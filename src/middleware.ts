import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/admin/login",
  "/api/auth",
  "/api/webhooks",
];

const STAFF_ROLES = ["admin", "manager"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith("/products")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static files, Next.js internals, and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    isPublic(pathname)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const role = token?.role as string | undefined;

  // ── Admin panel routes (/admin/*) ────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!token) {
      // Not logged in → go to staff login
      return NextResponse.redirect(
        new URL(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      );
    }

    if (!STAFF_ROLES.includes(role ?? "")) {
      // Logged in as client → send to client dashboard, not admin login
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  }

  // ── Client portal routes ─────────────────────────────────────────────────
  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
    );
  }

  // Staff trying to access client portal → redirect to admin
  if (STAFF_ROLES.includes(role ?? "")) {
    // Allow staff to view client portal if they explicitly navigate there
    // (useful for support/impersonation) — only redirect from root dashboard
    if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
