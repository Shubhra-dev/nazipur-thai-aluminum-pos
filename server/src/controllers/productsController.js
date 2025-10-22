import knex from "../db/knex.js";

// GET /api/products
export async function listProducts(_req, res, next) {
  try {
    const rows = await knex({ p: "products" })
      .where("p.active", 1)
      .leftJoin({ v: "variants" }, function () {
        this.on("v.product_id", "p.id").andOn("v.active", knex.raw("1"));
      })
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
      .orderBy("p.name", "asc");

    res.json({ success: true, data: rows });
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
