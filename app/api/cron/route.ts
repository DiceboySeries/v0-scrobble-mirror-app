import { type NextRequest, NextResponse } from "next/server"
import {
  getAllMirroringUsers,
  getMirrorConfig,
  getSessionKey,
  getScrobbleHistory,
  addToScrobbleHistory,
} from "@/lib/kv"
import { getRecentTracks, scrobbleToA } from "@/lib/lastfm"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[ScrobbleMirror] Cron job started")

    const users = await getAllMirroringUsers()
    console.log(`[ScrobbleMirror] Found ${users.length} active mirroring users`)

    let totalMirrored = 0

    for (const username of users) {
      try {
        const config = await getMirrorConfig(username)
        if (!config || !config.enabled) continue

        const sessionKey = await getSessionKey(username)
        if (!sessionKey) {
          console.log(`[ScrobbleMirror] No session key for ${username}, skipping`)
          continue
        }

        const recentTracks = await getRecentTracks(config.accountB, 50)
        console.log(`[ScrobbleMirror] Found ${recentTracks.length} recent tracks for ${config.accountB}`)

        // Get existing history to avoid duplicates
        const history = await getScrobbleHistory(username)
        const existingTimestamps = new Set(history.map((t) => t.timestamp))

        // Mirror new tracks
        for (const track of recentTracks) {
          // Check if this is a "now playing" track (has @attr with nowplaying=true)
          const isNowPlaying = track["@attr"]?.nowplaying === "true"
          
          // Skip now playing tracks - they should only be scrobbled after they're actually played
          if (isNowPlaying) {
            console.log(`[ScrobbleMirror] Skipping now playing track: ${track.name}`)
            continue
          }

          // Get timestamp from track
          const timestamp = track.date?.uts
          
          // Skip tracks without timestamps
          if (!timestamp) {
            console.log(`[ScrobbleMirror] Skipping track without timestamp: ${track.name}`)
            continue
          }

          // Skip if already mirrored
          if (existingTimestamps.has(timestamp)) {
            continue
          }

          // Scrobble to Account A
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
            // Add to history
            await addToScrobbleHistory(username, {
              artist: track.artist["#text"] || track.artist,
              track: track.name,
              album: track.album?.["#text"] || track.album,
              timestamp,
              mirroredAt: new Date().toISOString(),
            })

            totalMirrored++
            console.log(`[ScrobbleMirror] Mirrored: ${track.name} by ${track.artist["#text"] || track.artist}`)
          } else {
            console.log(`[ScrobbleMirror] Failed to mirror: ${track.name}`)
          }

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`[ScrobbleMirror] Error processing user ${username}:`, error)
      }
    }

    console.log(`[ScrobbleMirror] Cron job completed. Mirrored ${totalMirrored} tracks`)

    return NextResponse.json({
      success: true,
      users: users.length,
      mirrored: totalMirrored,
    })
  } catch (error) {
    console.error("[ScrobbleMirror] Cron job error:", error)
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 })
  }
}
