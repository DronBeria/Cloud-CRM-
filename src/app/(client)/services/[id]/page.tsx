import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Server, Calendar, Tag, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ServiceActions } from "@/components/services/ServiceActions";

export const metadata: Metadata = { title: "Service Details" };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  active: "success",
  pending: "info",
  suspended: "warning",
  cancelled: "destructive",
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) redirect("/login");

  const service = await db.service.findUnique({
    where: { id },
    include: {
      product: {
        include: {
          category: true,
          plans: { include: { prices: { include: { currency: true } } } },
          configOptions: { where: { hidden: false }, orderBy: { sort: "asc" } },
        },
      },
      plan: { include: { prices: { include: { currency: true } } } },
      order: { include: { invoice: true } },
      cancellation: true,
      upgrades: { orderBy: { createdAt: "desc" }, take: 1 },
      configs: { include: { configOption: true } },
    },
  });

  if (!service || service.userId !== currentUser!.id) notFound();

  const price = service.plan?.prices.find(
    (p) => p.currency.code === service.currencyCode
  ) ?? service.plan?.prices[0];

  const isExpired =
    service.expiresAt && new Date(service.expiresAt) < new Date();
  const canCancel =
    service.status !== "cancelled" && !service.cancellation;
  const canUpgrade =
    service.status === "active" &&
    service.product.plans.length > 1 &&
    !service.upgrades[0];

  const availablePlans = service.product.plans.filter(
    (p) => p.id !== service.planId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/services"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {service.label ?? service.product.name}
          </h1>
          <p className="text-muted-foreground">
            {service.product.category?.name} — {service.product.name}
          </p>
        </div>
        <Badge
          variant={statusVariant[service.status] ?? "outline"}
          className="ml-auto text-sm px-3 py-1"
        >
          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
        </Badge>
      </div>

      {/* Alerts */}
      {service.cancellation && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Cancellation Pending</p>
            <p className="text-muted-foreground mt-0.5">
              This service is scheduled for{" "}
              {service.cancellation.type === "immediate" ? "immediate" : "end-of-period"}{" "}
              cancellation.
              {service.cancellation.reason && ` Reason: ${service.cancellation.reason}`}
            </p>
          </div>
        </div>
      )}

      {service.status === "suspended" && (
        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Service Suspended</p>
            <p className="text-muted-foreground mt-0.5">
              This service is suspended due to an overdue invoice. Pay the outstanding balance to restore access.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Product</p>
                  <p className="font-medium mt-1">{service.product.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium mt-1 capitalize">{service.status}</p>
                </div>
                {service.plan && (
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium mt-1">{service.plan.name}</p>
                  </div>
                )}
                {service.label && (
                  <div>
                    <p className="text-muted-foreground">Label</p>
                    <p className="font-medium mt-1">{service.label}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium mt-1">{formatDate(service.createdAt)}</p>
                </div>
                {service.expiresAt && (
                  <div>
                    <p className="text-muted-foreground">
                      {isExpired ? "Expired" : "Next Renewal"}
                    </p>
                    <p className={`font-medium mt-1 ${isExpired ? "text-destructive" : ""}`}>
                      {formatDate(service.expiresAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Config options */}
              {service.configs.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-3">Configuration</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {service.configs.map((cfg) => (
                        <div key={cfg.id}>
                          <p className="text-muted-foreground">{cfg.configOption.name}</p>
                          <p className="font-medium mt-0.5">{cfg.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upgrade history */}
          {service.upgrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5" />Recent Upgrade
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Requested {formatDate(service.upgrades[0].createdAt)}
                  </span>
                  <Badge variant={service.upgrades[0].status === "completed" ? "success" : "info"}>
                    {service.upgrades[0].status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {/* Billing */}
          {price && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Billing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {price.currency.prefix}
                    {Number(price.price).toFixed(2)}
                    {price.currency.suffix}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium capitalize">
                    {service.plan?.billingPeriod} {service.plan?.billingUnit}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice link */}
          {service.order?.invoice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/invoices/${service.order.invoice.id}`}>
                    View Invoice {service.order.invoice.invoiceNumber ?? `#${service.order.invoice.number}`}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions — cancel / upgrade */}
          {(canCancel || canUpgrade) && (
            <ServiceActions
              serviceId={service.id}
              canCancel={canCancel}
              canUpgrade={canUpgrade}
              availablePlans={availablePlans.map((p) => ({
                id: p.id,
                name: p.name,
                billingPeriod: p.billingPeriod,
                billingUnit: p.billingUnit,
                price: p.prices.find(
                  (pr) => pr.currencyCode === service.currencyCode
                ) ?? p.prices[0],
              }))}
              currencyCode={service.currencyCode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
