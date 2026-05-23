export type UserRole = "CLIENT" | "FREELANCER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  upiHandle?: string | null;
}

export type MilestoneStatus = "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "FUNDS_RELEASED" | "DISPUTED";
export type ProjectStatus =
  | "DRAFT"
  | "CONTRACT_REVIEW"
  | "AWAITING_DEPOSIT"
  | "ACTIVE"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

export interface EscrowWallet {
  id?: string;
  totalDeposited: number;
  totalReleased: number;
  totalRefunded: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  estimatedDays: number;
  approvedAt?: Date | string | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  totalBudget: number;
  status: ProjectStatus;
  clientId: string;
  freelancerId?: string | null;
  milestones?: Milestone[];
  escrowWallet?: EscrowWallet | null;
  client?: { displayName: string; upiHandle?: string | null } | null;
  freelancer?: { displayName: string; upiHandle?: string | null } | null;
  contract?: { id: string } | null;
}
