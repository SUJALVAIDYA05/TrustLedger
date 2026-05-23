import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";

/**
 * Deposits funds into the escrow wallet for a project and locks funds per milestone.
 * All operations are atomic within a single transaction to prevent partial state.
 * @param req - Express request with projectId in params and amount in body
 * @param res - Express response
 * @throws {AppError} 404 if project not found
 * @throws {AppError} 403 if not the project client
 * @throws {AppError} 422 if project status doesn't allow deposits or has no milestones
 */
export const depositEscrow = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const { amount } = req.body;
  const userId = req.user!.userId;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { escrowWallet: true, milestones: { orderBy: { sequenceOrder: "asc" } } },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.clientId !== userId) {
    throw new AppError("You do not have permission to deposit into this escrow", 403);
  }

  if (project.status !== "AWAITING_DEPOSIT" && project.status !== "CONTRACT_REVIEW" && project.status !== "DRAFT") {
    throw new AppError("Project is not ready for escrow deposit", 422);
  }

  if (!project.milestones.length) {
    throw new AppError("Project has no milestones to fund", 422);
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let walletId = project.escrowWallet?.id;
    if (!walletId) {
      const newWallet = await tx.escrowWallet.create({
        data: { projectId: projectId },
      });
      walletId = newWallet.id;
    }

    await tx.walletLedger.create({
      data: {
        walletId,
        entryType: "DEPOSIT",
        amount,
        direction: "CREDIT",
        actorId: userId,
        milestoneId: null,
        memo: "Escrow deposit",
      },
    });

    await tx.escrowWallet.update({
      where: { id: walletId },
      data: { totalDeposited: { increment: amount } },
    });

    for (const m of project.milestones) {
      await tx.walletLedger.create({
        data: {
          walletId,
          entryType: "MILESTONE_LOCK",
          amount: Number(m.amount),
          direction: "DEBIT",
          actorId: userId,
          milestoneId: m.id,
          memo: `Funds locked for milestone: ${m.title}`,
        },
      });
    }

    await tx.project.update({
      where: { id: projectId },
      data: { status: "ACTIVE" },
    });

    return tx.escrowWallet.findUnique({
      where: { id: walletId },
    });
  });

  const newBalance = result!.totalDeposited.minus(result!.totalReleased).toString();

  res.status(201).json({
    success: true,
    data: { newBalance },
  });
};

/**
 * Retrieves the wallet ledger entries for a project's escrow wallet.
 * @param req - Express request with projectId in params
 * @param res - Express response
 * @throws {AppError} 404 if project or wallet not found
 * @throws {AppError} 403 if user is not part of the project
 */
export const getLedger = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const userId = req.user!.userId;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { escrowWallet: true },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new AppError("Not authorized to view this project's ledger", 403);
  }

  if (!project.escrowWallet) {
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const ledger = await prisma.walletLedger.findMany({
    where: { walletId: project.escrowWallet.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { displayName: true } } },
  });

  res.status(200).json({ success: true, data: ledger });
};
