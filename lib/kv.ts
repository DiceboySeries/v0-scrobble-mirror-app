import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

// Supabase helper functions
export async function getSessionKey(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('session_key')
    .eq('username', username)
    .maybeSingle()

  if (error || !data) return null
  return data.session_key
}

export async function setSessionKey(username: string, sessionKey: string): Promise<void> {
  await supabase
    .from('sessions')
    .upsert({ username, session_key: sessionKey })
}

export async function getMirrorConfig(username: string): Promise<MirrorConfig | null> {
  const { data, error } = await supabase
    .from('mirror_config')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error || !data) return null
  
  return {
    accountB: data.account_b,
    enabled: data.enabled,
  }
}

export async function setMirrorConfig(username: string, accountB: string): Promise<void> {
  await supabase
    .from('mirror_config')
    .upsert({ 
      username, 
      account_b: accountB, 
      enabled: true,
      updated_at: new Date().toISOString()
    })
}

export async function setMirrorEnabled(username: string, enabled: boolean): Promise<void> {
  await supabase
    .from('mirror_config')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('username', username)
}

export async function getScrobbleHistory(username: string): Promise<ScrobbledTrack[]> {
  const { data, error } = await supabase
    .from('scrobble_history')
    .select('*')
    .eq('username', username)
    .order('mirrored_at', { ascending: false })
    .limit(100)

  if (error || !data) return []

  return data.map(row => ({
    artist: row.artist,
    track: row.track,
    album: row.album,
    timestamp: row.timestamp,
    mirroredAt: row.mirrored_at,
  }))
}

export async function addToScrobbleHistory(username: string, track: ScrobbledTrack): Promise<void> {
  try {
    await supabase
      .from('scrobble_history')
      .insert({
        username,
        artist: track.artist,
        track: track.track,
        album: track.album,
        timestamp: track.timestamp,
      })
  } catch (error) {
    // Silently ignore duplicates
    console.log('Track may already exist:', track.track)
  }
}

export async function getAllMirroringUsers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('mirror_config')
    .select('username')
    .eq('enabled', true)

  if (error || !data) return []
  return data.map(row => row.username)
}
