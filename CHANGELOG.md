# Changelog

## 1.0.1 — 2026-07-13

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
