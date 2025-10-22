import knex from "../db/knex.js";

/**
 * Search by product name, variant label/color/thickness, or exact/partial SKU.
 * Returns top 30 active variants with product info and on_hand.
 */
export async function searchVariants(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ success: true, data: [] });

    const rows = await knex({ v: "variants" })
      .join({ p: "products" }, "p.id", "v.product_id")
      .where("p.active", 1)
      .andWhere("v.active", 1)
      .andWhere((qb) => {
        qb.whereILike("p.name", `%${q}%`)
          .orWhereILike("v.size_label", `%${q}%`)
          .orWhereILike("v.color", `%${q}%`)
          .orWhereILike("v.sku", `%${q}%`)
          .orWhereILike("v.group_name", `%${q}%`)
          .orWhereRaw("CAST(v.thickness_mm AS CHAR) LIKE ?", [`%${q}%`]);
      })
      .select(
        "v.*",
        "p.name as product_name",
        "p.type as product_type",
        "p.category as product_category"
      )
      .orderBy("p.name", "asc")
      .orderBy("v.sku", "asc")
      .limit(30);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}
