import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/admin/login",
  "/api/auth",
  "/api/webhooks",
  "/api/payment",
  "/api/health",
  "/api/inngest",
  "/monitoring",
  "/privacy",
  "/terms",
];

const STAFF_ROLES = ["admin", "manager"];

// Simple in-memory rate limiter (per edge instance)
const RL = new Map<string, { n: number; t: number }>();
function rateCheck(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const e = RL.get(key);
  if (!e || e.t < now) { RL.set(key, { n: 1, t: now + windowMs }); return true; }
  if (e.n >= limit) return false;
  e.n++;
  return true;
}

function isPublic(p: string) {
  return p === "/" ||
    p.startsWith("/products") ||
    PUBLIC_PATHS.some((pp) => p === pp || p.startsWith(pp + "/"));
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function addHeaders(res: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets fast path
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    if (!rateCheck(`api:${ip}`, 200, 60_000)) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: { "Retry-After": "60", "Content-Type": "text/plain" },
      });
    }
  }

  if (isPublic(pathname)) {
    return addHeaders(NextResponse.next());
  }

  // Decode JWT — getToken is local (no DB call) when strategy=jwt
  const token = await getToken({ req, secret: process.env.AUTH_SECRET }).catch(() => null);
  const role = token?.role as string | undefined;

  if (pathname.startsWith("/admin")) {
    if (!token) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!STAFF_ROLES.includes(role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return addHeaders(NextResponse.next());
  }

  // Client routes
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (STAFF_ROLES.includes(role ?? "") && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return addHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
