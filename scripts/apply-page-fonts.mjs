#!/usr/bin/env node
// Build-time injector (pure Node, CI-safe): adds a page-local @font-face for
// every page listed in public/fonts/earlysummer-pages/manifest.json. The injected
// face is declared AFTER font.css, so the CSS cascade makes it win over the
// unicode-range shards for that page — the browser downloads one exact subset
// instead of every shard band the article touches. Pages missing from the
// manifest (or stale subsets missing chars) simply fall through to the shards.
//
// Runs at the end of `pnpm build`, after Astro has written dist/.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DIST = 'dist'
const MANIFEST = 'public/fonts/earlysummer-pages/manifest.json'
const CONFIG = 'src/config.ts'
const MARKER = 'data-page-font'

// The serif body style is what routes prose text into the EarlySummer family.
// With themeConfig.global.fontStyle = 'sans' (site default) no element ever
// consults that family, so injecting page faces would only add dead bytes to
// every page — skip entirely and let the shards stay the serif-mode fallback.
const configSrc = fs.readFileSync(CONFIG, 'utf8')
const mode = configSrc.match(/fontStyle:\s*'(sans|serif)'/)?.[1]
if (mode !== 'serif') {
  // Page fonts in a sans build are dead deploy weight: no page references them,
  // but Astro still copies public/fonts/earlysummer-pages/ into dist. Remove
  // them so the deployment doesn't ship megabytes nothing will ever fetch.
  // (Serif rebuilds regenerate them via `pnpm gen:pagefonts` — see note/font-subset.md.)
  const distPages = path.join(DIST, 'fonts', 'earlysummer-pages')
  if (fs.existsSync(distPages)) {
    let bytes = 0
    let files = 0
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) {
          walk(p)
        }
        else {
          bytes += fs.statSync(p).size
          files++
        }
      }
    }
    walk(distPages)
    fs.rmSync(distPages, { recursive: true, force: true })
    console.log(`[page-fonts] fontStyle=${mode ?? '?'} — removed ${files} unreferenced page fonts from dist (-${(bytes / 1048576).toFixed(2)}MB deploy weight)`)
  }
  else {
    console.log(`[page-fonts] fontStyle=${mode ?? '?'} — page fonts only pay off in serif mode; nothing injected`)
  }
  process.exit(0)
}

function inject(html, fontUrl) {
  const style = `<style ${MARKER}>@font-face{font-family:"EarlySummer";`
    + `src:url("${fontUrl}")format("woff2-variations");`
    + 'font-display:swap;font-weight:400 700;}</style>'
  // Anchor on the LAST head closer: HTML comments (e.g. Head.astro notes) may
  // legitimately spell out the head closing tag inside a comment, and body text
  // always escapes such literals to entities — so the final occurrence is the
  // only one guaranteed to be the real </head>.
  const at = html.lastIndexOf('</head>')
  if (at < 0) {
    throw new Error('no head closer found')
  }
  return html.slice(0, at) + style + html.slice(at)
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(p)
    }
    else if (e.name.endsWith('.html')) {
      yield p
    }
  }
}

if (!fs.existsSync(MANIFEST)) {
  console.warn(`[page-fonts] no manifest at ${MANIFEST} — nothing to inject `
    + '(run `python scripts/gen-page-fonts.py` after a build to generate)')
  process.exit(0)
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

let injected = 0
let missing = 0
for (const hp of walk(DIST)) {
  const rel = path.relative(DIST, hp).replaceAll('\\', '/')
  const entry = manifest[rel]
  if (!entry) {
    continue
  }
  const distFont = path.join(DIST, 'fonts', 'earlysummer-pages', entry.font)
  if (!fs.existsSync(distFont)) {
    missing++
    console.warn(`[page-fonts] font for ${rel} missing in dist — skipped (shards apply)`)
    continue
  }
  const html = fs.readFileSync(hp, 'utf8')
  if (html.includes(MARKER)) {
    continue
  }
  fs.writeFileSync(hp, inject(html, `/fonts/earlysummer-pages/${entry.font}`))
  injected++
}
console.log(`[page-fonts] injected ${injected} page faces `
  + `(${missing} missing fonts fell back to shards)`)
