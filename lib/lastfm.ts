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
  const params = {
    method: "auth.getSession",
    api_key: API_KEY,
    token,
  }

  const api_sig = sign(params)

  const response = await axios.get(BASE_URL, {
    params: {
      ...params,
      api_sig,
      format: "json",
    },
  })

  if (response.data.error) {
    throw new Error(response.data.message)
  }

  return {
    session: response.data.session.key,
    name: response.data.session.name,
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

  // Return all tracks including "now playing" (we'll handle them separately)
  return Array.isArray(tracks) ? tracks : tracks ? [tracks] : []
}

// Update Now Playing for a track
export async function updateNowPlaying(
  track: { artist: string; name: string; album?: string },
  sessionKey: string,
): Promise<boolean> {
  const params: Record<string, string> = {
    method: "track.updateNowPlaying",
    api_key: API_KEY,
    sk: sessionKey,
    artist: track.artist,
    track: track.name,
  }

  if (track.album) {
    params.album = track.album
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

    if (response.data.error) {
      console.error("Now Playing error:", response.data.message)
      return false
    }

    return true
  } catch (error) {
    console.error("Now Playing error:", error)
    return false
  }
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
