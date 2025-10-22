import { Router } from "express";
import {
  profitList,
  profitDetail,
  salesSummary,
  salesDaily,
  salesByProduct,
  salesByCustomer,
} from "../controllers/reportsController.js";

const router = Router();

/** Profit endpoints (adjusted for returns) */
router.get("/reports/profit", profitList);
router.get("/reports/profit/:invoiceId", profitDetail);

/** Sales reporting endpoints (with returns columns) */
router.get("/reports/sales/summary", salesSummary);
router.get("/reports/sales/daily", salesDaily);
router.get("/reports/sales/by-product", salesByProduct);
/** Optional */
router.get("/reports/sales/by-customer", salesByCustomer);

export default router;
