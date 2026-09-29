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

function fontStyle() {
  const src = fs.readFileSync('src/config.ts', 'utf8')
  return src.match(/fontStyle:\s*'(sans|serif)'/)?.[1] ?? 'sans'
}

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

// ---- regression gate -------------------------------------------------------
// `--assert`          : absolute red lines only (content-growth independent — CI-safe)
// `--assert=<label>`  : additionally compare page-weight/deploy against
//                       benchmark/results/<label>.json with explicit tolerances
const assertArg = process.argv.find(a => a === '--assert' || a.startsWith('--assert='))
if (assertArg) {
  const violations = []
  const mode = fontStyle()

  // absolute red lines (v1.0.17+ policies; zero tolerance)
  if (pageWeight.summary.totalPages === 0) {
    violations.push('no pages built')
  }
  const dw = deployWeight.probes
  if (mode === 'sans' && dw.earlysummerPages.bytes > 0) {
    violations.push(`sans build ships ${kb(dw.earlysummerPages.bytes)}KB of unreferenced serif page fonts (apply-page-fonts cleanup skipped?)`)
  }
  if (dw.originalUiFonts.bytes > 0) {
    violations.push(`source fonts deployed: ${kb(dw.originalUiFonts.bytes)}KB (Snell/STIX originals belong in src/assets/fonts/)`)
  }
  if (dw.katexLegacyFonts.bytes > 0) {
    violations.push(`katex woff/ttf legacy fonts deployed: ${kb(dw.katexLegacyFonts.bytes)}KB (optimize-dist strip skipped?)`)
  }
  const minCoverageFloor = 95
  if (fontTraffic.summary.minPageCoveragePct < minCoverageFloor) {
    violations.push(`font-traffic min page coverage ${fontTraffic.summary.minPageCoveragePct}% < ${minCoverageFloor}% floor (some page's visible chars are not covered by any declared face)`)
  }

  // relative drift vs a committed baseline
  const baselineLabel = assertArg.includes('=') ? assertArg.slice('--assert='.length) : null
  if (baselineLabel) {
    const baselinePath = path.join('benchmark', 'results', `${baselineLabel}.json`)
    if (!fs.existsSync(baselinePath)) {
      violations.push(`baseline snapshot not found: ${baselinePath}`)
    }
    else {
      const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
      const drift = (now, before, tol) => now > before * tol
      const bMedian = base.pageWeight?.summary?.medianPageGz
      const bMax = base.pageWeight?.summary?.maxPageGz
      const bDeploy = base.deployWeight?.summary?.totalBytes
      if (bMedian && drift(pageWeight.summary.medianPageGz, bMedian, 1.15)) {
        violations.push(`page-weight median ${kb(pageWeight.summary.medianPageGz)}KB > ${kb(bMedian)}KB baseline × 1.15`)
      }
      if (bMax && drift(pageWeight.summary.maxPageGz, bMax, 1.25)) {
        violations.push(`page-weight max ${kb(pageWeight.summary.maxPageGz)}KB > ${kb(bMax)}KB baseline × 1.25`)
      }
      if (bDeploy && drift(deployWeight.totalBytes, bDeploy, 1.5)) {
        violations.push(`deploy total ${(deployWeight.totalBytes / 1048576).toFixed(2)}MB > ${(bDeploy / 1048576).toFixed(2)}MB baseline × 1.5`)
      }
    }
  }

  if (violations.length > 0) {
    console.error(`[assert] REGRESSION — ${violations.length} red-line violation(s):`)
    for (const v of violations) {
      console.error(`  ✗ ${v}`)
    }
    process.exit(1)
  }
  console.log(`[assert] all red lines hold${baselineLabel ? ` (vs baseline ${baselineLabel})` : ''}`)
}
console.log(`  snapshot → ${file}`)
