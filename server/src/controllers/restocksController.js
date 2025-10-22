import knex from "../db/knex.js";

/**
 * POST /api/restocks
 * POST /api/products/:id/restocks (alias)
 * Body:
 *   { variant_id (req), qty_base (req, +/-), note?, cost_per_unit? }
 * Effects:
 *   - updates variants.on_hand by qty_base
 *   - inserts a row in restocks (cost_per_unit coerced to 0.00 if missing)
 */
export async function createRestock(req, res, next) {
  try {
    const { variant_id, qty_base, note, cost_per_unit } = req.body;

    if (!variant_id || qty_base === undefined || qty_base === null) {
      return res
        .status(400)
        .json({ error: true, message: "variant_id and qty_base are required" });
    }

    const v = await knex("variants").where({ id: variant_id }).first();
    if (!v)
      return res
        .status(404)
        .json({ error: true, message: "Variant not found" });

    const delta = Number(qty_base);
    if (Number.isNaN(delta)) {
      return res
        .status(400)
        .json({ error: true, message: "qty_base must be a number" });
    }

    // Coerce cost to a safe DECIMAL(12,2)
    const cost =
      cost_per_unit === undefined ||
      cost_per_unit === null ||
      cost_per_unit === ""
        ? 0
        : Number(cost_per_unit);

    await knex.transaction(async (trx) => {
      // update stock
      await trx("variants")
        .where({ id: variant_id })
        .update({ on_hand: knex.raw("on_hand + ?", [delta]) });

      // insert restock row
      await trx("restocks").insert({
        variant_id,
        qty_base: delta,
        note: note || null,
        cost_per_unit: cost, // ✅ never NULL
        created_at: knex.fn.now(),
      });
    });

    const updated = await knex("variants").where({ id: variant_id }).first();
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/restocks
 * Optional query: product_id
 */
export async function listRestocks(req, res, next) {
  try {
    const { product_id } = req.query;

    let q = knex({ r: "restocks" })
      .join({ v: "variants" }, "v.id", "r.variant_id")
      .join({ p: "products" }, "p.id", "v.product_id")
      .modify((qb) => {
        if (product_id) qb.where("v.product_id", product_id);
      })
      .select(
        "r.id",
        "r.variant_id",
        "v.sku",
        "v.size_label",
        "v.color",
        "v.thickness_mm",
        "p.name as product_name",
        "p.type as product_type",
        "r.qty_base",
        "r.cost_per_unit",
        "r.note",
        "r.created_at"
      )
      .orderBy("r.id", "desc")
      .limit(200);

    const rows = await q;
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id/restocks
 */
export async function listRestocksByProduct(req, res, next) {
  try {
    const product_id = Number(req.params.id);
    const rows = await knex({ r: "restocks" })
      .join({ v: "variants" }, "v.id", "r.variant_id")
      .join({ p: "products" }, "p.id", "v.product_id")
      .where("p.id", product_id)
      .select(
        "r.id",
        "r.variant_id",
        "v.sku",
        "v.size_label",
        "v.color",
        "v.thickness_mm",
        "p.name as product_name",
        "p.type as product_type",
        "r.qty_base",
        "r.cost_per_unit",
        "r.note",
        "r.created_at"
      )
      .orderBy("r.id", "desc")
      .limit(200);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}
