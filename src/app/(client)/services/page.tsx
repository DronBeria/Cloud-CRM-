import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { Server, Plus } from "lucide-react";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  const currentUser = await getUser();
  if (!currentUser) redirect("/login");

  const services = await db.service.findMany({
    where: { userId: currentUser!.id },
    include: {
      product: true,
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const active = services.filter((s) => s.status === "active");
  const suspended = services.filter((s) => s.status === "suspended");
  const cancelled = services.filter((s) => s.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage your active services
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <Plus className="mr-2 h-4 w-4" />
            Order Service
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {active.length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Suspended</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {suspended.length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {cancelled.length}
          </p>
        </div>
      </div>

      {services.length > 0 ? (
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium">No services yet</h3>
          <p className="text-sm mt-1">
            Order a service to get started.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
