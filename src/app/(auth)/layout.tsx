import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left panel — animated illustration */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0f1729] to-slate-900">

        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-2/3 left-1/3 w-40 h-40 bg-violet-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-500/30">
              C
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}
            </span>
          </Link>
        </div>

        {/* Floating feature cards */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
          <div className="space-y-3 mb-10">
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Manage clients,<br />
              <span className="text-indigo-400">services & billing</span><br />
              in one place.
            </h2>
            <p className="text-slate-400 text-base mt-3 leading-relaxed">
              Built for cloud & IT service providers. VMware, TSplus, and more — all managed from a single dashboard.
            </p>
          </div>

          {/* Animated cards */}
          <div className="space-y-3">
            {[
              { icon: "🖥️", title: "VM Provisioning", desc: "VMware & cloud VMs in one click", color: "border-blue-500/30 bg-blue-500/5" },
              { icon: "🔐", title: "TSplus Management", desc: "Remote desktop licenses & sessions", color: "border-violet-500/30 bg-violet-500/5" },
              { icon: "📄", title: "Auto Billing", desc: "Invoices, renewals & Razorpay payments", color: "border-emerald-500/30 bg-emerald-500/5" },
              { icon: "📊", title: "Real-time Analytics", desc: "MRR, ARR, renewals & client activity", color: "border-orange-500/30 bg-orange-500/5" },
            ].map((card, i) => (
              <div
                key={card.title}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${card.color} backdrop-blur-sm`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-xl">{card.icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold leading-none">{card.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 px-10 pb-6 text-slate-600 text-xs">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"} · All rights reserved
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-14">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white font-bold">C</div>
            <span className="font-bold text-lg">{process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}</span>
          </Link>
        </div>
        <div className="w-full max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  );
}
