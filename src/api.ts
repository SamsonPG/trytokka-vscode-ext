/**
 * src/api.ts
 * TryTokka widget API client.
 *
 * Calls /api/widget-summary with a Bearer token.
 * Same endpoint used by the Chrome extension and dashboard widget.
 * No proxy, no code changes — read-only billing data only.
 */

const API_BASE = 'https://trytokka.com'
const TIMEOUT_MS = 10_000

export interface SpendData {
  todayCost: number
  monthCost: number
  totalCost: number        // rolling 30-day
  topProvider: string | null
  alertStatus: 'safe' | 'warning' | 'critical'
  lastUpdated: string      // ISO timestamp
}

export type FetchResult =
  | { ok: true;  data: SpendData }
  | { ok: false; status: number; message: string }

function asFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Normalize/validate API JSON so a malformed payload never crashes the UI. */
export function parseSpendPayload(raw: unknown): SpendData | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const alert = o.alertStatus
  const alertStatus =
    alert === 'warning' || alert === 'critical' || alert === 'safe' ? alert : 'safe'
  const top =
    typeof o.topProvider === 'string' && o.topProvider.trim()
      ? o.topProvider.trim()
      : null
  const lastUpdated =
    typeof o.lastUpdated === 'string' && o.lastUpdated
      ? o.lastUpdated
      : new Date().toISOString()

  return {
    todayCost: asFiniteNumber(o.todayCost),
    monthCost: asFiniteNumber(o.monthCost),
    totalCost: asFiniteNumber(o.totalCost),
    topProvider: top,
    alertStatus,
    lastUpdated,
  }
}

/**
 * Fetch spend summary from TryTokka.
 * Returns structured result — never throws — so callers don't need try/catch.
 */
export async function fetchSpend(token: string): Promise<FetchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${API_BASE}/api/widget-summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        status: res.status,
        message: res.status === 401
          ? 'Token invalid or expired — reconnect your account.'
          : res.status === 429
          ? 'Rate limited — try again in a few minutes.'
          : `Server error ${res.status}: ${body.slice(0, 100)}`,
      }
    }

    let json: unknown
    try {
      json = await res.json()
    } catch {
      return { ok: false, status: res.status, message: 'Server returned invalid JSON.' }
    }

    const data = parseSpendPayload(json)
    if (!data) {
      return { ok: false, status: res.status, message: 'Server returned an unexpected spend payload.' }
    }
    return { ok: true, data }

  } catch (err) {
    clearTimeout(timer)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      message: isAbort
        ? 'Request timed out — check your internet connection.'
        : `Network error: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Soft token shape check before network.
 * Production tokens are typically 64-char hex; placeholder tokens may use a prefix.
 */
export function looksLikeToken(value: string): boolean {
  const t = value.trim()
  if (t.length < 20 || t.length > 256) return false
  if (/\s/.test(t)) return false
  // Prefer hex (current TryTokka widget tokens) or obvious prefixed tokens
  if (/^[a-f0-9]{32,128}$/i.test(t)) return true
  if (/^tk[_-][a-z0-9_-]{16,}$/i.test(t)) return true
  // Allow other opaque tokens that look secret-like (no spaces, long enough)
  return /^[\w.-]{20,}$/.test(t)
}
