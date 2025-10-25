import knex from "../db/knex.js";

/* ========= Date helpers ========= */
function startOfDayISO(d) {
  return new Date(`${d}T00:00:00.000`);
}
function endOfDayISO(d) {
  return new Date(`${d}T23:59:59.999`);
}

/* ========= Number helpers ========= */
const fmt2 = (n) => Number(Number(n || 0).toFixed(2));
const fmt3 = (n) => Number(Number(n || 0).toFixed(3));

/* ========= UoM helpers ========= */
function glassSheetAreaSqft(variant) {
  const w = Number(variant.width_in || 0);
  const h = Number(variant.height_in || 0);
  return (w * h) / 144;
}
function baseUomForType(t) {
  const s = String(t || "").toLowerCase();
  if (s.includes("glass")) return "sheet";
  if (s.includes("thai")) return "bar";
  if (s.includes("ss")) return "pipe";
  return "piece";
}
function altUomForType(t) {
  const s = String(t || "").toLowerCase();
  if (s.includes("glass")) return "sqft";
  if (s.includes("thai")) return "ft";
  if (s.includes("ss")) return "ft";
  return null;
}
function normalizeUom(rawUom, productType) {
  const s = String(rawUom || "").toLowerCase();
  const base = baseUomForType(productType);
  const alt = altUomForType(productType);
  if (s === "base") return base;
  if (s === "alt") return alt || base;
  const known = ["sheet", "sqft", "bar", "ft", "pipe", "piece"];
  return known.includes(s) ? s : base;
}
function convertToBase(variant, product_type, uom, qty) {
  const t = String(product_type || "").toLowerCase();
  const q = Number(qty || 0);

  if (t.includes("glass")) {
    const area = glassSheetAreaSqft(variant);
    if (uom === "sheet") return q;
    if (uom === "sqft") return area ? q / area : 0;
  } else if (t.includes("thai")) {
    const L = Number(variant.rod_length_ft || 0);
    if (uom === "bar") return q;
    if (uom === "ft") return L ? q / L : 0;
  } else if (t.includes("ss")) {
    const L = Number(variant.pipe_length_ft || 20);
    if (uom === "pipe") return q;
    if (uom === "ft") return q / L;
  } else {
    return q; // others piece only
  }
  return 0;
}

/* ========= Invoice number helper ========= */
async function nextInvoiceNo(usingDate) {
  const d = usingDate ? new Date(usingDate) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const start = startOfDayISO(`${yyyy}-${mm}-${dd}`);
  const end = endOfDayISO(`${yyyy}-${mm}-${dd}`);

  const [{ cnt }] = await knex("invoices")
    .where("invoices.created_at", ">=", start)
    .andWhere("invoices.created_at", "<=", end)
    .count({ cnt: "*" });

  const seq = String(Number(cnt || 0) + 1).padStart(4, "0");
  return `INV-${yyyy}${mm}${dd}-${seq}`;
}

/* ========= LIST ========= */
/**
 * GET /api/invoices?page&page_size&q&from&to
 * q = invoice_no OR customer name OR phone (optional)
 */
