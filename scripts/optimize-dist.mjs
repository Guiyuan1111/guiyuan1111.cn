#!/usr/bin/env node
// Build-end deploy-weight pass (pure Node + sharp, already a dependency).
// Runs at the very end of `pnpm build`, after everything in dist/ is final.
// Two jobs, both deploy-size-only — no page-referenced asset changes format:
//
// 1. dist/og/*.png → palette PNG (sharp). astro-og-canvas emits truecolor PNGs
//    of flat-color text cards (~80KB each); palette quantization keeps them
//    visually identical at a fraction of the size. A re-encode is only kept if
//    it is smaller AND its dimensions match the original.
// 2. KaTeX legacy font fallbacks: the emitted katex.min.*.css declares
//    woff2 → woff → ttf src chains. Every browser that can run KaTeX speaks
//    woff2, so the woff/ttf copies (≈0.8MB) are dead weight — drop the src
//    entries and delete files that no dist asset references anymore.
// 3. Unreachable-asset sweep: with rehype-katex/rehype-mermaid both rendering
//    at build time, a build whose pages carry no math spans leaves katex css +
//    fonts (~0.27MB) referenced by nothing. benchmark/reachability.mjs does a
//    text-level reference closure over every emitted asset; closure-external
//    files are deleted. Vite always emits literal chunk paths, so text search
//    is a safe upper bound. Self-healing: a future math post renders the katex
//    <link>, making css+fonts reachable again and the sweep keeps them.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DIST = 'dist'

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

function referencedAnywhere(name) {
  // conservative: any file in dist still mentioning the asset keeps it alive
  for (const p of walk(DIST)) {
    if (!/\.(?:css|html|js|mjs)$/.test(p)) {
      continue
    }
    if (fs.readFileSync(p, 'utf8').includes(name)) {
      return true
    }
  }
  return false
}

async function optimizeOg() {
  const { default: sharp } = await import('sharp')
  const ogDir = path.join(DIST, 'og')
  if (!fs.existsSync(ogDir)) {
    return
  }
  let saved = 0
  let count = 0
  for (const p of walk(ogDir)) {
    if (!p.endsWith('.png')) {
      continue
    }
    const orig = fs.readFileSync(p)
    const img = sharp(orig)
    const meta = await img.metadata()
    const out = await img.png({ palette: true, quality: 90, effort: 9 }).toBuffer()
    if (out.length < orig.length && (await sharp(out).metadata()).width === meta.width) {
      fs.writeFileSync(p, out)
      saved += orig.length - out.length
      count++
    }
  }
  console.log(`[optimize-dist] og: re-encoded ${count} PNGs (-${(saved / 1048576).toFixed(2)}MB)`)
}

async function trimKatexLegacyFonts() {
  const cssFiles = [...walk(DIST)].filter(p => /katex.*\.css$/.test(p))
  if (cssFiles.length === 0) {
    return
  }
  const candidates = new Set()
  for (const p of cssFiles) {
    let css = fs.readFileSync(p, 'utf8')
    const beforeWoff2 = (css.match(/\.woff2/g) ?? []).length
    css = css.replace(/,url\([^)]*\.woff\)\s*format\("woff"\)/g, '')
    css = css.replace(/,url\([^)]*\.ttf\)\s*format\("truetype"\)/g, '')
    const afterWoff2 = (css.match(/\.woff2/g) ?? []).length
    if (afterWoff2 !== beforeWoff2) {
      throw new Error(`katex css rewrite changed woff2 refs (${beforeWoff2} → ${afterWoff2}) — aborting`)
    }
    fs.writeFileSync(p, css)
    for (const m of css.matchAll(/url\(([^)]*)\)/g)) {
      candidates.add(m[1].replace(/^["']|["']$/g, '').split('/').pop())
    }
  }
  let saved = 0
  let removed = 0
  for (const p of walk(DIST)) {
    const name = path.basename(p)
    if (!/\.(?:ttf|woff)$/.test(name) || !/_astro\//.test(p.replaceAll('\\', '/'))) {
      continue
    }
    if (candidates.has(name) || referencedAnywhere(name)) {
      continue
    }
    saved += fs.statSync(p).size
    fs.unlinkSync(p)
    removed++
  }
  console.log(`[optimize-dist] katex: removed ${removed} legacy woff/ttf files (-${(saved / 1048576).toFixed(2)}MB)`)
}

async function sweepUnreachableAssets() {
  const { analyze } = await import('../benchmark/reachability.mjs')
  // belt & suspenders: pages that actually carry feature markup keep everything
  // (attribute-anchored so prose merely mentioning the word never disables it)
  for (const p of walk(DIST)) {
    if (!p.endsWith('.html')) {
      continue
    }
    const html = fs.readFileSync(p, 'utf8')
    if (/class="mermaid"|class="katex/.test(html)) {
      console.log('[optimize-dist] sweep: skipped — pages carry mermaid/katex feature markup')
      return
    }
  }
  const { unreachable, bytes } = analyze(DIST)
  let saved = 0
  for (const f of unreachable) {
    saved += bytes(f)
    fs.unlinkSync(f)
  }
  console.log(`[optimize-dist] sweep: removed ${unreachable.length} unreachable _astro assets (-${(saved / 1048576).toFixed(2)}MB)`)
}

const results = await Promise.allSettled([optimizeOg(), trimKatexLegacyFonts()])
for (const r of results) {
  if (r.status === 'rejected') {
    console.warn(`[optimize-dist] step failed (non-fatal, deploy size unaffected): ${r.reason}`)
    process.exitCode = 0
  }
}
// sweep runs last and alone: it must see the dist the steps above finished with
try {
  await sweepUnreachableAssets()
}
catch (err) {
  console.warn(`[optimize-dist] sweep failed (non-fatal, deploy-weight probe will flag it): ${err}`)
  process.exitCode = 0
}
