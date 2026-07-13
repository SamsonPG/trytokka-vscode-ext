/**
 * src/sidebarProvider.ts
 * Scout sidebar — WebviewViewProvider.
 * Design system: exact TryTokka tokens (canvas #080C0B, brand #34E89A,
 * surface #0F1512, rim #24302A, radius-xl 22px, shadow-soft, btn-primary gradient).
 */
import * as vscode from 'vscode'
import type { SpendData } from './api'
import type { PsychState } from './psychology'
import { formatUsd } from './psychology'

export class ScoutSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'scout.panel'

  private _view?: vscode.WebviewView
  private _lastData?: SpendData
  private _lastState?: PsychState
  private _connected = false

  constructor(private readonly _context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    }
    webviewView.webview.html = this._getHtml(webviewView.webview)

    webviewView.webview.onDidReceiveMessage((msg: { type: string }) => {
      switch (msg.type) {
        case 'connect':      vscode.commands.executeCommand('scout.connect'); break
        case 'openSignup':   vscode.env.openExternal(vscode.Uri.parse('https://trytokka.com/signup?ref=vscode')); break
        case 'openDashboard':vscode.env.openExternal(vscode.Uri.parse('https://trytokka.com/dashboard')); break
        case 'openPricing':  vscode.env.openExternal(vscode.Uri.parse('https://trytokka.com/pricing?ref=vscode')); break
        case 'refresh':      vscode.commands.executeCommand('scout.refresh'); break
      }
    })

    if (this._lastData && this._lastState) {
      this._pushUpdate(this._lastData, this._lastState, this._connected)
    }
  }

  update(data: SpendData, state: PsychState, connected: boolean): void {
    this._lastData  = data
    this._lastState = state
    this._connected = connected
    if (this._view) this._pushUpdate(data, state, connected)
  }

  showDisconnected(): void {
    this._connected = false
    this._lastData  = undefined
    this._view?.webview.postMessage({ type: 'disconnected' })
  }

  private _pushUpdate(data: SpendData, state: PsychState, connected: boolean): void {
    const now         = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth  = now.getDate()

    this._view?.webview.postMessage({
      type: 'update',
      connected,
      data: {
        monthCostFmt: formatUsd(data.monthCost),
        todayCostFmt: formatUsd(data.todayCost ?? 0),
        projected:    formatUsd((data.monthCost / dayOfMonth) * daysInMonth),
        daysLeft:     daysInMonth - dayOfMonth,
        pctOfMonth:   Math.round((dayOfMonth / daysInMonth) * 100),
        topProvider:  data.topProvider,
        alertStatus:  data.alertStatus,
        lastUpdated:  data.lastUpdated,
      },
      psych: {
        spendPhrase: state.spendPhrase,
        subPhrase:   state.subPhrase,
        isSpike:     state.isSpike,
        showCta:     state.showCta,
        ctaUrgency:  state.ctaUrgency,
        ctaReason:   state.ctaReason,
        color:       state.statusColor,
        isMonthEnd:  state.isMonthEnd,
        days:        state.daysSinceInstall,
      },
    })
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce()
    const csp = `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src data: https:;`

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Scout</title>
<style nonce="${nonce}">
/* ── TryTokka design tokens (dark theme) ──────────────────────────────── */
:root {
  --canvas:         #080C0B;
  --surface:        #0F1512;
  --surface-2:      #161F1B;
  --rim:            #24302A;
  --rim-2:          #2F3D36;
  --text:           #ECF5F0;
  --text-muted:     #8FA89A;
  --text-faint:     #5C7168;
  --brand:          #34E89A;
  --brand-dark:     #22C55E;
  --brand-hover:    #5AF0A8;
  --on-brand:       #042014;
  --scout-green:    #4ADE80;
  --scout-amber:    #FBBF24;
  --scout-deep:     #FB7185;
  --highlight:      rgba(255,255,255,0.06);
  --shadow-soft:    0 1px 2px rgba(0,0,0,0.24), 0 4px 16px rgba(0,0,0,0.18);
  --shadow-lift:    0 4px 10px rgba(0,0,0,0.42), 0 14px 36px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.05);
  --shadow-glow:    0 0 0 1px rgba(52,232,154,0.32), 0 8px 32px rgba(52,232,154,0.24);
  --radius-sm:      10px;
  --radius-md:      14px;
  --radius-lg:      18px;
  --radius-xl:      22px;
  --radius-pill:    9999px;
  --ease-spring:    cubic-bezier(0.34,1.45,0.64,1);
  --ease-out:       cubic-bezier(0.05,0.7,0.1,1);
  --dur-fast:       0.18s;
  --dur-normal:     0.32s;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  background: var(--canvas);
  color: var(--text);
  padding: 12px;
  min-height: 100vh;
}

