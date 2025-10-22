import { Router } from "express";
import knex from "../db/knex.js";

const router = Router();
const VARIANTS = "variants";
const PRODUCTS = "products";

router.get("/", async (req, res) => {
  const rows = await knex({ v: VARIANTS })
    .leftJoin({ p: PRODUCTS }, "p.id", "v.product_id")
    .where("v.active", 1)
    .andWhere("p.active", 1)
    .andWhereRaw("v.on_hand <= v.low_stock_threshold")
    .select(
      "v.id",
      "v.product_id",
      "v.sku",
      "v.size_label",
      "v.thickness_mm",
      "v.width_in",
      "v.height_in",
      "v.color",
      "v.rod_length_ft",
      "v.pipe_length_ft",
      "v.on_hand",
      "v.low_stock_threshold",
      "p.name as product_name",
      "p.type as product_type"
    )
    .orderBy([
      { column: "p.name", order: "asc" },
      { column: "v.id", order: "asc" },
    ]);

  res.json({ success: true, data: rows });
});

export default router;
