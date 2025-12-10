import { NextResponse } from "next/server"

export async function GET() {
  const API_KEY = process.env.LASTFM_API_KEY
  const CALLBACK_URL = `${process.env.NEXT_PUBLIC_DOMAIN}/api/callback`

  console.log("[v0] Login attempt - API_KEY exists:", !!API_KEY)
  console.log("[v0] Login attempt - CALLBACK_URL:", CALLBACK_URL)

  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  const authUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(CALLBACK_URL)}`

  console.log("[v0] Redirecting to Last.fm:", authUrl)

  return NextResponse.redirect(authUrl)
}
