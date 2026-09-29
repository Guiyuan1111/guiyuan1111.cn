# benchmark — 站点访客性能基准套件

纯 Node（零依赖）测量脚本，对**已构建的 dist 目录**做只读分析，量化访客侧加载成本。
用于性能优化前后的对比，结果 JSON 存于 `benchmark/results/`，对比报告写入 `note/report/perf/`。

## 用法

```bash
pnpm build                                   # 先构建
pnpm bench                                   # 跑全部基准，结果打印 + 写入 benchmark/results/latest.json
node benchmark/run-all.mjs --label=after     # 自定义标签（同 dist 可多次测量）
node benchmark/run-all.mjs --assert          # 回归门禁：绝对红线断言（CI 在用）
node benchmark/run-all.mjs --assert=r8-final # 追加基线漂移对比（见下「断言门禁」）
node benchmark/font-cascade-check.mjs        # 真浏览器红线门禁（本地 Chrome/Edge，零依赖）
```

## 指标

| 脚本 | 指标 | 口径 |
|---|---|---|
| `page-weight.mjs` | 每页 HTML/CSS/JS/预加载资源的原始与 gzip 传输体积 | 从 HTML 里解析 `<link>`/`<script src>`/`<img>` 实际引用，gzip(9) 近似线上 brotli |
| `font-traffic.mjs` | 每页按 `unicode-range` 会命中的字体分片数与字节数 | 解析 `src/styles/font.css` + `src/styles/earlysummer-shards.css` 的全部 `@font-face`，提取页面可见文本的字符集逐片匹配 |
| `deploy-weight.mjs` | dist 部署足迹：总量/分类型/最大文件 + 死重探针 | 只读遍历 dist；死重探针（earlysummerPages/originalUiFonts/katexLegacyFonts/orphanAstroAssets/mermaidChunks/sounds）统计「存在于 dist 但任何页面都不会请求」的字节，模式感知（sans 下页面字体算死重）；orphanAstroAssets 由 `reachability.mjs` 引用闭包判定，构建清扫后必须为 0 |
| `reachability.mjs` | dist/_astro 资产的文本级引用闭包 | 对每个候选 basename 做全产物文本包含检查（覆盖静态/动态导入、css url()、preload），从 HTML 等非候选引用根传播闭包；optimize-dist 清扫与 deploy-weight 探针共用 |
| `font-cascade-check.mjs` | 真实浏览器中的字体请求级联 | 无头 Chromium/Edge + CDP：逐页加载 dist，断言字体网络请求与渲染来源 |

## 字体口径与 fontStyle 模式（重要）

站点 `src/config.ts` 的 `themeConfig.global.fontStyle` 决定正文字体栈：

- **`sans`（站点默认/生产配置）**：正文走系统无衬线栈，任何页面都不会请求
  EarlySummer 分片或页面字体；每页字体流量 = 2 个预载（Snell-Black 4.3KB +
  Snell-Bold 2.6KB）+ EarlySummer-Subset 11.2KB（导航/副标题 CJK）+ STIX-Italic
  12.8KB（页脚拉丁文触发），合计 ≈31.3KB/页。`page-weight.mjs` 只计预载部分。
- **`serif`（`font-serif` = `STIX, EarlySummer, …`）**：正文进入 EarlySummer
  家族——`font-traffic.mjs` 度量的是**这种模式下的分片流量**（若站点切到
  serif 即成为真实流量），`baseline → r1 → r2` 的字体对比数据均属此口径。
  `scripts/apply-page-fonts.mjs` 只在 serif 模式注入页面级子集（`<style
  data-page-font>`，声明在 font.css 之后赢得层叠，浏览器只下载该页精确子集，
  缺字符自动回落分片自愈）。页面字体由 `python scripts/gen-page-fonts.py`
  本地生成，产物不入库（见 `.gitignore`），CI 无 Python 时注入器自动跳过。

## 判定规则（兼容性红线）

- `font-traffic.mjs` 同时输出每页字符覆盖率：优化后任何页面覆盖率**不得低于**优化前；
- woff2 分片与页面子集必须保留变量字体轴（`fvar` 表，生成脚本内建断言），否则粗细渲染回退，视为不兼容；
- `font-cascade-check.mjs` 必须全绿才可发布：
  - serif 模式：每页恰好 1 个 `/fonts/earlysummer-pages/` 请求、0 个
    `EarlySummer-VF-Split/` 分片请求（预载的 11.2KB Subset 除外）、宽度探针证明
    文本由 webfont 渲染而非系统回退；
  - sans 模式：0 个 EarlySummer 家族请求（页面字体与分片都不该被触碰）；
  - 两种模式：无 console 错误、无 JS 异常。
  探针说明：`document.fonts.check()` 在多 unicode-range 分片的家族上恒为
  false（有未加载分片宣称覆盖即失败），汉字字宽在所有 CJK 字体里都是整 1em
  也无法区分来源，故用页头拉丁字符串 "Guiyuan1111"（每页子集必含）对比
  webfont 与系统 serif 的字宽差异。
- 每次优化轮次：改动前基线 JSON + 改动后 JSON 成对留存，报告必须给出两份数据的逐项对比。

## 断言门禁（--assert）

`run-all.mjs --assert` 在测量后执行回归断言，违规即非零退出（CI 阻断合并）：

- **绝对红线（零容忍，与内容增长无关，CI 长期可用）**：无页面产出；sans 构建
  出现 `fonts/earlysummer-pages/`（apply-page-fonts 清理被跳过）；dist 出现
  Snell/STIX 源字体（回流 public）；dist 出现 KaTeX woff/ttf（遗留裁剪被跳过）；
  dist 出现引用闭包外不可达的 `_astro` 资产（optimize-dist 清扫被跳过/失败）；
  font-traffic 最小页覆盖率 < 95%（可见字符无 face 覆盖）。
- **基线漂移（`--assert=<label>`，可选）**：对比 `results/<label>.json`——每页
  中位数 > ×1.15、最大值 > ×1.25、部署总量 > ×1.5 即失败。容差刻意宽松，
  只拦结构性膨胀，不拦正常写作。

红线设计依据与负向演练记录见
[R8 报告](../note/report/perf/2026-09-30-benchmark-assert-r8.md)。

## 文件

- `run-all.mjs` — 编排器，汇总写入 `results/<label>.json`
- `page-weight.mjs` / `font-traffic.mjs` / `deploy-weight.mjs` — 三个独立可跑的基准（支持 `--json=path` 单独导出）
- `reachability.mjs` — dist/_astro 引用闭包分析（optimize-dist 清扫与 deploy-weight 探针共用）
- `font-cascade-check.mjs` — 真浏览器级联门禁（CDP 驱动本地无头 Chrome/Edge，
  内置一次性静态服务器与桌面视口——主题在窄视口下正文走 sans 栈，serif 级联只在宽视口存在）
- `results/*.json` — 历次测量留档（入库作为证据）
