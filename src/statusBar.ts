/**
 * src/statusBar.ts
 * The daily touchpoint — every time the developer opens VS Code, they see this.
 */
import * as vscode from 'vscode'
import type { PsychState } from './psychology'

const COLORS = {
  safe:    undefined as vscode.ThemeColor | undefined,
  warning: new vscode.ThemeColor('statusBarItem.warningForeground'),
  danger:  new vscode.ThemeColor('statusBarItem.errorForeground'),
}
const BG = {
  safe:    undefined as vscode.ThemeColor | undefined,
  warning: new vscode.ThemeColor('statusBarItem.warningBackground'),
  danger:  new vscode.ThemeColor('statusBarItem.errorBackground'),
}

/** Thin Scout outline — contributed product icon (monochrome; VS Code themes it). */
const ICON = '$(scout-outline)'

export function createStatusBar(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  item.command = 'scout.openPanel'
  item.text    = `${ICON} Loading…`
  item.show()
  return item
}

export function updateStatusBar(
  item: vscode.StatusBarItem,
  state: PsychState | null,
  connected: boolean,
  opts: { demoMode?: boolean } = {},
): void {
  if (!connected) {
    item.text            = `${ICON} Scout: connect or try demo`
    item.tooltip         = 'Click to connect TryTokka, or run “Scout: Try demo” for sample spend'
    item.command         = 'scout.connect'
    item.color           = undefined
    item.backgroundColor = undefined
    return
  }

  if (!state) {
    item.text            = `${ICON} Fetching spend…`
    item.color           = undefined
    item.backgroundColor = undefined
    return
  }

  item.text            = state.statusLabel
  item.color           = COLORS[state.statusColor]
  item.backgroundColor = BG[state.statusColor]
  item.command         = 'scout.openPanel'
  const demoNote = opts.demoMode
    ? '\n\n_Sample data — paste your Widget Token for live spend_'
    : ''
  item.tooltip         = new vscode.MarkdownString(
    `**Scout — AI Spend**\n\n${state.spendPhrase}\n\n${state.subPhrase}${demoNote}\n\n_Click to open full breakdown_`,
    true,
  )
}
