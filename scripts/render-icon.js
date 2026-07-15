/**
 * scripts/render-icon.js
 * Marketplace product icon = full-color Scout (synced from TryTokka web icons).
 * Activity Bar uses media/gecko.svg (thin monochrome outline, themed by VS Code).
 */
const fs = require('fs')
const path = require('path')

const coloredSrc = path.join(
  __dirname,
  '..',
  '..',
  'trytokka',
  'public',
  'icons',
  'icon-512.png',
)
const dest = path.join(__dirname, '..', 'media', 'icon.png')

if (!fs.existsSync(coloredSrc)) {
  console.error('Missing colored source:', coloredSrc)
  console.error('Falling back: keep existing media/icon.png if present.')
  process.exit(fs.existsSync(dest) ? 0 : 1)
}

fs.copyFileSync(coloredSrc, dest)
console.log('wrote media/icon.png from', coloredSrc)
