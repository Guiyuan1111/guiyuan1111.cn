// dist 资产可达性分析（文本级，零依赖）。
// 判断 dist/_astro 内 js/css/字体哪些从未被任何产物引用——optimize-dist 用它做
// 死重清扫，deploy-weight 用它做「清扫后必须为零」的回归探针。
//
// 原理：对每个候选资产的 basename 做全产物文本包含检查（不解析 import 语法，
// 因此对静态/动态导入、css url()、preload link、内联 import 一律成立），
// 从「被非候选文件引用的根」出发做引用闭包；闭包外的即不可达。
// vite 对动态导入恒定生成字面量 chunk 路径，文本检查是可靠上界（宁可漏删不可误删）。
import fs from 'node:fs'
import path from 'node:path'

const CAND_EXT = new Set(['.js', '.mjs', '.css', '.woff2', '.woff', '.ttf', '.otf'])
const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.xml', '.svg', '.txt', '.json'])
const MAX_TEXT = 4e6

/**
 * @param {string} dist 构建产物目录
 * @returns {{candidates: string[], unreachable: string[], roots: string[], bytes: (f: string) => number}}
 *   candidates 全部候选资产；roots 被非候选文件引用的根；unreachable 闭包外不可达资产；
 *   bytes 取文件字节数的辅助函数
 */
export function analyze(dist) {
  const files = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory())
        walk(p)
      else files.push(p)
    }
  }
  walk(dist)

  const candidates = files.filter(f =>
    path.relative(dist, f).replaceAll('\\', '/').startsWith('_astro/')
    && CAND_EXT.has(path.extname(f)),
  )
  const texts = new Map(files.map((f) => {
    const ext = path.extname(f)
    const ok = TEXT_EXT.has(ext) && fs.statSync(f).size < MAX_TEXT
    return [f, ok ? fs.readFileSync(f, 'utf8') : '']
  }))
  const names = candidates.map(f => [f, path.basename(f)])
  const bytes = f => fs.statSync(f).size

  // 根：被任何非候选文本文件（HTML/公共 CSS/feeds 等）引用
  const roots = new Set()
  for (const [f, t] of texts) {
    if (candidates.includes(f) || !t)
      continue
    for (const [c, bn] of names) {
      if (t.includes(bn))
        roots.add(c)
    }
  }

  // 闭包：候选之间的相互引用（chunk 依赖图、css url() 字体等）
  const reach = new Set(roots)
  const queue = [...roots]
  while (queue.length) {
    const t = texts.get(queue.pop()) ?? ''
    for (const [c, bn] of names) {
      if (reach.has(c) || !t.includes(bn)) {
        continue
      }
      reach.add(c)
      queue.push(c)
    }
  }

  return {
    candidates,
    roots: [...roots],
    unreachable: candidates.filter(f => !reach.has(f)),
    bytes,
  }
}

/** 不可达字节数与按组统计（katex / 其他），用于探针与日志 */
export function summarize(dist) {
  const { candidates, unreachable, bytes } = analyze(dist)
  const group = (f) => {
    const bn = path.basename(f)
    return /katex/i.test(bn) ? 'katex' : 'other'
  }
  const groups = {}
  for (const f of unreachable) {
    const g = group(f)
    groups[g] = groups[g] || { files: 0, bytes: 0 }
    groups[g].files++
    groups[g].bytes += bytes(f)
  }
  return {
    candidateCount: candidates.length,
    candidateBytes: candidates.reduce((s, f) => s + bytes(f), 0),
    orphanFiles: unreachable.length,
    orphanBytes: unreachable.reduce((s, f) => s + bytes(f), 0),
    groups,
    unreachable,
  }
}
