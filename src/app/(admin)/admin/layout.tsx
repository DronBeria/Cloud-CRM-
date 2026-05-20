"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

const STAFF_ROLES = ["admin", "manager"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<string>("manager");
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    // getSession() reads from localStorage — zero network call, instant
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/admin/login"); return; }
      const userRole = (session.user.app_metadata?.role as string) ?? "user";
      if (!STAFF_ROLES.includes(userRole)) { router.replace("/dashboard"); return; }
      setRole(userRole);
      setUser({
        name: (session.user.user_metadata?.name as string) ?? session.user.email,
        email: session.user.email,
        role: userRole,
      });
      setReady(true);
    });
  }, [router]);

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex bg-[#F8F9FB]">
        {/* Skeleton sidebar so layout doesn't flash */}
        <div className="hidden md:flex w-60 bg-white border-r border-gray-100 shrink-0" />
        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-white border-b border-gray-100" />
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar onMenuClick={() => setSidebarOpen(true)} user={user} />
      <div className="flex flex-1">
        <div className="hidden md:flex shrink-0">
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
