import { Router } from "express";
import {
  createRestock,
  listRestocks,
  listRestocksByProduct,
} from "../controllers/restocksController.js";

const router = Router();

/**
 * Mounted at /api
 * Aliases provided so older/newer frontends both work:
 *   POST /api/restocks
 *   POST /api/products/:id/restocks
 *   GET  /api/restocks
 *   GET  /api/products/:id/restocks
 */

router.post("/restocks", createRestock);
router.post("/products/:id/restocks", createRestock);

router.get("/restocks", listRestocks);
router.get("/products/:id/restocks", listRestocksByProduct);

export default router;
