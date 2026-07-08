/**
 * src/storage.ts
 * Secure token storage + psychological state persistence.
 *
 * Token:       VS Code SecretStorage (encrypted, OS-keychain backed)
 * Other state: ExtensionContext.globalState (plain JSON)
 */
import * as vscode from 'vscode'

const TOKEN_KEY     = 'scout.widgetToken'
const INSTALL_KEY   = 'scout.installDate'
const LAST_COST_KEY = 'scout.lastMonthCost'
const CTA_KEY       = 'scout.ctaShownCount'
const SPIKE_ACK_KEY = 'scout.lastSpikeAckedCost'

export class Storage {
  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly state: vscode.Memento,
  ) {}

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(TOKEN_KEY)
  }

  async setToken(token: string): Promise<void> {
    await this.secrets.store(TOKEN_KEY, token.trim())
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY)
  }

  getInstallDate(): Date {
    const stored = this.state.get<string>(INSTALL_KEY)
    if (stored) return new Date(stored)
    const now = new Date().toISOString()
    this.state.update(INSTALL_KEY, now)
    return new Date(now)
  }

  daysSinceInstall(): number {
    return Math.floor((Date.now() - this.getInstallDate().getTime()) / 86_400_000)
  }

  getLastMonthCost(): number {
    return this.state.get<number>(LAST_COST_KEY) ?? 0
  }

  setLastMonthCost(cost: number): void {
    this.state.update(LAST_COST_KEY, cost)
  }

  getCtaShownCount(): number {
    return this.state.get<number>(CTA_KEY) ?? 0
  }

  incrementCtaShown(): void {
    this.state.update(CTA_KEY, this.getCtaShownCount() + 1)
  }

  getLastSpikeAckedCost(): number {
    return this.state.get<number>(SPIKE_ACK_KEY) ?? 0
  }

  ackSpike(cost: number): void {
    this.state.update(SPIKE_ACK_KEY, cost)
  }
}
