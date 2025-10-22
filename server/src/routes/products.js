import { Router } from "express";
import {
  listProducts,
  getProductWithVariants,
  createProduct,
  softDeleteProduct,
} from "../controllers/productsController.js";

const router = Router();

// GET /api/products
router.get("/products", listProducts);

// GET /api/products/:id
router.get("/products/:id", getProductWithVariants);

// POST /api/products
router.post("/products", createProduct);

// DELETE /api/products/:id (soft delete product + its variants)
router.delete("/products/:id", softDeleteProduct);

export default router;
