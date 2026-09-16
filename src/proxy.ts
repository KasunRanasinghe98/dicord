import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";

// Route-prefix -> allowed roles. This is a UX convenience (redirect to
// login instead of showing a broken page) — every actual data operation is
// still authorized server-side per-request via requireRole() (§26).
const PROTECTED_PREFIXES: Record<string, string[]> = {
  "/worker": ["WORKER"],
  "/employer": ["EMPLOYER"],
  "/coordinator": ["COORDINATOR", "ADMIN"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(PROTECTED_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix),
  );
  if (!matchedPrefix) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!PROTECTED_PREFIXES[matchedPrefix].includes(session.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/worker/:path*", "/employer/:path*", "/coordinator/:path*"],
};
