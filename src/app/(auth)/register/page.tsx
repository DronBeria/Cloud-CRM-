"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Loader2, ArrowRight, ArrowLeft, Check, User,
  Building, Package, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Step schemas ──────────────────────────────────────────────────────────────
const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Uppercase required").regex(/[0-9]/, "Number required"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const step2Schema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

interface Plan { id: string; name: string; billingPeriod: number; billingUnit: string; price?: number; prefix?: string; productName: string; productSlug: string; }

const STEPS = [
  { icon: User, label: "Account" },
  { icon: Building, label: "Profile" },
  { icon: Package, label: "Plan" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [step2Data, setStep2Data] = useState<Step2 | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { country: "India" },
  });

  useEffect(() => {
    if (step === 3) {
      setLoadingPlans(true);
      fetch("/api/products/plans")
        .then((r) => r.json())
        .then(setPlans)
        .catch(() => setPlans([]))
        .finally(() => setLoadingPlans(false));
    }
  }, [step]);

  const submitStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(2);
  });

  const submitStep2 = form2.handleSubmit((data) => {
    setStep2Data(data);
    setStep(3);
  });

  const finish = async () => {
    if (!step1Data) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: step1Data.name,
          email: step1Data.email,
          password: step1Data.password,
          phone: step2Data?.phone,
          companyName: step2Data?.companyName,
          gstin: step2Data?.gstin,
          city: step2Data?.city,
          state: step2Data?.state,
          country: step2Data?.country,
          selectedPlanId: selectedPlan,
        }),
      });

      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? "Registration failed."); return; }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: step1Data.email,
        password: step1Data.password,
      });

      if (error) { toast.success("Account created! Please sign in."); router.push("/login"); return; }

      toast.success("Welcome to CloudCRM! 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const Icon = s.icon;
            const done = step > n;
            const active = step === n;
            return (
              <div key={s.label} className="flex items-center flex-1">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all shrink-0",
                  done ? "bg-indigo-600 text-white" : active ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-gray-100 text-gray-400"
                )}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className={cn("text-xs font-medium", active ? "text-indigo-600" : done ? "text-gray-600" : "text-gray-400")}>{s.label}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-px mx-3", step > n ? "bg-indigo-600" : "bg-gray-200")} />
                )}
              </div>
            );
          })}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {step === 1 && "Create your account"}
          {step === 2 && "Business details"}
          {step === 3 && "Choose your plan"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {step === 1 && "Step 1 of 3 — Account credentials"}
          {step === 2 && "Step 2 of 3 — Tell us about your business"}
          {step === 3 && "Step 3 of 3 — Select a plan (optional, you can do this later)"}
        </p>
      </div>

      {/* Step 1 — Account */}
      {step === 1 && (
        <form onSubmit={submitStep1} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Full Name</Label>
            <Input placeholder="John Smith" {...form1.register("name")} className="h-11" />
            {form1.formState.errors.name && <p className="text-xs text-red-500">{form1.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Email address</Label>
            <Input type="email" placeholder="you@company.com" {...form1.register("email")} className="h-11" />
            {form1.formState.errors.email && <p className="text-xs text-red-500">{form1.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder="••••••••" {...form1.register("password")} className="h-11 pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form1.formState.errors.password && <p className="text-xs text-red-500">{form1.formState.errors.password.message}</p>}
            <div className="flex gap-3 mt-1">
              {["8+ chars", "Uppercase", "Number"].map((r) => (
                <span key={r} className="flex items-center gap-1 text-xs text-gray-400"><Check className="h-3 w-3 text-indigo-400" />{r}</span>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
            <Input type="password" placeholder="••••••••" {...form1.register("confirmPassword")} className="h-11" />
            {form1.formState.errors.confirmPassword && <p className="text-xs text-red-500">{form1.formState.errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full h-11 gap-2 bg-indigo-600 hover:bg-indigo-700 mt-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Sign in</Link>
          </p>
        </form>
      )}

      {/* Step 2 — Business profile */}
      {step === 2 && (
        <form onSubmit={submitStep2} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Phone / WhatsApp <span className="text-red-500">*</span></Label>
              <Input placeholder="+91 98765 43210" {...form2.register("phone")} className="h-11" />
              {form2.formState.errors.phone && <p className="text-xs text-red-500">{form2.formState.errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Company Name <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input placeholder="Acme Pvt Ltd" {...form2.register("companyName")} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">GSTIN <span className="text-gray-400 text-xs">(optional — for GST invoice)</span></Label>
            <Input placeholder="22AAAAA0000A1Z5" {...form2.register("gstin")} className="h-11 font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></Label>
              <Input placeholder="Mumbai" {...form2.register("city")} className="h-11" />
              {form2.formState.errors.city && <p className="text-xs text-red-500">{form2.formState.errors.city.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">State <span className="text-red-500">*</span></Label>
              <Input placeholder="Maharashtra" {...form2.register("state")} className="h-11" />
              {form2.formState.errors.state && <p className="text-xs text-red-500">{form2.formState.errors.state.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></Label>
              <Input placeholder="India" {...form2.register("country")} className="h-11" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1 h-11 gap-2" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="submit" className="flex-1 h-11 gap-2 bg-indigo-600 hover:bg-indigo-700">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Step 3 — Plan selection */}
      {step === 3 && (
        <div className="space-y-4">
          {loadingPlans ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No plans available yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    selectedPlan === plan.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                  )}
                >
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 transition-all",
                    selectedPlan === plan.id ? "border-indigo-600 bg-indigo-600" : "border-gray-300"
                  )}>
                    {selectedPlan === plan.id && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{plan.productName} — {plan.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{plan.billingPeriod} {plan.billingUnit}</p>
                  </div>
                  {plan.price !== undefined && (
                    <p className="text-sm font-bold text-indigo-600 shrink-0">
                      {plan.prefix ?? "₹"}{plan.price.toLocaleString("en-IN")}/{plan.billingUnit}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">You can also select a plan later from your dashboard</p>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-11 gap-2" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={finish} disabled={loading} className="flex-1 h-11 gap-2 bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />{selectedPlan ? "Register & Continue" : "Skip & Register"}</>}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
