import { Router } from "express";
import { raiseDispute, getDispute, generateAiSummary, resolveDispute } from "../controllers/disputeController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { raiseDisputeSchema, resolveDisputeSchema } from "../types/schemas";

const router = Router();

router.post(
  "/",
  authenticate,
  validateBody(raiseDisputeSchema),
  raiseDispute
);

router.get(
  "/:id",
  authenticate,
  getDispute
);

router.post(
  "/:id/ai-summary",
  authenticate,
  generateAiSummary
);

router.post(
  "/:id/resolve",
  authenticate,
  validateBody(resolveDisputeSchema),
  resolveDispute
);

export { router as disputeRouter };
