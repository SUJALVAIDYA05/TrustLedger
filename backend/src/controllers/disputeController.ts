import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { Prisma } from "@prisma/client";
import { generateDisputeSummary, type DisputeSummary } from "../services/gemini/disputeSummarizer";
import { notify } from "../services/notifications/notifier";
import { asyncHandler } from "../middleware/asyncHandler";

/**
 * Raises a dispute on a milestone. Both freelancer and client can raise disputes.
 * @param req - Express request with projectId, milestoneId, and reason in body
 * @param res - Express response
 * @throws {AppError} 400 if required fields are missing
 * @throws {AppError} 404 if milestone not found
 * @throws {AppError} 403 if user is not part of the project
 * @throws {AppError} 422 if milestone already has released funds
 */
export const raiseDispute = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, milestoneId, reason } = req.body as { projectId?: string; milestoneId?: string; reason?: string };
  
  if (!projectId || !milestoneId || !reason) {
    throw new AppError("Missing required fields: projectId, milestoneId, and reason are required", 400);
  }
  if (reason.length < 10) {
    throw new AppError("Reason must be at least 10 characters", 422);
  }
  
  const userId = req.user!.userId;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });

  if (!milestone) throw new AppError("Milestone not found", 404);

  if (milestone.project.clientId !== userId && milestone.project.freelancerId !== userId) {
    throw new AppError("Not authorized to raise a dispute on this project", 403);
  }

  if (milestone.status === "FUNDS_RELEASED" || milestone.status === "APPROVED") {
    throw new AppError("Cannot reverse approved milestones", 422);
  }

  const dispute = await prisma.dispute.create({
    data: {
      projectId,
      milestoneId,
      raisedByUserId: userId,
      reason,
      status: "OPEN",
    },
  });

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: "DISPUTED" },
  });

  const otherUserId =
    milestone.project.clientId === userId ? milestone.project.freelancerId : milestone.project.clientId;
  if (otherUserId) {
    await notify({
      userId: otherUserId,
      title: "Dispute Raised",
      body: `A dispute was raised on milestone: "${milestone.title}".`,
      type: "DISPUTE_RAISED",
      linkPath: `/projects/${projectId}`,
    });
  }

  res.status(201).json({ success: true, data: dispute });
});

/**
 * Retrieves a single dispute with all messages.
 * @param req - Express request with dispute ID in params
 * @param res - Express response
 * @throws {AppError} 404 if dispute not found
 * @throws {AppError} 403 if user is not part of the project
 */
export const getDispute = asyncHandler(async (req: Request, res: Response) => {
  const disputeId = req.params.id as string;
  const userId = req.user!.userId;

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      project: true,
      milestone: true,
      messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dispute) throw new AppError("Dispute not found", 404);
  if (dispute.project.clientId !== userId && dispute.project.freelancerId !== userId) {
    throw new AppError("Access denied", 403);
  }

  res.status(200).json({ success: true, data: dispute });
});

/**
 * Generates an AI-mediated summary of the dispute chat and proposes a resolution.
 * @param req - Express request with dispute ID in params
 * @param res - Express response
 * @throws {AppError} 404 if dispute not found
 * @throws {AppError} 403 if user is not part of the project
 * @throws {AppError} 422 if no messages exist to summarize
 */
export const generateAiSummary = asyncHandler(async (req: Request, res: Response) => {
  const disputeId = req.params.id as string;
  const userId = req.user!.userId;

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { project: true, messages: { include: { sender: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!dispute) throw new AppError("Dispute not found", 404);
  if (dispute.project.clientId !== userId && dispute.project.freelancerId !== userId) {
    throw new AppError("Access denied", 403);
  }

  const chatLog = dispute.messages
    .map((m) => `${m.sender.role}: ${m.body}`)
    .join("\n")
    .slice(0, 4000);

  if (!chatLog.trim()) throw new AppError("No messages to summarize", 422);

  const summary = await generateDisputeSummary(chatLog);
  const freelancerPct = Number(summary?.suggestedSplit?.freelancer ?? 50);
  const clientPct = Number(summary?.suggestedSplit?.client ?? 50);

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      aiSummary: summary as unknown as Prisma.InputJsonValue,
      proposedFreelancerPct: freelancerPct,
      proposedClientPct: clientPct,
      status: "IN_MEDIATION",
    },
  });

  res.status(200).json({ success: true, data: updated });
});

