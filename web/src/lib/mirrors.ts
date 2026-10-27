/*
 * Mirrors saved in this browser (onsp.fabriziob.com/my), used for the module page handoff:
 * mirror page > /connect (save mirror) > mirror auth/start > Spotify > / (redirect URI) > mirror auth/callback
 * Only the mirror address is saved here. The client secret never leaves the mirror.
 */

export type Mirror = {
  // Module page address, e.g. http://192.168.1.20:8080/onspotify/
  url: string
  name: string
  savedAt: number
  lastUsedAt?: number
}

const STORAGE_KEY = "ONSP_MIRRORS"
// Path of the module page on the mirror (node_helper.js > pageBase)
const MIRROR_PAGE_PATH = "/onspotify/"
// Must match node_helper.js > mirrorStatePrefix
export const MIRROR_STATE_PREFIX = "onsp-mirror"

export function loadMirrors(): Mirror[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function storeMirrors(mirrors: Mirror[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mirrors))
}

/**
 * Accepts "192.168.1.20:8080", "http://mirror.local:8080" or a full module page URL,
 * and returns the module page URL. Throws if it is not an http(s) address.
 */
export function normalizeMirrorUrl(input: string) {
  const value = input.trim()
  const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`)
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https addresses are supported")
  return `${url.origin}${MIRROR_PAGE_PATH}`
}

export const mirrorHost = (url: string) => new URL(url).host

export const findMirror = (url: string) => loadMirrors().find((m) => m.url === url)

export function saveMirror(url: string, name?: string) {
  const mirrors = loadMirrors()
  const existing = mirrors.find((m) => m.url === url)
  if (existing) {
    if (name) existing.name = name
  } else {
    mirrors.push({ url, name: name || mirrorHost(url), savedAt: Date.now() })
  }
  storeMirrors(mirrors)
}

export function renameMirror(url: string, name: string) {
  storeMirrors(loadMirrors().map((m) => (m.url === url ? { ...m, name } : m)))
}

export function removeMirror(url: string) {
  storeMirrors(loadMirrors().filter((m) => m.url !== url))
}

export function touchMirror(url: string) {
  storeMirrors(loadMirrors().map((m) => (m.url === url ? { ...m, lastUsedAt: Date.now() } : m)))
}

/** Starts the Spotify login on the mirror (the mirror builds the Spotify URL with its client id). */
export const mirrorStartUrl = (mirror: string) => new URL("api/auth/start?mirrorSaved=1", mirror).href

export const isMirrorState = (state: string | null) => !!state && state.startsWith(`${MIRROR_STATE_PREFIX}.`)

/** The mirror address embedded in the login state: onsp-mirror.<nonce>.<base64url(mirror page url)> */
export function mirrorFromState(state: string) {
  try {
    const encoded = state.split(".")[2]
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    return normalizeMirrorUrl(atob(base64))
  } catch {
    return null
  }
}

/** Where to send the Spotify login (code, state or error) on the mirror. */
export function mirrorCallbackUrl(mirror: string, params: URLSearchParams) {
  const url = new URL("api/auth/callback", mirror)
  for (const key of ["code", "state", "error"]) {
    const value = params.get(key)
    if (value) url.searchParams.set(key, value)
  }
  return url.href
}
