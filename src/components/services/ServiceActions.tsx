"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle, ArrowUpCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  billingPeriod: number;
  billingUnit: string;
  price?: { price: unknown; currency: { prefix: string; suffix: string } } | null;
}

interface ServiceActionsProps {
  serviceId: string;
  canCancel: boolean;
  canUpgrade: boolean;
  availablePlans: Plan[];
  currencyCode: string;
}

export function ServiceActions({
  serviceId,
  canCancel,
  canUpgrade,
  availablePlans,
  currencyCode,
}: ServiceActionsProps) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cancel form state
  const [cancelReason, setCancelReason] = useState("");
  const [cancelType, setCancelType] = useState<"scheduled" | "immediate">("scheduled");

  // Upgrade form state
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, type: cancelType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      toast.success(
        cancelType === "immediate"
          ? "Service cancelled immediately."
          : "Cancellation scheduled for end of billing period."
      );
      setCancelOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel service");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      if (data.requiresPayment && data.invoiceId) {
        toast.success("Upgrade initiated. An invoice has been created for the price difference.");
        router.push(`/invoices/${data.invoiceId}`);
      } else {
        toast.success("Plan upgraded successfully.");
        setUpgradeOpen(false);
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upgrade service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {canUpgrade && availablePlans.length > 0 && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setUpgradeOpen(true)}
            >
              <ArrowUpCircle className="mr-2 h-4 w-4 text-primary" />
              Upgrade Plan
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Request Cancellation
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Service
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm how you&apos;d like to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Type</Label>
              <RadioGroup
                value={cancelType}
                onValueChange={(v) => setCancelType(v as "scheduled" | "immediate")}
                className="space-y-2"
              >
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="scheduled" id="scheduled" className="mt-0.5" />
                  <div>
                    <Label htmlFor="scheduled" className="cursor-pointer font-medium">
                      End of Billing Period
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Service continues until the current period ends.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border border-destructive/30 rounded-lg">
                  <RadioGroupItem value="immediate" id="immediate" className="mt-0.5" />
                  <div>
                    <Label htmlFor="immediate" className="cursor-pointer font-medium">
                      Immediate
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Service is cancelled right now with no refund.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Tell us why you're cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={loading}>
              Keep Service
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Upgrade Plan
            </DialogTitle>
            <DialogDescription>
              Select a new plan. If the new plan costs more, an invoice for the
              difference will be created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <div className="space-y-2">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlanId === plan.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div>
                      <p className="font-medium text-sm">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.billingPeriod} {plan.billingUnit}
                      </p>
                    </div>
                    {plan.price && (
                      <Badge variant="secondary">
                        {(plan.price as { price: unknown; currency: { prefix: string; suffix: string } }).currency.prefix}
                        {Number((plan.price as { price: unknown }).price).toFixed(2)}
                        {(plan.price as { price: unknown; currency: { prefix: string; suffix: string } }).currency.suffix}
                        /{plan.billingUnit}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={loading || !selectedPlanId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
