import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/lastfm"
import { setSessionKey } from "@/lib/kv"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/?error=no_token", request.url))
  }

  try {
    // Exchange token for session key
    const { session, name } = await getSession(token)

    // Store session key in KV
    await setSessionKey(name, session)

    // Redirect to dashboard with username in query
    const redirectUrl = new URL("/api/set-auth", request.url)
    redirectUrl.searchParams.set("username", name)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }
}