export async function listInvoices(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.page_size || 10))
    );
    const q = (req.query.q || "").trim();
    const from = req.query.from ? startOfDayISO(req.query.from) : null;
    const to = req.query.to ? endOfDayISO(req.query.to) : null;

    const base = knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .leftJoin({ r: "returns" }, "r.invoice_id", "i.id")
      .modify((qb) => {
        if (from) qb.where("i.created_at", ">=", from);
        if (to) qb.where("i.created_at", "<=", to);
        if (q) {
          qb.andWhere((s) =>
            s
              .whereILike("i.invoice_no", `%${q}%`)
              .orWhereILike("c.name", `%${q}%`)
              .orWhereILike("c.phone", `%${q}%`)
          );
        }
      });

    const [{ cnt }] = await base
      .clone()
      .clearSelect()
      .countDistinct({ cnt: "i.id" });

    const rows = await base
      .clone()
      .select(
        "i.id",
        "i.invoice_no",
        "i.created_at",
        "i.subtotal",
        "i.discount_bdt",
        "i.grand_total",
        "i.paid_amount",
        "i.status",
        knex.raw("COALESCE(SUM(r.subtotal_refund),0) AS refund_total"),
        "c.name as customer_name",
        "c.phone as customer_phone"
      )
      .groupBy(
        "i.id",
        "i.invoice_no",
        "i.created_at",
        "i.subtotal",
        "i.discount_bdt",
        "i.grand_total",
        "i.paid_amount",
        "i.status",
        "c.name",
        "c.phone"
      )
      .orderBy("i.created_at", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data = rows.map((r) => {
      const refund = Number(r.refund_total || 0);
      const dueRaw =
        Number(r.grand_total || 0) - refund - Number(r.paid_amount || 0);
      return {
        ...r,
        refund_total: refund,
        due: Math.max(0, Number(dueRaw.toFixed(2))), // never negative
      };
    });

    res.json({
      success: true,
      data,
      pagination: { page, page_size: pageSize, total: Number(cnt || 0) },
    });
  } catch (err) {
    next(err);
  }
}

/* ========= GET ========= */
/**
 * GET /api/invoices/:id
 * Returns invoice + lines (+ customer fields) + refund_total
 * GUARANTEES: data.items is an array ordered by line id ASC
 */
export async function getInvoiceById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const inv = await knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .where("i.id", id)
      .select(
        "i.id",
        "i.invoice_no",
        "i.created_at",
        "i.subtotal",
        "i.discount_bdt",
        "i.grand_total",
        "i.paid_amount",
        "i.status",
        "i.shop_name",
        "i.shop_address",
        "i.shop_phone",
        "c.name as customer_name",
        "c.phone as customer_phone",
        "c.address as customer_address"
      )
      .first();

    if (!inv) {
      return res
        .status(404)
        .json({ error: true, message: "Invoice not found" });
    }

    // Always fetch items the UI/print expects
    const items = await knex({ ii: "invoice_items" })
      .where("ii.invoice_id", id)
      .select(
        "ii.id",
        "ii.variant_id",
        "ii.sku",
        "ii.product_name",
        "ii.product_type",
        "ii.variant_label",
        "ii.uom",
        "ii.qty",
        "ii.base_qty",
        "ii.unit_price",
        "ii.line_total",
        "ii.cost_at_sale"
      )
      .orderBy("ii.id", "asc");

    // Sum refunds for this invoice (for display/print)
    const { sum_refund } = await knex({ r: "returns" })
      .join({ ri: "return_items" }, "ri.return_id", "r.id")
      .where("r.invoice_id", id)
      .sum({ sum_refund: "ri.refund_amount" })
      .first();

    res.json({
      success: true,
      data: {
        ...inv,
        items,
        refund_total: Number(sum_refund || 0),
      },
    });
  } catch (err) {
    next(err);
  }
}

