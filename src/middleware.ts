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

function isPublic(p: string) {
  return PUBLIC_EXACT.has(p) || PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|ttf|map|webp)$/)) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads JWT from cookie — local, no network call, handles chunked cookies
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const role = (user?.app_metadata?.role as string) ?? null;

  if (isPublic(pathname)) return res;

  const redirectTo = (path: string) => {
    const url = new URL(path, req.url);
    if (path.includes("login")) url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    if (!user) return redirectTo("/admin/login");
    if (!STAFF_ROLES.includes(role ?? "")) return redirectTo("/dashboard");
    res.headers.set("x-user-id", (user.app_metadata?.prisma_id as string) ?? user.id);
    res.headers.set("x-user-role", role ?? "user");
    res.headers.set("x-user-email", user.email ?? "");
    return res;
  }

  if (!user) return redirectTo("/login");

  if (STAFF_ROLES.includes(role ?? "") && pathname === "/dashboard") {
    return redirectTo("/admin");
  }

  res.headers.set("x-user-id", (user.app_metadata?.prisma_id as string) ?? user.id);
  res.headers.set("x-user-role", role ?? "user");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
