import { Router } from "express";
import { authenticate, authorizeRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getMyProjects,
  getProject,
  getOpenProjects,
  createProject,
  linkFreelancer,
  applyToProject,
  persistMilestones,
  upsertContract,
  signContract,
} from "../controllers/projectController";
import { createContractSchema, persistMilestonesSchema, signContractSchema } from "../types/schemas";

const router = Router();

router.get("/", authenticate, getMyProjects);
router.get("/open", authenticate, authorizeRole("FREELANCER"), getOpenProjects);
router.get("/:id", authenticate, getProject);
router.post("/", authenticate, authorizeRole("CLIENT"), createProject);
router.post("/:projectId/apply", authenticate, authorizeRole("FREELANCER"), applyToProject);
router.post("/:projectId/link", authenticate, authorizeRole("CLIENT"), linkFreelancer);

router.post(
  "/:projectId/milestones",
  authenticate,
  authorizeRole("CLIENT"),
  validateBody(persistMilestonesSchema),
  persistMilestones
);

router.post(
  "/:projectId/contract",
  authenticate,
  authorizeRole("CLIENT"),
  validateBody(createContractSchema),
  upsertContract
);

router.post(
  "/:projectId/sign",
  authenticate,
  validateBody(signContractSchema),
  signContract
);

export { router as projectRouter };
