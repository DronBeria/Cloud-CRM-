"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search, Users, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  activeTab: string;
  search: string;
}

export function ClientsTabSwitcher({ activeTab, search }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    const delay = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (searchValue) params.set("search", searchValue);
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchValue, activeTab, pathname, router]);

  const switchTab = (tab: string) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (searchValue) params.set("search", searchValue);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => switchTab("clients")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            activeTab === "clients"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Users className="h-3.5 w-3.5" />Clients
        </button>
        <button
          onClick={() => switchTab("leads")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            activeTab === "leads"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <UserPlus className="h-3.5 w-3.5" />Leads
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-8 h-9 text-sm bg-gray-50 border-gray-200"
        />
      </div>
    </div>
  );
}
