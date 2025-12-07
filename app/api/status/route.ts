import { type NextRequest, NextResponse } from "next/server"
import { getMirrorConfig, getScrobbleHistory } from "@/lib/kv"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const username = url.searchParams.get("username")

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 })
    }

    const config = await getMirrorConfig(username)
    const history = await getScrobbleHistory(username)

    return NextResponse.json({ config, history })
  } catch (error) {
    console.error("Status error:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}
