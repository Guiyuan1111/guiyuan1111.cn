# benchmark — 站点访客性能基准套件

纯 Node（零依赖）测量脚本，对**已构建的 dist 目录**做只读分析，量化访客侧加载成本。
用于性能优化前后的对比，结果 JSON 存于 `benchmark/results/`，对比报告写入 `note/report/perf/`。

## 用法

```bash
pnpm build                                   # 先构建
pnpm bench                                   # 跑全部基准，结果打印 + 写入 benchmark/results/latest.json
node benchmark/run-all.mjs --label=after     # 自定义标签（同 dist 可多次测量）
```

## 指标

| 脚本 | 指标 | 口径 |
|---|---|---|
| `page-weight.mjs` | 每页 HTML/CSS/JS/预加载资源的原始与 gzip 传输体积 | 从 HTML 里解析 `<link>`/`<script src>`/`<img>` 实际引用，gzip(9) 近似线上 brotli |
| `font-traffic.mjs` | 每页按 `unicode-range` 会命中的字体分片数与字节数 | 解析 `src/styles/font.css` 的全部 `@font-face`，提取页面可见文本的字符集逐片匹配 |

## 判定规则（兼容性红线）

- `font-traffic.mjs` 同时输出每页字符覆盖率：优化后任何页面覆盖率**不得低于**优化前；
- woff2 分片必须保留变量字体轴（`fvar` 表，见 `lib/woff2-tables.mjs`），否则粗细渲染回退，视为不兼容；
- 每次优化轮次：改动前基线 JSON + 改动后 JSON 成对留存，报告必须给出两份数据的逐项对比。

## 文件

- `run-all.mjs` — 编排器，汇总写入 `results/<label>.json`
- `page-weight.mjs` / `font-traffic.mjs` — 两个独立可跑的基准（支持 `--json=path` 单独导出）
- `lib/woff2-tables.mjs` — WOFF2 表目录解析（brotli 解压 + 表标签提取），用于验证分片是否保留 `fvar`/`glyf`/`CFF2`
- `results/*.json` — 历次测量留档（入库作为证据）
