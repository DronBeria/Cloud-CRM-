import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Server, Calendar, Tag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Service Details" };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  active: "success",
  suspended: "warning",
  cancelled: "destructive",
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const service = await db.service.findUnique({
    where: { id },
    include: {
      product: { include: { category: true } },
      plan: { include: { prices: { include: { currency: true } } } },
      order: { include: { invoice: true } },
    },
  });

  if (!service || service.userId !== session.user.id) notFound();

  const price = service.plan?.prices[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Information
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
                      {new Date(service.expiresAt) < new Date() ? "Expired" : "Next Renewal"}
                    </p>
                    <p className="font-medium mt-1">{formatDate(service.expiresAt)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
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
                  <span className="text-muted-foreground">Billing Period</span>
                  <span className="font-medium capitalize">
                    {service.plan?.billingPeriod} {service.plan?.billingUnit}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {service.order?.invoice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/invoices/${service.order.invoice.id}`}>
                    View Invoice #{service.order.invoice.number}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
