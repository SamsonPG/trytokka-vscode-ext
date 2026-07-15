/**
 * src/storage.ts
 * Secure token storage + psychological state persistence.
 *
 * Token:       VS Code SecretStorage (encrypted, OS-keychain backed)
 * Other state: ExtensionContext.globalState (plain JSON)
 */
import * as vscode from 'vscode'

const TOKEN_KEY         = 'scout.widgetToken'
const INSTALL_KEY       = 'scout.installDate'
const LAST_COST_KEY     = 'scout.lastMonthCost'
const CTA_KEY           = 'scout.ctaShownCount'
const CTA_DAY_KEY       = 'scout.ctaCountedDay'
const SPIKE_ACK_KEY     = 'scout.lastSpikeAckedCost'
const SIDEBAR_OPEN_KEY  = 'scout.sidebarAutoOpened'
const DEMO_KEY          = 'scout.demoMode'

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
    await this.clearDemoMode()
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY)
  }

  isDemoMode(): boolean {
    return this.state.get<boolean>(DEMO_KEY) === true
  }

  async enableDemoMode(): Promise<void> {
    await this.state.update(DEMO_KEY, true)
  }

  async clearDemoMode(): Promise<void> {
    await this.state.update(DEMO_KEY, false)
  }

  /** Start the install clock on first activate (not first successful fetch). */
  ensureInstallDate(): void {
    void this.getInstallDate()
  }

  getInstallDate(): Date {
    const stored = this.state.get<string>(INSTALL_KEY)
    if (stored) {
      const d = new Date(stored)
      return Number.isNaN(d.getTime()) ? new Date() : d
    }
    const now = new Date().toISOString()
    void this.state.update(INSTALL_KEY, now)
    return new Date(now)
  }

  daysSinceInstall(): number {
    return Math.max(0, Math.floor((Date.now() - this.getInstallDate().getTime()) / 86_400_000))
  }

  getLastMonthCost(): number {
    const n = this.state.get<number>(LAST_COST_KEY) ?? 0
    return Number.isFinite(n) ? n : 0
  }

  setLastMonthCost(cost: number): void {
    void this.state.update(LAST_COST_KEY, cost)
  }

  getCtaShownCount(): number {
    const n = this.state.get<number>(CTA_KEY) ?? 0
    return Number.isFinite(n) ? n : 0
  }

  /**
   * Count at most one CTA "impression" per UTC day so the refresh loop
   * cannot burn the 3-show lifetime limit. Call only when the sidebar is visible.
   */
  recordCtaImpressionIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10)
    if (this.state.get<string>(CTA_DAY_KEY) === today) return
    void this.state.update(CTA_DAY_KEY, today)
    void this.state.update(CTA_KEY, this.getCtaShownCount() + 1)
  }

  getLastSpikeAckedCost(): number {
    const n = this.state.get<number>(SPIKE_ACK_KEY) ?? 0
    return Number.isFinite(n) ? n : 0
  }

  ackSpike(cost: number): void {
    void this.state.update(SPIKE_ACK_KEY, cost)
  }

  hasAutoOpenedSidebar(): boolean {
    return this.state.get<boolean>(SIDEBAR_OPEN_KEY) === true
  }

  markSidebarAutoOpened(): void {
    void this.state.update(SIDEBAR_OPEN_KEY, true)
  }
}
