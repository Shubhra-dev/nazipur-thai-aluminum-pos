import knex from "../db/knex.js";

/**
 * GET /api/products?q=&page=&page_size=
 * - q: filters by product name OR variant SKU (case-insensitive)
 * - pagination based on distinct products
 * Returns:
 * { success, data: [...], pagination: { page, page_size, total } }
 */
export async function listProducts(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      50,
      Math.max(6, Number(req.query.page_size || 12))
    );
    const q = (req.query.q || "").trim();

    // Base with LEFT JOIN to count active variants and sum on_hand
    const base = knex({ p: "products" })
      .where("p.active", 1)
      .leftJoin({ v: "variants" }, function () {
        this.on("v.product_id", "p.id").andOn("v.active", knex.raw("1"));
      })
      .modify((qb) => {
        if (q) {
          qb.andWhere((w) =>
            w.whereILike("p.name", `%${q}%`).orWhereILike("v.sku", `%${q}%`)
          );
        }
      });

    // Total distinct products for pagination
    const [{ cnt }] = await base
      .clone()
      .clearSelect()
      .countDistinct({ cnt: "p.id" });

    // Page of aggregated products
    const rows = await base
      .clone()
      .groupBy("p.id", "p.name", "p.type", "p.category", "p.active")
      .select(
        "p.id",
        "p.name",
        "p.type",
        "p.category",
        "p.active",
        knex.raw("COUNT(v.id) AS variant_count"),
        knex.raw("COALESCE(SUM(v.on_hand),0) AS stock_total")
      )
      .orderBy("p.name", "asc")
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

// GET /api/products/:id
export async function getProductWithVariants(req, res, next) {
  try {
    const { id } = req.params;

    const product = await knex("products").where({ id }).first();
    if (!product)
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });

    const variants = await knex("variants")
      .where("variants.product_id", id)
      .select("variants.*")
      .orderBy([
        { column: "active", order: "desc" },
        { column: "id", order: "asc" },
      ]);

    res.json({ success: true, data: { product, variants } });
  } catch (err) {
    next(err);
  }
}

// POST /api/products
export async function createProduct(req, res, next) {
  try {
    const { name, type, category } = req.body;
    if (!name || !type) {
      return res
        .status(400)
        .json({ error: true, message: "name and type are required" });
    }
    const [id] = await knex("products").insert({
      name,
      type,
      category: category || type,
      active: 1,
    });
    const product = await knex("products").where({ id }).first();
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id (soft)
export async function softDeleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await knex("products").where({ id }).update({ active: 0 });
    await knex("variants").where({ product_id: id }).update({ active: 0 });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}
