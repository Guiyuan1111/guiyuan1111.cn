#!/usr/bin/env node
// Real-browser red-line gate for the page-font cascade (R2).
// Zero-dependency: launches a local headless Chromium/Edge via the DevTools
// protocol, serves ./dist over a throwaway HTTP server, loads every page that
// has an injected page font, and asserts:
//   - serif mode (fontStyle='serif'): the page requests exactly its own
//     /fonts/earlysummer-pages/ subset, zero EarlySummer-VF-Split shard
//     requests, and document.fonts.check() passes for chars of the page title;
//   - sans mode (fontStyle='sans', site default): prose never consults the
//     EarlySummer family, so neither page fonts nor shards may be requested —
//     the only webfonts allowed are the Snell/STIX/Subset preloads+cascade;
//   - both modes: no console errors / JS exceptions.
// Exit code 0 = all pages pass; 1 = red-line violation (details printed).
//
// Usage: node benchmark/font-cascade-check.mjs [--dist=dist] [--sample=6]
// --sample limits the number of tested pages (default: all manifest pages).
import { spawn } from 'node:child_process'
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
const CDP_PORT = 9777
const HTTP_PORT = 4199

function fontStyle() {
  const src = fs.readFileSync('src/config.ts', 'utf8')
  return src.match(/fontStyle:\s*'(sans|serif)'/)?.[1] ?? 'sans'
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
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

function fetchJson(url, method = 'GET') {
  return fetch(url, { method }).then(r => r.json())
}

async function waitForCdp() {
  for (let i = 0; i < 40; i++) {
    try {
      return await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`)
    }
    catch {
      await new Promise(r => setTimeout(r, 250))
    }
  }
  throw new Error('CDP endpoint never became ready')
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    this.listeners = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) {
          reject(new Error(`${msg.error.message}: ${msg.error.data ?? ''}`))
        }
        else {
          resolve(msg.result)
        }
      }
      else if (msg.method) {
        for (const fn of this.listeners) {
          fn(msg)
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

  send(method, params = {}) {
    const id = this.nextId++
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.ws.send(JSON.stringify({ id, method, params }))
    return promise
  }

  on(fn) {
    this.listeners.push(fn)
  }

  close() {
    this.ws.close()
  }
}

async function loadPage(cdp, pageUrl, mode) {
  const fontRequests = []
  const errors = []
  let loadedResolve
  const loadedPromise = new Promise((resolve) => {
    loadedResolve = resolve
  })
  const listener = (msg) => {
    if (msg.method === 'Network.requestWillBeSent' && msg.params.request.url.endsWith('.woff2')) {
      fontRequests.push(msg.params.request.url)
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(`console.error: ${msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')}`)
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(`exception: ${msg.params.exceptionDetails.text}`)
    }
    if (msg.method === 'Page.loadEventFired') {
      loadedResolve()
    }
  }
  cdp.on(listener)
  await cdp.send('Page.navigate', { url: pageUrl })
  await Promise.race([loadedPromise, new Promise(r => setTimeout(r, 10000))])
  cdp.listeners = cdp.listeners.filter(fn => fn !== listener)
  // document.fonts.check() is useless for a family with many unicode-range
  // faces (it stays false while any unloaded shard claims coverage), and
  // hanzi advance is exactly 1em in every CJK font so hanzi widths cannot
  // discriminate either. Probe with Latin text instead: the header string
  // "Guiyuan1111" ships in every page subset, and the webfont's Latin
  // metrics differ from the system serif fallback. Equal widths mean the
  // text fell back to the system font. Serif mode only — in sans mode the
  // probe itself would force shard downloads for its Latin text.
  const serifProbe = mode === 'serif'
    ? `const chars = "Guiyuan1111";
       const probe = (fam) => {
         const s = document.createElement("span");
         s.style.cssText = "font-family:" + fam + ";font-size:32px;position:absolute;visibility:hidden;white-space:nowrap";
         s.textContent = chars;
         document.body.appendChild(s);
         const w = s.getBoundingClientRect().width;
         s.remove();
         return w;
       };
       const webW = probe('"__sysprobe__", serif');`
    : 'const chars = ""; const webW = 0;'
  const expression = `document.fonts.ready.then(() => {
    ${serifProbe}
    return {
      title: document.title,
      status: document.fonts.status,
      chars,
      webWidth: chars ? probe("EarlySummer") : 0,
      sysWidth: webW,
      res: performance.getEntriesByType("resource").filter(r => r.name.endsWith(".woff2")).map(r => r.name)
    };
  })`
  const evalRes = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression,
  })
  const info = evalRes.result.value
  if (!info || typeof info.title !== 'string') {
    throw new Error(`page never settled for ${pageUrl}`)
  }
  const renderedFromWebfont = mode !== 'serif' || (info.chars.length > 0 && info.webWidth !== info.sysWidth)
  return { fontRequests, errors, info, renderedFromWebfont }
}

