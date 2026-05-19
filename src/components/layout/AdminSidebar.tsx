"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Server, MessageSquare,
  Package, Settings, Puzzle, CreditCard, Bell, Shield, ChevronLeft,
  Zap, Activity, Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SHARED_NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/clients", icon: Users, label: "Clients" },
  { href: "/admin/invoices", icon: FileText, label: "Invoices" },
  { href: "/admin/services", icon: Server, label: "Services" },
  { href: "/admin/tickets", icon: MessageSquare, label: "Tickets" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/workflows", icon: Zap, label: "Workflows" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
];

const ADMIN_ONLY_NAV = [
  { href: "/admin/integrations", icon: Link, label: "Integrations" },
  { href: "/admin/audit", icon: Activity, label: "Audit Log" },
  { href: "/admin/gateways", icon: CreditCard, label: "Gateways" },
  { href: "/admin/extensions", icon: Puzzle, label: "Extensions" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface AdminSidebarProps {
  role?: string;
  onClose?: () => void;
}

export function AdminSidebar({ role, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const navItems = isAdmin ? [...SHARED_NAV, ...ADMIN_ONLY_NAV] : SHARED_NAV;

  return (
    <aside className="flex h-full w-60 flex-col bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-gray-100">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 font-semibold text-gray-900"
          onClick={onClose}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white text-xs font-bold shrink-0">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm">{isAdmin ? "Admin" : "Manager"} Panel</span>
        </Link>
        <Link
          href="/dashboard"
          className="text-gray-300 hover:text-gray-500 transition-colors"
          title="Client Portal"
          onClick={onClose}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-orange-50 text-orange-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-orange-500" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">System</p>
            </div>
            <div className="space-y-0.5">
              {ADMIN_ONLY_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all",
                      isActive
                        ? "bg-orange-50 text-orange-600 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-orange-500" : "text-gray-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-gray-100 px-3 py-3">
        <p className="text-[10px] text-gray-300 capitalize">{role} access</p>
      </div>
    </aside>
  );
}
