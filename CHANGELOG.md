# Changelog

## 1.0.9 — 2026-07-15

- **Marketplace / panel:** full-color Scout mascot again (`media/icon.png` synced from TryTokka web icons).
- **Activity Bar + status bar:** thin white outline only (`media/gecko.svg` + contributed `$(scout-outline)` icon font). Stroke weight reduced vs 1.0.7–1.0.8.

## 1.0.8 — 2026-07-15

- **Screenshots:** Marketplace hero + walkthrough images now embed the same generated white-line `icon.png` (Activity Bar + status chip). Removed the alternate SVG “lizard” mark from screenshots.

## 1.0.7 — 2026-07-15

- **Icons:** GitHub-style white-line Scout mark on black (#080C0B) for Marketplace, Activity Bar outline, and sidebar (removed filled teal/yellow gecko and `$(pulse)`).
- Status bar uses `$(eye)` (Scout watching). README + walkthrough screenshots updated to match.

## 1.0.6 — 2026-07-15

Marketplace + activation pass.

- **SEO:** categories `Machine Learning` / `Visualization` / `Data Science`; expanded keywords; Overview hero image.
- **Walkthrough:** 3-step Getting Started (open panel → status bar → connect/demo).
- **Try demo:** sample spend in status bar + sidebar with no account (peak–end aha).
- **Paste token:** dedicated command for existing TryTokka users (skips signup fork).
- **CTA impressions** counted only when the Scout sidebar is visible.
- **Status bar:** month-end shows projection pace (`$X → $Y paced`); softer yellow only when spend ≥ $20.
- **First activate:** auto-opens Scout panel once; install clock starts on activate.

## 1.0.5 — 2026-07-15

- **Marketplace README:** removed maintainer "Releasing" docs (secrets / tag steps) from the public Overview page. Those live in `docs/RELEASING.md` in the repo only.

## 1.0.4 — 2026-07-15

QA hardening pass — study every command/setting/webview path and ship fixes.

### Critical / high
- **Fixed: status bar stuck on "Loading…"** after network/timeout errors with a saved token.
- **Fixed: CTA impressions burned by refresh loop** — max 3 shows meant 3 refreshes (~90 min); now at most one impression per UTC day.
- **Fixed: `localAlertThresholdUsd` did not colour the status bar** — now forces danger state + clear label when exceeded (throttled toast).
- **Fixed: malformed widget API JSON** could crash parsing — response is validated/coerced.
- **Fixed: spike dialog** always acked even when dismissed via X — only Open Dashboard / Dismiss acknowledge.
- **Fixed: overlapping refreshes** could race — single-flight guard.

### Medium
- Connect flow simplified (dismiss cancels cleanly); token placeholder matches hex tokens.
- Refresh interval clamped to 5–120 minutes at runtime.
- Disconnect command added to sidebar view title menu.
- Webview uses VS Code theme CSS variables (readable on light / high-contrast).
- Invalid `lastUpdated` no longer shows "Updated NaNm ago".
- Unit tests for token validation, payload parse, psychology, USD formatting.

### Icon (from 1.0.3)
- Activity Bar: Copilot-style black outline gecko.
- Status bar: monochrome `$(pulse)` ThemeIcon.

## 1.0.3 — 2026-07-15

- **Activity Bar icon:** Copilot-style black outline gecko.
- **Status bar:** Replaced emoji with monochrome `$(pulse)` ThemeIcon.

## 1.0.2 — 2026-07-13

Bundles all the 1.0.1 fixes under a fresh version (the Marketplace doesn't
allow re-uploading a version number), guaranteeing every fix below ships.

- **Fixed: panel buttons/links did nothing.** The webview's Content-Security-
  Policy (script-src nonce) blocked inline onclick handlers, so "Start free",
  "connect", refresh, and all links were dead. Rewired via data-action +
  event delegation so they work under CSP.
- **Fixed: the `scout.showInStatusBar` setting did nothing.** It was declared
  but never read, so the status bar always showed. Now honoured, and reacts to
  changes live (no reload).
- Brand polish: the panel logo now uses the real Scout gecko mascot (was a
  generic 🦎 emoji), matching the Marketplace icon.
- Fixed the Activity Bar icon — now a clean monochrome gecko silhouette
  instead of a solid square (VS Code renders activity-bar icons single-colour).

## 1.0.0 — 2026-07-08

Initial release.

- Status bar spend number — updates every 30 minutes
- Sidebar panel with full spend breakdown
- Spike detection with VS Code notification
- Psychology-timed CTA (shows at the right moment, not immediately)
- Supports all 7 TryTokka providers: OpenAI, Anthropic, Gemini, OpenRouter, Azure, Bedrock, Cursor
- Token stored securely in VS Code SecretStorage
- Works on VS Code Marketplace + Open VSX (Cursor users)
