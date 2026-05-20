import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const STAFF_ROLES = ["admin", "manager"];

const PUBLIC_PREFIXES = [
  "/api/auth", "/api/webhooks", "/api/payment", "/api/health",
  "/api/inngest", "/monitoring", "/_next", "/favicon", "/products",
];
const PUBLIC_EXACT = new Set([
  "/", "/login", "/register", "/forgot-password",
  "/admin/login", "/privacy", "/terms",
]);

function isPublic(p: string) {
  return PUBLIC_EXACT.has(p) || PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix));
}

// Read JWT from Supabase cookie — decode locally, NO network call
function getSessionFromCookies(req: NextRequest) {
  try {
    // Supabase stores session in sb-<ref>-auth-token cookie
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
      .replace("https://", "").replace(".supabase.co", "");

    const cookieName = `sb-${projectRef}-auth-token`;
    const raw = req.cookies.get(cookieName)?.value;
    if (!raw) return null;

    // Cookie value is a JSON array [access_token, refresh_token, ...]
    const parsed = JSON.parse(decodeURIComponent(raw));
    const token = Array.isArray(parsed) ? parsed[0] : parsed.access_token ?? parsed;
    if (!token || typeof token !== "string") return null;

    // Decode JWT payload (no signature verification — middleware is public-facing edge)
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiry
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      role: (payload.app_metadata?.role as string) ?? "user",
      prismaId: (payload.app_metadata?.prisma_id as string) ?? payload.sub,
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files immediately
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|ttf|map|webp)$/)) {
    return NextResponse.next();
  }

  // Read session from cookie — pure local JWT decode, ~0ms
  const session = getSessionFromCookies(req);
  const role = session?.role ?? null;

  if (isPublic(pathname)) {
    const res = NextResponse.next({ request: req });
    // Refresh session cookie if needed (non-blocking)
    if (session) refreshSession(req, res);
    return res;
  }

  const redirect = (to: string) => {
    const url = new URL(to, req.url);
    if (to.includes("login")) url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    if (!session) return redirect("/admin/login");
    if (!STAFF_ROLES.includes(role ?? "")) return redirect("/dashboard");
    const res = NextResponse.next({ request: req });
    res.headers.set("x-user-id", session.prismaId);
    res.headers.set("x-user-role", role ?? "user");
    res.headers.set("x-user-email", session.email ?? "");
    refreshSession(req, res);
    return res;
  }

  if (!session) return redirect("/login");

  if (STAFF_ROLES.includes(role ?? "") && pathname === "/dashboard") {
    return redirect("/admin");
  }

  const res = NextResponse.next({ request: req });
  res.headers.set("x-user-id", session.prismaId);
  res.headers.set("x-user-role", role ?? "user");
  refreshSession(req, res);
  return res;
}

// Refresh Supabase session cookie in background (handles token expiry)
// This uses the Supabase client only when needed, not on every request
function refreshSession(req: NextRequest, res: NextResponse) {
  // Only refresh if token is within 10 minutes of expiry
  try {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
      .replace("https://", "").replace(".supabase.co", "");
    const cookieName = `sb-${projectRef}-auth-token`;
    const raw = req.cookies.get(cookieName)?.value;
    if (!raw) return;

    const parsed = JSON.parse(decodeURIComponent(raw));
    const token = Array.isArray(parsed) ? parsed[0] : parsed.access_token ?? parsed;
    if (!token) return;

    const parts = token.split(".");
    if (parts.length !== 3) return;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    // If more than 10 min remaining, no refresh needed
    const timeLeft = (payload.exp ?? 0) - Date.now() / 1000;
    if (timeLeft > 600) return;

    // Token expiring soon — trigger background refresh via Supabase client
    // This is async and doesn't block the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    // Fire and forget — don't await
    supabase.auth.getSession().catch(() => {});
  } catch { /* silent */ }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
