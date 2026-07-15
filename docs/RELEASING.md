# Releasing (maintainers)

Marketplace updates are **manual uploads** (no VSCE_PAT / Actions publish).

1. Bump `version` in `package.json` and add a CHANGELOG entry.
2. Commit and push `main`.
3. Package locally:

```bash
npm run compile
npx @vscode/vsce package --allow-missing-repository -o extension.vsix
```

4. Upload `extension.vsix` in [Marketplace → Manage](https://marketplace.visualstudio.com/manage/publishers/trytokka) (same flow you use today).

Optional: attach the `.vsix` to a GitHub Release for yourself (`gh release create vX.Y.Z extension.vsix`).

CI still compiles + dry-run packages on every push/PR so breaks are caught early. It does **not** publish.