/* ── Layout ─────────────────────────────────────────────────────────── */
#view-disconnected { display: flex;  flex-direction: column; gap: 10px; }
#view-connected    { display: none;  flex-direction: column; gap: 10px; }

/* ── Surface card — matches .surface-card in globals.css ─────────────── */
.card {
  border-radius: var(--radius-xl);
  background: var(--surface);
  border: 1px solid var(--rim);
  box-shadow: var(--shadow-soft);
  background-image: linear-gradient(180deg, var(--highlight) 0%, transparent 45%);
  padding: 14px 16px;
}
.card.warning { border-color: rgba(251,191,36,0.35);  background-image: linear-gradient(180deg, rgba(251,191,36,0.06) 0%, transparent 60%); }
.card.danger  { border-color: rgba(251,113,133,0.4);  background-image: linear-gradient(180deg, rgba(251,113,133,0.07) 0%, transparent 60%); }
.card.brand   { border-color: rgba(52,232,154,0.25);  background-image: linear-gradient(180deg, rgba(52,232,154,0.07) 0%, transparent 60%); }

/* ── Primary button — matches .btn-primary in globals.css ────────────── */
.btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 10px 16px;
  border-radius: var(--radius-pill);
  border: none; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1;
  color: var(--on-brand);
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--brand) 92%, white) 0%,
    var(--brand) 48%,
    var(--brand-dark) 100%);
  box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, var(--shadow-soft);
  transition: transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-normal) var(--ease-out), filter var(--dur-fast) ease;
}
.btn-primary:hover  { transform: translateY(-2px); box-shadow: var(--shadow-glow); filter: brightness(1.03); }
.btn-primary:active { transform: translateY(0) scale(0.98); filter: brightness(0.97); }

/* ── Secondary button — matches .btn-secondary ───────────────────────── */
.btn-secondary {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--rim); cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1;
  color: var(--text);
  background: var(--surface);
  background-image: linear-gradient(180deg, var(--highlight) 0%, transparent 50%);
  box-shadow: var(--shadow-soft);
  transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast) ease, box-shadow var(--dur-normal) var(--ease-out);
}
.btn-secondary:hover  { transform: translateY(-1px); border-color: #3A5246; box-shadow: var(--shadow-lift); }
.btn-secondary:active { transform: scale(0.98); }

/* ── Header ──────────────────────────────────────────────────────────── */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rim);
  margin-bottom: 2px;
}
.brand-row    { display: flex; align-items: center; gap: 8px; }
.brand-gecko  { line-height: 0; }
.brand-gecko svg { width: 22px; height: 22px; display: block; }
.brand-name   {
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--brand);
}
.header-actions { display: flex; gap: 4px; }
.icon-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); font-size: 14px;
  padding: 3px 5px; border-radius: 6px; line-height: 1;
  transition: color var(--dur-fast) ease, background var(--dur-fast) ease;
}
.icon-btn:hover { color: var(--text); background: rgba(255,255,255,0.06); }

/* ── Spend card — the psychological anchor ───────────────────────────── */
.spend-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--text-faint);
  margin-bottom: 6px;
}
.spend-amount {
  font-size: 34px; font-weight: 800;
  letter-spacing: -0.02em; line-height: 1;
  color: var(--brand);
  margin-bottom: 4px;
}
.card.warning .spend-amount { color: var(--scout-amber); }
.card.danger  .spend-amount { color: var(--scout-deep); }

.spend-sub {
  font-size: 12px; color: var(--text-muted); line-height: 1.55;
}

/* ── Spike banner ────────────────────────────────────────────────────── */
.spike-banner {
  display: none;
  border-radius: var(--radius-md);
  border: 1px solid rgba(251,113,133,0.35);
  background: linear-gradient(180deg, rgba(251,113,133,0.08) 0%, transparent 70%);
  padding: 10px 14px;
}
.spike-banner.show { display: block; }
.spike-title { font-size: 12px; font-weight: 700; color: var(--scout-deep); margin-bottom: 3px; }
.spike-body  { font-size: 11px; color: var(--text-muted); line-height: 1.5; }

