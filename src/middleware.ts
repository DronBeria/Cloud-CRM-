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
];

const STAFF_ROLES = ["admin", "manager"];

// Simple in-middleware rate limiter using headers (stateless, per-edge-instance)
// For distributed rate limiting across serverless, combine with DB-based lib/ratelimit.ts
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(key);

  if (!entry || entry.resetAt < now) {
    RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Clean up old entries periodically (simple GC)
if (RATE_LIMIT_MAP.size > 10000) {
  const now = Date.now();
  for (const [k, v] of RATE_LIMIT_MAP) {
    if (v.resetAt < now) RATE_LIMIT_MAP.delete(k);
  }
}

function isPublic(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/products") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown";

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Rate limit: 200 req/min per IP on all API routes
  if (pathname.startsWith("/api/")) {
    const allowed = checkRateLimit(`api:${ip}`, 200, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // Add security headers to all responses
  const response = await processRoute(req, pathname, ip);

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

async function processRoute(req: NextRequest, pathname: string, ip: string): Promise<NextResponse> {
  if (isPublic(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({
    req,
    secret,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    secureCookie: process.env.NODE_ENV === "production",
  });

  const role = token?.role as string | undefined;

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!STAFF_ROLES.includes(role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