/**
 * Resolves a dispute by splitting the milestone funds between freelancer and client.
 * @param req - Express request with dispute ID and split percentages
 * @param res - Express response
 * @throws {AppError} 422 if split doesn't sum to 100
 * @throws {AppError} 404 if dispute not found
 * @throws {AppError} 403 if user is not part of the project
 * @throws {AppError} 422 if dispute already resolved
 */
export const resolveDispute = asyncHandler(async (req: Request, res: Response) => {
  const disputeId = req.params.id as string;
  const userId = req.user!.userId;
  const { freelancerPct, clientPct } = req.body as { freelancerPct: number; clientPct: number };

  if (freelancerPct + clientPct !== 100) throw new AppError("Split must sum to 100", 422);

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { project: { include: { escrowWallet: true } }, milestone: true },
  });
  if (!dispute) throw new AppError("Dispute not found", 404);
  if (dispute.project.clientId !== userId && dispute.project.freelancerId !== userId) {
    throw new AppError("Access denied", 403);
  }
  if (dispute.status === "RESOLVED") throw new AppError("Dispute already resolved", 422);

  const walletId = dispute.project.escrowWallet?.id;
  if (!walletId) throw new AppError("Project has no escrow wallet", 422);

  const amount = Number(dispute.milestone.amount);
  const freelancerAmount = (amount * freelancerPct) / 100;
  const clientAmount = (amount * clientPct) / 100;

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const wallet = await tx.escrowWallet.findUniqueOrThrow({
      where: { id: walletId },
    });

    const balance = wallet.totalDeposited.minus(wallet.totalReleased).minus(wallet.totalRefunded);

    if (freelancerAmount > 0) {
      if (balance.lessThan(freelancerAmount)) {
        throw new AppError("Insufficient escrow balance to release funds", 422);
      }

      await tx.walletLedger.create({
        data: {
          walletId,
          entryType: "DISPUTE_RESOLVE",
          amount: freelancerAmount,
          direction: "DEBIT",
          actorId: userId,
          milestoneId: dispute.milestoneId,
          memo: `Dispute resolved: ${freelancerPct}% to freelancer`,
        },
      });

      await tx.escrowWallet.update({
        where: { id: walletId },
        data: { totalReleased: { increment: freelancerAmount } },
      });
    }

    if (clientAmount > 0) {
      if (balance.lessThan(clientAmount)) {
        throw new AppError("Insufficient escrow balance for refund", 422);
      }

      await tx.walletLedger.create({
        data: {
          walletId,
          entryType: "DISPUTE_RESOLVE",
          amount: clientAmount,
          direction: "DEBIT",
          actorId: userId,
          milestoneId: dispute.milestoneId,
          memo: `Dispute resolved: ${clientPct}% refunded to client`,
        },
      });

      await tx.escrowWallet.update({
        where: { id: walletId },
        data: { totalRefunded: { increment: clientAmount } },
      });
    }

    const d = await tx.dispute.update({
      where: { id: disputeId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    if (freelancerAmount > 0) {
      await tx.milestone.update({
        where: { id: dispute.milestoneId },
        data: { status: "FUNDS_RELEASED", approvedAt: new Date() },
      });
    }

    return d;
  });

  if (dispute.project.clientId) {
    await notify({
      userId: dispute.project.clientId,
      title: "Dispute Resolved",
      body: "A dispute was resolved and funds were distributed.",
      type: "DISPUTE_RESOLVED",
      linkPath: `/projects/${dispute.projectId}`,
    });
  }
  if (dispute.project.freelancerId) {
    await notify({
      userId: dispute.project.freelancerId,
      title: "Dispute Resolved",
      body: "A dispute was resolved and funds were distributed.",
      type: "DISPUTE_RESOLVED",
      linkPath: `/projects/${dispute.projectId}`,
    });
  }

  res.status(200).json({ success: true, data: updated });
});
