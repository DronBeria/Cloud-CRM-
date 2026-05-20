"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClientNavbar } from "@/components/layout/ClientNavbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    // getSession() reads from memory/localStorage — no network call, instant
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser({
        name: (session.user.user_metadata?.name as string) ?? session.user.email,
        email: session.user.email,
      });
      setReady(true);
    });
  }, [router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <div className="hidden md:flex w-56 bg-white border-r border-gray-100 shrink-0" />
        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-white border-b border-gray-100" />
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50/50">
      <div className="hidden md:flex shrink-0"><Sidebar user={user} /></div>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-56">
          <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-w-0">
        <ClientNavbar onMenuClick={() => setSidebarOpen(true)} user={user} />
        <main className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
