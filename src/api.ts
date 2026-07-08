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
        'Content-Type': 'application/json',
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

    const data = await res.json() as SpendData
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

/** Validate a token format before making a network call. */
export function looksLikeToken(value: string): boolean {
  return value.trim().length >= 20
}
