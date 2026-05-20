"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientNavbarProps {
  onMenuClick?: () => void;
  user?: { name?: string; email?: string } | null;
}

export function ClientNavbar({ onMenuClick }: ClientNavbarProps) {
  const { theme, setTheme } = useTheme();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
      )}
      <Link href="/dashboard" className="md:hidden flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">{appName.charAt(0)}</div>
        <span className="font-bold text-sm text-gray-900">{appName}</span>
      </Link>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" asChild>
        <Link href="/cart"><ShoppingCart className="h-4 w-4" /></Link>
      </Button>
    </header>
  );
}
