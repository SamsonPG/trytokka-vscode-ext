# Scout — AI Spend Tracker

**See exactly what AI APIs are costing you, right in VS Code. Every time you code.**

No proxy. No code changes. No SDK. Just a number in your status bar that tells you the truth.

---

## What it does

Scout shows your real AI API spend in the VS Code status bar — updated automatically, no browser tab required.

```
🦎 $47.20 leaving this month
```

Click it. Get the full breakdown:

- **Total this month** — the anchor number everything else is judged against
- **Today's spend** — what left today, right now
- **Projected month total** — on pace for what?
- **Top provider** — which API is driving the bill
- **Days left** — how much runway before month-end
- **Spike alerts** — popup the moment your spend jumps unexpectedly

---

## Providers supported

| Provider | Tracked |
|----------|---------|
| OpenAI (GPT-4o, o1, o3, mini) | ✓ |
| Anthropic (Claude Sonnet, Haiku, Opus) | ✓ |
| Google Gemini | ✓ |
| OpenRouter (300+ models) | ✓ |
| Azure OpenAI | ✓ |
| AWS Bedrock | ✓ |
| Cursor (Pro subscription + BYOK) | ✓ |

All providers. One number. One place.

---

## How to set up (2 minutes)

1. **Create a free TryTokka account** at [trytokka.com](https://trytokka.com/signup?ref=vscode) — 7-day trial, no card needed
2. **Connect your AI providers** with read-only API keys (TryTokka never makes API calls — read-only billing access only)
3. **Copy your Widget Token** from Settings → Apps → Widget Token
4. **Paste the token** in Scout (Command: `Scout: Connect TryTokka Account`)

Done. Scout starts tracking instantly.

---

## Why read-only keys?

Scout uses TryTokka's backend, which connects to AI provider billing APIs with read-only admin keys. Your traffic is never proxied. We only ever read usage data — we cannot make API calls, create resources, or incur charges on your behalf.

Full security details: [trytokka.com/security](https://trytokka.com/security)

---

## Status bar colours

| Colour | Meaning |
|--------|---------|
| Default | Spend within normal range |
| 🟡 Yellow | Approaching your configured alert threshold |
| 🔴 Red | Alert threshold crossed, or sudden spike detected |

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `scout.refreshIntervalMinutes` | `30` | How often to fetch fresh data |
| `scout.showInStatusBar` | `true` | Show/hide the status bar item |
| `scout.localAlertThresholdUsd` | `0` | Local VS Code alert (0 = off). For email alerts, set them in TryTokka. |

---

## TryTokka — the full dashboard

Scout gives you the number. [TryTokka](https://trytokka.com) gives you:

- **Email alerts** — get notified before your bill arrives
- **Model optimizer** — Scout shows you exactly which model to switch and how much you'd save (e.g. "Switch gpt-4o → gpt-4o-mini: save $34/month based on your actual token usage")
- **Spend forecasting** — on pace for what this month?
- **Spike investigation** — click any day, see which model caused the jump
- **Team plans** — shared spend visibility for the whole team

[Start free → trytokka.com](https://trytokka.com/signup?ref=vscode)

---

## Commands

| Command | Description |
|---------|-------------|
| `Scout: Connect TryTokka Account` | Paste your widget token to start tracking |
| `Scout: Disconnect Account` | Remove your token |
| `Scout: Refresh Now` | Fetch the latest spend data immediately |
| `Scout: Open Spend Panel` | Open the sidebar breakdown |

---

## Privacy

- Your widget token is stored in VS Code's encrypted `SecretStorage` (OS keychain)
- No API keys are stored in this extension — token only
- Scout makes read-only GET requests to `trytokka.com/api/widget-summary`
- No telemetry, no analytics, no data collection by this extension

---

## Links

- [TryTokka](https://trytokka.com) — the full dashboard
- [GitHub](https://github.com/SamsonPG/trytokka-vscode-ext) — source code
- [Support](https://trytokka.com/support) — get help
- [Security](https://trytokka.com/security) — how we protect your keys

---

## Releasing (maintainers)

Publishing is automated by GitHub Actions — you never run `vsce publish` by hand.

**One-time setup** — add two repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it | Enables |
|--------|-----------------|---------|
| `VSCE_PAT` | Azure DevOps PAT for the `trytokka` publisher (Marketplace: Manage) | VS Code Marketplace |
| `OVSX_PAT` | Access token from [open-vsx.org](https://open-vsx.org) | Cursor / VSCodium (optional) |

**To cut a release:**

```bash
# 1. Bump the version in package.json (e.g. 1.0.0 → 1.0.1)
# 2. Commit it
git commit -am "release: v1.0.1"
# 3. Tag and push — the tag must match package.json exactly
git tag v1.0.1
git push origin main --tags
```

The `Publish extension` workflow then compiles, verifies the tag matches
`package.json`, packages the `.vsix`, publishes to both registries (skipping any
whose secret is absent), and attaches the `.vsix` to the GitHub Release.

Every push/PR also runs a `CI` workflow that compiles and dry-run-packages, so a
broken build can't reach a tag.

---

*Scout is built by [TryTokka](https://trytokka.com). Made for developers who ship with AI.*
