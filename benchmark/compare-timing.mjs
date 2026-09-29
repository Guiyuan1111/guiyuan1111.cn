#!/usr/bin/env node
// Compare two page-timing snapshots (zero-dependency): medians over the pages
// present in BOTH snapshots, plus estimated real-network FCP under reference
// bandwidths. Pure evidence assembly for note/report/perf — no site changes.
//
// Usage: node benchmark/compare-timing.mjs --old=results/a.json --new=results/b.json
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

// estimated FCP = local render baseline (measured FCP, transfer ≈ free on
// localhost) + wire transfer time at the reference bandwidth
const estimateFcp = (wireKb, fcpMs, kbps) => Math.round((wireKb * 1024 * 8) / kbps + fcpMs)

const oldSnap = JSON.parse(fs.readFileSync(path.resolve(arg('old')), 'utf8'))
const newSnap = JSON.parse(fs.readFileSync(path.resolve(arg('new')), 'utf8'))
const newByPage = new Map(newSnap.pages.map(p => [p.page, p]))
const shared = oldSnap.pages.filter(p => newByPage.has(p.page))

const wireOld = median(shared.map(p => p.transferKB))
const wireNew = median(shared.map(p => newByPage.get(p.page).transferKB))
const fcpOld = median(shared.map(p => p.fcpMs))
const fcpNew = median(shared.map(p => newByPage.get(p.page).fcpMs))
const lcpOld = median(shared.map(p => p.lcpMs))
const lcpNew = median(shared.map(p => newByPage.get(p.page).lcpMs))
const loadOld = median(shared.map(p => p.loadMs))
const loadNew = median(shared.map(p => newByPage.get(p.page).loadMs))

const BANDWIDTHS = [
  { name: 'congested ~400kbps', kbps: 400 },
  { name: 'Slow 4G ~1.6Mbps', kbps: 1600 },
  { name: 'regular 4G ~8Mbps', kbps: 8000 },
]

const out = {
  sharedPages: shared.length,
  oldSnapshot: path.basename(arg('old')),
  newSnapshot: path.basename(arg('new')),
  medians: {
    wireKb: { old: wireOld, new: wireNew, deltaPct: Number(((1 - wireNew / wireOld) * 100).toFixed(1)) },
    fcpLocalMs: { old: fcpOld, new: fcpNew },
    lcpLocalMs: { old: lcpOld, new: lcpNew },
    loadLocalMs: { old: loadOld, new: loadNew },
  },
  estimatedFcpMs: Object.fromEntries(BANDWIDTHS.map((b) => {
    const before = estimateFcp(wireOld, fcpOld, b.kbps)
    const after = estimateFcp(wireNew, fcpNew, b.kbps)
    return [b.name, { old: before, new: after, deltaPct: Number(((1 - after / before) * 100).toFixed(1)) }]
  })),
  worstNewLcp: shared
    .map(p => ({ page: p.page, lcpMs: newByPage.get(p.page).lcpMs }))
    .sort((a, b) => b.lcpMs - a.lcpMs)
    .slice(0, 3),
}

console.log(`shared pages: ${out.sharedPages}`)
console.log(`wire@load median: ${wireOld} -> ${wireNew} KB (${out.medians.wireKb.deltaPct}% off)`)
console.log(`FCP local median: ${fcpOld} -> ${fcpNew} ms; LCP: ${lcpOld} -> ${lcpNew} ms`)
for (const [name, e] of Object.entries(out.estimatedFcpMs)) {
  console.log(`estimated FCP ${name}: ${e.old} -> ${e.new} ms (${e.deltaPct}% off)`)
}
console.log(`worst LCP now: ${out.worstNewLcp.map(w => `${w.lcpMs}ms ${w.page}`).join('; ')}`)

const jsonOut = arg('json', '')
if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2))
  console.log(`comparison → ${jsonOut}`)
}
