"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Server, MessageSquare,
  Package, Settings, Puzzle, CreditCard, Bell, Shield,
  ChevronLeft, UserPlus, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Items available to both admin and manager
const SHARED_NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/leads", icon: UserPlus, label: "Leads" },
  { href: "/admin/users", icon: Users, label: "Clients" },
  { href: "/admin/invoices", icon: FileText, label: "Invoices" },
  { href: "/admin/services", icon: Server, label: "Services" },
  { href: "/admin/tickets", icon: MessageSquare, label: "Tickets" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
];

// Items visible only to admins
const ADMIN_ONLY_NAV = [
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

  const navItems = isAdmin
    ? [...SHARED_NAV, ...ADMIN_ONLY_NAV]
    : SHARED_NAV;

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground"
          onClick={onClose}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 text-white text-xs font-bold">
            <Shield className="h-4 w-4" />
          </div>
          <span>
            {isAdmin ? "Admin" : "Manager"}
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          title="View Client Portal"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-orange-500/20 text-orange-400"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {!isAdmin && (
          <div className="mt-4 px-3 py-2 rounded-md bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs text-orange-400 font-medium">Manager Access</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gateways and settings are admin-only.
            </p>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <p className="text-xs text-sidebar-foreground/40 text-center capitalize">
          {role} · Staff Portal
        </p>
      </div>
    </aside>
  );
}
