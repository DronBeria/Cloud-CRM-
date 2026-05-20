"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Uppercase required").regex(/[0-9]/, "Number required"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      // Use server API — creates both Prisma + Supabase user via admin client
      // Admin client sets email_confirm: true so NO confirmation email is sent
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });

      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? "Registration failed."); return; }

      // Sign in immediately — account is already confirmed
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.success("Account created! Please sign in.");
        router.push("/login");
        return;
      }

      toast.success("Welcome aboard!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Get started — it&apos;s free</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Full Name</Label>
          <Input placeholder="John Smith" {...register("name")} disabled={loading} className="h-11" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Email address</Label>
          <Input type="email" placeholder="you@example.com" {...register("email")} disabled={loading} className="h-11" />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Password</Label>
          <Input type="password" placeholder="••••••••" {...register("password")} disabled={loading} className="h-11" />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          <div className="flex gap-4 mt-1">
            {["8+ chars", "Uppercase", "Number"].map((r) => (
              <span key={r} className="flex items-center gap-1 text-xs text-gray-400">
                <Check className="h-3 w-3" />{r}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
          <Input type="password" placeholder="••••••••" {...register("confirmPassword")} disabled={loading} className="h-11" />
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="w-full h-11 gap-2 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Sign in</Link>
      </p>
    </>
  );
}
