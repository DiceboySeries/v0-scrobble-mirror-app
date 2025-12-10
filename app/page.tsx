"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedUsername = localStorage.getItem("lastfm_username")
    setUsername(storedUsername)

    const errorParam = searchParams.get("error")
    if (errorParam) {
      switch (errorParam) {
        case "no_token":
          setError("Authentication failed: No token received from Last.fm")
          break
        case "auth_failed":
          setError("Authentication failed: Unable to verify with Last.fm. Check console logs for details.")
          break
        default:
          setError("Authentication failed: Unknown error")
      }
    }

    setLoading(false)
  }, [searchParams])

  const handleLogin = () => {
    setError(null)
    window.location.href = "/api/login"
  }

  const handleDashboard = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm tracking-wider uppercase">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-sm tracking-widest uppercase font-light">ScrobbleMirror</h1>
          <div className="text-xs tracking-wider uppercase text-muted-foreground space-x-6">
            {username && <span>Dashboard</span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-20 pb-20 px-6">
        <div className="max-w-md w-full text-center space-y-12">
          {/* Title Section */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight">SCROBBLE MIRROR</h2>
            <p className="text-sm tracking-wide text-muted-foreground uppercase leading-relaxed">
              Automatically mirror Last.fm scrobbles between accounts
            </p>
          </div>

          {error && (
            <div className="border border-foreground bg-foreground/5 p-6 text-left">
              <p className="text-xs tracking-wider uppercase text-muted-foreground mb-2">Error</p>
              <p className="text-sm tracking-wide font-light">{error}</p>
              <p className="text-xs tracking-wide text-muted-foreground mt-4">
                Make sure LASTFM_API_KEY, LASTFM_SECRET, and NEXT_PUBLIC_DOMAIN are configured correctly.
              </p>
            </div>
          )}

          {/* Action Section */}
          <div className="space-y-6">
            {username ? (
              <div className="space-y-8">
                <div className="py-8 border-y border-border">
                  <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">Logged in as</p>
                  <p className="text-lg tracking-wide font-light">{username}</p>
                </div>
                <button
                  onClick={handleDashboard}
                  className="w-full py-4 px-8 bg-foreground text-background text-xs tracking-widest uppercase font-light border border-foreground hover:bg-background hover:text-foreground transition-colors duration-200"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full py-4 px-8 bg-foreground text-background text-xs tracking-widest uppercase font-light border border-foreground hover:bg-background hover:text-foreground transition-colors duration-200"
              >
                Log in with Last.fm
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs tracking-wider uppercase text-muted-foreground">Powered by Last.fm API</p>
        </div>
      </footer>
    </div>
  )
}
