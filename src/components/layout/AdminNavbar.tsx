"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Moon, Sun, Menu, ChevronDown, LogOut, Settings, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Breadcrumb label map
const PATH_LABELS: Record<string, string> = {
  "/admin": "Overview",
  "/admin/clients": "Clients",
  "/admin/invoices": "Invoices",
  "/admin/services": "Services",
  "/admin/tickets": "Support",
  "/admin/products": "Products",
  "/admin/workflows": "Workflows",
  "/admin/notifications": "Notifications",
  "/admin/integrations": "Integrations",
  "/admin/gateways": "Gateways",
  "/admin/extensions": "Extensions",
  "/admin/audit": "Audit Log",
  "/admin/email-logs": "Email Logs",
  "/admin/settings": "Settings",
};

interface AdminNavbarProps {
  onMenuClick?: () => void;
}

export function AdminNavbar({ onMenuClick }: AdminNavbarProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  // Build breadcrumb
  const pageLabel = PATH_LABELS[pathname] ??
    (pathname.includes("/clients/") ? "Client Profile" :
     pathname.includes("/users/") ? "User Detail" : "Admin");

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-gray-100 bg-white/95 backdrop-blur px-4 gap-3">
      {/* Mobile menu button */}
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
        <span className="text-gray-400 hidden sm:block font-medium">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}
        </span>
        <span className="text-gray-300 hidden sm:block">/</span>
        <span className="font-semibold text-gray-800 truncate">{pageLabel}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-gray-700"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-1">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-none">
                <p className="text-xs font-semibold text-gray-800">{user?.name?.split(" ")[0]}</p>
                <p className="text-[10px] text-gray-400 capitalize mt-0.5">{user?.role}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 shadow-lg border-gray-100">
            <DropdownMenuLabel className="pb-2">
              <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
              <p className="text-[11px] text-gray-400 font-normal mt-0.5 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer text-sm text-gray-700 flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-400" />Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer text-sm flex items-center gap-2"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
            >
              <LogOut className="h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
