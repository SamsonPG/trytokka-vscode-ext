/**
 * src/sidebarProvider.ts
 * WebviewViewProvider for the Scout activity bar panel.
 *
 * Manages the HTML webview, sends data via postMessage, receives
 * user actions (connect, open TryTokka, dismiss spike) back.
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

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((msg: { type: string }) => {
      switch (msg.type) {
        case 'connect':
          vscode.commands.executeCommand('scout.connect')
          break
        case 'openTryTokka':
          vscode.env.openExternal(vscode.Uri.parse('https://trytokka.com/signup?ref=vscode'))
          break
        case 'openDashboard':
          vscode.env.openExternal(vscode.Uri.parse('https://trytokka.com/dashboard'))
          break
        case 'openPricing':
          vscode.env.openExternal(vscode.Uri.parse('https://trytokka.com/pricing?ref=vscode'))
          break
        case 'refresh':
          vscode.commands.executeCommand('scout.refresh')
          break
      }
    })

    // Push current state if we already have data
    if (this._lastData && this._lastState) {
      this._pushUpdate(this._lastData, this._lastState, this._connected)
    }
  }

  /** Called by extension.ts after each successful fetch. */
  update(data: SpendData, state: PsychState, connected: boolean): void {
    this._lastData    = data
    this._lastState   = state
    this._connected   = connected
    if (this._view) {
      this._pushUpdate(data, state, connected)
    }
  }

  showDisconnected(): void {
    this._connected = false
    this._lastData  = undefined
    this._view?.webview.postMessage({ type: 'disconnected' })
  }

  private _pushUpdate(data: SpendData, state: PsychState, connected: boolean): void {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth  = now.getDate()

    this._view?.webview.postMessage({
      type: 'update',
      connected,
      data: {
        monthCost:     data.monthCost,
        todayCost:     data.todayCost ?? 0,
        totalCost:     data.totalCost,
        topProvider:   data.topProvider,
        alertStatus:   data.alertStatus,
        lastUpdated:   data.lastUpdated,
        // formatted strings (psychology-framed)
        monthCostFmt:  formatUsd(data.monthCost),
        todayCostFmt:  formatUsd(data.todayCost ?? 0),
        // projected
        projected:     formatUsd((data.monthCost / dayOfMonth) * daysInMonth),
        daysLeft:      daysInMonth - dayOfMonth,
        pctOfMonth:    Math.round((dayOfMonth / daysInMonth) * 100),
      },
      psych: {
        spendPhrase:  state.spendPhrase,
        subPhrase:    state.subPhrase,
        isSpike:      state.isSpike,
        showCta:      state.showCta,
        ctaUrgency:   state.ctaUrgency,
        ctaReason:    state.ctaReason,
        color:        state.statusColor,
        isMonthEnd:   state.isMonthEnd,
        days:         state.daysSinceInstall,
      },
    })
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce()
    const csp = `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src data:;`

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Scout — AI Spend</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --green:   #34E89A;
      --amber:   #FB923C;
      --red:     #FB7185;
      --surface: var(--vscode-sideBar-background, #0F1512);
      --border:  var(--vscode-widget-border, #24302A);
      --text:    var(--vscode-foreground, #ECF5F0);
      --muted:   var(--vscode-descriptionForeground, #9C8A6E);
      --faint:   var(--vscode-disabledForeground, #6B5B47);
      --input:   var(--vscode-input-background, #1C2420);
      --btn-bg:  var(--vscode-button-background, #34E89A);
      --btn-fg:  var(--vscode-button-foreground, #080C0B);
      --btn-hover: var(--vscode-button-hoverBackground, #2DD480);
      --radius:  10px;
      --radius-sm: 6px;
    }

    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      background: var(--surface);
      color: var(--text);
      padding: 12px;
      min-height: 100vh;
    }

    /* ── Disconnected state ─────────────────────────────── */
    #disconnected { display: flex; flex-direction: column; gap: 12px; }
    #connected    { display: none; flex-direction: column; gap: 12px; }

    /* ── Header ─────────────────────────────────────────── */
    .header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 4px;
    }
    .brand { display: flex; align-items: center; gap: 6px; }
    .brand-gecko { font-size: 18px; }
    .brand-name { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--green); }
    .refresh-btn {
      background: none; border: none; color: var(--muted); cursor: pointer;
      font-size: 14px; padding: 2px 4px; border-radius: 4px; line-height: 1;
    }
    .refresh-btn:hover { color: var(--text); background: rgba(255,255,255,.06); }

    /* ── Main spend number ───────────────────────────────── */
    .spend-card {
      background: rgba(52,232,154,.06);
      border: 1px solid rgba(52,232,154,.18);
      border-radius: var(--radius);
      padding: 14px 14px 12px;
    }
    .spend-card.warning { border-color: rgba(251,146,60,.35); background: rgba(251,146,60,.06); }
    .spend-card.danger  { border-color: rgba(251,113,133,.35); background: rgba(251,113,133,.06); }

    .spend-phrase {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .06em; color: var(--muted); margin-bottom: 6px;
    }
    .spend-big {
      font-size: 32px; font-weight: 800; letter-spacing: -.02em;
      color: var(--green); line-height: 1; margin-bottom: 4px;
    }
    .spend-card.warning .spend-big { color: var(--amber); }
    .spend-card.danger  .spend-big { color: var(--red); }
    .spend-sub { font-size: 11px; color: var(--muted); line-height: 1.5; }

    /* ── Spike banner ────────────────────────────────────── */
    .spike-banner {
      display: none;
      background: rgba(251,113,133,.1);
      border: 1px solid rgba(251,113,133,.3);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      font-size: 12px; line-height: 1.5;
    }
    .spike-banner.show { display: block; }
    .spike-label { font-weight: 700; color: var(--red); margin-bottom: 2px; }

    /* ── Stats row ───────────────────────────────────────── */
    .stats-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .stat-box {
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px;
    }
    .stat-label { font-size: 10px; color: var(--faint); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
    .stat-value { font-size: 16px; font-weight: 700; color: var(--text); }
    .stat-value.green { color: var(--green); }

    /* ── Provider badge ──────────────────────────────────── */
    .provider-row {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
    }
    .provider-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
    .provider-label { font-size: 11px; color: var(--muted); }
    .provider-name { font-size: 12px; font-weight: 600; color: var(--text); }

    /* ── Progress bar ────────────────────────────────────── */
    .progress-wrap { }
    .progress-label { display: flex; justify-content: space-between; font-size: 10px; color: var(--faint); margin-bottom: 5px; }
    .progress-track {
      height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;
    }
    .progress-fill {
      height: 100%; border-radius: 2px; background: var(--green);
      transition: width .4s ease;
    }
    .progress-fill.warning { background: var(--amber); }
    .progress-fill.danger  { background: var(--red); }

    /* ── CTA ─────────────────────────────────────────────── */
    .cta-card {
      background: rgba(52,232,154,.08);
      border: 1px solid rgba(52,232,154,.25);
      border-radius: var(--radius);
      padding: 12px;
    }
    .cta-card.high { border-color: rgba(251,113,133,.4); background: rgba(251,113,133,.06); }
    .cta-reason { font-size: 11px; color: var(--muted); margin-bottom: 8px; line-height: 1.5; }
    .cta-btn {
      display: block; width: 100%; padding: 9px 12px;
      background: var(--green); color: #080C0B;
      border: none; border-radius: var(--radius-sm);
      font-size: 12px; font-weight: 700; cursor: pointer; text-align: center;
      line-height: 1;
    }
    .cta-btn:hover { background: var(--btn-hover); }
    .cta-btn.secondary {
      background: transparent;
      border: 1px solid rgba(52,232,154,.35);
      color: var(--green);
      margin-top: 6px;
    }
    .cta-btn.secondary:hover { background: rgba(52,232,154,.1); }

    /* ── Connect state ───────────────────────────────────── */
    .connect-hero { text-align: center; padding: 24px 8px 16px; }
    .connect-gecko { font-size: 42px; margin-bottom: 10px; }
    .connect-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .connect-sub   { font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 16px; }
    .connect-steps { text-align: left; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; margin-bottom: 12px; }
    .connect-step  { font-size: 11px; color: var(--muted); padding: 3px 0; display: flex; gap: 8px; }
    .step-num { color: var(--green); font-weight: 700; flex-shrink: 0; }

    /* ── Footer ─────────────────────────────────────────────*/
    .footer { font-size: 10px; color: var(--faint); text-align: center; padding-top: 4px; }
    .footer a { color: var(--faint); text-decoration: none; }
    .footer a:hover { color: var(--muted); }
    .updated { font-size: 10px; color: var(--faint); text-align: right; margin-top: 2px; }
  </style>
</head>
<body>

<!-- ── DISCONNECTED STATE ───────────────────────────────────────────────── -->
<div id="disconnected">
  <div class="connect-hero">
    <div class="connect-gecko">🦎</div>
    <div class="connect-title">Scout watches your AI spend</div>
    <div class="connect-sub">
      See exactly what OpenAI, Anthropic, Gemini, and Cursor<br>
      are costing you — right here, every time you code.
    </div>
  </div>

  <div class="connect-steps">
    <div class="connect-step"><span class="step-num">1</span> Create a free TryTokka account (2 min, no card)</div>
    <div class="connect-step"><span class="step-num">2</span> Connect your AI providers with a read-only key</div>
    <div class="connect-step"><span class="step-num">3</span> Copy your Widget Token from Settings → Apps</div>
    <div class="connect-step"><span class="step-num">4</span> Paste it here — Scout starts tracking instantly</div>
  </div>

  <button class="cta-btn" onclick="send('openTryTokka')">
    Start free — trytokka.com →
  </button>
  <button class="cta-btn secondary" onclick="send('connect')" style="margin-top:8px">
    I have a token — connect now
  </button>

  <div class="footer">
    No proxy · No code changes · No credit card
  </div>
</div>

<!-- ── CONNECTED STATE ──────────────────────────────────────────────────── -->
<div id="connected">

  <div class="header">
    <div class="brand">
      <span class="brand-gecko">🦎</span>
      <span class="brand-name">Scout</span>
    </div>
    <button class="refresh-btn" onclick="send('refresh')" title="Refresh now">↻</button>
  </div>

  <!-- Main spend number — the psychological anchor -->
  <div class="spend-card" id="spendCard">
    <div class="spend-phrase" id="spendPhrase">THIS MONTH</div>
    <div class="spend-big" id="monthCost">$0.00</div>
    <div class="spend-sub" id="subPhrase">Loading…</div>
  </div>

  <!-- Spike banner — Variable Reward trigger -->
  <div class="spike-banner" id="spikeBanner">
    <div class="spike-label">⚠ Spend spike detected</div>
    <div id="spikeText">Your AI spend just jumped. Check what ran.</div>
  </div>

  <!-- Stats row -->
  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-label">Today</div>
      <div class="stat-value" id="todayCost">—</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Projected</div>
      <div class="stat-value" id="projected">—</div>
    </div>
  </div>

  <!-- Month progress -->
  <div class="progress-wrap">
    <div class="progress-label">
      <span id="progressLabel">Month progress</span>
      <span id="daysLeft">— days left</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" id="progressFill" style="width:0%"></div>
    </div>
  </div>

  <!-- Top provider -->
  <div class="provider-row" id="providerRow" style="display:none">
    <div class="provider-dot"></div>
    <div>
      <div class="provider-label">Top provider</div>
      <div class="provider-name" id="topProvider">—</div>
    </div>
  </div>

  <!-- CTA — conversion prompt (shown based on psychology engine timing) -->
  <div class="cta-card" id="ctaCard" style="display:none">
    <div class="cta-reason" id="ctaReason"></div>
    <button class="cta-btn" onclick="send('openDashboard')">
      Open Scout dashboard →
    </button>
    <button class="cta-btn secondary" onclick="send('openPricing')">
      Add alerts + model optimizer
    </button>
  </div>

  <div class="updated" id="lastUpdated"></div>

  <div class="footer">
    <a href="#" onclick="send('openDashboard')">trytokka.com</a>
    &nbsp;·&nbsp;
    <a href="#" onclick="send('openTryTokka')">Upgrade</a>
  </div>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi()

  function send(type) {
    vscode.postMessage({ type })
  }

  window.addEventListener('message', ({ data: msg }) => {
    if (msg.type === 'disconnected') {
      showDisconnected()
      return
    }
    if (msg.type === 'update') {
      if (!msg.connected) { showDisconnected(); return }
      showConnected(msg.data, msg.psych)
    }
  })

  function showDisconnected() {
    document.getElementById('disconnected').style.display = 'flex'
    document.getElementById('connected').style.display    = 'none'
  }

  function showConnected(data, psych) {
    document.getElementById('disconnected').style.display = 'none'
    document.getElementById('connected').style.display    = 'flex'

    // ── Spend card (the psychological anchor) ─────────────────────────────
    const card = document.getElementById('spendCard')
    card.className = 'spend-card ' + (psych.color === 'danger' ? 'danger' : psych.color === 'warning' ? 'warning' : '')

    document.getElementById('spendPhrase').textContent = psych.spendPhrase.toUpperCase()
    document.getElementById('monthCost').textContent   = data.monthCostFmt
    document.getElementById('subPhrase').textContent   = psych.subPhrase

    // ── Spike banner ──────────────────────────────────────────────────────
    const spike = document.getElementById('spikeBanner')
    spike.className = 'spike-banner' + (psych.isSpike ? ' show' : '')
    if (psych.isSpike) {
      document.getElementById('spikeText').textContent =
        'Your spend jumped since the last check. Open the dashboard to see what ran.'
    }

    // ── Stats ─────────────────────────────────────────────────────────────
    document.getElementById('todayCost').textContent = data.todayCostFmt
    document.getElementById('projected').textContent = data.projected

    // ── Progress bar ──────────────────────────────────────────────────────
    document.getElementById('progressLabel').textContent =
      data.pctOfMonth + '% through the month'
    document.getElementById('daysLeft').textContent = data.daysLeft + ' days left'
    const fill = document.getElementById('progressFill')
    fill.style.width = Math.min(data.pctOfMonth, 100) + '%'
    fill.className   = 'progress-fill ' + (psych.color === 'danger' ? 'danger' : psych.color === 'warning' ? 'warning' : '')

    // ── Top provider ──────────────────────────────────────────────────────
    const providerRow = document.getElementById('providerRow')
    if (data.topProvider) {
      providerRow.style.display = 'flex'
      document.getElementById('topProvider').textContent =
        data.topProvider.charAt(0).toUpperCase() + data.topProvider.slice(1) +
        ' is your top AI spend this month'
    } else {
      providerRow.style.display = 'none'
    }

    // ── CTA (psychology engine decides if/what to show) ───────────────────
    const ctaCard = document.getElementById('ctaCard')
    if (psych.showCta) {
      ctaCard.style.display = 'block'
      ctaCard.className = 'cta-card' + (psych.ctaUrgency === 'high' ? ' high' : '')
      document.getElementById('ctaReason').textContent = psych.ctaReason +
        ' — set an alert threshold so Scout emails you before your limit.'
    } else {
      ctaCard.style.display = 'none'
    }

    // ── Last updated ──────────────────────────────────────────────────────
    const updated = new Date(data.lastUpdated)
    const mins = Math.round((Date.now() - updated.getTime()) / 60000)
    document.getElementById('lastUpdated').textContent =
      mins < 2 ? 'Updated just now' : 'Updated ' + mins + 'm ago'
  }
</script>
</body>
</html>`
  }
}

function getNonce(): string {
  let text = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return text
}
