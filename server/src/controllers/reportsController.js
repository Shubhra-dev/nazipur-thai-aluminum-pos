import knex from "../db/knex.js";

/* ===================== HELPERS ===================== */
function startOfDayISO(d) {
  return new Date(`${d}T00:00:00.000`);
}
function endOfDayISO(d) {
  return new Date(`${d}T23:59:59.999`);
}
const n2 = (x) => Number(Number(x || 0).toFixed(2));

/* ===================== PROFIT (ADJUSTED BY RETURNS) ===================== */
/**
 * Net profit per invoice:
 *   gross = SUM(ii.line_total - ii.cost_at_sale * ii.qty)
 *   returns_impact = SUM(ri.refund_amount - ii.cost_at_sale * qty_returned_in_sale_uom)
 *   net = gross - i.discount_bdt - returns_impact
 *
 * Note: returns_impact considers ALL returns against the invoice (regardless of return date),
 *       matching how we already show refunds on the invoice list/print.
 */
export async function profitList(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.page_size || 10))
    );
    const q = (req.query.q || "").trim();
    const from = req.query.from ? startOfDayISO(req.query.from) : null;
    const to = req.query.to ? endOfDayISO(req.query.to) : null;

    const baseInvoices = knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
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

    const [{ cnt }] = await baseInvoices
      .clone()
      .clearOrder()
      .clearSelect()
      .countDistinct({ cnt: "i.id" });

    // Page rows with gross profit AND returns impact
    const rows = await baseInvoices
      .clone()
      .join({ ii: "invoice_items" }, "ii.invoice_id", "i.id")
      .leftJoin({ r: "returns" }, "r.invoice_id", "i.id")
      .leftJoin({ ri: "return_items" }, "ri.return_id", "r.id")
      .leftJoin({ v: "variants" }, "v.id", "ii.variant_id")
      .groupBy(
        "i.id",
        "i.invoice_no",
        "i.created_at",
        "i.subtotal",
        "i.discount_bdt",
        "i.grand_total",
        "c.name",
        "c.phone"
      )
      .select(
        "i.id",
        "i.invoice_no",
        "i.created_at",
        "i.subtotal",
        "i.discount_bdt",
        "i.grand_total",
        "c.name as customer_name",
        "c.phone as customer_phone",
        // gross profit from invoice_items
        knex.raw(
          "COALESCE(SUM(ii.line_total - ii.cost_at_sale * ii.qty),0) AS gross_profit"
        ),
        // sum of refund amounts on all returns for this invoice
        knex.raw("COALESCE(SUM(ri.refund_amount),0) AS refund_total"),
        // qty returned converted into the invoice line's sale uom
        knex.raw(`
          COALESCE(SUM(
            CASE
              WHEN ri.id IS NULL THEN 0
              ELSE
                CASE
                  WHEN LOWER(ii.product_type) LIKE '%glass%' THEN
                    CASE
                      WHEN ii.uom='sheet' AND ri.uom='sqft'
                        THEN ri.qty / NULLIF((v.width_in * v.height_in)/144,0)
                      WHEN ii.uom='sqft' AND ri.uom='sheet'
                        THEN ri.qty * ((v.width_in * v.height_in)/144)
                      ELSE ri.qty
                    END
                  WHEN LOWER(ii.product_type) LIKE '%thai%' THEN
                    CASE
                      WHEN ii.uom='bar' AND ri.uom='ft'
                        THEN ri.qty / NULLIF(v.rod_length_ft,0)
                      WHEN ii.uom='ft' AND ri.uom='bar'
                        THEN ri.qty * v.rod_length_ft
                      ELSE ri.qty
                    END
                  WHEN LOWER(ii.product_type) LIKE '%ss%' THEN
                    CASE
                      WHEN ii.uom='pipe' AND ri.uom='ft' THEN ri.qty / 20
                      WHEN ii.uom='ft' AND ri.uom='pipe' THEN ri.qty * 20
                      ELSE ri.qty
                    END
                  ELSE ri.qty
                END
            END
          ),0) AS returned_qty_in_sale_uom
        `),
        // returns impact = refunds - cost * qty_in_sale_uom
        knex.raw(`
          COALESCE(SUM(
            CASE WHEN ri.id IS NULL THEN 0
                 ELSE ri.refund_amount - (ii.cost_at_sale *
                   CASE
                     WHEN LOWER(ii.product_type) LIKE '%glass%' THEN
                       CASE
                         WHEN ii.uom='sheet' AND ri.uom='sqft'
                           THEN ri.qty / NULLIF((v.width_in * v.height_in)/144,0)
                         WHEN ii.uom='sqft' AND ri.uom='sheet'
                           THEN ri.qty * ((v.width_in * v.height_in)/144)
                         ELSE ri.qty
                       END
                     WHEN LOWER(ii.product_type) LIKE '%thai%' THEN
                       CASE
                         WHEN ii.uom='bar' AND ri.uom='ft'
                           THEN ri.qty / NULLIF(v.rod_length_ft,0)
                         WHEN ii.uom='ft' AND ri.uom='bar'
                           THEN ri.qty * v.rod_length_ft
                         ELSE ri.qty
                       END
                     WHEN LOWER(ii.product_type) LIKE '%ss%' THEN
                       CASE
                         WHEN ii.uom='pipe' AND ri.uom='ft' THEN ri.qty / 20
                         WHEN ii.uom='ft' AND ri.uom='pipe' THEN ri.qty * 20
                         ELSE ri.qty
                       END
                     ELSE ri.qty
                   END)
            END
          ),0) AS returns_impact
        `)
      )
      .orderBy("i.created_at", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data = rows.map((r) => {
      const gross = Number(r.gross_profit || 0);
      const discount = Number(r.discount_bdt || 0);
      const impact = Number(r.returns_impact || 0);
      const net = gross - discount - impact;
      return {
        ...r,
        gross_profit: n2(gross),
        refund_total: n2(r.refund_total || 0),
        returns_impact: n2(impact),
        net_profit: n2(net),
      };
    });

    // Summary: total net profit across all filtered invoices (same formula)
    const allAgg = await baseInvoices
      .clone()
      .join({ ii: "invoice_items" }, "ii.invoice_id", "i.id")
      .leftJoin({ r: "returns" }, "r.invoice_id", "i.id")
      .leftJoin({ ri: "return_items" }, "ri.return_id", "r.id")
      .leftJoin({ v: "variants" }, "v.id", "ii.variant_id")
      .groupBy("i.id", "i.discount_bdt")
      .select(
        knex.raw(
          "COALESCE(SUM(ii.line_total - ii.cost_at_sale * ii.qty),0) AS gross"
        ),
        knex.raw("i.discount_bdt AS disc"),
        knex.raw(`
          COALESCE(SUM(
            CASE WHEN ri.id IS NULL THEN 0
                 ELSE ri.refund_amount - (ii.cost_at_sale *
                   CASE
                     WHEN LOWER(ii.product_type) LIKE '%glass%' THEN
                       CASE
                         WHEN ii.uom='sheet' AND ri.uom='sqft'
                           THEN ri.qty / NULLIF((v.width_in * v.height_in)/144,0)
                         WHEN ii.uom='sqft' AND ri.uom='sheet'
                           THEN ri.qty * ((v.width_in * v.height_in)/144)
                         ELSE ri.qty
                       END
                     WHEN LOWER(ii.product_type) LIKE '%thai%' THEN
                       CASE
                         WHEN ii.uom='bar' AND ri.uom='ft'
                           THEN ri.qty / NULLIF(v.rod_length_ft,0)
                         WHEN ii.uom='ft' AND ri.uom='bar'
                           THEN ri.qty * v.rod_length_ft
                         ELSE ri.qty
                       END
                     WHEN LOWER(ii.product_type) LIKE '%ss%' THEN
                       CASE
                         WHEN ii.uom='pipe' AND ri.uom='ft' THEN ri.qty / 20
                         WHEN ii.uom='ft' AND ri.uom='pipe' THEN ri.qty * 20
                         ELSE ri.qty
                       END
                     ELSE ri.qty
                   END)
            END
          ),0) AS impact
        `)
      );

    const total_net_profit = n2(
      (allAgg || []).reduce(
        (sum, r) =>
          sum +
          (Number(r.gross || 0) - Number(r.disc || 0) - Number(r.impact || 0)),
        0
      )
    );

    res.json({
      success: true,
      data,
      summary: { total_net_profit },
      pagination: { page, page_size: pageSize, total: Number(cnt || 0) },
    });
  } catch (err) {
    next(err);
  }
}

