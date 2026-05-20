"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

const STAFF_ROLES = ["admin", "manager"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<string>("user");
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/admin/login"); return; }
      const userRole = (user.app_metadata?.role as string) ?? "user";
      if (!STAFF_ROLES.includes(userRole)) { router.replace("/dashboard"); return; }
      setRole(userRole);
      setUser({ name: (user.user_metadata?.name as string) ?? user.email, email: user.email, role: userRole });
      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar onMenuClick={() => setSidebarOpen(true)} user={user} />
      <div className="flex flex-1">
        <div className="hidden md:flex">
          <AdminSidebar role={role} />
        </div>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-56">
            <AdminSidebar role={role} onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto bg-[#F8F9FB]">
          <div className="container max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
