// Lightning CSS Turbopack patch — STATIC REQUIRES
// Turbopack, lightningcss node/index.js içindeki dinamik require desenini
// (require(`lightningcss-${parts.join('-')}`)) çözemeyip "Cannot find module 'unknown'"
// hatası veriyor (next dev 500). Çözüm: her platform için statik require zinciri.
// npm ci / npm install sonrası otomatik uygulanır (package.json -> postinstall).
const fs = require('fs')
const path = require('path')

const f = path.join(process.cwd(), 'node_modules', 'lightningcss', 'node', 'index.js')
if (!fs.existsSync(f)) {
  console.log('[patch-lightningcss] lightningcss node/index.js bulunamadı, atlanıyor.')
  process.exit(0)
}

let src = fs.readFileSync(f, 'utf8')
const startMark = 'let native;'
const endMark = 'module.exports.transform'
const startIdx = src.indexOf(startMark)
const endIdx = src.indexOf(endMark)
if (startIdx === -1 || endIdx === -1) {
  console.log('[patch-lightningcss] hedef blok bulunamadi (zaten patch\'li olabilir), atlaniyor.')
  process.exit(0)
}

// Zaten patch'liyse (statik zincir varsa) atla
if (src.includes("'lightningcss-win32-x64-msvc'")) {
  console.log('[patch-lightningcss] zaten patch\'li, atlaniyor.')
  process.exit(0)
}

const replacement = `let native;
if (process.platform === 'win32' && (process.arch === 'x64' || process.arch === 'arm64')) {
  native = require(process.arch === 'x64' ? 'lightningcss-win32-x64-msvc' : 'lightningcss-win32-arm64-msvc');
} else if (process.platform === 'linux') {
  const { MUSL, familySync } = require('detect-libc');
  if (familySync() === MUSL) {
    native = require(process.arch === 'x64' ? 'lightningcss-linux-x64-musl' : 'lightningcss-linux-arm64-musl');
  } else {
    native = require(process.arch === 'x64' ? 'lightningcss-linux-x64-gnu' : 'lightningcss-linux-arm64-gnu');
  }
} else if (process.platform === 'darwin') {
  native = require(process.arch === 'x64' ? 'lightningcss-darwin-x64' : 'lightningcss-darwin-arm64');
} else {
  native = require(require('path').join(require('os').tmpdir(), 'lightningcss-missing-platform'));
}

${endMark}`

src = src.slice(0, startIdx) + replacement + src.slice(endIdx + endMark.length)
fs.writeFileSync(f, src)
console.log('[patch-lightningcss] PATCHED — statik require zinciri uygulandı.')