async function main() {
  const dist = arg('dist', 'dist')
  const sample = Number(arg('sample', '0'))
  const mode = fontStyle()
  const manifestPath = path.join(dist, 'fonts', 'earlysummer-pages', 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error(`[font-cascade-check] missing ${manifestPath} — run the build first`)
    process.exitCode = 1
    return
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  let pages = Object.keys(manifest)
  if (sample > 0) {
    pages = pages.slice(0, sample)
  }
  const browserPath = findBrowser()
  if (!browserPath) {
    console.error('[font-cascade-check] no local Chrome/Edge found')
    process.exitCode = 1
    return
  }
  const profileDir = path.join(process.cwd(), 'TEMP', 'cdp-profile')
  fs.rmSync(profileDir, { recursive: true, force: true })
  fs.mkdirSync(profileDir, { recursive: true })

  const browser = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' })

  const server = await startServer(path.resolve(dist))
  let cdp = null
  let targetId = null
  const failures = []
  try {
    await waitForCdp()
    let target
    try {
      target = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, 'PUT')
    }
    catch {
      target = (await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`))[0]
    }
    targetId = target.id
    cdp = await Cdp.connect(target.webSocketDebuggerUrl)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    // Desktop viewport: the theme serves prose in a system sans stack on narrow
    // viewports and only switches to the serif/EarlySummer stack when wide.
    // The cascade under test exists only in the serif branch.
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    for (const page of pages) {
      const urlPath = page.replace(/\/index\.html$/, '/')
      const url = `http://127.0.0.1:${HTTP_PORT}/${encodeURI(urlPath).replace(/^\/+/, '')}`
      const { fontRequests, errors, info, renderedFromWebfont } = await loadPage(cdp, url, mode)
      const pageFont = fontRequests.filter(u => u.includes('earlysummer-pages'))
      // EarlySummer-VF-Subset.woff2 sits inside the split dir but is the tiny
      // preloaded UI-chrome font, not a shard — exclude it from the leak check.
      const shards = fontRequests.filter(u => u.includes('EarlySummer-VF-Split/') && !u.endsWith('EarlySummer-VF-Subset.woff2'))
      const problems = []
      if (mode === 'serif') {
        if (pageFont.length !== 1) {
          problems.push(`serif: expected exactly 1 page-font request, got ${pageFont.length}`)
        }
        if (!renderedFromWebfont) {
          problems.push(`serif: title "${info.chars}" renders at system-fallback width (${info.webWidth}px === ${info.sysWidth}px) — webfont not used`)
        }
      }
      else if (pageFont.length > 0) {
        problems.push(`sans: page fonts must not be requested, got ${pageFont.length}`)
      }
      if (shards.length > 0) {
        problems.push(`${shards.length} shard requests leaked: ${shards.map(s => s.split('/').pop()).slice(0, 3).join(', ')}`)
      }
      if (errors.length > 0) {
        problems.push(errors.slice(0, 3).join(' | '))
      }
      const status = problems.length === 0 ? 'PASS' : 'FAIL'
      console.log(`[${status}] ${urlPath} fonts=${fontRequests.length} pageFont=${pageFont.length} shards=${shards.length} title="${info.title.slice(0, 24)}"`)
      if (problems.length > 0) {
        failures.push({ page: urlPath, problems })
        for (const p of problems) {
          console.log(`        ${p}`)
        }
      }
    }
  }
  finally {
    if (cdp) {
      cdp.close()
    }
    if (targetId) {
      await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/close/${targetId}`).catch(() => {})
    }
    browser.kill()
    await new Promise((resolve) => {
      if (browser.exitCode !== null) {
        resolve()
        return
      }
      browser.once('exit', resolve)
      setTimeout(resolve, 4000)
    })
    server.close()
    for (let i = 0; i < 6; i++) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true })
        break
      }
      catch {
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }

  if (failures.length > 0) {
    console.error(`[font-cascade-check] mode=${mode}: ${failures.length}/${pages.length} pages FAILED`)
    process.exitCode = 1
  }
  else {
    const why = mode === 'serif'
      ? '(page font wins cascade, no shard downloads, glyphs render)'
      : '(no EarlySummer family traffic in sans mode, glyphs render)'
    console.log(`[font-cascade-check] mode=${mode}: all ${pages.length} pages passed ${why}`)
  }
}

main().catch((err) => {
  console.error('[font-cascade-check] fatal:', err)
  process.exitCode = 1
})
