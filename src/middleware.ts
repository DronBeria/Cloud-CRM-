import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware uses ONLY the edge-compatible authConfig — no Prisma, no bcrypt.
 * Runs on Vercel Edge Runtime: zero cold starts, globally distributed, ~1ms overhead.
 */
const { auth } = NextAuth(authConfig);

const STAFF_ROLES = ["admin", "manager"];

const PUBLIC_PREFIXES = [
  "/products", "/api/auth", "/api/webhooks", "/api/payment",
  "/api/health", "/api/inngest", "/monitoring", "/_next", "/favicon",
];
const PUBLIC_EXACT = new Set(["/", "/login", "/register", "/forgot-password", "/admin/login", "/privacy", "/terms"]);

function isPublic(pathname: string) {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth((req: NextRequest & { auth: { user?: { role?: string; id?: string } } | null }) => {
  const { pathname } = req.nextUrl;

  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|ttf|map)$/)) return NextResponse.next();
  if (isPublic(pathname)) return NextResponse.next();

  const session = req.auth;
  const role = session?.user?.role as string | undefined;
  const userId = session?.user?.id as string | undefined;

  const injectHeaders = (res: NextResponse) => {
    if (userId) res.headers.set("x-user-id", userId);
    if (role) res.headers.set("x-user-role", role ?? "user");
    return res;
  };

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
    return injectHeaders(NextResponse.next());
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

  return injectHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
