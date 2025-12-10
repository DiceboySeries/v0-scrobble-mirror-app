import crypto from "crypto"
import axios from "axios"

const API_KEY = process.env.LASTFM_API_KEY!
const API_SECRET = process.env.LASTFM_SECRET!
const BASE_URL = "https://ws.audioscrobbler.com/2.0/"

// Create API signature according to Last.fm rules
export function sign(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("")

  return crypto
    .createHash("md5")
    .update(sorted + API_SECRET)
    .digest("hex")
}

// Get session key from auth token
export async function getSession(token: string): Promise<{ session: string; name: string }> {
  console.log("[v0] getSession called with token:", token.substring(0, 10) + "...")
  console.log("[v0] API_KEY exists:", !!API_KEY)
  console.log("[v0] API_SECRET exists:", !!API_SECRET)

  const params = {
    method: "auth.getSession",
    api_key: API_KEY,
    token,
  }

  const api_sig = sign(params)

  console.log("[v0] API signature generated:", api_sig.substring(0, 10) + "...")

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        ...params,
        api_sig,
        format: "json",
      },
    })

    console.log("[v0] Last.fm API response status:", response.status)
    console.log("[v0] Last.fm API response data:", JSON.stringify(response.data))

    if (response.data.error) {
      console.error("[v0] Last.fm API error:", response.data.message)
      throw new Error(response.data.message)
    }

    return {
      session: response.data.session.key,
      name: response.data.session.name,
    }
  } catch (error) {
    console.error("[v0] getSession error:", error)
    throw error
  }
}

// Get recent tracks for a username
export async function getRecentTracks(username: string, limit = 10) {
  const response = await axios.get(BASE_URL, {
    params: {
      method: "user.getrecenttracks",
      user: username,
      api_key: API_KEY,
      format: "json",
      limit,
    },
  })

  if (response.data.error) {
    throw new Error(response.data.message)
  }

  const tracks = response.data.recenttracks?.track || []

  // Filter out "now playing" tracks (they don't have a timestamp)
  return Array.isArray(tracks) ? tracks.filter((t: any) => t.date?.uts) : tracks.date?.uts ? [tracks] : []
}

// Scrobble a track to Account A
export async function scrobbleToA(
  track: { artist: string; name: string; album?: string },
  timestamp: string,
  sessionKey: string,
): Promise<boolean> {
  const params: Record<string, string> = {
    method: "track.scrobble",
    api_key: API_KEY,
    sk: sessionKey,
    "artist[0]": track.artist,
    "track[0]": track.name,
    "timestamp[0]": timestamp,
  }

  if (track.album) {
    params["album[0]"] = track.album
  }

  const api_sig = sign(params)

  try {
    const response = await axios.post(
      BASE_URL,
      new URLSearchParams({
        ...params,
        api_sig,
        format: "json",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )

    return !response.data.error
  } catch (error) {
    console.error("Scrobble error:", error)
    return false
  }
}
