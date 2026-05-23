import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/core";
import { StepIndicator } from "../components/StepIndicator/StepIndicator";
import { Step1ProjectDetails, type ProjectFormData } from "../components/WizardStep/Step1ProjectDetails";
import { Step2Milestones, type EditableMilestone } from "../components/WizardStep/Step2Milestones";
import { Step3Contract } from "../components/WizardStep/Step3Contract";
import { Step4Deposit } from "../components/WizardStep/Step4Deposit";
import {
  useCreateProject,
  useLinkFreelancer,
  usePersistMilestones,
  useSignContract,
  useUpsertContract,
} from "../api/useProjects";
import { useAiContract, useAiMilestones, type MilestoneSuggestion } from "../api/useAi";
import { apiClient } from "../api/client";

const STEPS = ["Describe", "AI Scope", "Contract", "Deposit"];

const defaultMilestones: EditableMilestone[] = [
  { title: "Milestone 1", description: "First milestone deliverable", budgetPercent: 30, estimatedDays: 3, verificationCriteria: "Client approval" },
  { title: "Milestone 2", description: "Second milestone deliverable", budgetPercent: 50, estimatedDays: 5, verificationCriteria: "Client approval" },
  { title: "Milestone 3", description: "Final milestone deliverable", budgetPercent: 20, estimatedDays: 2, verificationCriteria: "Client approval" },
];

export default function CreateProjectWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProjectFormData>({ 
    title: "", description: "", budget: "", deadline: "", freelancerEmail: "" 
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isDepositSuccess, setIsDepositSuccess] = useState(false);
  const [milestones, setMilestones] = useState<EditableMilestone[]>(defaultMilestones);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [clauses, setClauses] = useState<{ title: string; body: string }[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const navigate = useNavigate();

  const createProject = useCreateProject();
  const linkFreelancer = useLinkFreelancer();
  const aiMilestones = useAiMilestones();
  const aiContract = useAiContract();
  const persistMilestones = usePersistMilestones();
  const upsertContract = useUpsertContract();
  const signContract = useSignContract();

  const ensureProject = async (): Promise<string> => {
    if (projectId) return projectId;
    return new Promise((resolve, reject) => {
      createProject.mutate(
        {
          title: form.title,
          description: form.description,
          totalBudget: Number(form.budget),
          deadline: form.deadline || new Date(Date.now() + 10 * 86400000).toISOString(),
        },
        {
          onSuccess: (data) => { setProjectId(data.id); resolve(data.id); },
          onError: reject,
        }
      );
    });
  };

  const handleStep1Submit = async () => {
    setStepError(null);
    try {
      const pid = await ensureProject();
      if (form.freelancerEmail.trim()) {
        await linkFreelancer.mutateAsync({ projectId: pid, email: form.freelancerEmail.trim() });
      }
      
      setIsGeneratingAi(true);
      setStep(2);
      
      aiMilestones.mutate(
        { title: form.title, description: form.description, budget: Number(form.budget), deadline: form.deadline },
        {
          onSuccess: (data: MilestoneSuggestion[]) => {
            const editable: EditableMilestone[] = data.map(m => ({
              title: m.title,
              description: m.description,
              budgetPercent: m.budgetPercent,
              estimatedDays: m.estimatedDays,
              verificationCriteria: m.verificationCriteria,
            }));
            setMilestones(editable);
            setIsGeneratingAi(false);
          },
          onError: (e: any) => {
            setStepError(e?.response?.data?.error || "Failed to generate milestones");
            setIsGeneratingAi(false);
          },
        }
      );
    } catch (e: any) {
      setStepError(e?.response?.data?.error || "Failed to create project");
    }
  };

  const handleStep2Next = async () => {
    setStepError(null);
    const pid = await ensureProject();
    
    await persistMilestones.mutateAsync({ projectId: pid, milestones });
    
    aiContract.mutate(
      { title: form.title, description: form.description, milestones },
      {
        onSuccess: async (data) => {
          setClauses(data.clauses);
          await upsertContract.mutateAsync({ projectId: pid, clauses: data.clauses });
          setStep(3);
        },
        onError: (e: any) => setStepError(e?.response?.data?.error || "Failed to generate contract"),
      }
    );
  };

  const handleStep3Sign = async () => {
    setStepError(null);
    try {
      const pid = await ensureProject();
      const updated = await signContract.mutateAsync({ projectId: pid, ipHash: crypto.randomUUID().replace(/-/g, "") });
      if (updated.status === "AWAITING_DEPOSIT") {
        setStep(4);
      } else {
        navigate(`/projects/${pid}`);
      }
    } catch (e: any) {
      setStepError(e?.response?.data?.error || "Failed to sign contract");
    }
  };

  const handleStep4Deposit = async () => {
    setStepError(null);
    
    try {
      let pid = projectId;
      
      if (!pid) {
        pid = await new Promise<string>((resolve, reject) => {
          createProject.mutate(
            {
              title: form.title,
              description: form.description,
              totalBudget: Number(form.budget),
              deadline: form.deadline || new Date(Date.now() + 10 * 86400000).toISOString(),
            },
            {
              onSuccess: (data) => resolve(data.id),
              onError: reject,
            }
          );
        });
        setProjectId(pid);
      }
      
      const { data: proj } = await apiClient.get<{ data: { status: string } }>(`/projects/${pid}`);
      if (proj.data.status !== "AWAITING_DEPOSIT") {
        navigate(`/projects/${pid}`);
        return;
      }
      
      setIsDepositing(true);
      
      await apiClient.post(`/escrow/${pid}/deposit`, { amount: Number(form.budget) });
      
      setIsDepositSuccess(true);
      
      setTimeout(() => {
        navigate(`/projects/${pid}`);
      }, 800);
    } catch (e: any) {
      setStepError(e?.response?.data?.error || "Deposit failed. Please try again.");
      setIsDepositing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <StepIndicator currentStep={step} steps={STEPS} />

      <Card className="p-8 shadow-md">
        {step === 1 && (
          <Step1ProjectDetails
            form={form}
            setForm={setForm}
            onSubmit={handleStep1Submit}
            isLoading={createProject.isPending || linkFreelancer.isPending}
            error={stepError}
          />
        )}

        {step === 2 && (
          <Step2Milestones
            milestones={milestones}
            onMilestonesChange={setMilestones}
            onBack={() => setStep(1)}
            onNext={handleStep2Next}
            isLoading={isGeneratingAi || aiContract.isPending || persistMilestones.isPending || upsertContract.isPending}
          />
        )}

        {step === 3 && (
          <Step3Contract
            clauses={clauses}
            agreed={agreed}
            setAgreed={setAgreed}
            onBack={() => setStep(2)}
            onSign={handleStep3Sign}
            isLoading={signContract.isPending}
            error={stepError}
          />
        )}

        {step === 4 && (
          <Step4Deposit
            amount={form.budget}
            onDeposit={handleStep4Deposit}
            isLoading={isDepositing}
            isSuccess={isDepositSuccess}
            error={stepError}
            onError={setStepError}
          />
        )}
      </Card>
    </div>
  );
}
