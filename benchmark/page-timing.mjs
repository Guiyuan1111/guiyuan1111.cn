import { spawn } from 'node:child_process'
// Loading-timing benchmark (zero-dependency): serves a built dist/ over a
// throwaway HTTP server, loads every page in headless Chrome/Edge via CDP with
// cache disabled, and records what bytes alone cannot — user-perceived timing:
// FCP, LCP, DOMContentLoaded, load event, and total wire transfer.
// Complements page-weight/font-traffic (static bytes) and font-cascade-check
// (font cascade correctness); the campaign's before/after evidence lives in
// note/report/perf/ alongside per-round byte reports.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'

const BROWSER_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const CDP_PORT = 9779
const HTTP_PORT = 4211
const LCP_SETTLE_MS = 1500

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
}

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

function findBrowser() {
  for (const p of BROWSER_CANDIDATES) {
    if (fs.existsSync(p)) {
      return p
    }
  }
  return null
}

function startServer(root) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(root, urlPath)
    if (urlPath.endsWith('/')) {
      file = path.join(file, 'index.html')
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
      res.end(data)
    })
  })
  return new Promise(resolve => server.listen(HTTP_PORT, '127.0.0.1', () => resolve(server)))
}

async function fetchJson(url, method = 'GET') {
  const res = await fetch(url, { method })
  return res.json()
}

