import { Router } from "express";
import {
  findOrCreateByPhone,
  searchCustomers,
} from "../controllers/customersController.js";

const router = Router();

/**
 * Mounted at /api
 * POST /api/customers/find-or-create   { name?, phone, address? }
 * GET  /api/customers/search?q=017...
 */
router.post("/customers/find-or-create", findOrCreateByPhone);
router.get("/customers/search", searchCustomers);

export default router;
