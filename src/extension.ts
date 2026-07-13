/**
 * src/extension.ts
 * Scout — AI Spend Tracker · VS Code Extension
 * by TryTokka (https://trytokka.com)
 *
 * Architecture:
 *   activation     → onStartupFinished (doesn't slow VS Code startup)
 *   status bar     → persistent spend number, refreshes every N minutes
 *   sidebar panel  → full breakdown with psychology-timed CTA
 *   data source    → TryTokka /api/widget-summary (Bearer token, read-only)
 *   token storage  → VS Code SecretStorage (OS keychain, encrypted)
 *   psychology     → timing engine decides what to show and when
 */
import * as vscode from 'vscode'
import { fetchSpend, looksLikeToken } from './api'
import { Storage } from './storage'
import { computePsychState } from './psychology'
import { createStatusBar, updateStatusBar } from './statusBar'
import { ScoutSidebarProvider } from './sidebarProvider'

const APP_URL = 'https://trytokka.com'

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const storage  = new Storage(context.secrets, context.globalState)
  const statusBar = createStatusBar()
  context.subscriptions.push(statusBar)

  const sidebarProvider = new ScoutSidebarProvider(context)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ScoutSidebarProvider.viewId, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  )

  // ── Refresh loop ───────────────────────────────────────────────────────────
  let refreshTimer: NodeJS.Timeout | undefined

  async function refresh(): Promise<void> {
    const token = await storage.getToken()
    if (!token) {
      updateStatusBar(statusBar, null, false)
      sidebarProvider.showDisconnected()
      return
    }

    const result = await fetchSpend(token)
    if (!result.ok) {
      // 401 = token revoked / expired → clear and prompt reconnect
      if (result.status === 401) {
        await storage.clearToken()
        updateStatusBar(statusBar, null, false)
        sidebarProvider.showDisconnected()
        vscode.window.showWarningMessage(
          'Scout: Your TryTokka token is invalid or expired. Please reconnect.',
          'Reconnect',
        ).then(choice => { if (choice === 'Reconnect') connectAccount() })
      } else {
        // Transient error — don't clear token, just show stale state
        vscode.window.setStatusBarMessage(`Scout: ${result.message}`, 8000)
      }
      return
    }

    const { data } = result
    const psychState = computePsychState(data, storage)

    // Check local alert threshold (VS Code setting, separate from TryTokka alerts)
    const localThreshold = vscode.workspace.getConfiguration('scout').get<number>('localAlertThresholdUsd', 0)
    if (localThreshold > 0 && data.monthCost > localThreshold && psychState.statusColor === 'safe') {
      vscode.window.showWarningMessage(
        `Scout: AI spend hit $${data.monthCost.toFixed(2)} this month (your local threshold: $${localThreshold}).`,
        'Open Dashboard',
      ).then(c => { if (c === 'Open Dashboard') openDashboard() })
    }

    // Spike notification
    const lastAcked = storage.getLastSpikeAckedCost()
    if (psychState.isSpike && data.monthCost > lastAcked + 2) {
      vscode.window.showWarningMessage(
        `Scout: Your AI spend just jumped to $${data.monthCost.toFixed(2)} this month.`,
        'Open Dashboard',
        'Dismiss',
      ).then(c => {
        if (c === 'Open Dashboard') openDashboard()
        storage.ackSpike(data.monthCost)
      })
    }

    // Update persistent last cost for next spike check
    storage.setLastMonthCost(data.monthCost)

    // Track CTA shown count so we don't nag
    if (psychState.showCta) storage.incrementCtaShown()

    updateStatusBar(statusBar, psychState, true)
    sidebarProvider.update(data, psychState, true)
  }

  function scheduleRefresh(): void {
    if (refreshTimer) clearInterval(refreshTimer)
    const minutes = vscode.workspace.getConfiguration('scout').get<number>('refreshIntervalMinutes', 30)
    const ms = Math.max(5, minutes) * 60_000
    refreshTimer = setInterval(refresh, ms)
  }

  // Honours the scout.showInStatusBar setting (was previously declared but never
  // applied — toggling it off did nothing).
  function applyStatusBarVisibility(): void {
    const show = vscode.workspace.getConfiguration('scout').get<boolean>('showInStatusBar', true)
    if (show) statusBar.show()
    else statusBar.hide()
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  async function connectAccount(): Promise<void> {
    // Step 1: offer to open TryTokka if they don't have an account
    const choice = await vscode.window.showInformationMessage(
      'Scout needs a TryTokka account to fetch your AI spend. It\'s free (7-day trial, no card).',
      'I have an account',
      'Create free account →',
    )

    if (choice === 'Create free account →') {
      vscode.env.openExternal(vscode.Uri.parse(`${APP_URL}/signup?ref=vscode`))
      // After they sign up, they'll need the token — prompt after a moment
      await new Promise<void>(r => setTimeout(r, 2000))
    }

    if (!choice && choice !== 'I have an account') return

    // Step 2: get the token
    const token = await vscode.window.showInputBox({
      title:       'Scout — Connect TryTokka',
      prompt:      'Paste your Widget Token from TryTokka → Settings → Apps → Widget Token',
      placeHolder: 'tk_live_...',
      password:    true,
      ignoreFocusOut: true,
      validateInput(value) {
        if (!value?.trim()) return 'Token cannot be empty'
        if (!looksLikeToken(value)) return 'That doesn\'t look like a TryTokka token — it should be at least 20 characters'
        return undefined
      },
    })

    if (!token) return

    // Step 3: verify it works before saving
    const testResult = await fetchSpend(token.trim())
    if (!testResult.ok) {
      vscode.window.showErrorMessage(`Scout: Token check failed — ${testResult.message}`)
      return
    }

    await storage.setToken(token.trim())
    vscode.window.showInformationMessage(`Scout: Connected! AI spend for this month: $${testResult.data.monthCost.toFixed(2)} 🦎`)
    await refresh()
  }

  function openDashboard(): void {
    vscode.env.openExternal(vscode.Uri.parse(`${APP_URL}/dashboard`))
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('scout.connect', connectAccount),

    vscode.commands.registerCommand('scout.disconnect', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Disconnect Scout from TryTokka? Spend tracking will stop.',
        { modal: true },
        'Disconnect',
      )
      if (confirm === 'Disconnect') {
        await storage.clearToken()
        updateStatusBar(statusBar, null, false)
        sidebarProvider.showDisconnected()
        vscode.window.showInformationMessage('Scout disconnected.')
      }
    }),

    vscode.commands.registerCommand('scout.refresh', refresh),

    vscode.commands.registerCommand('scout.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.scout-sidebar')
    }),

    vscode.commands.registerCommand('scout.openSignup', () => {
      vscode.env.openExternal(vscode.Uri.parse(`${APP_URL}/signup?ref=vscode`))
    }),

    // React to relevant setting changes without a reload.
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('scout.refreshIntervalMinutes')) {
        scheduleRefresh()
      }
      if (e.affectsConfiguration('scout.showInStatusBar')) {
        applyStatusBarVisibility()
      }
    }),
  )

  // ── Initial load ───────────────────────────────────────────────────────────
  applyStatusBarVisibility()
  await refresh()
  scheduleRefresh()
  // Register disposal AFTER scheduleRefresh() so refreshTimer is defined.
  context.subscriptions.push({ dispose: () => { if (refreshTimer) clearInterval(refreshTimer) } })
}

export function deactivate(): void { /* cleanup handled by subscriptions */ }
