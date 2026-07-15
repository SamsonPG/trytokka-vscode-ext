/**
 * Rebuild media/font/scout-icons.woff from media/icons-src/*.svg
 * (Windows: path.join + glob need forward slashes — patched below.)
 */
const path = require('path')
const fs = require('fs')

const origJoin = path.join.bind(path)
path.join = (...args) => origJoin(...args).split(path.sep).join('/')

async function main() {
  const fantasticonPath = path.resolve(
    __dirname,
    '..',
    '.npm-cache',
    '_npx',
    'e89296a1237d61a1',
    'node_modules',
    'fantasticon',
  )
  let fantasticon
  try {
    fantasticon = require(fantasticonPath)
  } catch {
    console.error('Install fantasticon once: npx fantasticon --help')
    console.error('Or run: npm i -D fantasticon')
    process.exit(1)
  }

  const root = path.resolve(__dirname, '..').split(path.sep).join('/')
  const inputDir = `${root}/media/icons-src`
  const outputDir = `${root}/media/font`
  fs.mkdirSync(outputDir.replace(/\//g, path.sep), { recursive: true })

  await fantasticon.generateFonts({
    inputDir,
    outputDir,
    name: 'scout-icons',
    fontTypes: ['woff'],
    assetTypes: ['json'],
    normalize: true,
    fontHeight: 1000,
  })
  console.log('wrote media/font/scout-icons.woff')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
