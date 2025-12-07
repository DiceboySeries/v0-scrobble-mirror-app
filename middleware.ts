import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  // For API routes that need username, try to get it from cookie
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const username = request.cookies.get("lastfm_username")?.value

    if (username) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-username", username)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
