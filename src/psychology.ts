/**
 * src/psychology.ts
 * The psychological timing engine — decides WHAT to show and WHEN.
 */
import type { SpendData } from './api'
import type { Storage } from './storage'

const SPIKE_PERCENT    = 0.20
const SPIKE_MIN_USD    = 2.00
const MONTH_END_DAYS   = 5
const CTA_WINDOW_START = 4
const CTA_WINDOW_END   = 14
const CTA_MAX_SHOWS    = 3
/** Month-end yellow only if spend has signal — avoids false alarms on tiny bills. */
const MONTH_END_WARN_USD = 20

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

export interface PsychOptions {
  /** Local VS Code threshold (USD). 0 = off. Flashes status bar red when exceeded. */
  localAlertThresholdUsd?: number
  /** Prefix status label when showing sample data. */
  demoMode?: boolean
}

export function computePsychState(
  data: SpendData,
  storage: Storage,
  options: PsychOptions = {},
): PsychState {
  const days     = storage.daysSinceInstall()
  const lastCost = storage.getLastMonthCost()
  const ctaShown = storage.getCtaShownCount()
  const localThreshold = options.localAlertThresholdUsd ?? 0
  const demoMode = options.demoMode === true

  const costDelta = data.monthCost - lastCost
  const pctJump   = lastCost > 0 ? costDelta / lastCost : 0
  const isSpike   = !demoMode
    && costDelta >= SPIKE_MIN_USD
    && pctJump >= SPIKE_PERCENT
    && lastCost > 0

  const now         = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - now.getDate()
  const isMonthEnd  = daysLeft <= MONTH_END_DAYS
  const localBreach = localThreshold > 0 && data.monthCost > localThreshold
  const projected   = projectedMonthCost(data.monthCost, now)
  const monthEndWarn = isMonthEnd && data.monthCost >= MONTH_END_WARN_USD

  const statusColor: PsychState['statusColor'] =
    data.alertStatus === 'critical' || isSpike || localBreach ? 'danger'
    : data.alertStatus === 'warning' || monthEndWarn ? 'warning'
    : 'safe'

  const m = formatUsd(data.monthCost)
  const t = formatUsd(data.todayCost ?? 0)
  const p = formatUsd(projected)
  const demoTag = demoMode ? 'Demo · ' : ''

  const statusLabel = isSpike
    ? `$(scout-outline) ${demoTag}${m} — spike`
    : localBreach
    ? `$(scout-outline) ${demoTag}${m} over local limit`
    : statusColor === 'danger'
    ? `$(scout-outline) ${demoTag}${m} this month`
    : isMonthEnd
    ? `$(scout-outline) ${demoTag}${m} → ${p} paced · ${daysLeft}d left`
    : `$(scout-outline) ${demoTag}${m} leaving this month`

  let spendPhrase: string
  let subPhrase: string

  if (demoMode) {
    spendPhrase = `Sample: ${m} on AI this month`
    subPhrase   = `Today ${t} · on pace for ${p}. Connect a token for your real number.`
  } else if (isSpike) {
    spendPhrase = `Something just cost you ${formatUsd(costDelta)}`
    subPhrase   = `Month jumped to ${m} — up ${Math.round(pctJump * 100)}% since last check`
  } else if (localBreach) {
    spendPhrase = `${m} — over your local $${localThreshold} limit`
    subPhrase   = `Today: ${t}. Adjust in Settings → Scout, or open the dashboard.`
  } else if (isMonthEnd) {
    spendPhrase = `${m} spent — on pace for ${p}`
    subPhrase   = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left · Today: ${t}`
  } else if (days <= 1) {
    spendPhrase = `You've spent ${m} on AI this month`
    subPhrase   = `Scout is now watching. Check back tomorrow to see the pattern.`
  } else {
    spendPhrase = `${m} leaving this month on AI`
    subPhrase   = `Today: ${t} · Tracking ${days} day${days !== 1 ? 's' : ''} · Pace ${p}`
  }

  const inWindow = days >= CTA_WINDOW_START && days <= CTA_WINDOW_END
  const showCta  = !demoMode
    && ctaShown < CTA_MAX_SHOWS
    && (isSpike || isMonthEnd || inWindow || localBreach)

  let ctaUrgency: PsychState['ctaUrgency'] = 'low'
  let ctaReason = 'You\'ve been tracking for a few days'

  if (isSpike) {
    ctaUrgency = 'high'
    ctaReason  = `Spend jumped ${Math.round(pctJump * 100)}% — set a limit before this closes`
  } else if (localBreach) {
    ctaUrgency = 'high'
    ctaReason  = `You crossed your local $${localThreshold} threshold in VS Code`
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

/** Projected month-end spend from day-of-month pace. Safe on day 1. */
export function projectedMonthCost(monthCost: number, now = new Date()): number {
  if (!Number.isFinite(monthCost) || monthCost < 0) return 0
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth  = Math.max(1, now.getDate())
  return (monthCost / dayOfMonth) * daysInMonth
}
