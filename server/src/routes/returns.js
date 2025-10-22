import { Router } from "express";
import {
  prepareInvoiceReturnInfo,
  createReturn,
  listReturns,
  getReturnById,
} from "../controllers/returnsController.js";

const router = Router();

// Prepare invoice + items with already returned base qty
router.get("/returns/prepare/:invoiceId", prepareInvoiceReturnInfo);

// Create a return (now supports editable line refund and invoice discount update)
router.post("/returns", createReturn);

// Returns list
router.get("/returns", listReturns);

// Single return detail
router.get("/returns/:id", getReturnById);

export default router;
