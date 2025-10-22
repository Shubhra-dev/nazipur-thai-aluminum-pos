import knex from "../db/knex.js";

/* ------------ helpers ------------ */
const f2 = (n) => Number(Number(n || 0).toFixed(2));
const f3 = (n) => Number(Number(n || 0).toFixed(3));
const toStart = (d) => new Date(`${d}T00:00:00.000`);
const toEnd = (d) => new Date(`${d}T23:59:59.999`);

function baseUomForType(t) {
  const s = String(t || "").toLowerCase();
  if (s.includes("glass")) return "sheet";
  if (s.includes("thai")) return "bar";
  if (s.includes("ss")) return "pipe";
  return "piece";
}

async function getAlreadyReturnedBaseQty(invoice_item_id) {
  const row = await knex({ ri: "return_items" })
    .join({ r: "returns" }, "r.id", "ri.return_id")
    .where("ri.invoice_item_id", invoice_item_id)
    .sum({ b: "ri.base_qty" })
    .first();
  return f3(row?.b || 0);
}

function glassSheetAreaSqft(variant) {
  const w = Number(variant.width_in || 0);
  const h = Number(variant.height_in || 0);
  return (w * h) / 144;
}

function convertBetween(variant, product_type, fromUom, toUom, qty) {
  const q = Number(qty || 0);
  if (!q || fromUom === toUom) return q;
  const t = String(product_type || "").toLowerCase();

  if (t.includes("glass")) {
    const area = glassSheetAreaSqft(variant);
    if (area <= 0) return 0;
    if (fromUom === "sqft" && toUom === "sheet") return q / area;
    if (fromUom === "sheet" && toUom === "sqft") return q * area;
  }
  if (t.includes("thai")) {
    const L = Number(variant.rod_length_ft || 0);
    if (L <= 0) return 0;
    if (fromUom === "ft" && toUom === "bar") return q / L;
    if (fromUom === "bar" && toUom === "ft") return q * L;
  }
  if (t.includes("ss")) {
    const L = Number(variant.pipe_length_ft || 20);
    if (fromUom === "ft" && toUom === "pipe") return q / L;
    if (fromUom === "pipe" && toUom === "ft") return q * L;
  }
  return q; // others
}

/* ------------ prepare (unchanged) ------------ */
export async function prepareInvoiceReturnInfo(req, res, next) {
  try {
    const invoiceId = Number(req.params.invoiceId);
    const inv = await knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .where("i.id", invoiceId)
      .first(
        "i.*",
        "c.name as customer_name",
        "c.phone as customer_phone",
        "c.address as customer_address"
      );
    if (!inv)
      return res
        .status(404)
        .json({ error: true, message: "Invoice not found" });

    const items = await knex({ ii: "invoice_items" })
      .join({ v: "variants" }, "v.id", "ii.variant_id")
      .where("ii.invoice_id", invoiceId)
      .orderBy("ii.id", "asc")
      .select(
        "ii.*",
        "v.width_in",
        "v.height_in",
        "v.rod_length_ft",
        "v.pipe_length_ft",
        "v.price_base as _price_base",
        "v.price_alt as _price_alt"
      );

    const enriched = [];
    for (const it of items) {
      const already_base = await getAlreadyReturnedBaseQty(it.id);
      enriched.push({
        ...it,
        already_returned_base_qty: f3(already_base),
        remaining_base_qty: f3(Number(it.base_qty) - already_base),
        variant_fields: {
          width_in: it.width_in,
          height_in: it.height_in,
          rod_length_ft: it.rod_length_ft,
          pipe_length_ft: it.pipe_length_ft || 20,
        },
        variant_price_base: Number(it._price_base || 0),
        variant_price_alt:
          it._price_alt !== null ? Number(it._price_alt) : null,
      });
    }

    res.json({ success: true, data: { invoice: inv, items: enriched } });
  } catch (err) {
    next(err);
  }
}