/* ========= CREATE ========= */
export async function createInvoice(req, res, next) {
  const trx = await knex.transaction();
  try {
    const {
      invoice_no: bodyInvoiceNo,
      invoice_date, // "YYYY-MM-DD"
      sale_date, // alternative
      customer,
      subtotal: bodySubtotal,
      discount_bdt: bodyDiscount,
      grand_total: bodyGrand,
      paid_amount: bodyPaid,
      status: bodyStatus,
      shop_name,
      shop_address,
      shop_phone,
    } = req.body;

    // Accept multiple item keys
    const rawItems =
      (Array.isArray(req.body.items) && req.body.items) ||
      (Array.isArray(req.body.lines) && req.body.lines) ||
      (Array.isArray(req.body.line_items) && req.body.line_items) ||
      [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      await trx.rollback();
      return res
        .status(400)
        .json({ error: true, message: "No items to save." });
    }

    /* --- Resolve / upsert customer by phone if provided --- */
    let customer_id = null;
    if (customer?.phone) {
      const existing = await trx("customers")
        .where({ phone: customer.phone })
        .first();
      if (existing) {
        customer_id = existing.id;
        await trx("customers")
          .where({ id: customer_id })
          .update({
            name: customer.name ?? existing.name,
            address: customer.address ?? existing.address,
          });
      } else {
        const [cid] = await trx("customers").insert({
          name: customer.name || null,
          phone: customer.phone,
          address: customer.address || null,
        });
        customer_id = cid;
      }
    } else if (customer?.name || customer?.address) {
      const [cid] = await trx("customers").insert({
        name: customer.name || null,
        phone: customer?.phone || null,
        address: customer.address || null,
      });
      customer_id = cid;
    }

    /* --- Totals / status --- */
    const subtotal =
      bodySubtotal != null
        ? fmt2(bodySubtotal)
        : fmt2(
            rawItems.reduce(
              (s, it) => s + Number((it.line_total ?? it.lineTotal) || 0),
              0
            )
          );

    const discount = fmt2(bodyDiscount || 0);
    const grand_total =
      bodyGrand != null ? fmt2(bodyGrand) : fmt2(subtotal - discount);
    const paid_amount = fmt2(bodyPaid || 0);

    const status =
      bodyStatus ||
      (paid_amount >= grand_total
        ? "PAID"
        : paid_amount > 0
        ? "PARTIAL"
        : "UNPAID");

    /* --- created_at & invoice_no --- */
    const dateStr =
      (typeof invoice_date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(invoice_date) &&
        invoice_date) ||
      (typeof sale_date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(sale_date) &&
        sale_date) ||
      null;

    const created_at = dateStr ? startOfDayISO(dateStr) : knex.fn.now();
    const invoice_no =
      bodyInvoiceNo || (await nextInvoiceNo(dateStr || undefined));

    /* --- Insert invoice --- */
    const [invoice_id] = await trx("invoices").insert({
      invoice_no,
      customer_id,
      subtotal,
      discount_bdt: discount,
      grand_total,
      paid_amount,
      status,
      shop_name,
      shop_address,
      shop_phone,
      created_at,
    });

    /* --- Insert items --- */
    for (const it of rawItems) {
      const variant_id = it.variant_id ?? it.variantId;
      if (!variant_id) throw new Error("variant_id missing on line item");

      const vp = await trx({ v: "variants" })
        .leftJoin({ p: "products" }, "p.id", "v.product_id")
        .where("v.id", variant_id)
        .first("v.*", "p.name as product_name_db", "p.type as product_type_db");
      if (!vp) throw new Error("Variant not found");

      const product_type =
        (it.product_type ?? it.productType ?? vp.product_type_db) || "other";
      const product_name =
        (it.product_name ?? it.productName ?? vp.product_name_db) || "Item";
      const variant_label = (
        it.variant_label ??
        it.variantLabel ??
        vp.size_label ??
        vp.color ??
        ""
      ).toString();

      const uomIncoming = it.uom ?? it.unit ?? "base";
      const uom = normalizeUom(uomIncoming, product_type);

      const qty = Number(it.qty ?? it.quantity ?? 0);
      const base_qty =
        it.base_qty != null
          ? fmt3(it.base_qty)
          : fmt3(convertToBase(vp, product_type, uom, qty));

      if (base_qty > Number(vp.on_hand)) {
        throw new Error(
          `Insufficient stock for SKU ${vp.sku || it.sku || variant_id}`
        );
      }

      const unit_price = fmt2(it.unit_price ?? it.unitPrice ?? 0);
      const line_total = fmt2(
        it.line_total ?? it.lineTotal ?? unit_price * qty
      );
      const cost_at_sale = fmt2(it.cost_at_sale ?? vp.cost_price ?? 0);

      await trx("invoice_items").insert({
        invoice_id,
        variant_id,
        sku: it.sku ?? vp.sku ?? null,
        product_name,
        product_type,
        variant_label,
        uom,
        qty: fmt3(qty),
        base_qty,
        unit_price,
        line_total,
        cost_at_sale,
      });

      await trx("variants")
        .where({ id: variant_id })
        .decrement("on_hand", base_qty);
    }

    await trx.commit();

    const created = await knex("invoices").where({ id: invoice_id }).first();
    res.json({ success: true, data: created });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
}
