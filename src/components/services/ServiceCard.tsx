import Link from "next/link";
import { Server, Calendar, Tag, ExternalLink, Monitor } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface TsplusMeta {
  tsplus_username?: string;
  tsplus_launch_url?: string;
  tsplus_server_url?: string;
}

interface ServiceCardProps {
  service: {
    id: string;
    status: string;
    label: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    metadata?: unknown;
    product: { name: string; slug: string };
    plan: { name: string; billingPeriod: number; billingUnit: string } | null;
  };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  active: "success",
  pending: "info",
  suspended: "warning",
  cancelled: "destructive",
};

export function ServiceCard({ service }: ServiceCardProps) {
  const displayName = service.label ?? service.product.name;
  const meta = service.metadata as TsplusMeta | null;
  const hasTsplus = !!meta?.tsplus_username && service.status === "active";
  const isTallyProduct = service.product.slug.toLowerCase().includes("tally") ||
    service.product.slug.toLowerCase().includes("rdp") ||
    service.product.slug.toLowerCase().includes("desktop");

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-100">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasTsplus || isTallyProduct ? "bg-violet-100" : "bg-blue-100"}`}>
              {hasTsplus || isTallyProduct
                ? <Monitor className="h-5 w-5 text-violet-600" />
                : <Server className="h-5 w-5 text-blue-600" />}
            </div>
            <div>
              <Link href={`/services/${service.id}`} className="font-semibold hover:text-primary transition-colors">
                {displayName}
              </Link>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                <span>{service.product.name}</span>
                {service.plan && (
                  <>
                    <span>·</span>
                    <span>{service.plan.name} ({service.plan.billingPeriod} {service.plan.billingUnit})</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant={statusVariant[service.status] ?? "outline"}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </Badge>
        </div>

        <div className="mt-3 pt-3 border-t flex items-center gap-2">
          {service.expiresAt && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(service.expiresAt) < new Date() ? "Expired" : "Renews"} {formatDate(service.expiresAt)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {hasTsplus && meta?.tsplus_launch_url && (
              <a
                href={meta.tsplus_launch_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Launch Tally
              </a>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/services/${service.id}`}>Manage</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
