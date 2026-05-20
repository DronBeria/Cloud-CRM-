import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STAFF_ROLES = ["admin", "manager"];

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

function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/products") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Use NextAuth v5's own auth() as middleware — reads the correct authjs cookie
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const session = req.auth;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const addHeaders = (res: NextResponse) => {
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    // Pass user info to server components via headers (avoids double JWT decode)
    if (session?.user) {
      res.headers.set("x-user-id", session.user.id ?? "");
      res.headers.set("x-user-role", role ?? "user");
    }
    return res;
  };

  if (isPublic(pathname)) {
    return addHeaders(NextResponse.next());
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
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
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (STAFF_ROLES.includes(role ?? "") && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return addHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
