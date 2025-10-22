import { Router } from "express";
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
} from "../controllers/invoicesController.js";

const router = Router();

// GET /api/invoices
router.get("/invoices", listInvoices);

// GET /api/invoices/:id
router.get("/invoices/:id", getInvoiceById);

// POST /api/invoices
router.post("/invoices", createInvoice);

export default router;
