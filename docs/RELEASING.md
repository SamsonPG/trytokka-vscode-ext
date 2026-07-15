# Releasing (maintainers)

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
