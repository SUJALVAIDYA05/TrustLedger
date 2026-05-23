import { z } from "zod";

// --- Auth Schemas ---
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLIENT", "FREELANCER"]),
  displayName: z.string().min(2),
  upiHandle: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// --- Escrow Schemas ---
export const depositSchema = z.object({
  amount: z.coerce.number().positive(),
});

// --- Milestone Schemas ---
export const submitMilestoneSchema = z.object({
  url: z.string().url(),
});

// --- Dispute Schemas ---
export const raiseDisputeSchema = z.object({
  projectId: z.string().cuid(),
  milestoneId: z.string().cuid(),
  reason: z.string().min(10).max(2000),
});

// --- Project lifecycle schemas ---
export const persistMilestonesSchema = z.object({
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        description: z.string().min(1),
        budgetPercent: z.number().int().min(1).max(100),
        estimatedDays: z.number().int().min(1).max(365),
        verificationCriteria: z.string().min(1),
      })
    )
    .min(3)
    .max(5),
});

export const signContractSchema = z.object({
  ipHash: z.string().min(16), // caller should send a hash, not raw IP
});

export const resolveDisputeSchema = z.object({
  freelancerPct: z.number().int().min(0).max(100),
  clientPct: z.number().int().min(0).max(100),
});

export const createContractSchema = z.object({
  clauses: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).min(1),
});
