"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, LogOut, User, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminNavbarProps {
  onMenuClick?: () => void;
}

export function AdminNavbar({ onMenuClick }: AdminNavbarProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 dark:bg-gray-950 dark:border-gray-800">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Breadcrumb / brand */}
      <div className="flex items-center gap-2 mr-auto">
        <div className="hidden md:flex h-6 w-6 items-center justify-center rounded-md bg-orange-500 text-white">
          <Shield className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden md:block">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}
        </span>
        <span className="text-gray-300 dark:text-gray-600 hidden md:block text-sm">/</span>
        <span className="text-sm text-gray-500 hidden md:block capitalize">
          {user?.role} Portal
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2 text-sm text-gray-700 dark:text-gray-300">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-orange-100 text-orange-600 font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium">{user?.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-xs font-normal text-muted-foreground truncate">{user?.email}</p>
              <p className="text-xs capitalize text-orange-500 font-medium mt-0.5">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
