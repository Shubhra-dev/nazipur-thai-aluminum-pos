import { Router } from "express";
import { searchVariants } from "../controllers/searchController.js";

const router = Router();

/**
 * Mounted at /api
 * GET /api/search/variants?q=5mm  (by product name / variant / SKU)
 */
router.get("/search/variants", searchVariants);

export default router;
