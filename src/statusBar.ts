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

export function createStatusBar(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  item.command = 'scout.openPanel'
  item.text    = '🦎 Loading…'
  item.show()
  return item
}

export function updateStatusBar(
  item: vscode.StatusBarItem,
  state: PsychState | null,
  connected: boolean,
): void {
  if (!connected) {
    item.text            = '🦎 Scout: connect account'
    item.tooltip         = 'Click to connect your TryTokka account and see AI spend'
    item.command         = 'scout.connect'
    item.color           = undefined
    item.backgroundColor = undefined
    return
  }

  if (!state) {
    item.text            = '🦎 Fetching spend…'
    item.color           = undefined
    item.backgroundColor = undefined
    return
  }

  item.text            = state.statusLabel
  item.color           = COLORS[state.statusColor]
  item.backgroundColor = BG[state.statusColor]
  item.command         = 'scout.openPanel'
  item.tooltip         = new vscode.MarkdownString(
    `**Scout — AI Spend**\n\n${state.spendPhrase}\n\n${state.subPhrase}\n\n_Click to open full breakdown_`,
    true,
  )
}
