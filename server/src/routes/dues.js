import { Router } from "express";
import {
  listDues,
  getDueDetail,
  addPayment,
} from "../controllers/duesController.js";

const router = Router();

// List all dues with filters
router.get("/", listDues);

// Single due detail (by invoice id)
router.get("/:invoiceId", getDueDetail);

// Add installment payment
router.post("/:invoiceId/payments", addPayment);

export default router;