async function waitForCdp(attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`)
    }
    catch {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  throw new Error('CDP endpoint never came up')
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.listeners = new Set()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      }
      else if (msg.method) {
        for (const l of this.listeners) {
          l(msg)
        }
      }
    })
  }

  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve)
      ws.addEventListener('error', reject)
    })
    return new Cdp(ws)
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }))
    return promise
  }

  on(listener) {
    this.listeners.add(listener)
  }

  close() {
    this.ws.close()
  }
}

// Observers must exist before navigation: buffered paint/LCP entries land in
// window.__timing for collection after the load event + settle window.
const OBSERVER_BOOTSTRAP = `
window.__timing = { fcp: 0, lcp: 0 }
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) {
    if (e.name === 'first-contentful-paint') window.__timing.fcp = e.startTime
  }
}).observe({ type: 'paint', buffered: true })
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) {
    if (e.startTime > window.__timing.lcp) window.__timing.lcp = e.startTime
  }
}).observe({ type: 'largest-contentful-paint', buffered: true })
`

function median(values) {
  const v = values.filter(x => Number.isFinite(x)).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

async function main() {
  const dist = arg('dist', 'dist')
  const jsonOut = arg('json', '')
  const browser = findBrowser()
  if (!browser) {
    console.error('[page-timing] no Chrome/Edge found')
    process.exit(1)
  }
  const pages = []
  const walkHtml = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) {
        walkHtml(p)
      }
      else if (e.name === 'index.html') {
        pages.push(path.relative(dist, p).replaceAll('\\', '/'))
      }
    }
  }
  walkHtml(dist)
  const sample = Number(arg('sample', '0'))
  const selected = sample > 0 ? pages.slice(0, sample) : pages
  if (pages.length === 0) {
    console.error(`[page-timing] no pages found under ${dist} — run the build first`)
    process.exit(1)
  }

  const server = await startServer(dist)
  const child = spawn(browser, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'pt-cdp-'))}`,
  ], { stdio: 'ignore' })
  const targets = await waitForCdp()
  const pageTarget = targets.find(t => t.type === 'page')
  const browserCdp = await Cdp.connect(pageTarget.webSocketDebuggerUrl)

  const transferByTarget = new Map()
  browserCdp.on((msg) => {
    if (msg.method === 'Network.requestWillBeSent' && transferByTarget.has(msg.sessionId)) {
      transferByTarget.get(msg.sessionId).urls.set(msg.params.requestId, msg.params.request.url)
    }
    if (msg.method === 'Network.loadingFinished' && transferByTarget.has(msg.sessionId)) {
      const rec = transferByTarget.get(msg.sessionId)
      rec.bytes += msg.params.encodedDataLength || 0
      rec.requests++
      rec.perUrl.set(msg.params.requestId, (rec.perUrl.get(msg.params.requestId) || 0) + (msg.params.encodedDataLength || 0))
    }
  })

  const results = []
  for (const rel of selected) {
    const { targetId, sessionId } = await browserCdp.send('Target.createTarget', { url: 'about:blank' })
    await browserCdp.send('Target.attachToTarget', { targetId, flatten: true })
    const flat = {
      send: (method, params = {}) => browserCdp.send(method, params, sessionId),
    }
    await flat.send('Page.enable')
    await flat.send('Network.enable')
    await flat.send('Runtime.enable')
    // background tabs never paint — without this, paint/LCP entries never appear
    await flat.send('Emulation.setFocusEmulationEnabled', { enabled: true })
    await flat.send('Page.bringToFront', {})
    await flat.send('Network.setCacheDisabled', { cacheDisabled: true })
    await flat.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER_BOOTSTRAP })
    transferByTarget.set(sessionId, { bytes: 0, requests: 0, urls: new Map(), perUrl: new Map() })
    let wireAtLoad = { bytes: 0, requests: 0 }
    await flat.send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/${rel}` })
    await new Promise((resolve) => {
      const listener = (msg) => {
        if (msg.method === 'Page.loadEventFired' && msg.sessionId === sessionId) {
          browserCdp.listeners.delete(listener)
          // snapshot before link-prefetch (prefetchAll) inflates the totals —
          // this is the cost of THIS page; the final sum includes prefetch
          const rec = transferByTarget.get(sessionId)
          wireAtLoad = { bytes: rec.bytes, requests: rec.requests }
          resolve()
        }
      }
      browserCdp.on(listener)
    })
    await new Promise(r => setTimeout(r, LCP_SETTLE_MS))
    const { result: nav } = await flat.send('Runtime.evaluate', {
      expression: `(() => { const n = performance.getEntriesByType('navigation')[0]; return JSON.stringify({ dcl: n ? n.domContentLoadedEventEnd : 0, load: n ? n.loadEventEnd : 0 }) })()`,
      returnByValue: true,
    })
    // direct timeline reads are the primary source (paint entries are always
    // buffered); the bootstrap observers only add a redundant fallback
    const { result: timing } = await flat.send('Runtime.evaluate', {
      expression: `(() => {
        const paint = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
        return JSON.stringify({
          fcp: paint ? paint.startTime : (window.__timing ? window.__timing.fcp : 0),
          lcp: lcpEntries.length ? lcpEntries.at(-1).startTime : (window.__timing ? window.__timing.lcp : 0),
        })
      })()`,
      returnByValue: true,
    })
    const navData = JSON.parse(nav.value)
    const t = JSON.parse(timing.value)
    const wire = transferByTarget.get(sessionId)
    const topUrls = [...wire.perUrl.entries()]
      .map(([id, b]) => ({ url: (wire.urls.get(id) || '?').replace(`http://127.0.0.1:${HTTP_PORT}`, ''), kb: Number((b / 1024).toFixed(1)) }))
      .sort((a, b) => b.kb - a.kb)
      .slice(0, 5)
    const rec = {
      page: rel,
      fcpMs: Math.round(t.fcp),
      lcpMs: Math.round(t.lcp),
      dclMs: Math.round(navData.dcl),
      loadMs: Math.round(navData.load),
      transferKB: Number((wireAtLoad.bytes / 1024).toFixed(1)),
      requests: wireAtLoad.requests,
      wireWithPrefetchKB: Number((wire.bytes / 1024).toFixed(1)),
      topUrls,
    }
    results.push(rec)
    console.log(`[page-timing] ${rec.page} fcp=${rec.fcpMs}ms lcp=${rec.lcpMs}ms load=${rec.loadMs}ms wire=${rec.transferKB}KB`)
    await browserCdp.send('Target.closeTarget', { targetId })
  }

  const summary = {
    pages: results.length,
    medianFcpMs: median(results.map(r => r.fcpMs)),
    medianLcpMs: median(results.map(r => r.lcpMs)),
    medianDclMs: median(results.map(r => r.dclMs)),
    medianLoadMs: median(results.map(r => r.loadMs)),
    medianTransferKB: median(results.map(r => r.transferKB)),
    worstLcp: results.reduce((a, b) => (b.lcpMs > a.lcpMs ? b : a)),
  }
  console.log(`[page-timing] summary: median fcp=${summary.medianFcpMs}ms lcp=${summary.medianLcpMs}ms load=${summary.medianLoadMs}ms wire=${summary.medianTransferKB}KB; worst lcp=${summary.worstLcp.lcpMs}ms (${summary.worstLcp.page})`)

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ dist, date: new Date().toISOString(), summary, pages: results }, null, 2))
    console.log(`[page-timing] snapshot → ${jsonOut}`)
  }

  browserCdp.close()
  child.kill()
  server.close()
}

main().catch((err) => {
  console.error('[page-timing] failed:', err)
  process.exit(1)
})
