import { put, list, del } from '@vercel/blob'

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
    const { blobs } = await list({ prefix: key })
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
    await put(key, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    })
  } catch (error) {
    console.error(`[Blob] Error putting ${key}:`, error)
    throw error
  }
}

async function deleteKey(key: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: key })
    for (const blob of blobs) {
      await del(blob.url)
    }
  } catch (error) {
    console.error(`[Blob] Error deleting ${key}:`, error)
  }
}

// Session key functions
export async function getSessionKey(username: string): Promise<string | null> {
  console.log('[Blob] Getting session key for:', username)
  const data = await getJSON<{ sessionKey: string }>(`sessions/${username}.json`)
  return data?.sessionKey || null
}

export async function setSessionKey(username: string, sessionKey: string): Promise<void> {
  console.log('[Blob] Setting session key for:', username)
  await putJSON(`sessions/${username}.json`, { sessionKey })
}

// Mirror config functions
export async function getMirrorConfig(username: string): Promise<MirrorConfig | null> {
  console.log('[Blob] Getting mirror config for:', username)
  return await getJSON<MirrorConfig>(`config/${username}.json`)
}

export async function setMirrorConfig(username: string, accountB: string): Promise<void> {
  console.log('[Blob] Setting mirror config for:', username, 'accountB:', accountB)
  await putJSON(`config/${username}.json`, {
    accountB,
    enabled: true,
  })
}

export async function setMirrorEnabled(username: string, enabled: boolean): Promise<void> {
  console.log('[Blob] Setting mirror enabled for:', username, 'to:', enabled)
  const config = await getMirrorConfig(username)
  if (config) {
    await putJSON(`config/${username}.json`, {
      ...config,
      enabled,
    })
  }
}

// Scrobble history functions
export async function getScrobbleHistory(username: string): Promise<ScrobbledTrack[]> {
  console.log('[Blob] Getting scrobble history for:', username)
  const data = await getJSON<{ tracks: ScrobbledTrack[] }>(`history/${username}.json`)
  return data?.tracks || []
}

export async function addToScrobbleHistory(username: string, track: ScrobbledTrack): Promise<void> {
  console.log('[Blob] Adding to scrobble history for:', username, 'track:', track.track)
  
  const history = await getScrobbleHistory(username)
  
  // Check for duplicates by timestamp
  if (history.some(t => t.timestamp === track.timestamp)) {
    console.log('[Blob] Track already exists in history (duplicate), ignoring')
    return
  }
  
  // Add new track and keep only last 1000 tracks
  history.unshift(track)
  const trimmed = history.slice(0, 1000)
  
  await putJSON(`history/${username}.json`, { tracks: trimmed })
  console.log('[Blob] Track added to history successfully')
}

export async function getAllMirroringUsers(): Promise<string[]> {
  console.log('[Blob] Getting all mirroring users...')
  
  try {
    const { blobs } = await list({ prefix: 'config/' })
    const users: string[] = []
    
    for (const blob of blobs) {
      // Extract username from path: config/username.json
      const username = blob.pathname.replace('config/', '').replace('.json', '')
      
      // Check if enabled
      const config = await getMirrorConfig(username)
      if (config?.enabled) {
        users.push(username)
      }
    }
    
    console.log('[Blob] Found', users.length, 'mirroring users:', users)
    return users
  } catch (error) {
    console.error('[Blob] Error getting all mirroring users:', error)
    return []
  }
}