/* ------------ create return (UPDATED) ------------ */
export async function createReturn(req, res, next) {
  const trx = await knex.transaction();
  try {
    const { invoice_id, items, note, new_discount_bdt } = req.body;
    if (!invoice_id || !Array.isArray(items) || items.length === 0) {
      await trx.rollback();
      return res
        .status(400)
        .json({ error: true, message: "invoice_id and items required" });
    }

    const invoice = await trx("invoices").where({ id: invoice_id }).first();
    if (!invoice) {
      await trx.rollback();
      return res
        .status(404)
        .json({ error: true, message: "Invoice not found" });
    }

    let subtotal_refund = 0;
    const rowsToInsert = [];

    for (const line of items) {
      const invoice_item = await trx("invoice_items")
        .where({ id: line.invoice_item_id })
        .first();
      if (!invoice_item) throw new Error("Invoice item not found");

      const variant = await trx("variants")
        .where({ id: invoice_item.variant_id })
        .first();
      if (!variant) throw new Error("Variant not found");

      const product_type = invoice_item.product_type;
      const baseUom = baseUomForType(product_type);
      const uom = String(line.uom || "").toLowerCase();
      const qty = Number(line.qty || 0);

      // base cannot be fractional
      if (uom === baseUom && Math.abs(qty - Math.round(qty)) > 1e-9) {
        throw new Error(
          `Base unit returns cannot be fractional for ${baseUom}`
        );
      }

      const base_qty = f3(
        convertBetween(variant, product_type, uom, baseUom, qty)
      );

      if (base_qty <= 0) {
        await trx.rollback();
        return res
          .status(400)
          .json({
            error: true,
            message: "Return qty must be greater than zero",
          });
      }

      const already_base = await getAlreadyReturnedBaseQty(invoice_item.id);
      const remaining_base = f3(Number(invoice_item.base_qty) - already_base);
      if (base_qty > remaining_base + 1e-9) {
        await trx.rollback();
        return res.status(400).json({
          error: true,
          message: "Return qty exceeds remaining allowed for this line",
        });
      }

      // EDITABLE refund override is a FULL line total
      const overrideRefund =
        line.refund_override != null ? Number(line.refund_override) : null;

      let effective_rate = 0;
      let refund_amount = 0;

      if (overrideRefund != null && overrideRefund >= 0) {
        if (qty <= 0) {
          await trx.rollback();
          return res.status(400).json({
            error: true,
            message: "Qty must be greater than zero for a refund override",
          });
        }
        refund_amount = f2(overrideRefund);
        effective_rate = f2(refund_amount / qty);
      } else {
        if (uom === baseUom) {
          effective_rate = Number(variant.price_base || 0);
        } else {
          const alt = variant.price_alt;
          if (alt === null || alt === undefined) {
            await trx.rollback();
            return res
              .status(400)
              .json({
                error: true,
                message: "Alt price not set for this variant",
              });
          }
          effective_rate = Number(alt || 0);
        }
        refund_amount = f2(effective_rate * qty);
      }

      subtotal_refund += refund_amount;

      rowsToInsert.push({
        invoice_item_id: invoice_item.id,
        variant_id: invoice_item.variant_id,
        product_name: invoice_item.product_name,
        variant_label: invoice_item.variant_label,
        uom,
        qty: f3(qty),
        base_qty: f3(base_qty),
        effective_rate: f2(effective_rate),
        refund_amount,
        note: line.note || null,
      });
    }

    // header no
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const start = toStart(`${yyyy}-${mm}-${dd}`);
    const end = toEnd(`${yyyy}-${mm}-${dd}`);
    const [{ cnt }] = await trx("returns")
      .where("created_at", ">=", start)
      .andWhere("created_at", "<=", end)
      .count({ cnt: "*" });
    const seq = String(Number(cnt || 0) + 1).padStart(4, "0");
    const return_no = `RET-${yyyy}${mm}${dd}-${seq}`;

    const [return_id] = await trx("returns").insert({
      return_no,
      invoice_id,
      subtotal_refund: f2(subtotal_refund),
      note: note || null,
    });

    // items + restock
    for (const r of rowsToInsert) {
      await trx("return_items").insert({ return_id, ...r });
      await trx("variants")
        .where({ id: r.variant_id })
        .increment("on_hand", r.base_qty);
    }

    // UPDATE invoice: discount + recompute grand_total (IMPORTANT FIX)
    let newDiscount = invoice.discount_bdt;
    if (new_discount_bdt != null) {
      newDiscount = Math.max(0, Number(new_discount_bdt));
    }
    const newGrand = f2(
      Number(invoice.subtotal || 0) - Number(newDiscount || 0)
    );
    const remark =
      (invoice.remark ? invoice.remark + " | " : "") + `Return ${return_no}`;

    await trx("invoices")
      .where({ id: invoice_id })
      .update({
        discount_bdt: f2(newDiscount || 0),
        grand_total: newGrand,
        remark,
      });

    await trx.commit();

    const created = await knex({ r: "returns" })
      .leftJoin({ i: "invoices" }, "i.id", "r.invoice_id")
      .where("r.id", return_id)
      .first("r.*", "i.invoice_no as original_invoice_no");

    res.json({ success: true, data: created });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
}

/* ------------ list & detail (unchanged, but ensure refund_amount selected) ------------ */
export async function listReturns(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.page_size || 10))
    );
    const q = (req.query.q || "").trim();
    const from = req.query.from ? toStart(req.query.from) : null;
    const to = req.query.to ? toEnd(req.query.to) : null;

    const base = knex({ r: "returns" })
      .join({ i: "invoices" }, "i.id", "r.invoice_id")
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .modify((qb) => {
        if (from) qb.where("r.created_at", ">=", from);
        if (to) qb.where("r.created_at", "<=", to);
        if (q)
          qb.andWhere((x) =>
            x
              .whereILike("i.invoice_no", `%${q}%`)
              .orWhereILike("c.phone", `%${q}%`)
              .orWhereILike("c.name", `%${q}%`)
          );
      });

    const [{ cnt }] = await base.clone().clearSelect().count({ cnt: "*" });

    const rows = await base
      .clone()
      .select(
        "r.id",
        "r.return_no",
        "r.created_at",
        "r.subtotal_refund",
        "i.invoice_no",
        "c.name as customer_name",
        "c.phone as customer_phone"
      )
      .orderBy("r.created_at", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    res.json({
      success: true,
      data: rows,
      pagination: { page, page_size: pageSize, total: Number(cnt || 0) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getReturnById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const head = await knex({ r: "returns" })
      .join({ i: "invoices" }, "i.id", "r.invoice_id")
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .where("r.id", id)
      .first(
        "r.*",
        "i.invoice_no",
        "i.shop_name",
        "i.shop_address",
        "i.shop_phone",
        "c.name as customer_name",
        "c.phone as customer_phone",
        "c.address as customer_address"
      );
    if (!head)
      return res.status(404).json({ error: true, message: "Return not found" });

    const items = await knex({ ri: "return_items" })
      .join({ ii: "invoice_items" }, "ii.id", "ri.invoice_item_id")
      .where("ri.return_id", id)
      .select(
        "ri.id",
        "ri.uom",
        "ri.qty",
        "ri.base_qty",
        "ri.effective_rate",
        "ri.refund_amount",
        "ri.note",
        "ii.product_name",
        "ii.variant_label",
        "ii.sku"
      );

    res.json({ success: true, data: { head, items } });
  } catch (err) {
    next(err);
  }
}
