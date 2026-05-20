"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, Loader2, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialInfo {
  eligible: boolean;
  planName?: string;
  days?: number;
  reason?: string;
}

export function FreeTrialBanner() {
  const [info, setInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/trial")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  const claimTrial = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`🎉 Free ${data.service.trialDays}-day trial activated! Your ${data.service.productName} service is ready.`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!info?.eligible || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-5">
      {/* Background decoration */}
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-4 right-12 h-16 w-16 rounded-full bg-white/10 blur-lg" />

      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shrink-0">
          <Gift className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base leading-tight">
            Start your free {info.days}-day trial
          </p>
          <p className="text-indigo-200 text-sm mt-0.5">
            Get full access to {info.planName} — no credit card required
          </p>
        </div>
        <Button
          onClick={claimTrial}
          disabled={loading}
          className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold shrink-0 gap-1.5 shadow-lg"
          size="sm"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Zap className="h-4 w-4" />Claim Free Trial</>
          }
        </Button>
      </div>
    </div>
  );
}
