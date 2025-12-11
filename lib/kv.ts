import { put, list, del, copy } from '@vercel/blob'

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

// Simple JSON storage helpers
async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (blobs.length === 0) return null
    
    const response = await fetch(blobs[0].url)
    return await response.json()
  } catch (error) {
    console.error(`[Blob] Error getting ${key}:`, error)
    return null
  }
}

async function putJSON<T>(key: string, data: T): Promise<void> {
  try {
    // Check if blob exists
    const { blobs } = await list({ prefix: key, limit: 1 })
    
    if (blobs.length > 0) {
      // Delete existing blob first
      await del(blobs[0].url)
    }
    
    // Put new blob
    await put(key, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    })
  } catch (error) {
    console.error(`[Blob] Error putting ${key}:`, error)
    throw error
  }
}

// Session key functions
export async function getSessionKey(username: string): Promise<string | null> {
  const data = await getJSON<string>(`session/${username}.json`)
  return data
}

export async function setSessionKey(username: string, sessionKey: string): Promise<void> {
  await putJSON(`session/${username}.json`, sessionKey)
}

// Mirror config functions
export async function getMirrorConfig(username: string): Promise<MirrorConfig | null> {
  const accountB = await getJSON<string>(`mirror/${username}.json`)
  const enabled = await getJSON<boolean>(`enabled/${username}.json`)

  if (!accountB) return null

  return {
    accountB,
    enabled: enabled ?? false,
  }
}

export async function setMirrorConfig(username: string, accountB: string): Promise<void> {
  await putJSON(`mirror/${username}.json`, accountB)
  await putJSON(`enabled/${username}.json`, true)
}

export async function setMirrorEnabled(username: string, enabled: boolean): Promise<void> {
  await putJSON(`enabled/${username}.json`, enabled)
}

// Scrobble history functions
export async function getScrobbleHistory(username: string): Promise<ScrobbledTrack[]> {
  const history = await getJSON<ScrobbledTrack[]>(`history/${username}.json`)
  return history || []
}

export async function addToScrobbleHistory(username: string, track: ScrobbledTrack): Promise<void> {
  const history = await getScrobbleHistory(username)
  
  // Check for duplicates by timestamp
  if (history.some(t => t.timestamp === track.timestamp)) {
    console.log('[Blob] Track already exists in history (duplicate), ignoring')
    return
  }
  
  history.unshift(track)

  // Keep only last 100 tracks
  const trimmed = history.slice(0, 100)
  await putJSON(`history/${username}.json`, trimmed)
}

export async function getAllMirroringUsers(): Promise<string[]> {
  try {
    // Get all keys that match the pattern "enabled/*"
    const { blobs } = await list({ prefix: 'enabled/' })
    const users: string[] = []

    for (const blob of blobs) {
      const enabled = await getJSON<boolean>(blob.pathname)
      if (enabled) {
        // Extract username from "enabled/username.json"
        const username = blob.pathname.replace('enabled/', '').replace('.json', '')
        users.push(username)
      }
    }

    return users
  } catch (error) {
    console.error('[Blob] Error getting all mirroring users:', error)
    return []
  }
}
