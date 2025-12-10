import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/lastfm"
import { setSessionKey } from "@/lib/kv"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token")

  console.log("[v0] Callback received - token exists:", !!token)

  if (!token) {
    console.log("[v0] Callback failed - no token provided")
    return NextResponse.redirect(new URL("/?error=no_token", request.url))
  }

  try {
    console.log("[v0] Attempting to get session from Last.fm...")

    // Exchange token for session key
    const { session, name } = await getSession(token)

    console.log("[v0] Session obtained for user:", name)
    console.log("[v0] Session key exists:", !!session)

    // Store session key in KV
    await setSessionKey(name, session)

    console.log("[v0] Session key stored in KV for user:", name)

    // Redirect to dashboard with username in query
    const redirectUrl = new URL("/api/set-auth", request.url)
    redirectUrl.searchParams.set("username", name)

    console.log("[v0] Redirecting to set-auth with username:", name)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("[v0] Auth callback error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }
}
