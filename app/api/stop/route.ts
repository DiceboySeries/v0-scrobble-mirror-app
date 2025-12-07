import { type NextRequest, NextResponse } from "next/server"
import { setMirrorEnabled } from "@/lib/kv"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 })
    }

    await setMirrorEnabled(username, false)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stop mirroring error:", error)
    return NextResponse.json({ error: "Failed to stop mirroring" }, { status: 500 })
  }
}
