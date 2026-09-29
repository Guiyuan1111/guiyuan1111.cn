# 部署体积清理 R6 实测对比报告（v1.0.16 → v1.0.17）

> 日期：2026-09-30 · 快照见 [`benchmark/results/`](../../benchmark/results/)（`r6-*.json`）。
> 本轮与 R5 互补：R5 优化**访客带宽**（每页引用资产），R6 优化**部署足迹**（每次发布上传
> CDN 的 dist 总量与其中"永远不会被任何页面请求"的死重）。
> 新增基准 [`benchmark/deploy-weight.mjs`](../../../benchmark/deploy-weight.mjs)（已接入 run-all），
> 内置死重探针；红线不变：安全 / 稳定 / 兼容零回归。

## TL;DR

| 口径 | 优化前（v1.0.16） | 优化后（v1.0.17） | 变化 |
| --- | --- | --- | --- |
| **部署产物总量（dist）** | 20.31 MB / 324 文件 | **10.64 MB / 228 文件** | **-47.6%** |
| 每页引用资产 gzip（中位数） | 52.5 KB | 52.5 KB | **0（零回归）** |
| 每页引用资产 gzip（最重页） | 93.2 KB | 93.2 KB | **0（零回归）** |
| sans 门禁 webfont（45 页） | 46.1 KB/页 | 46.1 KB/页 | 0 |

死重探针（存在于 dist 但任何页面都不会请求的字节）：

| 探针 | 前 | 后 | 说明 |
| --- | --- | --- | --- |
| earlysummerPages（sans 构建） | 7 370 KB | **0** | sans 不注入页面字体，Astro 却照常复制 public/ 下的 46 个 woff2 |
| katexLegacyFonts（woff/ttf） | 798 KB | **0** | KaTeX 的 src 链是 woff2→woff→ttf，能跑 KaTeX 的浏览器全支持 woff2 |
| originalUiFonts（源字体） | 214 KB | **0** | font.css 只引用 `*.subset.woff2`，原始字体是再生成素材 |
| og PNG（image 类合计） | 1.89 MB | 0.52 MB | 调色板重编码，尺寸/格式不变 |
| mermaidChunks（懒加载 chunk） | 586 KB | 586 KB | **有意保留**：mermaid 功能的按需加载路径，无图页面零请求 |
| sounds（44KB） | 44 KB | 44 KB | **有意保留**：禁用音效的恢复路径依赖其存在（见 disabled-features.md） |

## 改动内容

1. **`scripts/apply-page-fonts.mjs`**：sans 模式分支新增清理——删除 Astro 从 public/ 复制进
   dist 的 `fonts/earlysummer-pages/`（46 个 woff2，7.2MB）。serif 构建不受影响
   （注入流程原样，门禁复核 45/45）。
2. **源字体移出 public/**（`git mv`）：`Snell-Black-SF.woff2`、`Snell-Bold-SF.woff2`、
   `STIX-VF.woff2`、`STIX-Italic-VF.woff2` → `src/assets/fonts/`；上游分片清单
   `Font Subset List/` → `scripts/data/font-subset-lists/`。`subset-ui-fonts.py` 的源路径
   同步更新（v1.0.2 NotoSansSC 同款模式）。
3. **`scripts/optimize-dist.mjs`**（新，构建链末步）：
   - `dist/og/*.png` 用 sharp 重编码为调色板 PNG（quality 90 / effort 9），仅当
     体积更小**且**宽高不变才替换——24 张重编码，-1.38MB；
   - KaTeX CSS 裁掉 woff/ttf src 回退并删除 dist 中不再被引用的 40 个字体文件
     （-0.78MB）；内建断言：woff2 引用数不得变化，删除前扫描全 dist 引用。
4. **`benchmark/deploy-weight.mjs`**（新）：dist 总量/分类型/最大文件 + 死重探针，
   接入 `run-all.mjs` 快照。
5. **`benchmark/font-cascade-check.mjs`**：页面枚举改为三重回退
   （dist manifest → public 源 manifest → 遍历 dist HTML）——sans 构建清理页面字体后
   dist 内不再有 manifest，门禁此前会因此报错。

## 验证

- page-weight 与 r6 基线**逐字节一致**（max 93.2 / median 52.5 KB）——访客侧零回归；
- `font-cascade-check.mjs`：sans **45/45**、serif **45/45**（worst 731.2 / median 133.8 KB，
  与 R5 持平）；
- OG 图抽检：PNG 格式有效、1200×630 不变、P 调色板模式；
- `pnpm lint` 0 问题、`pnpm check` 0 错误、`pnpm build` 45 页正常。

## 复现

```bash
pnpm build && node benchmark/run-all.mjs --label=r6-baseline
# 本轮改动后
pnpm build && node benchmark/run-all.mjs --label=r6-after
node benchmark/font-cascade-check.mjs --json=benchmark/results/r6-gate-sans.json
# serif 轮：切 fontStyle → gen:pagefonts → build → 门禁 --json=r6-gate-serif.json → 还原
```

## 考虑过但放弃的项（记录避免重复评估）

- **mermaid 懒加载 chunk 移出构建图**：3.0MB 部署占用，但访客零成本；移除需破坏
  `MediaEmbed` 的按需 import 图或引入运行时裸说明符等 hack，稳定/兼容风险大于收益。
- **RSS/Atom 全文改摘要**（各 516KB）：改变订阅语义，属功能变更非性能优化。
- **sounds 移出部署**：44KB 但恢复路径文档依赖其存在（disabled-features.md）。
