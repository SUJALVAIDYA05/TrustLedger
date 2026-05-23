import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createInvoice, getInvoice } from "../controllers/invoiceController";

const router = Router();

router.post(
  "/:projectId",
  authenticate,
  createInvoice
);

router.get(
  "/:projectId",
  authenticate,
  getInvoice
);

export { router as invoiceRouter };
