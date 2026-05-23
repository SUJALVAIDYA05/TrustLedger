import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Badge, Alert } from "../components/ui/core";
import { SubmitMilestoneModal } from "../components/SubmitMilestoneModal/SubmitMilestoneModal";
import { useAuthStore } from "../stores/authStore";
import { useApproveMilestone, useReviewMilestone, useSubmitMilestone } from "../api/useMilestones";
import { useProject } from "../api/useProjects";
import { useRaiseDispute } from "../api/useDisputes";
import { useDepositEscrow, useLedger } from "../api/useEscrow";
import { useSignContract } from "../api/useProjects";

const LEDGER_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "bg-green-100 text-green-800",
  RELEASE: "bg-green-100 text-green-800",
  MILESTONE_LOCK: "bg-blue-100 text-blue-800",
  REFUND: "bg-amber-100 text-amber-800",
  DISPUTE_HOLD: "bg-red-100 text-red-800",
  DISPUTE_RESOLVE: "bg-red-100 text-red-800",
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: project, isLoading, error } = useProject(id!);
  const { data: ledger = [], isLoading: ledgerLoading } = useLedger(id || "");

  const [submittingMilestone, setSubmittingMilestone] = useState<{
    id: string;
    title: string;
    amount: number;
    verificationCriteria: string;
  } | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  const isClient = user?.role === "CLIENT";

  const { mutate: approve } = useApproveMilestone(id!);
  const { mutate: review } = useReviewMilestone(id!);
  const { mutate: submit, isPending: isSubmitting } = useSubmitMilestone(id!);
  const { mutateAsync: raiseDispute } = useRaiseDispute(id!);
  const depositEscrow = useDepositEscrow(id!);
  const signContract = useSignContract();

  const handleSubmitDeliverable = async (data: { url: string; notes?: string }) => {
    if (!submittingMilestone) return;
    submit(
      { milestoneId: submittingMilestone.id, url: data.url },
      {
        onSuccess: () => setSubmittingMilestone(null),
      }
    );
  };

  if (isLoading) return <div className="flex justify-center py-20 text-gray-500">Loading project...</div>;
  if (error || !project) return <div className="flex justify-center py-20 text-red-500">Project not found.</div>;

  const deposited = Number(project.escrowWallet?.totalDeposited ?? 0);
  const released = Number(project.escrowWallet?.totalReleased ?? 0);

  return (
    <div className="max-w-6xl mx-auto py-6 lg:py-10 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-1 lg:col-span-8 space-y-6">
          <header className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{project.title}</h1>
              <Badge status={project.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-semibold">
                  {(project as any).client?.displayName?.charAt(0).toUpperCase()}
                </span>
                {(project as any).client?.displayName}
              </span>
              <span className="text-gray-300 hidden sm:inline">→</span>
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-trust-green to-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                  {(project as any).freelancer?.displayName?.charAt(0).toUpperCase() ?? "?"}
                </span>
                {(project as any).freelancer?.displayName ?? "Awaiting freelancer"}
              </span>
            </div>
          </header>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Milestones
            </h2>
            <div className="space-y-4">
              {(project.milestones ?? []).map((m, index) => (
                <Card key={m.id} className="p-5 border border-secondary-100 hover:border-secondary-200 hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-lg">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{m.title}</h3>
                        <p className="text-xl font-bold text-brand-600 mt-0.5">₹{Number(m.amount).toLocaleString()}</p>
                        <div className="mt-2">
                          <Badge status={m.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:ml-auto">
                      {isClient && m.status === "SUBMITTED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const reason =
                                window.prompt("Why are you raising a dispute? (min 10 chars)") ||
                                "Deliverable does not meet the agreed criteria.";
                              const dispute = await raiseDispute({ milestoneId: m.id, reason });
                              navigate(`/projects/${id}/dispute/${dispute.id}`);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Dispute
                          </Button>
                          <Button size="sm" variant="success" onClick={() => approve(m.id)}>
                            Release ₹{Number(m.amount).toLocaleString()}
                          </Button>
                        </>
                      )}
                      {isClient && m.status === "UNDER_REVIEW" && (
                        <Button size="sm" variant="success" onClick={() => approve(m.id)}>
                          Release ₹{Number(m.amount).toLocaleString()}
                        </Button>
                      )}
                      {!isClient && m.status === "PENDING" && (
                        <Button size="sm" variant="primary" onClick={() => setSubmittingMilestone({ 
                          id: m.id, 
                          title: m.title, 
                          amount: Number(m.amount),
                          verificationCriteria: (m as any).verificationCriteria || "Client reviews and approves the deliverable"
                        })}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Submit Deliverable
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-4 space-y-4">
          {(project.status === "CONTRACT_REVIEW" || project.status === "AWAITING_DEPOSIT") && project.contract && (
            <Card className="p-5 border border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Contract</h3>
                  <p className="text-xs text-amber-700">Awaiting signatures</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Both parties must sign before escrow can be deposited.
              </p>
              {signContract.error && (
                <Alert variant="danger" title="Signing failed">
                  {(signContract.error as any)?.response?.data?.error || signContract.error.message || "Please try again"}
                </Alert>
              )}
              <Button
                variant="primary"
                className="w-full shadow-md"
                disabled={signContract.isPending}
                onClick={() =>
                  signContract.mutate(
                    { projectId: id!, ipHash: crypto.randomUUID().replace(/-/g, "") }
                  )
                }
              >
                {signContract.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing...
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Sign Contract
                  </>
                )}
              </Button>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Escrow Wallet</h3>
                <p className="text-xs text-gray-500">Secured funds</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl">
                <span className="text-sm text-gray-600">Total Deposited</span>
                <span className="font-bold text-gray-900">₹{deposited.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                <span className="text-sm text-gray-600">Funds Released</span>
                <span className="font-bold text-emerald-600">₹{released.toLocaleString()}</span>
              </div>
              {deposited > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-secondary-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-brand-400 to-brand-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(released / deposited) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{Math.round((released / deposited) * 100)}% released</p>
                </div>
              )}
            </div>
            {isClient && (
              <div className="mt-5 space-y-2">
                {depositEscrow.error && (
                  <Alert variant="danger" title="Deposit failed">
                    {(depositEscrow.error as any)?.response?.data?.error || depositEscrow.error.message || "Please try again"}
                  </Alert>
                )}
                <Button
                  onClick={() => depositEscrow.mutate(Number(project.totalBudget))}
                  variant="success"
                  className="w-full shadow-md"
                  disabled={depositEscrow.isPending || project.status !== "AWAITING_DEPOSIT"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {depositEscrow.isPending ? "Depositing..." : `Deposit ₹${Number(project.totalBudget).toLocaleString()}`}
                </Button>
                <Button onClick={() => navigate(`/projects/${id}/invoice`)} variant="outline" className="w-full">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                  View Invoice
                </Button>
              </div>
            )}

            {ledger.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setShowLedger(!showLedger)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  data-testid="ledger-toggle"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transaction History
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showLedger ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showLedger && (
                  <div className="mt-4 space-y-3" data-testid="ledger-entries">
                    {ledgerLoading ? (
                      <p className="text-xs text-gray-400">Loading...</p>
                    ) : (
                      ledger.map((entry) => (
                        <div key={entry.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                          <div className="flex flex-col">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${LEDGER_TYPE_COLORS[entry.entryType] || "bg-gray-100 text-gray-700"}`}>
                              {entry.entryType.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">{entry.actor.displayName}</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-semibold text-sm ${entry.direction === "CREDIT" ? "text-emerald-600" : "text-red-600"}`}>
                              {entry.direction === "CREDIT" ? "+" : "-"}₹{Number(entry.amount).toLocaleString()}
                            </span>
                            <span className="block text-xs text-gray-400">{formatDate(entry.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {submittingMilestone && (
        <SubmitMilestoneModal
          milestoneId={submittingMilestone.id}
          milestoneTitle={submittingMilestone.title}
          milestoneAmount={`₹${submittingMilestone.amount.toLocaleString()}`}
          verificationCriteria={submittingMilestone.verificationCriteria}
          onSubmit={handleSubmitDeliverable}
          onClose={() => setSubmittingMilestone(null)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
