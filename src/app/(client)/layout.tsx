"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClientNavbar } from "@/components/layout/ClientNavbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setUser({ name: (user.user_metadata?.name as string) ?? user.email, email: user.email });
      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
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