export async function profitDetail(req, res, next) {
  try {
    const invoiceId = Number(req.params.invoiceId);
    const invoice = await knex("invoices").where({ id: invoiceId }).first();
    if (!invoice)
      return res
        .status(404)
        .json({ error: true, message: "Invoice not found" });

    const items = await knex("invoice_items")
      .where({ invoice_id: invoiceId })
      .select("*");

    const rows = items.map((it) => {
      const line_gross_profit =
        Number(it.line_total) - Number(it.cost_at_sale) * Number(it.qty);
      const share =
        Number(invoice.subtotal) > 0
          ? (Number(it.line_total) / Number(invoice.subtotal)) *
            Number(invoice.discount_bdt || 0)
          : 0;
      const line_net_profit = line_gross_profit - share;
      return {
        ...it,
        line_gross_profit: n2(line_gross_profit),
        share_discount: n2(share),
        line_net_profit: n2(line_net_profit),
      };
    });

    // returns impact for this invoice (all returns regardless of date)
    const retRow = await knex({ r: "returns" })
      .leftJoin({ ri: "return_items" }, "ri.return_id", "r.id")
      .leftJoin({ ii: "invoice_items" }, "ii.id", "ri.invoice_item_id")
      .leftJoin({ v: "variants" }, "v.id", "ii.variant_id")
      .where("r.invoice_id", invoiceId)
      .select(
        knex.raw("COALESCE(SUM(ri.refund_amount),0) AS refund_total"),
        knex.raw(`
          COALESCE(SUM(
            CASE WHEN ri.id IS NULL THEN 0
                 ELSE ri.refund_amount - (ii.cost_at_sale *
                   CASE
                     WHEN LOWER(ii.product_type) LIKE '%glass%' THEN
                       CASE
                         WHEN ii.uom='sheet' AND ri.uom='sqft'
                           THEN ri.qty / NULLIF((v.width_in * v.height_in)/144,0)
                         WHEN ii.uom='sqft' AND ri.uom='sheet'
                           THEN ri.qty * ((v.width_in * v.height_in)/144)
                         ELSE ri.qty
                       END
                     WHEN LOWER(ii.product_type) LIKE '%thai%' THEN
                       CASE
                         WHEN ii.uom='bar' AND ri.uom='ft'
                           THEN ri.qty / NULLIF(v.rod_length_ft,0)
                         WHEN ii.uom='ft' AND ri.uom='bar'
                           THEN ri.qty * v.rod_length_ft
                         ELSE ri.qty
                       END
                     WHEN LOWER(ii.product_type) LIKE '%ss%' THEN
                       CASE
                         WHEN ii.uom='pipe' AND ri.uom='ft' THEN ri.qty / 20
                         WHEN ii.uom='ft' AND ri.uom='pipe' THEN ri.qty * 20
                         ELSE ri.qty
                       END
                     ELSE ri.qty
                   END)
            END
          ),0) AS returns_impact
        `)
      )
      .first();

    const gross_total = rows.reduce(
      (a, r) => a + r.line_gross_profit + r.share_discount,
      0
    ); // reverse out discount to get gross
    const net_profit_items = rows.reduce((a, r) => a + r.line_net_profit, 0);
    const returns_impact = n2(retRow?.returns_impact || 0);
    const refund_total = n2(retRow?.refund_total || 0);
    const net_profit = n2(net_profit_items - returns_impact);

    res.json({
      success: true,
      data: {
        invoice: {
          id: invoice.id,
          invoice_no: invoice.invoice_no,
          created_at: invoice.created_at,
          subtotal: invoice.subtotal,
          discount_bdt: invoice.discount_bdt,
          grand_total: invoice.grand_total,
        },
        lines: rows,
        refund_total,
        returns_impact,
        net_profit,
      },
    });
  } catch (err) {
    next(err);
  }
}