/* ── Stats grid ──────────────────────────────────────────────────────── */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat {
  border-radius: var(--radius-md);
  border: 1px solid var(--rim);
  background: var(--surface-2);
  padding: 10px 12px;
}
.stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: 700; color: var(--text); }

/* ── Progress bar ────────────────────────────────────────────────────── */
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.progress-label  { font-size: 11px; color: var(--text-muted); }
.progress-days   { font-size: 11px; color: var(--text-faint); }
.progress-track  { height: 4px; border-radius: 2px; background: var(--rim); overflow: hidden; }
.progress-fill   {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--brand-dark), var(--brand));
  transition: width 0.6s var(--ease-out);
}
.progress-fill.warning { background: linear-gradient(90deg, #D97706, var(--scout-amber)); }
.progress-fill.danger  { background: linear-gradient(90deg, #BE123C, var(--scout-deep)); }

/* ── Provider row ────────────────────────────────────────────────────── */
.provider-row {
  display: none;
  align-items: center; gap: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--rim);
  background: var(--surface-2);
  padding: 10px 12px;
}
.provider-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); flex-shrink: 0; }
.provider-meta { }
.provider-meta-label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; }
.provider-meta-name  { font-size: 12px; font-weight: 600; color: var(--text); }

/* ── CTA card ────────────────────────────────────────────────────────── */
.cta-card { display: none; flex-direction: column; gap: 8px; }
.cta-card.show { display: flex; }
.cta-reason { font-size: 12px; color: var(--text-muted); line-height: 1.6; padding: 0 2px; }

/* ── Scout status badge (safe/warning/critical) ──────────────────────── */
.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: var(--radius-pill);
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  width: fit-content;
}
.status-badge.safe    { background: rgba(74,222,128,0.12); color: var(--scout-green); border: 1px solid rgba(74,222,128,0.25); }
.status-badge.warning { background: rgba(251,191,36,0.12); color: var(--scout-amber); border: 1px solid rgba(251,191,36,0.25); }
.status-badge.danger  { background: rgba(251,113,133,0.12); color: var(--scout-deep); border: 1px solid rgba(251,113,133,0.25); }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* ── Connect screen ──────────────────────────────────────────────────── */
.connect-hero { text-align: center; padding: 20px 8px 8px; }
.connect-gecko { margin-bottom: 10px; line-height: 0; }
.connect-gecko svg { width: 56px; height: 56px; display: inline-block; }
.connect-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.connect-sub   { font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px; }

