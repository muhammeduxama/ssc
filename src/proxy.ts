import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: real authorisation happens in pages and route handlers.
export function proxy(req: NextRequest) {
  const has = req.cookies.has("ssc-session");
  if (!has) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/orders/:path*", "/messages/:path*", "/customers/:path*", "/mechanics/:path*", "/settings/:path*"],
};