/* ===================== SALES REPORTING (WITH RETURNS) ===================== */
/**
 * GET /api/reports/sales/summary?from&to
 * - revenue: SUM(i.grand_total)
 * - refunds: SUM(returns within date range by return date)
 * - net_revenue: revenue - refunds
 * - due: max(0, net_revenue - paid)
 */
export async function salesSummary(req, res, next) {
  try {
    const from = req.query.from ? startOfDayISO(req.query.from) : null;
    const to = req.query.to ? endOfDayISO(req.query.to) : null;

    const row = await knex({ i: "invoices" })
      .modify((qb) => {
        if (from) qb.where("i.created_at", ">=", from);
        if (to) qb.where("i.created_at", "<=", to);
      })
      .first(
        knex.raw("COUNT(*) AS invoices_count"),
        knex.raw("COALESCE(SUM(i.grand_total),0) AS revenue"),
        knex.raw("COALESCE(SUM(i.discount_bdt),0) AS discount"),
        knex.raw("COALESCE(SUM(i.paid_amount),0) AS paid")
      );

    const refundsRow = await knex({ r: "returns" })
      .modify((qb) => {
        if (from) qb.where("r.created_at", ">=", from);
        if (to) qb.where("r.created_at", "<=", to);
      })
      .first(knex.raw("COALESCE(SUM(r.subtotal_refund),0) AS refunds"));

    const invoices_count = Number(row?.invoices_count || 0);
    const revenue = Number(row?.revenue || 0);
    const discount = Number(row?.discount || 0);
    const paid = Number(row?.paid || 0);
    const refunds = Number(refundsRow?.refunds || 0);

    const net_revenue = revenue - refunds;
    const due = Math.max(0, net_revenue - paid);
    const avg_order_value =
      invoices_count > 0 ? net_revenue / invoices_count : 0;

    res.json({
      success: true,
      data: {
        invoices_count,
        revenue: n2(revenue),
        refunds: n2(refunds),
        net_revenue: n2(net_revenue),
        discount: n2(discount),
        paid: n2(paid),
        due: n2(due),
        avg_order_value: n2(avg_order_value),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/sales/daily?from&to
 * - rows by invoice date for revenue/paid/discount
 * - refunds by return date, merged into same calendar days
 */
export async function salesDaily(req, res, next) {
  try {
    const from = req.query.from ? startOfDayISO(req.query.from) : null;
    const to = req.query.to ? endOfDayISO(req.query.to) : null;

    const salesRows = await knex({ i: "invoices" })
      .modify((qb) => {
        if (from) qb.where("i.created_at", ">=", from);
        if (to) qb.where("i.created_at", "<=", to);
      })
      .groupByRaw("DATE(i.created_at)")
      .select(
        knex.raw("DATE(i.created_at) AS d"),
        knex.raw("COALESCE(SUM(i.grand_total),0) AS revenue"),
        knex.raw("COALESCE(SUM(i.discount_bdt),0) AS discount"),
        knex.raw("COALESCE(SUM(i.paid_amount),0) AS paid")
      )
      .orderBy("d", "asc");

    const refundRows = await knex({ r: "returns" })
      .modify((qb) => {
        if (from) qb.where("r.created_at", ">=", from);
        if (to) qb.where("r.created_at", "<=", to);
      })
      .groupByRaw("DATE(r.created_at)")
      .select(
        knex.raw("DATE(r.created_at) AS d"),
        knex.raw("COALESCE(SUM(r.subtotal_refund),0) AS refunds")
      );

    // Merge by date
    const map = new Map();
    for (const r of salesRows) {
      map.set(String(r.d), {
        date: r.d,
        revenue: Number(r.revenue || 0),
        discount: Number(r.discount || 0),
        paid: Number(r.paid || 0),
        refunds: 0,
      });
    }
    for (const rr of refundRows) {
      const key = String(rr.d);
      const node = map.get(key) || {
        date: rr.d,
        revenue: 0,
        discount: 0,
        paid: 0,
        refunds: 0,
      };
      node.refunds = Number(rr.refunds || 0);
      map.set(key, node);
    }

    const data = Array.from(map.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((r) => ({
        date: r.date,
        revenue: n2(r.revenue),
        discount: n2(r.discount),
        paid: n2(r.paid),
        refunds: n2(r.refunds),
        net_revenue: n2(r.revenue - r.refunds),
        due: n2(Math.max(0, r.revenue - r.refunds - r.paid)),
      }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/sales/by-product?from&to&page&page_size&q
 * Sales by product name plus refunds (by return date) tied to those products.
 */
export async function salesByProduct(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.page_size || 10))
    );
    const q = (req.query.q || "").trim();
    const from = req.query.from ? startOfDayISO(req.query.from) : null;
    const to = req.query.to ? endOfDayISO(req.query.to) : null;

    const baseSales = knex({ i: "invoices" })
      .join({ ii: "invoice_items" }, "ii.invoice_id", "i.id")
      .modify((qb) => {
        if (from) qb.where("i.created_at", ">=", from);
        if (to) qb.where("i.created_at", "<=", to);
      });

    const filtered = baseSales.clone().modify((qb) => {
      if (q) qb.whereILike("ii.product_name", `%${q}%`);
    });

    const cntRows = await filtered
      .clone()
      .groupBy("ii.product_name")
      .select("ii.product_name");
    const total = cntRows.length;

    // Refunds by product_name over return date range
    const refundsByProduct = await knex({ r: "returns" })
      .join({ ri: "return_items" }, "ri.return_id", "r.id")
      .join({ ii: "invoice_items" }, "ii.id", "ri.invoice_item_id")
      .modify((qb) => {
        if (from) qb.where("r.created_at", ">=", from);
        if (to) qb.where("r.created_at", "<=", to);
      })
      .groupBy("ii.product_name")
      .select(
        "ii.product_name",
        knex.raw("COALESCE(SUM(ri.refund_amount),0) AS refund")
      );

    const refundMap = new Map(
      refundsByProduct.map((r) => [r.product_name, Number(r.refund || 0)])
    );

    const rows = await filtered
      .clone()
      .groupBy("ii.product_name")
      .select(
        "ii.product_name",
        knex.raw("COUNT(DISTINCT i.id) AS invoices"),
        knex.raw("COALESCE(SUM(ii.line_total),0) AS sales"),
        knex.raw("COALESCE(SUM(ii.qty),0) AS qty")
      )
      .orderBy("sales", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data = rows.map((r) => {
      const refund = Number(refundMap.get(r.product_name) || 0);
      const sales = Number(r.sales || 0);
      return {
        product_name: r.product_name,
        invoices: Number(r.invoices || 0),
        qty: Number(r.qty || 0),
        sales: n2(sales),
        refunds: n2(refund),
        net_sales: n2(sales - refund),
      };
    });

    res.json({
      success: true,
      data,
      pagination: { page, page_size: pageSize, total },
    });
  } catch (err) {
    next(err);
  }
}

/** (Kept for completeness; UI can ignore) */
export async function salesByCustomer(req, res, next) {
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
      .modify((qb) => {
        if (from) qb.where("i.created_at", ">=", from);
        if (to) qb.where("i.created_at", "<=", to);
        if (q)
          qb.andWhere((s) =>
            s.whereILike("c.name", `%${q}%`).orWhereILike("c.phone", `%${q}%`)
          );
      });

    const cntRows = await base
      .clone()
      .groupBy("i.customer_id", "c.name", "c.phone")
      .select("i.customer_id");
    const total = cntRows.length;

    const rows = await base
      .clone()
      .groupBy("i.customer_id", "c.name", "c.phone")
      .select(
        "i.customer_id",
        "c.name as customer_name",
        "c.phone as customer_phone",
        knex.raw("COUNT(*) AS invoices"),
        knex.raw("COALESCE(SUM(i.grand_total),0) AS sales"),
        knex.raw("COALESCE(SUM(i.paid_amount),0) AS paid")
      )
      .orderBy("sales", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data = rows.map((r) => ({
      customer_id: r.customer_id,
      customer_name: r.customer_name || "Walk-in",
      customer_phone: r.customer_phone || "N/A",
      invoices: Number(r.invoices || 0),
      sales: n2(r.sales || 0),
      paid: n2(r.paid || 0),
      due: n2((r.sales || 0) - (r.paid || 0)),
    }));

    res.json({
      success: true,
      data,
      pagination: { page, page_size: pageSize, total },
    });
  } catch (err) {
    next(err);
  }
}
