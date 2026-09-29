#!/usr/bin/env node
// Per-page webfont shard traffic benchmark (read-only, zero-dep).
// Parses every @font-face unicode-range from font.css, extracts the visible text
// of each built page, and reports exactly which shard files a browser would
// fetch for that page — the honest cost of "on-demand" CJK font loading.
//
// Usage: node benchmark/font-traffic.mjs [--dist=dist] [--css=src/styles/font.css]
//                                        [--json=path] [--top=10]
// Run from the repo root.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

function quotedUrl(body) {
  const m = body.match(/url\(\s*["']([^"']+)["']\s*\)/)
  return m ? m[1] : null
}

function bareUrl(body) {
  const m = body.match(/url\(([^)"'\s]+)\)/)
  return m ? m[1] : null
}

/** Parse @font-face blocks (multiline-tolerant) into face records with codepoint sets. */
export function parseFaces(css) {
  const faces = []
  for (const m of css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const body = m[1]
    const family = (body.match(/font-family:\s*["']([^"']+)["']/) || [])[1]
    const src = quotedUrl(body) || bareUrl(body)
    const rangeStr = (body.match(/unicode-range:\s*([^;}]+)/) || [])[1]
    if (!family || !src) {
      continue
    }
    const cps = new Set()
    if (rangeStr) {
      for (const part of rangeStr.split(',')) {
        const x = part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/)
        if (!x) {
          continue
        }
        const a = Number.parseInt(x[1], 16)
        const z = x[2] ? Number.parseInt(x[2], 16) : a
        for (let c = a; c <= z; c++) {
          cps.add(c)
        }
      }
    }
    faces.push({ family, file: src.split('/').pop(), url: src, cps, hasRange: !!rangeStr })
  }
  return faces
}

export function extractVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number.parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, ' ')
}

function* walkHtml(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walkHtml(p)
    }
    else if (e.name.endsWith('.html')) {
      yield p
    }
  }
}

