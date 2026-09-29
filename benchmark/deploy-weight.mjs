#!/usr/bin/env node
// Deploy-footprint benchmark (zero-dependency): walks a built dist/ and reports
// total and per-type bytes, the largest files, and probes for known classes of
// dead deploy weight. Page-load cost is page-weight.mjs's job; this measures the
// other axis — what gets uploaded to the CDN on every deploy.
//
// Probes (bytes of assets no page will ever fetch, by construction):
//   - earlysummerPages  page-level serif subsets when fontStyle='sans' (they are
//                       only injected into pages in serif builds)
//   - originalUiFonts   Snell/STIX source fonts kept next to their subsets
//   - katexLegacyFonts  KaTeX woff/ttf fallbacks (woff2 covers every browser
//                       that can execute KaTeX)
//   - mermaidChunks     mermaid lazy chunks; fetched only if a page embeds a
//                       diagram, so dead weight unless such content exists
//   - sounds            disabled SoundEffect WAVs (kept: documented restore path)
//   - orphanAstroAssets unreachable-by-reference-closure _astro files (must be 0
//                       after the optimize-dist sweep; >0 means sweep skipped)
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { summarize as reachabilitySummary } from './reachability.mjs'

const FONT_EXT = new Set(['.woff2', '.woff', '.ttf', '.otf'])
const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif', '.avif'])
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3)
const jsonOut = arg('json')

function fontStyle() {
  const src = fs.readFileSync('src/config.ts', 'utf8')
  return src.match(/fontStyle:\s*'(sans|serif)'/)?.[1] ?? 'sans'
}

function* walk(dir) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(p)
    }
    else {
      yield p
    }
  }
}

function dirBytes(dir) {
  let total = 0
  let files = 0
  for (const p of walk(dir)) {
    total += fs.statSync(p).size
    files++
  }
  return { bytes: total, files }
}

export function run({ dist = 'dist' } = {}) {
  const mode = fontStyle()
  const byType = {}
  const files = []
  for (const p of walk(dist)) {
    const size = fs.statSync(p).size
    const ext = path.extname(p).toLowerCase()
    const rel = path.relative(dist, p).replaceAll('\\', '/')
    const type = ext === '.html'
      ? 'html'
      : ext === '.css'
        ? 'css'
        : ext === '.js' || ext === '.mjs'
          ? 'js'
          : FONT_EXT.has(ext)
            ? 'font'
            : IMAGE_EXT.has(ext)
              ? 'image'
              : 'other'
    byType[type] = (byType[type] ?? 0) + size
    files.push({ file: rel, bytes: size, type })
  }
  const totalBytes = files.reduce((a, f) => a + f.bytes, 0)
  const top = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 12)
  const reach = reachabilitySummary(dist)

  const sans = mode !== 'serif'
  const sumMatch = (re) => {
    const hits = files.filter(f => re.test(f.file))
    return { present: hits.length > 0, dead: true, bytes: hits.reduce((a, f) => a + f.bytes, 0) }
  }
  const sumDir = (rel, dead) => {
    const r = dirBytes(path.join(dist, rel))
    return { present: r.files > 0, dead, bytes: r.bytes }
  }
  const probes = {
    mode,
    // page-level serif subsets are only injected into pages in serif builds
    earlysummerPages: sumDir('fonts/earlysummer-pages', sans),
    originalUiFonts: sumMatch(/^fonts\/(?:Snell-[A-Za-z]+-SF|STIX(?:-Italic)?-VF)\.woff2$/),
    katexLegacyFonts: sumMatch(/KaTeX_.+\.(?:ttf|woff)$/),
    mermaidChunks: { ...sumMatch(/mermaid/i), dead: true },
    // disabled SoundEffect WAVs are intentionally kept (documented restore path)
    sounds: { ...sumDir('sounds', false), dead: false },
    // text-level reference closure over _astro: anything here is fetched by no
    // page and imported by no chunk — the optimize-dist sweep must have removed it
    orphanAstroAssets: {
      present: reach.orphans > 0,
      dead: true,
      bytes: reach.orphanBytes,
      files: reach.orphanFiles,
    },
  }

  return { totalBytes, fileCount: files.length, byType, top, probes }
}

export function format(res) {
  const kb = b => (b / 1024).toFixed(1)
  const mb = b => (b / 1048576).toFixed(2)
  const lines = []
  lines.push(`  deploy-size : total=${mb(res.totalBytes)}MB files=${res.fileCount}`)
  for (const [t, b] of Object.entries(res.byType).sort((a, b) => b[1] - a[1])) {
    lines.push(`    ${t.padEnd(6)} ${mb(b)}MB`)
  }
  const dead = Object.entries(res.probes).filter(([k, v]) => k !== 'mode' && v.dead && v.bytes > 0)
  if (dead.length) {
    lines.push(`    dead-weight probes: ${dead.map(([k, v]) => `${k}=${kb(v.bytes)}KB`).join('  ')}`)
  }
  else {
    lines.push('    dead-weight probes: none flagged')
  }
  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}`) {
  const dist = arg('dist') ?? 'dist'
  const res = run({ dist })
  console.log(format(res))
  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify(res, null, 2))
    console.log(`  snapshot → ${jsonOut}`)
  }
  process.exit(0)
}
