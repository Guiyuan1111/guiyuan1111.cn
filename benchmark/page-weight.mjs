#!/usr/bin/env node
import { Buffer } from 'node:buffer'
// Per-page transfer-weight benchmark (read-only, zero-dep).
// For every built page: resolve the assets its HTML actually references
// (stylesheets, module scripts, preloads, images), and report raw + gzip(9)
// sizes as a local proxy for the CDN's brotli transfer size.
//
// Usage: node benchmark/page-weight.mjs [--dist=dist] [--json=path] [--top=10]
// Run from the repo root.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const gzCache = new Map()
function gz(p) {
  if (!gzCache.has(p)) {
    gzCache.set(p, zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length)
  }
  return gzCache.get(p)
}

function attrOf(tag, name) {
  const m = tag.match(new RegExp(`${name}=["']([^"']*)["']`))
  return m ? m[1] : ''
}

function resolveRef(ref, htmlPath, distRoot) {
  const clean = decodeURIComponent(ref.split('?')[0].split('#')[0])
  if (/^https?:\/\//.test(clean)) {
    return { external: true }
  }
  const p = clean.startsWith('/')
    ? path.join(distRoot, clean)
    : path.resolve(path.dirname(htmlPath), clean)
  return { external: false, path: p }
}

function cat(file) {
  if (file.endsWith('.css')) {
    return 'css'
  }
  if (file.endsWith('.js')) {
    return 'js'
  }
  if (/\.(?:woff2?|ttf|otf)$/i.test(file)) {
    return 'font'
  }
  if (/\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(file)) {
    return 'img'
  }
  return 'other'
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

export function run(cfg = {}) {
  const dist = cfg.dist ?? 'dist'
  const rawStat = p => fs.statSync(p).size
  const pages = []
  const uniq = { css: new Map(), js: new Map(), font: new Map(), img: new Map(), other: new Map() }

  for (const hp of walkHtml(dist)) {
    const html = fs.readFileSync(hp, 'utf8')
    const refs = []
    for (const m of html.matchAll(/<link\s[^>]*>/gi)) {
      const tag = m[0]
      const rel = attrOf(tag, 'rel')
      const href = attrOf(tag, 'href')
      if (!href) {
        continue
      }
      if (rel === 'stylesheet' || rel === 'preload' || rel === 'modulepreload' || rel === 'prefetch') {
        refs.push({ kind: cat(href), href })
      }
    }
    for (const m of html.matchAll(/<script\s[^>]*>/gi)) {
      const src = attrOf(m[0], 'src')
      if (src) {
        refs.push({ kind: 'js', href: src })
      }
    }
    for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
      const src = attrOf(m[0], 'src')
      if (src) {
        refs.push({ kind: 'img', href: src })
      }
    }
    // per-page exact font subsets are referenced from an inline <style>
    for (const m of html.matchAll(/<style[^>]*data-page-font[^>]*>[\s\S]*?<\/style>/gi)) {
      const u = /url\(([^)]+)\)/.exec(m[0])
      if (u) {
        refs.push({ kind: 'font', href: u[1].replace(/["']/g, '') })
      }
    }
    // inline script bytes: script elements whose open tag carries no src attr
    let inlineScript = 0
    for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi)) {
      const openTag = m[0].slice(0, m[0].indexOf('>') + 1)
      if (!attrOf(openTag, 'src')) {
        inlineScript += m[1].length
      }
    }

    const agg = {}
    const seen = new Set()
    for (const { kind, href } of refs) {
      const r = resolveRef(href, hp, dist)
      if (r.external) {
        continue
      }
      const key = `${kind}\u0000${r.path}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      agg[kind] = agg[kind] || { raw: 0, gz: 0, files: [] }
      if (!fs.existsSync(r.path)) {
        agg[kind].missing = (agg[kind].missing || 0) + 1
        continue
      }
      const s = rawStat(r.path)
      agg[kind].raw += s
      agg[kind].gz += gz(r.path)
      agg[kind].files.push(r.path)
      if (!uniq[kind].has(r.path)) {
        uniq[kind].set(r.path, { raw: s, gz: gz(r.path) })
      }
    }
    const htmlRaw = Buffer.byteLength(html)
    const total = { raw: htmlRaw, gz: gz(hp) }
    for (const k in agg) {
      total.raw += agg[k].raw
      total.gz += agg[k].gz
    }
    pages.push({
      page: path.relative(dist, hp).replaceAll('\\', '/'),
      html: { raw: htmlRaw, gz: gz(hp), inlineScriptBytes: inlineScript },
      assets: agg,
      total,
    })
  }

  const sorted = [...pages].sort((a, b) => b.total.gz - a.total.gz)
  const med = arr => (arr.length ? [...arr].sort((x, y) => x - y)[Math.floor(arr.length / 2)] : 0)
  const footprint = {}
  for (const k in uniq) {
    const raw = [...uniq[k].values()].reduce((s, v) => s + v.raw, 0)
    const gzSum = [...uniq[k].values()].reduce((s, v) => s + v.gz, 0)
    footprint[k] = { files: uniq[k].size, raw, gz: gzSum }
  }
  const eagerJs = uniq.js.size
    ? {
        files: [...uniq.js.keys()].map(p => path.basename(p)),
        raw: [...uniq.js.values()].reduce((s, v) => s + v.raw, 0),
        gz: [...uniq.js.values()].reduce((s, v) => s + v.gz, 0),
      }
    : null
  const summary = {
    totalPages: pages.length,
    maxPageGz: sorted[0] ? sorted[0].total.gz : 0,
    maxPage: sorted[0] ? sorted[0].page : null,
    medianPageGz: med(pages.map(p => p.total.gz)),
    minHtmlGz: Math.min(...pages.map(p => p.html.gz)),
    eagerJs,
    siteFootprint: footprint,
  }
  return { meta: { dist }, summary, pages }
}

// ---- CLI ----
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(new URL(import.meta.url))
if (invokedDirectly) {
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
  const cfg = { dist: arg('dist') ?? 'dist' }
  const r = run(cfg)
  const top = Number(arg('top') ?? 10)
  const kb = b => (b / 1024).toFixed(1)
  console.log(`== page-weight == dist=${cfg.dist} pages=${r.summary.totalPages}`)
  console.log(`max=${kb(r.summary.maxPageGz)}KB(${r.summary.maxPage}) median=${kb(r.summary.medianPageGz)}KB`)
  if (r.summary.eagerJs) {
    console.log(`eagerJs: files=${r.summary.eagerJs.files.length} raw=${r.summary.eagerJs.raw}B gz=${r.summary.eagerJs.gz}B [${r.summary.eagerJs.files.join(', ')}]`)
  }
  for (const [k, v] of Object.entries(r.summary.siteFootprint)) {
    console.log(`footprint ${k}: files=${v.files} raw=${kb(v.raw)}KB gz=${kb(v.gz)}KB`)
  }
  for (const p of r.pages.sort((a, b) => b.total.gz - a.total.gz).slice(0, top)) {
    console.log(`  ${kb(p.total.gz).padStart(8)}KB gz (raw ${kb(p.total.raw)}KB)  ${p.page}`)
  }
  const json = arg('json')
  if (json) {
    fs.mkdirSync(path.dirname(json), { recursive: true })
    fs.writeFileSync(json, JSON.stringify(r, null, 2))
    console.log(`json → ${json}`)
  }
}