function median(arr) {
  if (!arr.length) {
    return 0
  }
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export function run(cfg = {}) {
  const dist = cfg.dist ?? 'dist'
  const cssPath = cfg.css ?? 'src/styles/font.css'
  const css = fs.readFileSync(cssPath, 'utf8')
  const faces = parseFaces(css)
  const resolveFile = url => (url.startsWith('/') ? path.join(dist, url) : path.join('.', url))
  const sizeOf = new Map()
  for (const f of faces) {
    try {
      sizeOf.set(f.file, fs.statSync(resolveFile(f.url)).size)
    }
    catch {
      sizeOf.set(f.file, 0)
    }
  }
  const esFaces = faces.filter(f => f.family.startsWith('EarlySummer'))

  // per-page exact subsets (R2): when a page carries an injected full-coverage
  // face, the browser downloads that single file INSTEAD of touching any shard
  let pageManifest = null
  if (cfg.pagesManifest) {
    try {
      pageManifest = JSON.parse(fs.readFileSync(cfg.pagesManifest, 'utf8'))
    }
    catch {
      pageManifest = null
    }
  }

  const pages = []
  for (const p of walkHtml(dist)) {
    const html = fs.readFileSync(p, 'utf8')
    const rel = path.relative(dist, p).replaceAll('\\', '/')
    const injected = /<style[^>]*data-page-font[^>]*>[\s\S]*?url\(([^)]+)\)[\s\S]*?<\/style>/.exec(html)
    const text = extractVisibleText(html)
    const cpSet = new Set()
    for (const ch of text) {
      const c = ch.codePointAt(0)
      if (c >= 0x80) {
        cpSet.add(c)
      }
    }
    const hits = new Set()
    let covered = 0
    for (const c of cpSet) {
      let ok = false
      for (const f of esFaces) {
        if (f.hasRange ? f.cps.has(c) : true) {
          ok = true
          if (f.family === 'EarlySummer' && f.hasRange) {
            hits.add(f.file)
          }
        }
      }
      if (ok) {
        covered++
      }
    }
    let shardBytes = 0
    for (const h of hits) {
      shardBytes += sizeOf.get(h) || 0
    }
    let pageFontBytes = 0
    let pageFontChars = null
    if (injected) {
      const url = injected[1].replace(/["']/g, '')
      try {
        pageFontBytes = fs.statSync(path.join(dist, url.replace(/^\//, ''))).size
      }
      catch {
        pageFontBytes = 0
      }
      const entry = pageManifest ? pageManifest[rel] : null
      pageFontChars = entry ? entry.chars : null
      // the injected face wins the cascade for every codepoint it maps; shards
      // are not fetched for this page
      shardBytes = 0
      hits.clear()
      if (pageFontChars !== null) {
        covered = Math.min(covered, pageFontChars)
      }
    }
    pages.push({
      page: rel,
      uniqueNonAscii: cpSet.size,
      covered,
      coveragePct: cpSet.size ? Number(((covered / cpSet.size) * 100).toFixed(1)) : null,
      shardCount: hits.size,
      shardBytes,
      pageFontBytes,
      pageFontChars,
      shards: [...hits],
    })
  }

  const pop = new Map()
  for (const r of pages) {
    for (const s of r.shards) {
      pop.set(s, (pop.get(s) || 0) + 1)
    }
  }
  const shardFiles = esFaces.filter(f => f.family === 'EarlySummer' && f.hasRange).map(f => f.file)
  const union = new Set(pages.flatMap(r => r.shards))
  const unionBytes = [...union].reduce((s, f) => s + (sizeOf.get(f) || 0), 0)
  const fontTotal = r => r.shardBytes + r.pageFontBytes
  const worst = pages.slice().sort((a, b) => fontTotal(b) - fontTotal(a))[0] || null

  const summary = {
    faceCount: faces.length,
    shardFaceCount: shardFiles.length,
    shardTotalBytes: shardFiles.reduce((s, f) => s + (sizeOf.get(f) || 0), 0),
    siteUnionShardCount: union.size,
    siteUnionShardBytes: unionBytes,
    pagesWithPageFont: pages.filter(r => r.pageFontBytes > 0).length,
    worstPageFontBytes: worst ? fontTotal(worst) : 0,
    worstPage: worst ? worst.page : null,
    medianPageShardBytes: median(pages.map(r => r.shardBytes)),
    medianPageFontBytes: median(pages.map(fontTotal)),
    minPageCoveragePct: pages.length ? Math.min(...pages.map(r => r.coveragePct ?? 100)) : null,
  }
  return {
    meta: { dist, css: cssPath },
    summary,
    pages,
    shardPopularity: [...pop.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([file, n]) => ({ file, pages: n, bytes: sizeOf.get(file) || 0 })),
  }
}

// ---- CLI ----
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(new URL(import.meta.url))
if (invokedDirectly) {
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
  const cfg = {
    dist: arg('dist') ?? 'dist',
    css: arg('css') ?? 'src/styles/font.css',
    pagesManifest: arg('pages-manifest'),
  }
  const r = run(cfg)
  const top = Number(arg('top') ?? 10)
  const kb = b => (b / 1024).toFixed(1)
  console.log(`== font-traffic == dist=${cfg.dist} css=${cfg.css} manifest=${cfg.pagesManifest ?? 'off'}`)
  console.log(`faces=${r.summary.faceCount} shards=${r.summary.shardFaceCount} shardTotal=${(r.summary.shardTotalBytes / 1048576).toFixed(2)}MB pageFontPages=${r.summary.pagesWithPageFont} worst=${r.summary.worstPage}=${kb(r.summary.worstPageFontBytes)}KB medianShard=${kb(r.summary.medianPageShardBytes)}KB medianTotal=${kb(r.summary.medianPageFontBytes)}KB minCoverage=${r.summary.minPageCoveragePct}%`)
  for (const p of r.pages.sort((a, b) => (b.shardBytes + b.pageFontBytes) - (a.shardBytes + a.pageFontBytes)).slice(0, top)) {
    console.log(`  ${kb(p.shardBytes + p.pageFontBytes).padStart(8)}KB ${String(p.shardCount).padStart(3)}片 pageFont=${kb(p.pageFontBytes)}KB cov=${p.coveragePct}%  ${p.page}`)
  }
  const json = arg('json')
  if (json) {
    fs.mkdirSync(path.dirname(json), { recursive: true })
    fs.writeFileSync(json, JSON.stringify(r, null, 2))
    console.log(`json → ${json}`)
  }
}
