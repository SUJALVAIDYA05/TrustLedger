import { Router } from "express";
import { depositEscrow, getLedger } from "../controllers/escrowController";
import { validateBody } from "../middleware/validate";
import { authenticate, authorizeRole } from "../middleware/auth";
import { depositSchema } from "../types/schemas";

const router = Router({ mergeParams: true });

router.post(
  "/:projectId/deposit",
  authenticate,
  authorizeRole("CLIENT"),
  validateBody(depositSchema),
  depositEscrow
);

router.get(
  "/:projectId/ledger",
  authenticate,
  getLedger
);

export { router as escrowRouter };
