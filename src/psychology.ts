/**
 * src/psychology.ts
 * The psychological timing engine — decides WHAT to show and WHEN.
 *
 * 7 principles applied:
 *   1. Loss Aversion        — "leaving" not neutral numbers
 *   2. Pain of Paying       — make invisible API costs salient
 *   3. Present Bias         — always today's accumulating total
 *   4. Spotlight Effect     — daily visibility builds urgency over 4–7 days
 *   5. Anchoring            — show total before savings opportunity
 *   6. Endowment Effect     — baseline ownership after a few days
 *   7. Variable Reward      — spike detection = compulsive checking
 */
import type { SpendData } from './api'
import type { Storage } from './storage'

const SPIKE_PERCENT         = 0.20   // 20% jump = spike
const SPIKE_MIN_USD         = 2.00   // minimum $2 absolute increase
const MONTH_END_DAYS        = 5      // last 5 days = month-end urgency
const CTA_WINDOW_START      = 4      // start showing CTA on day 4
const CTA_WINDOW_END        = 14     // stop after day 14
const CTA_MAX_SHOWS         = 3      // never show more than 3 times

export interface PsychState {
  statusLabel:      string
  statusColor:      'safe' | 'warning' | 'danger'
  isSpike:          boolean
  showCta:          boolean
  ctaUrgency:       'low' | 'medium' | 'high'
  ctaReason:        string
  spendPhrase:      string
  subPhrase:        string
  daysSinceInstall: number
  isMonthEnd:       boolean
}

export function computePsychState(data: SpendData, storage: Storage): PsychState {
  const days     = storage.daysSinceInstall()
  const lastCost = storage.getLastMonthCost()
  const ctaShown = storage.getCtaShownCount()

  // ── 1. Spike detection ────────────────────────────────────────────────────
  const costDelta = data.monthCost - lastCost
  const pctJump   = lastCost > 0 ? costDelta / lastCost : 0
  const isSpike   = costDelta >= SPIKE_MIN_USD && pctJump >= SPIKE_PERCENT && lastCost > 0

  // ── 2. Month-end ──────────────────────────────────────────────────────────
  const now         = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - now.getDate()
  const isMonthEnd  = daysLeft <= MONTH_END_DAYS

  // ── 3. Status color ───────────────────────────────────────────────────────
  const statusColor: PsychState['statusColor'] =
    data.alertStatus === 'critical' || isSpike   ? 'danger'
    : data.alertStatus === 'warning' || isMonthEnd ? 'warning'
    : 'safe'

  // ── 4. Status bar label (Loss Aversion — "leaving" framing) ──────────────
  const m = formatUsd(data.monthCost)
  const t = formatUsd(data.todayCost ?? 0)

  const statusLabel = isSpike              ? `🦎 ⚠ ${m} — spike!`
    : statusColor === 'danger'             ? `🦎 🔴 ${m} this month`
    : isMonthEnd                           ? `🦎 ${m} — ${daysLeft}d left`
    : `🦎 ${m} leaving this month`

  // ── 5. Panel headline (Anchoring — total first) ───────────────────────────
  let spendPhrase: string
  let subPhrase: string

  if (isSpike) {
    spendPhrase = `Something just cost you ${formatUsd(costDelta)}`
    subPhrase   = `Month jumped to ${m} — up ${Math.round(pctJump * 100)}% since last check`
  } else if (isMonthEnd) {
    spendPhrase = `${m} spent — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
    subPhrase   = `Today: ${t}`
  } else if (days <= 1) {
    spendPhrase = `You've spent ${m} on AI this month`
    subPhrase   = `Scout is now watching. Check back tomorrow to see the pattern.`
  } else {
    // Endowment Effect: "your X-day baseline" after a few days of data
    spendPhrase = `${m} leaving this month on AI`
    subPhrase   = `Today: ${t} · Tracking ${days} day${days !== 1 ? 's' : ''}`
  }

  // ── 6. CTA (Spotlight Effect + Conversion Window) ─────────────────────────
  const inWindow = days >= CTA_WINDOW_START && days <= CTA_WINDOW_END
  const showCta  = ctaShown < CTA_MAX_SHOWS && (isSpike || isMonthEnd || inWindow)

  let ctaUrgency: PsychState['ctaUrgency'] = 'low'
  let ctaReason = 'You\'ve been tracking for a few days'

  if (isSpike) {
    ctaUrgency = 'high'
    ctaReason  = `Spend jumped ${Math.round(pctJump * 100)}% — set a limit before this closes`
  } else if (isMonthEnd && data.alertStatus !== 'safe') {
    ctaUrgency = 'high'
    ctaReason  = `${daysLeft} days left this month and spend is elevated`
  } else if (isMonthEnd) {
    ctaUrgency = 'medium'
    ctaReason  = `Month closing — set a limit before next month starts`
  } else if (inWindow) {
    ctaUrgency = data.monthCost > 20 ? 'medium' : 'low'
    ctaReason  = `You've seen what AI is actually costing you`
  }

  return { statusLabel, statusColor, isSpike, showCta, ctaUrgency, ctaReason,
           spendPhrase, subPhrase, daysSinceInstall: days, isMonthEnd }
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '$0.00'
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  if (n >= 10)   return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}
