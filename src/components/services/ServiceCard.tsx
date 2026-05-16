import Link from "next/link";
import { Server, Calendar, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface ServiceCardProps {
  service: {
    id: string;
    status: string;
    label: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    product: { name: string; slug: string };
    plan: { name: string; billingPeriod: number; billingUnit: string } | null;
  };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  active: "success",
  suspended: "warning",
  cancelled: "destructive",
};

export function ServiceCard({ service }: ServiceCardProps) {
  const displayName = service.label ?? service.product.name;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <Link
                href={`/services/${service.id}`}
                className="font-semibold hover:text-primary transition-colors"
              >
                {displayName}
              </Link>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                <span>{service.product.name}</span>
                {service.plan && (
                  <>
                    <span>·</span>
                    <span>
                      {service.plan.name} ({service.plan.billingPeriod}{" "}
                      {service.plan.billingUnit})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Badge variant={statusVariant[service.status] ?? "outline"}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </Badge>
        </div>

        {service.expiresAt && (
          <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground pt-3 border-t">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(service.expiresAt) < new Date()
                ? "Expired"
                : "Renews"}{" "}
              {formatDate(service.expiresAt)}
            </span>
            <div className="ml-auto">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/services/${service.id}`}>Manage</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
