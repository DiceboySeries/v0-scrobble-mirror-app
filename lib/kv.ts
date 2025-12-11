import { Redis } from "@upstash/redis"

// Initialize Upstash Redis client
export const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Helper types
export interface MirrorConfig {
  accountB: string
  enabled: boolean
}

export interface ScrobbledTrack {
  artist: string
  track: string
  album?: string
  timestamp: string
  mirroredAt: string
}

// KV helper functions
export async function getSessionKey(username: string): Promise<string | null> {
  return await kv.get(`session:${username}`)
}

export async function setSessionKey(username: string, sessionKey: string): Promise<void> {
  await kv.set(`session:${username}`, sessionKey)
}

export async function getMirrorConfig(username: string): Promise<MirrorConfig | null> {
  const accountB = await kv.get<string>(`mirror:${username}`)
  const enabled = await kv.get<boolean>(`enabled:${username}`)

  if (!accountB) return null

  return {
    accountB,
    enabled: enabled ?? false,
  }
}

export async function setMirrorConfig(username: string, accountB: string): Promise<void> {
  await kv.set(`mirror:${username}`, accountB)
  await kv.set(`enabled:${username}`, true)
}

export async function setMirrorEnabled(username: string, enabled: boolean): Promise<void> {
  await kv.set(`enabled:${username}`, enabled)
}

export async function getScrobbleHistory(username: string): Promise<ScrobbledTrack[]> {
  const history = await kv.get<ScrobbledTrack[]>(`history:${username}`)
  return history || []
}

export async function addToScrobbleHistory(username: string, track: ScrobbledTrack): Promise<void> {
  const history = await getScrobbleHistory(username)
  history.unshift(track)

  // Keep only last 100 tracks
  const trimmed = history.slice(0, 100)
  await kv.set(`history:${username}`, trimmed)
}

export async function getAllMirroringUsers(): Promise<string[]> {
  // Get all keys that match the pattern "enabled:*"
  const keys = await kv.keys("enabled:*")
  const users: string[] = []

  for (const key of keys) {
    const enabled = await kv.get<boolean>(key)
    if (enabled) {
      // Extract username from "enabled:username"
      const username = key.replace("enabled:", "")
      users.push(username)
    }
  }

  return users
}
