import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  const pathname = req.nextUrl.pathname;
  const isHandlePage = /^\/v\/[^/]+$/.test(pathname);

  if (isHandlePage && accept.includes("application/intent+json")) {
    const url = req.nextUrl.clone();
    url.pathname = `${pathname}/intent`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/v/:handle",
};
