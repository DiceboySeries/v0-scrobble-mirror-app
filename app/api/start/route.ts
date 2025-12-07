import { type NextRequest, NextResponse } from "next/server"
import { setMirrorConfig } from "@/lib/kv"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountB, username } = body

    if (!accountB || !username) {
      return NextResponse.json({ error: "Account B username and username required" }, { status: 400 })
    }

    await setMirrorConfig(username, accountB)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Start mirroring error:", error)
    return NextResponse.json({ error: "Failed to start mirroring" }, { status: 500 })
  }
}
