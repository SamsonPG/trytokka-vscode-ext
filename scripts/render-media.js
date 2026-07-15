const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

function writePng(file, svg, width) {
  const r = new Resvg(Buffer.from(svg), { fitTo: { mode: 'width', value: width } })
  const png = r.render().asPng()
  fs.writeFileSync(file, png)
  console.log('wrote', file, png.length)
}

// Marketplace product mark = full-color Scout (from trytokka web icons when present)
require('./render-icon.js')

const colorB64 = fs.readFileSync(path.join('media', 'icon.png')).toString('base64')
const colorHref = `data:image/png;base64,${colorB64}`

// Thin white outline for Activity Bar + status chip (not marketplace product icon)
writePng(
  path.join('media', 'icon-outline-preview.png'),
  fs.readFileSync(path.join('media', 'icon-outline.svg')),
  128,
)
const outlineB64 = fs.readFileSync(path.join('media', 'icon-outline-preview.png')).toString('base64')
const outlineHref = `data:image/png;base64,${outlineB64}`

const hero = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#080C0B"/>
  <rect x="0" y="0" width="52" height="720" fill="#0A100E"/>
  <!-- Activity Bar: thin white outline -->
  <image href="${outlineHref}" x="8" y="118" width="36" height="36"/>
  <rect x="52" y="0" width="360" height="720" fill="#0F1512" stroke="#24302A"/>
  <image href="${colorHref}" x="76" y="28" width="28" height="28"/>
  <text x="112" y="48" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">Scout</text>
  <text x="76" y="72" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="12">AI Spend</text>
  <rect x="76" y="100" width="300" height="120" rx="18" fill="#161F1B" stroke="#24302A"/>
  <text x="96" y="132" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="11">LEAVING THIS MONTH ON AI</text>
  <text x="96" y="178" fill="#34E89A" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="700">$47.20</text>
  <text x="96" y="204" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="12">Today $2.14 · on pace for $62.80</text>
  <rect x="76" y="240" width="140" height="64" rx="14" fill="#161F1B" stroke="#24302A"/>
  <rect x="236" y="240" width="140" height="64" rx="14" fill="#161F1B" stroke="#24302A"/>
  <text x="92" y="268" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="11">TODAY</text>
  <text x="92" y="290" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">$2.14</text>
  <text x="252" y="268" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="11">PROJECTED</text>
  <text x="252" y="290" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">$62.80</text>
  <rect x="430" y="0" width="850" height="720" fill="#080C0B"/>
  <text x="470" y="80" fill="#5C7168" font-family="Segoe UI, Arial, sans-serif" font-size="14">editor · your code</text>
  <rect x="0" y="680" width="1280" height="40" fill="#0A100E"/>
  <rect x="960" y="686" width="280" height="28" rx="8" fill="#161F1B"/>
  <!-- Status chip: thin outline mark -->
  <image href="${outlineHref}" x="968" y="690" width="20" height="20"/>
  <text x="994" y="705" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="12">$47.20 leaving this month</text>
</svg>`

writePng(path.join('media', 'marketplace-hero.png'), hero, 1280)
fs.copyFileSync(
  path.join('media', 'marketplace-hero.png'),
  path.join('media', 'walkthrough', 'panel.png'),
)

const statusbar = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#080C0B"/>
  <text x="64" y="120" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600">Status bar — every time you code</text>
  <text x="64" y="160" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="16">Scout shows your month spend on the right. No browser tab.</text>
  <rect x="0" y="620" width="1280" height="48" fill="#0A100E"/>
  <rect x="900" y="628" width="340" height="32" rx="8" fill="#161F1B"/>
  <image href="${outlineHref}" x="910" y="632" width="24" height="24"/>
  <text x="942" y="650" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="14">$47.20 leaving this month</text>
  <image href="${colorHref}" x="64" y="220" width="96" height="96"/>
  <text x="180" y="260" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="14">Marketplace icon</text>
  <text x="180" y="284" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">Full-color Scout</text>
  <image href="${outlineHref}" x="64" y="360" width="96" height="96"/>
  <text x="180" y="400" fill="#8FA89A" font-family="Segoe UI, Arial, sans-serif" font-size="14">Activity Bar + status bar</text>
  <text x="180" y="424" fill="#ECF5F0" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">Thin white outline</text>
</svg>`

writePng(path.join('media', 'walkthrough', 'statusbar.png'), statusbar, 1280)

try {
  fs.unlinkSync(path.join('media', 'icon-outline-preview.png'))
} catch (_) {
  /* optional temp */
}
