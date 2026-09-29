# 不可达资产清扫 R9 实测报告（v1.0.19 → v1.0.20）

> 日期：2026-09-30 · 快照与门禁 JSON 存于 [`benchmark/results/`](../../benchmark/results/)（`r9-final.json` / `r9-gate-sans.json`）。
> 红线：安全性 / 稳定性 / 兼容性（视觉与行为零回归）。

## TL;DR

R9 是**部署足迹收尾轮**：新增文本级「引用闭包」可达性分析（`benchmark/reachability.mjs`），
把 dist 里「任何页面不会请求、任何 chunk 不会加载」的资产在构建尾部落盘前删除，并作为
deploy-weight 探针 + CI 红线固化。本轮实测唯一真孤儿是 **KaTeX CSS + 19 个字体（20 个
文件 276KB）**——rehype-katex 在构建期把数学渲染成 span，当前站点无数学内容，这些文件
只被彼此引用。清扫后构建自愈：未来文章写数学时 `<link>` 使其重新可达，清扫自动保留。

| 口径 | v1.0.19 | v1.0.20 | 变化 |
| --- | --- | --- | --- |
| 部署足迹 | 10.62 MB | 10.35 MB | **-0.27MB（-2.6%）**，文件 228→208 |
| 每页引用资产 gzip（45 页中位数） | 43.8 KB | 43.8 KB | 逐字节不变（访客侧零变化） |
| 真实浏览器每页 webfont（wire） | 31.3 KB | 31.3 KB | 不变 |
| font-traffic 最小页覆盖率 | 95.8% | 95.8% | 不变 |
| CDP 门禁（sans，45 页） | 全绿 | 全绿（0 failed） | 零回归 |

对比本轮优化起点 v1.0.15 的累计值：每页资产中位数 **-47.7%**（83.7→43.8KB）、
webfont **-60.4%**（79.1→31.3KB）、部署 **-49.1%**（20.31→10.35MB）。

## 排查过程（两个被测量否决的候选，记录以免重查）

1. **HTML 块级空白压缩**：实测 dist 全部 HTML 中「块边界标签间纯空白」（pre/script/style
   保护后）仅 **1KB / 1.93MB（0.1%）**——Astro 的 compressHTML 已把模板与 markdown 产物
   压到极限，该方向无收益，放弃。
2. **mermaid 客户端图谱（2.87MB JS 中的大头）**：初步可达性分析曾误判为孤儿，修正
   walker 缺陷后确认 **可达**——`rehype-mermaid` 配置为 `strategy: 'pre-mermaid'`
   （客户端渲染），`MediaEmbed.astro` 的构建产物里含 mermaid 动态导入字面量，任何页面
   都构成引用根。这是活的特性路径（R6 结论维持）：访客零成本，仅在内容真的包含图表时
   才会被下载。

## 实现

### `benchmark/reachability.mjs`（共享模块，零依赖）

- 候选：`dist/_astro/` 下 js/mjs/css/woff2/woff/ttf/otf；
- 引用判定：对每个候选 basename 做**全产物文本包含检查**——不解析 import 语法，对静态
  导入、动态 `import()`、css `url()`、preload link、内联 import 一律成立（vite 对动态
  导入恒定生成字面量 chunk 路径，文本检查是可靠上界，宁可漏删不可误删）；
- 闭包：从「被非候选文本文件（HTML/公共 CSS/feeds）引用的根」出发沿候选间引用传播，
  闭包外即不可达。

### `scripts/optimize-dist.mjs` 第三步（构建尾部串行执行）

- 删除全部不可达候选，日志输出数量与字节数；失败不阻塞构建（deploy-weight 探针会兜底上报）；
- **双保险守卫**：任何页面含 `class="mermaid"` 或 `class="katex"` 特性标记时整轮清扫跳过
  （属性锚定，正文提及该单词不会误触发）——防御未知的动态 URL 构造加载路径；
- **自愈语义**：清扫只删「本次构建不可达」的文件。未来数学文章让 katex CSS `<link>`
  回到 HTML → CSS+字体重新可达 → 自动保留，无需任何手工步骤。

### 回归防线

- `benchmark/deploy-weight.mjs` 新增探针 `orphanAstroAssets`（引用闭包外的字节数/文件数）；
- `benchmark/run-all.mjs --assert` 新增红线：`orphanAstroAssets > 0` 即失败
  （消息：optimize-dist sweep skipped or failed）；
- **负向演练**：向 `dist/_astro/` 植入无引用 dummy JS → 断言 exit 1 并输出
  `✗ 1 unreachable _astro assets deployed: 5.0KB`；删除后恢复 exit 0。

## 复现

```bash
pnpm build                                                   # 日志含 [optimize-dist] sweep 行
node benchmark/run-all.mjs --assert                          # 含 orphanAstroAssets 红线
node benchmark/run-all.mjs --assert=r9-final --label=r9-x    # 基线漂移对比
node benchmark/font-cascade-check.mjs --json=benchmark/results/r9-gate-sans.json
```
