import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const STAFF_ROLES = ["admin", "manager"];

const PUBLIC_PREFIXES = [
  "/api/auth", "/api/webhooks", "/api/payment", "/api/health",
  "/api/inngest", "/monitoring", "/_next", "/favicon", "/products",
];
const PUBLIC_EXACT = new Set([
  "/", "/login", "/register", "/forgot-password",
  "/admin/login", "/privacy", "/terms",
]);

function isPublic(pathname: string) {
  return PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|ttf|map)$/)) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.app_metadata?.role as string) ?? null;

  if (isPublic(pathname)) return res;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!STAFF_ROLES.includes(role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    res.headers.set("x-user-id", (user.app_metadata?.prisma_id as string) ?? user.id);
    res.headers.set("x-user-role", role ?? "user");
    res.headers.set("x-user-email", user.email ?? "");
    return res;
  }

  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (STAFF_ROLES.includes(role ?? "") && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  res.headers.set("x-user-id", (user.app_metadata?.prisma_id as string) ?? user.id);
  res.headers.set("x-user-role", role ?? "user");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
