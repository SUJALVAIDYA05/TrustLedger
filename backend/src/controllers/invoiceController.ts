import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { generateInvoicePdf } from "../services/invoice/generator";
import { AppError } from "../lib/AppError";
import { asyncHandler } from "../middleware/asyncHandler";

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: true,
      client: true,
      freelancer: true,
    },
  });

  if (!project) throw new AppError("Project not found", 404);

  const userId = req.user!.userId;
  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new AppError("Access denied", 403);
  }

  const allReleased = project.milestones.every((m) => m.status === "FUNDS_RELEASED");
  if (!allReleased) {
    throw new AppError("Cannot generate invoice until all milestones are released", 422);
  }

  // Idempotent: if invoice already exists, return it
  const existing = await prisma.invoice.findFirst({ where: { projectId } });
  const invoice =
    existing ??
    (await prisma.invoice.create({
      data: {
        projectId,
        invoiceNumber: `TB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        totalAmount: project.totalBudget,
        metadata: {
          amount: project.totalBudget,
          client: project.client.displayName,
          freelancer: project.freelancer?.displayName,
          milestones: project.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            approvedAt: m.approvedAt,
            amount: m.amount,
          })),
        },
      },
    }));

  const invoicePdfBase64 = await generateInvoicePdf(invoice.invoiceNumber, invoice.metadata);

  res.status(201).json({
    success: true,
    data: { invoice, pdfPayload: invoicePdfBase64 },
  });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const userId = req.user!.userId;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, freelancerId: true },
  });
  if (!project) throw new AppError("Project not found", 404);
  if (project.clientId !== userId && project.freelancerId !== userId) throw new AppError("Access denied", 403);

  const invoice = await prisma.invoice.findFirst({ where: { projectId } });
  if (!invoice) throw new AppError("Invoice not found", 404);

  res.status(200).json({ success: true, data: invoice });
});
