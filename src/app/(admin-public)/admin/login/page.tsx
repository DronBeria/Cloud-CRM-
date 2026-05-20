"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Shield, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type Form = z.infer<typeof schema>;

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error || !authData.user) { toast.error("Invalid credentials."); return; }

      const role = authData.user.app_metadata?.role as string;
      if (!role || !["admin", "manager"].includes(role)) {
        await supabase.auth.signOut();
        toast.error("Access denied — staff accounts only.");
        return;
      }

      router.push(callbackUrl);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-300">Email address</Label>
        <Input type="email" placeholder="staff@company.com" {...register("email")} disabled={loading} autoFocus
          className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500" />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-300">Password</Label>
        <div className="relative">
          <Input type={showPass ? "text" : "password"} placeholder="••••••••" {...register("password")} disabled={loading}
            className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500 pr-10" />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" onClick={() => setShowPass(!showPass)}>
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-medium gap-2 border-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4" />Sign In to Staff Panel</>}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex bg-slate-950">
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 bg-slate-900 border-r border-slate-800 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white"><Shield className="h-5 w-5" /></div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Staff Portal</p>
            <p className="text-slate-500 text-xs mt-0.5">{process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}</p>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">Admin &<br />Management Access</h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">Restricted to authorized staff only.</p>
          </div>
          {["Full client and billing management", "Service provisioning and monitoring", "Support ticket resolution", "Platform configuration"].map((item) => (
            <div key={item} className="flex items-center gap-3"><div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" /><p className="text-slate-400 text-sm">{item}</p></div>
          ))}
          <div className="flex items-start gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Lock className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-orange-300 text-xs leading-relaxed">Unauthorized access is strictly prohibited.</p>
          </div>
        </div>
        <p className="relative z-10 text-slate-700 text-xs">© {new Date().getFullYear()} CloudCRM · Internal use only</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-14">
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white"><Shield className="h-4 w-4" /></div>
          <p className="text-white font-bold">Staff Portal</p>
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Sign in</h1>
            <p className="text-slate-400 mt-1 text-sm">Staff accounts only. <a href="/login" className="text-orange-400 hover:text-orange-300">Client portal →</a></p>
          </div>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
            <StaffLoginForm />
          </Suspense>
          <p className="text-center text-slate-700 text-xs mt-8">All access is monitored · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
