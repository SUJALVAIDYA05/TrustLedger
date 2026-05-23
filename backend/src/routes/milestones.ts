import { Router } from "express";
import { authenticate, authorizeRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { submitMilestoneSchema } from "../types/schemas";
import { submitMilestone, reviewMilestone, approveMilestone } from "../controllers/milestoneController";

const router = Router({ mergeParams: true });

// Endpoint handles FSM Submissions
router.post(
  "/:id/submit",
  authenticate,
  authorizeRole("FREELANCER"),
  validateBody(submitMilestoneSchema),
  submitMilestone
);

// Review triggered implicitly initially, or manually by client
router.post(
  "/:id/review",
  authenticate,
  authorizeRole("CLIENT"),
  reviewMilestone
);

// Release triggers processEscrowEvent automatically
router.post(
  "/:id/release",
  authenticate,
  authorizeRole("CLIENT"),
  approveMilestone
);

export { router as milestoneRouter };
