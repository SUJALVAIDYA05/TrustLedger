import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { Prisma } from "@prisma/client";

export const getOpenProjects = async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    where: {
      freelancerId: null,
      status: { in: ["DRAFT", "CONTRACT_REVIEW", "AWAITING_DEPOSIT", "ACTIVE"] },
    },
    include: { client: { select: { displayName: true } }, milestones: true },
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json({ success: true, data: projects });
};

export const applyToProject = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const userId = req.user!.userId;
  const role = req.user!.role;

  if (role !== "FREELANCER") throw new AppError("Only freelancers can apply", 403);

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Project not found", 404);
  if (project.freelancerId) throw new AppError("Project already has a freelancer", 422);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { freelancerId: userId, status: "CONTRACT_REVIEW" },
    include: { milestones: true, escrowWallet: true, client: true, freelancer: true },
  });

  await prisma.notification.create({
    data: {
      userId: project.clientId,
      title: "Freelancer Applied",
      body: `A freelancer has applied to your project "${project.title}".`,
      type: "FREELANCER_APPLIED",
      linkPath: `/projects/${projectId}`,
    },
  });

  res.status(200).json({ success: true, data: updated });
};

export const getMyProjects = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  const projects = await prisma.project.findMany({
    where: role === "CLIENT" ? { clientId: userId } : { freelancerId: userId },
    include: { milestones: true, escrowWallet: true },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ success: true, data: projects });
};

export const getProject = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { milestones: { orderBy: { sequenceOrder: "asc" } }, escrowWallet: true, client: true, freelancer: true, contract: true },
  });

  if (!project) throw new AppError("Project not found", 404);
  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new AppError("Access denied", 403);
  }

  res.status(200).json({ success: true, data: project });
};

export const createProject = async (req: Request, res: Response) => {
  const { title, description, totalBudget, deadline } = req.body;
  const userId = req.user!.userId;
  const role = req.user!.role;

  if (role !== "CLIENT") throw new AppError("Only clients can create projects", 403);

  const project = await prisma.project.create({
    data: {
      title,
      description,
      totalBudget,
      deadline: new Date(deadline),
      clientId: userId,
      status: "DRAFT",
    },
  });

  res.status(201).json({ success: true, data: project });
};

export const linkFreelancer = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const { email } = req.body;

  const freelancer = await prisma.user.findUnique({ where: { email } });
  if (!freelancer || freelancer.role !== "FREELANCER") {
    throw new AppError("Freelancer not found", 404);
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      freelancerId: freelancer.id,
      status: "CONTRACT_REVIEW",
    },
  });

  res.status(200).json({ success: true, data: project });
};

/**
 * Persist AI-generated milestones to the project.
 * Side effects: overwrites existing milestones for the project (prototype behavior).
 */
export const persistMilestones = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const userId = req.user!.userId;
  const { milestones } = req.body as {
    milestones: {
      title: string;
      description: string;
      budgetPercent: number;
      estimatedDays: number;
      verificationCriteria: string;
    }[];
  };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { milestones: true },
  });
  if (!project) throw new AppError("Project not found", 404);
  if (project.clientId !== userId) throw new AppError("Access denied", 403);

  const sum = milestones.reduce((acc, m) => acc + m.budgetPercent, 0);
  if (sum !== 100) throw new AppError("Milestone budgetPercent must sum to 100", 422);

  const totalBudget = new Prisma.Decimal(project.totalBudget);

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.milestone.deleteMany({ where: { projectId } });

    const created = await Promise.all(
      milestones.map((m, idx) => {
        const amount = totalBudget.mul(m.budgetPercent).div(100);
        return tx.milestone.create({
          data: {
            projectId,
            title: m.title,
            description: m.description,
            budgetPercent: m.budgetPercent,
            amount,
            estimatedDays: m.estimatedDays,
            verificationCriteria: m.verificationCriteria,
            sequenceOrder: idx + 1,
            status: "PENDING",
          },
        });
      })
    );

    const proj = await tx.project.update({
      where: { id: projectId },
      data: { status: "CONTRACT_REVIEW" },
      include: { milestones: { orderBy: { sequenceOrder: "asc" } } },
    });

    return { project: proj, milestones: created };
  });

  res.status(200).json({ success: true, data: updated.project });
};

/**
 * Create or replace the cached contract clauses for a project.
 */
export const upsertContract = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const userId = req.user!.userId;
  const { clauses } = req.body as { clauses: { title: string; body: string }[] };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Project not found", 404);
  if (project.clientId !== userId) throw new AppError("Access denied", 403);

  const contract = await prisma.contract.upsert({
    where: { projectId },
    create: { projectId, clauses },
    update: { clauses },
  });

  res.status(200).json({ success: true, data: contract });
};

/**
 * Sign a contract for the project as the current user.
 * When both parties have signed, project moves to AWAITING_DEPOSIT.
 */
export const signContract = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const userId = req.user!.userId;
  const { ipHash } = req.body as { ipHash: string };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { contract: { include: { signatures: true } }, escrowWallet: true, milestones: true },
  });
  if (!project) throw new AppError("Project not found", 404);
  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new AppError("Access denied", 403);
  }

  let contractId = project.contract?.id;
  if (!contractId) {
    const clauses = project.milestones.map((m) => ({
      title: m.title,
      body: `Complete ${m.title}. Verification criteria: ${m.verificationCriteria || "Client approval"} for ${m.amount}.`,
    }));
    const created = await prisma.contract.create({
      data: { projectId, clauses },
    });
    contractId = created.id;
  }

  await prisma.contractSignature.upsert({
    where: { contractId_userId: { contractId, userId } },
    create: { contractId, userId, ipHash },
    update: { ipHash },
  });

  const sigs = await prisma.contractSignature.findMany({
    where: { contractId },
    select: { userId: true },
  });

  const signedClient = sigs.some((s) => s.userId === project.clientId);
  const signedFreelancer = project.freelancerId
    ? sigs.some((s) => s.userId === project.freelancerId)
    : false;

  const isFunded = project.escrowWallet && Number(project.escrowWallet.totalDeposited) >= Number(project.totalBudget);
  const updatedProject =
    signedClient && signedFreelancer
      ? await prisma.project.update({
          where: { id: projectId },
          data: { status: isFunded ? "ACTIVE" : "AWAITING_DEPOSIT" },
          include: { milestones: { orderBy: { sequenceOrder: "asc" } }, escrowWallet: true, client: true, freelancer: true },
        })
      : await prisma.project.findUniqueOrThrow({
          where: { id: projectId },
          include: { milestones: { orderBy: { sequenceOrder: "asc" } }, escrowWallet: true, client: true, freelancer: true },
        });

  res.status(200).json({ success: true, data: updatedProject });
};
