"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

interface ScrobbledTrack {
  artist: string
  track: string
  album?: string
  timestamp: string
  mirroredAt: string
}

interface MirrorConfig {
  accountB: string
  enabled: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [accountB, setAccountB] = useState("")
  const [config, setConfig] = useState<MirrorConfig | null>(null)
  const [history, setHistory] = useState<ScrobbledTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    const storedUsername = localStorage.getItem("lastfm_username")
    if (!storedUsername) {
      router.push("/")
      return
    }
    setUsername(storedUsername)
    fetchDashboardData(storedUsername)
  }, [router])

  useEffect(() => {
    if (!autoRefresh || !username) return

    const interval = setInterval(() => {
      fetchDashboardData(username)
    }, 60000)

    return () => clearInterval(interval)
  }, [autoRefresh, username])

  const fetchDashboardData = async (user: string) => {
    try {
      const response = await fetch(`/api/status?username=${user}`)
      const data = await response.json()

      if (data.config) {
        setConfig(data.config)
        setAccountB(data.config.accountB || "")
      }

      setHistory(data.history || [])
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartMirroring = async () => {
    if (!accountB.trim()) {
      alert("Please enter Account B username")
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountB: accountB.trim(), username }),
      })

      if (response.ok) {
        await fetchDashboardData(username!)
      } else {
        alert("Failed to start mirroring")
      }
    } catch (error) {
      console.error("Failed to start mirroring:", error)
      alert("Failed to start mirroring")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStopMirroring = async () => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      if (response.ok) {
        await fetchDashboardData(username!)
      } else {
        alert("Failed to stop mirroring")
      }
    } catch (error) {
      console.error("Failed to stop mirroring:", error)
      alert("Failed to stop mirroring")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncNow = async () => {
    if (!username) return

    setSyncLoading(true)
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchDashboardData(username)
        alert(
          data.mirrored > 0
            ? `Successfully synced ${data.mirrored} new track(s)!`
            : "No new tracks to sync at this time.",
        )
      } else {
        alert(data.error || "Failed to sync")
      }
    } catch (error) {
      console.error("Failed to sync:", error)
      alert("Failed to sync tracks")
    } finally {
      setSyncLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("lastfm_username")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm tracking-wider uppercase">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-sm tracking-widest uppercase font-light">ScrobbleMirror</h1>
          <button
            onClick={handleLogout}
            className="text-xs tracking-wider uppercase hover:text-muted-foreground transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="space-y-16">
          {/* Account Info */}
          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-6">Account Information</h2>
            <div className="border border-border p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-foreground flex items-center justify-center">
                  <span className="text-background text-lg font-light">{username?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-xs tracking-wider uppercase text-muted-foreground mb-1">Account A (Destination)</p>
                  <p className="text-base tracking-wide font-light">{username}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Mirror Configuration */}
          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-6">Mirror Configuration</h2>
            <div className="border border-border p-8 space-y-8">
              <div className="space-y-3">
                <label htmlFor="accountB" className="block text-xs tracking-wider uppercase text-muted-foreground">
                  Account B Username (Source)
                </label>
                <Input
                  id="accountB"
                  placeholder="Enter Last.fm username to mirror from"
                  value={accountB}
                  onChange={(e) => setAccountB(e.target.value)}
                  disabled={config?.enabled}
                  className="w-full border-border bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex gap-4">
                {config?.enabled ? (
                  <button
                    onClick={handleStopMirroring}
                    disabled={actionLoading}
                    className="flex-1 py-3 px-6 bg-foreground text-background text-xs tracking-widest uppercase font-light border border-foreground hover:bg-background hover:text-foreground transition-colors duration-200 disabled:opacity-50"
                  >
                    {actionLoading ? "Stopping..." : "Stop Mirroring"}
                  </button>
                ) : (
                  <button
                    onClick={handleStartMirroring}
                    disabled={actionLoading}
                    className="flex-1 py-3 px-6 bg-foreground text-background text-xs tracking-widest uppercase font-light border border-foreground hover:bg-background hover:text-foreground transition-colors duration-200 disabled:opacity-50"
                  >
                    {actionLoading ? "Starting..." : "Start Mirroring"}
                  </button>
                )}
              </div>

              {config && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs tracking-wider uppercase text-muted-foreground">Status:</span>
                    <span
                      className={`text-xs tracking-widest uppercase ${config.enabled ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {config.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Sync Controls */}
          {config?.enabled && (
            <section>
              <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-6">Sync Controls</h2>
              <div className="border border-border p-8 space-y-6">
                <button
                  onClick={handleSyncNow}
                  disabled={syncLoading}
                  className="w-full py-3 px-6 bg-foreground text-background text-xs tracking-widest uppercase font-light border border-foreground hover:bg-background hover:text-foreground transition-colors duration-200 disabled:opacity-50"
                >
                  {syncLoading ? "Syncing..." : "Sync Now"}
                </button>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 border-border"
                  />
                  <label htmlFor="autoRefresh" className="text-xs tracking-wider uppercase cursor-pointer">
                    Auto-refresh every minute
                  </label>
                </div>

                <p className="text-xs tracking-wide text-muted-foreground pt-2">
                  Automatic background syncing runs daily. Use these controls for immediate syncing.
                </p>
              </div>
            </section>
          )}

          {/* Recent Activity */}
          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-6">Recent Activity</h2>
            <div className="border border-border">
              {history.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-xs tracking-wider uppercase text-muted-foreground">
                    No tracks mirrored yet. Start mirroring to see activity here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {history.slice(0, 10).map((track, index) => (
                    <div key={index} className="p-6 hover:bg-muted/20 transition-colors">
                      <p className="text-sm font-light mb-1">{track.track}</p>
                      <p className="text-xs tracking-wide text-muted-foreground mb-3">
                        {track.artist}
                        {track.album && ` • ${track.album}`}
                      </p>
                      <p className="text-xs tracking-wider uppercase text-muted-foreground">
                        {new Date(track.mirroredAt).toLocaleDateString()} •{" "}
                        {new Date(track.mirroredAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