.connect-steps {
  border-radius: var(--radius-lg);
  border: 1px solid var(--rim);
  background: var(--surface);
  background-image: linear-gradient(180deg, var(--highlight) 0%, transparent 45%);
  box-shadow: var(--shadow-soft);
  padding: 12px 14px;
  margin-bottom: 10px;
  display: flex; flex-direction: column; gap: 8px;
}
.step { display: flex; gap: 10px; align-items: flex-start; }
.step-num {
  font-size: 11px; font-weight: 700; color: var(--on-brand);
  background: var(--brand-dark);
  width: 18px; height: 18px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.step-text { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

/* ── Footer ──────────────────────────────────────────────────────────── */
.footer {
  font-size: 10px; color: var(--text-faint);
  text-align: center; padding-top: 4px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.footer a { color: var(--text-faint); text-decoration: none; cursor: pointer; }
.footer a:hover { color: var(--text-muted); }
.footer-sep { color: var(--rim-2); }
.updated { font-size: 10px; color: var(--text-faint); text-align: right; }

/* ── Divider ─────────────────────────────────────────────────────────── */
.divider { height: 1px; background: var(--rim); }

/* ── Scrollbar ───────────────────────────────────────────────────────── */
::-webkit-scrollbar       { width: 4px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--rim-2); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #3D5248; }
</style>
</head>
<body>

<!-- ───────────── DISCONNECTED ──────────────────────────────────────────── -->
<div id="view-disconnected">
  <div class="connect-hero">
    <div class="connect-gecko"><svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M22 48Q18 24 50 20Q80 22 82 46Q84 58 68 64Q50 69 34 63Q20 58 22 48Z" fill="#34D399"/><ellipse cx="50" cy="22" rx="9" ry="5.5" fill="#34D399"/><ellipse cx="35" cy="40" rx="13" ry="14" fill="#06251C"/><ellipse cx="65" cy="40" rx="13" ry="14" fill="#06251C"/><circle cx="35" cy="40" r="9.5" fill="#FACC15"/><circle cx="65" cy="40" r="9.5" fill="#FACC15"/><ellipse cx="35" cy="40" rx="3.4" ry="8.5" fill="#06251C"/><ellipse cx="65" cy="40" rx="3.4" ry="8.5" fill="#06251C"/><circle cx="31" cy="34" r="2.4" fill="#fff" opacity="0.95"/><circle cx="61" cy="34" r="2.4" fill="#fff" opacity="0.95"/><path d="M42 56Q50 61 58 56" stroke="#06251C" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.6"/></svg></div>
    <div class="connect-title">Scout AI Spend Tracker</div>
    <div class="connect-sub">
      See exactly what OpenAI, Anthropic, Gemini,<br>
      and Cursor are costing you — every time you code.
    </div>
  </div>

  <div class="connect-steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text">Create a free TryTokka account — 7-day trial, no card needed</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text">Connect AI providers with a read-only key</div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text">Copy your Widget Token from Settings → Apps</div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-text">Paste it here — Scout starts watching instantly</div>
    </div>
  </div>

  <button class="btn-primary" onclick="send('openSignup')">
    Start free — trytokka.com →
  </button>
  <button class="btn-secondary" onclick="send('connect')">
    I have a token — connect
  </button>

  <div class="footer">
    <span>No proxy</span>
    <span class="footer-sep">·</span>
    <span>No code changes</span>
    <span class="footer-sep">·</span>
    <span>No card</span>
  </div>
</div>

<!-- ───────────── CONNECTED ─────────────────────────────────────────────── -->
<div id="view-connected">

  <!-- Header -->
  <div class="header">
    <div class="brand-row">
      <span class="brand-gecko"><svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M22 48Q18 24 50 20Q80 22 82 46Q84 58 68 64Q50 69 34 63Q20 58 22 48Z" fill="#34D399"/><ellipse cx="50" cy="22" rx="9" ry="5.5" fill="#34D399"/><ellipse cx="35" cy="40" rx="13" ry="14" fill="#06251C"/><ellipse cx="65" cy="40" rx="13" ry="14" fill="#06251C"/><circle cx="35" cy="40" r="9.5" fill="#FACC15"/><circle cx="65" cy="40" r="9.5" fill="#FACC15"/><ellipse cx="35" cy="40" rx="3.4" ry="8.5" fill="#06251C"/><ellipse cx="65" cy="40" rx="3.4" ry="8.5" fill="#06251C"/><circle cx="31" cy="34" r="2.4" fill="#fff" opacity="0.95"/><circle cx="61" cy="34" r="2.4" fill="#fff" opacity="0.95"/><path d="M42 56Q50 61 58 56" stroke="#06251C" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.6"/></svg></span>
      <span class="brand-name">Scout</span>
    </div>
    <div class="header-actions">
      <button class="icon-btn" onclick="send('refresh')" title="Refresh now">↻</button>
    </div>
  </div>

  <!-- Spend card — psychological anchor (big number first) -->
  <div class="card" id="spendCard">
    <div class="spend-label" id="spendLabel">THIS MONTH</div>
    <div class="spend-amount" id="monthCost">—</div>
    <div class="spend-sub" id="spendSub">Loading…</div>
  </div>

  <!-- Alert status badge -->
  <div class="status-badge safe" id="statusBadge">
    <div class="badge-dot"></div>
    <span id="statusText">Safe</span>
  </div>

  <!-- Spike banner -->
  <div class="spike-banner" id="spikeBanner">
    <div class="spike-title">⚠ Spend spike detected</div>
    <div class="spike-body" id="spikeBody">Your AI spend jumped since the last check. Open the dashboard to investigate.</div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat">
      <div class="stat-label">Today</div>
      <div class="stat-value" id="todayCost">—</div>
    </div>
    <div class="stat">
      <div class="stat-label">Projected</div>
      <div class="stat-value" id="projected">—</div>
    </div>
  </div>

  <!-- Month progress -->
  <div>
    <div class="progress-header">
      <span class="progress-label" id="progressLabel">Month progress</span>
      <span class="progress-days" id="daysLeft">—</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" id="progressFill" style="width:0%"></div>
    </div>
  </div>

  <!-- Top provider -->
  <div class="provider-row" id="providerRow">
    <div class="provider-dot"></div>
    <div class="provider-meta">
      <div class="provider-meta-label">Top provider</div>
      <div class="provider-meta-name" id="topProvider">—</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- CTA — psychology-timed, max 3 shows -->
  <div class="cta-card" id="ctaCard">
    <div class="cta-reason" id="ctaReason"></div>
    <button class="btn-primary" onclick="send('openDashboard')">
      Open Scout dashboard →
    </button>
    <button class="btn-secondary" onclick="send('openPricing')">
      Add alerts + model optimizer
    </button>
  </div>

  <div class="updated" id="lastUpdated"></div>

  <div class="footer">
    <a onclick="send('openDashboard')">trytokka.com</a>
    <span class="footer-sep">·</span>
    <a onclick="send('openSignup')">Upgrade</a>
  </div>

</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi()
function send(type) { vscode.postMessage({ type }) }

const STATUS_LABELS = { safe: 'On track', warning: 'Approaching limit', critical: 'Limit crossed' }
const STATUS_CLASS  = { safe: 'safe', warning: 'warning', critical: 'danger' }

window.addEventListener('message', ({ data: msg }) => {
  if (msg.type === 'disconnected') { show('disconnected'); return }
  if (msg.type === 'update') {
    if (!msg.connected) { show('disconnected'); return }
    render(msg.data, msg.psych)
  }
})

function show(state) {
  document.getElementById('view-disconnected').style.display = state === 'disconnected' ? 'flex' : 'none'
  document.getElementById('view-connected').style.display    = state === 'connected'    ? 'flex' : 'none'
}

function render(data, psych) {
  show('connected')

  // Spend card
  const card = document.getElementById('spendCard')
  card.className = 'card ' + (psych.color === 'danger' ? 'danger' : psych.color === 'warning' ? 'warning' : 'brand')
  document.getElementById('spendLabel').textContent  = psych.spendPhrase.toUpperCase()
  document.getElementById('monthCost').textContent   = data.monthCostFmt
  document.getElementById('spendSub').textContent    = psych.subPhrase

  // Status badge
  const badge = document.getElementById('statusBadge')
  const cls   = STATUS_CLASS[data.alertStatus] ?? 'safe'
  badge.className = 'status-badge ' + cls
  document.getElementById('statusText').textContent = STATUS_LABELS[data.alertStatus] ?? 'On track'

  // Spike banner
  const spike = document.getElementById('spikeBanner')
  spike.className = 'spike-banner' + (psych.isSpike ? ' show' : '')

  // Stats
  document.getElementById('todayCost').textContent = data.todayCostFmt
  document.getElementById('projected').textContent  = data.projected

  // Progress
  document.getElementById('progressLabel').textContent = data.pctOfMonth + '% of month elapsed'
  document.getElementById('daysLeft').textContent      = data.daysLeft + ' days left'
  const fill = document.getElementById('progressFill')
  fill.style.width = Math.min(data.pctOfMonth, 100) + '%'
  fill.className   = 'progress-fill ' + (psych.color === 'danger' ? 'danger' : psych.color === 'warning' ? 'warning' : '')

  // Top provider
  const provRow = document.getElementById('providerRow')
  if (data.topProvider) {
    provRow.style.display = 'flex'
    document.getElementById('topProvider').textContent =
      data.topProvider.charAt(0).toUpperCase() + data.topProvider.slice(1) + ' is driving your spend'
  } else {
    provRow.style.display = 'none'
  }

  // CTA
  const cta = document.getElementById('ctaCard')
  cta.className = 'cta-card' + (psych.showCta ? ' show' : '')
  if (psych.showCta) {
    document.getElementById('ctaReason').textContent = psych.ctaReason +
      '. Set an alert so Scout emails you before the bill arrives.'
  }

  // Last updated
  const mins = Math.round((Date.now() - new Date(data.lastUpdated).getTime()) / 60000)
  document.getElementById('lastUpdated').textContent = mins < 2 ? 'Updated just now' : 'Updated ' + mins + 'm ago'
}
</script>
</body>
</html>`
  }
}

function getNonce(): string {
  let t = ''
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) t += c[Math.floor(Math.random() * c.length)]
  return t
}
