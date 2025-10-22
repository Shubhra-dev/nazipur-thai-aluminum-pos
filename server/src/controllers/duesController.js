import knex from "../db/knex.js";

/** Helpers */
const toStart = (d) => new Date(`${d}T00:00:00.000`);
const toEnd = (d) => new Date(`${d}T23:59:59.999`);
const f2 = (n) => Number(Number(n || 0).toFixed(2));

async function refundsSumForInvoice(invoiceId) {
  const { sum_refund } = await knex({ r: "returns" })
    .join({ ri: "return_items" }, "ri.return_id", "r.id")
    .where("r.invoice_id", invoiceId)
    .sum({ sum_refund: "ri.refund_amount" })
    .first();
  return Number(sum_refund || 0);
}

/**
 * GET /api/dues?page&page_size&q&from&to
 * q: invoice_no or phone or name
 * Lists invoices where computed due > 0
 */
export async function listDues(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.page_size || 10))
    );
    const q = (req.query.q || "").trim();
    const from = req.query.from ? toStart(req.query.from) : null;
    const to = req.query.to ? toEnd(req.query.to) : null;

    // base query
    const base = knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .modify((qb) => {
        if (from) qb.where("i.created_at", ">=", from);
        if (to) qb.where("i.created_at", "<=", to);
        if (q) {
          qb.andWhere((s) =>
            s
              .whereILike("i.invoice_no", `%${q}%`)
              .orWhereILike("c.phone", `%${q}%`)
              .orWhereILike("c.name", `%${q}%`)
          );
        }
      });

    // fetch page rows
    const rows = await base
      .clone()
      .select(
        "i.id",
        "i.invoice_no",
        "i.created_at",
        "i.subtotal",
        "i.discount_bdt",
        "i.paid_amount",
        "c.name as customer_name",
        "c.phone as customer_phone"
      )
      .orderBy("i.created_at", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // compute dues and filter > 0
    const computed = [];
    for (const r of rows) {
      const refund = await refundsSumForInvoice(r.id);
      const grand =
        Number(r.subtotal || 0) - Number(r.discount_bdt || 0) - refund;
      const due = Math.max(0, f2(grand - Number(r.paid_amount || 0)));
      if (due > 0.0001) {
        computed.push({
          ...r,
          refund_total: refund,
          grand_total: f2(grand),
          due: f2(due),
        });
      }
    }

    // For total count, we can approximate by checking more rows, but simpler:
    // count distinct invoices in time range and then we'll recompute dues again — acceptable for our page size.
    // Or just return computed.length + (if fewer than pagesize, last page).
    // Here, we compute total precisely:
    const all = await base
      .clone()
      .select("i.id", "i.subtotal", "i.discount_bdt", "i.paid_amount");
    let total = 0;
    for (const r of all) {
      const refund = await refundsSumForInvoice(r.id);
      const grand =
        Number(r.subtotal || 0) - Number(r.discount_bdt || 0) - refund;
      const due = Math.max(0, f2(grand - Number(r.paid_amount || 0)));
      if (due > 0.0001) total++;
    }

    res.json({
      success: true,
      data: computed,
      pagination: { page, page_size: pageSize, total },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dues/:invoiceId
 * Returns invoice, computed due, refunds, payment history
 */
export async function getDueDetail(req, res, next) {
  try {
    const id = Number(req.params.invoiceId);
    const i = await knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .where("i.id", id)
      .first(
        "i.*",
        "c.name as customer_name",
        "c.phone as customer_phone",
        "c.address as customer_address"
      );
    if (!i)
      return res
        .status(404)
        .json({ error: true, message: "Invoice not found" });

    const refund_total = await refundsSumForInvoice(id);
    const grand =
      Number(i.subtotal || 0) - Number(i.discount_bdt || 0) - refund_total;
    const due = Math.max(0, f2(grand - Number(i.paid_amount || 0)));

    const payments = await knex("due_payments")
      .where({ invoice_id: id })
      .orderBy("created_at", "asc");

    const paid_installments = payments.reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );
    const paid_at_sale = Number(i.paid_amount || 0) - paid_installments;
    const remaining = f2(due);

    res.json({
      success: true,
      data: {
        invoice: i,
        computed: {
          refund_total: f2(refund_total),
          grand_total: f2(grand),
          due: f2(due),
          paid_at_sale: f2(paid_at_sale),
          paid_installments: f2(paid_installments),
        },
        payments,
        customer: {
          name: i.customer_name || "Walk-in",
          phone: i.customer_phone || "",
          address: i.customer_address || "",
        },
        remaining,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/dues/:invoiceId/payments  { amount, note }
 * - Creates payment with a receipt no
 * - Increases invoices.paid_amount by amount
 * - Returns receipt payload
 */
export async function addPayment(req, res, next) {
  const trx = await knex.transaction();
  try {
    const invoiceId = Number(req.params.invoiceId);
    let { amount, note } = req.body;
    amount = Number(amount || 0);

    if (amount <= 0) {
      await trx.rollback();
      return res
        .status(400)
        .json({ error: true, message: "Amount must be > 0" });
    }

    const i = await trx("invoices").where({ id: invoiceId }).first();
    if (!i) {
      await trx.rollback();
      return res
        .status(404)
        .json({ error: true, message: "Invoice not found" });
    }

    const refund_total = await refundsSumForInvoice(invoiceId);
    const grand =
      Number(i.subtotal || 0) - Number(i.discount_bdt || 0) - refund_total;
    const current_due = Math.max(0, f2(grand - Number(i.paid_amount || 0)));
    if (amount > current_due + 1e-9) {
      await trx.rollback();
      return res
        .status(400)
        .json({ error: true, message: "Amount exceeds remaining due" });
    }

    // Create receipt no
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const start = toStart(`${yyyy}-${mm}-${dd}`);
    const end = toEnd(`${yyyy}-${mm}-${dd}`);
    const [{ cnt }] = await trx("due_payments")
      .where("created_at", ">=", start)
      .andWhere("created_at", "<=", end)
      .count({ cnt: "*" });
    const seq = String(Number(cnt || 0) + 1).padStart(4, "0");
    const receipt_no = `REC-${yyyy}${mm}${dd}-${seq}`;

    const [payment_id] = await trx("due_payments").insert({
      invoice_id: invoiceId,
      amount: f2(amount),
      note: note || null,
      receipt_no,
    });

    await trx("invoices")
      .where({ id: invoiceId })
      .increment("paid_amount", f2(amount));

    await trx.commit();

    // Build receipt payload
    const i2 = await knex({ i: "invoices" })
      .leftJoin({ c: "customers" }, "c.id", "i.customer_id")
      .where("i.id", invoiceId)
      .first(
        "i.*",
        "c.name as customer_name",
        "c.phone as customer_phone",
        "c.address as customer_address"
      );
    const payment = await knex("due_payments")
      .where({ id: payment_id })
      .first();

    // Recompute remaining after payment
    const refund_after = await refundsSumForInvoice(invoiceId);
    const grand_after =
      Number(i2.subtotal || 0) - Number(i2.discount_bdt || 0) - refund_after;
    const remaining_after = Math.max(
      0,
      f2(grand_after - Number(i2.paid_amount || 0))
    );

    res.json({
      success: true,
      data: {
        receipt: payment,
        invoice: i2,
        remaining_after,
      },
    });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
}
