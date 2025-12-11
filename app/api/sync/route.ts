import { type NextRequest, NextResponse } from "next/server"
import {
  getMirrorConfig,
  getSessionKey,
  getScrobbleHistory,
  addToScrobbleHistory,
  getAllMirroringUsers,
} from "@/lib/kv"
import { getRecentTracks, getNowPlayingTrack, scrobbleToA, updateNowPlayingToA } from "@/lib/lastfm"

const CRON_AUTH_TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.QWxhZGRpbjpPcGVuU2VzYW1lU2FtcGxlUGF5bG9hZA.7f1d9c4f0c3f9e1bb28f2ac9876e8d93"

async function syncUser(username: string): Promise<{ mirrored: number; total: number }> {
  const config = await getMirrorConfig(username)
  if (!config || !config.enabled) {
    return { mirrored: 0, total: 0 }
  }

  const sessionKey = await getSessionKey(username)
  if (!sessionKey) {
    return { mirrored: 0, total: 0 }
  }

  // Update now playing status
  const nowPlayingTrack = await getNowPlayingTrack(config.accountB)
  if (nowPlayingTrack) {
    await updateNowPlayingToA(
      {
        artist: nowPlayingTrack.artist["#text"] || nowPlayingTrack.artist,
        name: nowPlayingTrack.name,
        album: nowPlayingTrack.album?.["#text"] || nowPlayingTrack.album,
      },
      sessionKey,
    )
  }

  const recentTracks = await getRecentTracks(config.accountB, 20)
  const history = await getScrobbleHistory(username)
  const existingTimestamps = new Set(history.map((t) => t.timestamp))

  let mirrored = 0

  for (const track of recentTracks) {
    const timestamp = track.date.uts

    if (existingTimestamps.has(timestamp)) {
      continue
    }

    const success = await scrobbleToA(
      {
        artist: track.artist["#text"] || track.artist,
        name: track.name,
        album: track.album?.["#text"] || track.album,
      },
      timestamp,
      sessionKey,
    )

    if (success) {
      await addToScrobbleHistory(username, {
        artist: track.artist["#text"] || track.artist,
        track: track.name,
        album: track.album?.["#text"] || track.album,
        timestamp,
        mirroredAt: new Date().toISOString(),
      })
      mirrored++
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return { mirrored, total: recentTracks.length }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    // If there's an auth header, validate it (external cron job)
    // If no auth header, it's from the dashboard (still allowed)
    if (authHeader && authHeader !== CRON_AUTH_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { username } = body

    if (!username) {
      const allUsers = await getAllMirroringUsers()

      if (allUsers.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No users with mirroring enabled",
          usersSynced: 0,
        })
      }

      let totalMirrored = 0
      let totalTracks = 0
      const results: Record<string, { mirrored: number; total: number }> = {}

      for (const user of allUsers) {
        const result = await syncUser(user)
        results[user] = result
        totalMirrored += result.mirrored
        totalTracks += result.total
      }

      return NextResponse.json({
        success: true,
        usersSynced: allUsers.length,
        totalMirrored,
        totalTracks,
        results,
      })
    }

    const result = await syncUser(username)

    return NextResponse.json({
      success: true,
      mirrored: result.mirrored,
      total: result.total,
    })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: "Failed to sync tracks" }, { status: 500 })
  }
}
