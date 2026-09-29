#!/usr/bin/env node
import { execSync } from 'node:child_process'
// Orchestrator: run every benchmark against dist and write a labelled snapshot
// to benchmark/results/<label>.json. Snapshots are committed as before/after evidence.
//
// Usage: node benchmark/run-all.mjs [--label=baseline] [--dist=dist]
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { format as formatDeploy, run as runDeployWeight } from './deploy-weight.mjs'
import { run as runFontTraffic } from './font-traffic.mjs'
import { run as runPageWeight } from './page-weight.mjs'

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const label = arg('label') ?? 'latest'
const dist = arg('dist') ?? 'dist'
const pagesManifest = arg('pages-manifest') ?? 'public/fonts/earlysummer-pages/manifest.json'

let gitSha = null
try {
  gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
}
catch {
  gitSha = null
}

const pageWeight = runPageWeight({ dist })
const fontTraffic = runFontTraffic({ dist, pagesManifest })
const deployWeight = runDeployWeight({ dist })
const out = {
  label,
  date: new Date().toISOString(),
  gitSha,
  pageWeight: { summary: pageWeight.summary, pages: pageWeight.pages },
  fontTraffic: {
    summary: fontTraffic.summary,
    pages: fontTraffic.pages,
    shardPopularity: fontTraffic.shardPopularity,
  },
  deployWeight: { summary: { totalBytes: deployWeight.totalBytes, fileCount: deployWeight.fileCount, byType: deployWeight.byType, probes: deployWeight.probes }, top: deployWeight.top },
}

const file = path.join('benchmark', 'results', `${label}.json`)
fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file, JSON.stringify(out, null, 2))

const kb = b => (b / 1024).toFixed(1)
console.log(`[${label}] git=${gitSha} pages=${pageWeight.summary.totalPages}`)
console.log(`  page-weight : max=${kb(pageWeight.summary.maxPageGz)}KB(${pageWeight.summary.maxPage}) median=${kb(pageWeight.summary.medianPageGz)}KB`)
console.log(`  font-traffic: shards=${fontTraffic.summary.shardFaceCount} total=${(fontTraffic.summary.shardTotalBytes / 1048576).toFixed(2)}MB pageFontPages=${fontTraffic.summary.pagesWithPageFont} worst=${kb(fontTraffic.summary.worstPageFontBytes)}KB(${fontTraffic.summary.worstPage}) medianTotal=${kb(fontTraffic.summary.medianPageFontBytes)}KB minCov=${fontTraffic.summary.minPageCoveragePct}%`)
console.log(formatDeploy(deployWeight))
console.log(`  snapshot → ${file}`)
