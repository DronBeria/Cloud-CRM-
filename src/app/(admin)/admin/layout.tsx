"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { isStaff } from "@/lib/permissions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || !isStaff(role)) {
    router.replace("/admin/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        <div className="hidden md:flex">
          <AdminSidebar role={role} />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AdminSidebar role={role} onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="container max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
