"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Server, MessageSquare,
  Package, Settings, Puzzle, CreditCard, Bell, Shield,
  ChevronLeft, Zap, Activity, Link2, LogOut, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const NAV_GROUPS = [
  {
    id: "clients",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Overview" },
      { href: "/admin/clients", icon: Users, label: "Clients" },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      { href: "/admin/invoices", icon: FileText, label: "Invoices" },
      { href: "/admin/services", icon: Server, label: "Services" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/tickets", icon: MessageSquare, label: "Support" },
      { href: "/admin/products", icon: Package, label: "Products" },
      { href: "/admin/workflows", icon: Zap, label: "Workflows" },
      { href: "/admin/notifications", icon: Bell, label: "Notifications" },
    ],
  },
];

const SYSTEM_ITEMS: NavItem[] = [
  { href: "/admin/integrations", icon: Link2, label: "Integrations" },
  { href: "/admin/gateways", icon: CreditCard, label: "Gateways" },
  { href: "/admin/extensions", icon: Puzzle, label: "Extensions" },
  { href: "/admin/audit", icon: Activity, label: "Audit Log" },
  { href: "/admin/email-logs", icon: Mail, label: "Email Logs" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface AdminSidebarProps {
  role?: string;
  onClose?: () => void;
}

export function AdminSidebar({ role, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
          active
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-600" : "text-gray-400")} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-56 flex-col bg-white border-r border-gray-100">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-gray-100">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-2 font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-sm">{isAdmin ? "Admin" : "Manager"}</span>
        </Link>
        <Link href="/dashboard" onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors" title="Client View">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Top group (Overview + Clients) */}
        <div className="space-y-0.5">
          {NAV_GROUPS[0].items.map((item) => <NavLink key={item.href} item={item} />)}
        </div>

        {/* Business + Operations groups */}
        {NAV_GROUPS.slice(1).map((group) => (
          <div key={group.id}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
        ))}

        {/* System — admin only */}
        {isAdmin && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              System
            </p>
            <div className="space-y-0.5">
              {SYSTEM_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
