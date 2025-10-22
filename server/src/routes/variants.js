import { Router } from "express";
import {
  createVariant,
  updateVariant,
  softDeleteVariant,
  restoreVariant,
} from "../controllers/variantsController.js";
import knex from "../db/knex.js";

const router = Router();

router.post("/products/:id/variants", createVariant);
router.put("/products/:id/variants/:variantId", updateVariant);
router.delete("/products/:id/variants/:variantId", softDeleteVariant);
router.post("/products/:id/variants/:variantId/restore", restoreVariant);

// Low stock (compat paths)
async function lowStockHandler(_req, res, next) {
  try {
    const rows = await knex({ v: "variants" })
      .join({ p: "products" }, "p.id", "v.product_id")
      .where("v.active", 1)
      .andWhereRaw("COALESCE(v.low_stock_threshold, 0) > 0")
      .andWhereRaw("COALESCE(v.on_hand, 0) <= v.low_stock_threshold")
      .select(
        "v.id as variant_id",
        "v.sku",
        "v.size_label",
        "v.color",
        "v.thickness_mm",
        "v.rod_length_ft",
        "v.pipe_length_ft",
        "v.on_hand",
        "v.low_stock_threshold",
        "p.id as product_id",
        "p.name as product_name",
        "p.type as product_type",
        "p.category as product_category"
      )
      .orderBy("p.name", "asc")
      .orderBy("v.sku", "asc");

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

router.get("/low-stock", lowStockHandler);
router.get("/variants/low-stock", lowStockHandler);

export default router;
