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
];

const STAFF_ROLES = ["admin", "manager"];

function isPublic(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/products") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  const token = await getToken({
    req,
    secret,
    // NextAuth v5 uses different cookie names
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    secureCookie: process.env.NODE_ENV === "production",
  });

  const role = token?.role as string | undefined;

  // ── Admin routes ──────────────────────────────────────────────────────────
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

  // ── Client routes ─────────────────────────────────────────────────────────
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Staff hitting /dashboard → send to admin
  if (STAFF_ROLES.includes(role ?? "") && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
