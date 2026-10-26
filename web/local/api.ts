import { useEffect, useState } from "react"

/* Talks to the module's node_helper (node_helper.js > registerRoutes) */

export const ONSP_URL = "https://onsp.fabriziob.com/"
export const GUIDE_URL =
  "https://github.com/Fabrizz/MMM-OnSpotify#spotify-login-expires-every-6-months"

/*
 * onsp handoff. The first time (in this browser) the user goes through onsp /connect to save
 * the mirror there. After that the mirror can start the Spotify login directly.
 */
const HANDOFF_READY_KEY = "onsp-handoff-ready"

export function isHandoffReady() {
  try {
    return localStorage.getItem(HANDOFF_READY_KEY) === "1"
  } catch {
    return false
  }
}

function markHandoffReady() {
  try {
    localStorage.setItem(HANDOFF_READY_KEY, "1")
  } catch {
    // Private mode: the next handoff goes through /connect again, which still works
  }
}

export function handoffUrl() {
  if (isHandoffReady()) return "./api/auth/start"
  // This page's address is the one that reached the mirror, onsp sends the login back here
  const page = new URL("./", window.location.href).href
  return `${ONSP_URL}connect?mirror=${encodeURIComponent(page)}`
}

/** Result of a handoff (?reauth=ok|error&reason=...), read once and removed from the URL. */
export function readReauthResult(): { ok: boolean; reason: string | null } | null {
  const params = new URLSearchParams(window.location.search)
  const reauth = params.get("reauth")
  if (!reauth) return null
  window.history.replaceState({}, document.title, window.location.pathname)
  if (reauth === "ok") markHandoffReady()
  return { ok: reauth === "ok", reason: params.get("reason") }
}

export type ModuleState = "waiting" | "connected" | "reauth" | "error"

export type Status = {
  state: ModuleState
  error: string | null
  user: { name: string; image: string | null; product?: string } | null
  token: {
    source: "config" | "credentials"
    // null when we don't know when the user authorized (tokens from config.js)
    authorizedAt: number | null
    expiresBy: number | null
  } | null
  // Redirect URI the Spotify App needs for the onsp handoff (module option authRedirectUri)
  redirectUri?: string
}

export type NowPlaying = {
  empty?: true
  filteredDevice?: string | null
  private?: true
  name?: string
  artists?: string
  album?: string | null
  image?: string | null
  uri?: string
  type?: string
  device?: string
  deviceType?: string
  isPlaying?: boolean
  progress?: number
  duration?: number
  // Local time when the page got the event, progress is animated from here
  receivedAt: number
}

/** Live module state from the SSE stream (./api/events). */
export function useModuleEvents() {
  const [status, setStatus] = useState<Status | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const source = new EventSource("./api/events")
    source.onopen = () => setOnline(true)
    // EventSource reconnects by itself (retry sent by the server)
    source.onerror = () => setOnline(false)
    source.addEventListener("status", (e) => setStatus(JSON.parse(e.data)))
    source.addEventListener("nowPlaying", (e) =>
      setNowPlaying({ ...JSON.parse(e.data), receivedAt: Date.now() }),
    )
    return () => source.close()
  }, [])

  return { status, setStatus, nowPlaying, online }
}

async function send(method: "POST" | "DELETE", path: string, body?: unknown) {
  // JSON content type is required by the module (blocks cross-site requests)
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as Status
}

/** Tests the token with Spotify and saves it to .credentials.json. */
export const setRefreshToken = (refreshToken: string) =>
  send("POST", "./api/auth/token", { refreshToken })

/** Forgets the saved token, the module uses the one in config.js again. */
export const resetToConfigToken = () => send("DELETE", "./api/auth")
