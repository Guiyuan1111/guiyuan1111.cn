# 剩余固定串字集收窄 R7 实测对比报告（v1.0.17 → v1.0.18）

> 日期：2026-09-30 · 快照见 [`benchmark/results/`](../../benchmark/results/)（`r7-*.json`）。
> R5 收窄了「预载三字体」中的 Snell-Black 与 EarlySummer-Subset，本轮把同一套
> 「渲染角色决定字集」逻辑应用到剩余两个每页可见字体上，完成字体侧的收尾。
> 红线不变：安全 / 稳定 / 兼容零回归，双模式真浏览器门禁 45/45。

## TL;DR（本轮）

| 口径 | 优化前（v1.0.17） | 优化后（v1.0.18） | 变化 |
| --- | --- | --- | --- |
| 每页引用资产 gzip（中位数，45 页） | 52.5 KB | **42.1 KB** | **-19.8%** |
| 每页引用资产 gzip（最重页） | 93.2 KB | 82.7 KB | -11.2% |
| 真实浏览器每页 webfont 传输（sans） | 46.1 KB | **21.8 KB** | **-52.7%** |
| serif 门禁页面字体中位数 | 133.8 KB | 109.6 KB | -18.1%（serif 模式 UI 字体同步受益） |

## 三轮累计（自 v1.0.15 基线）

| 口径 | v1.0.15 | v1.0.18 | 累计变化 |
| --- | --- | --- | --- |
| 每页引用资产 gzip（中位数） | 83.7 KB | 42.1 KB | **-49.7%** |
| 每页引用资产 gzip（最重页） | 124.4 KB | 82.7 KB | **-33.5%** |
| 真实浏览器每页 webfont（sans） | 79.1 KB | 21.8 KB | **-72.4%** |
| 首屏预载字体合计（raw） | 59.2 KB | 16.5 KB | **-72.1%** |
| 部署产物总量（R6） | 20.31 MB | 10.64 MB | **-47.6%** |

## 改动内容

`scripts/subset-ui-fonts.py` 两个字集策略收窄（渲染角色论证与 R5 相同——
渲染文本是 config/组件固定串，改文案本就必须重跑 `gen:uifonts`）：

| 字体 | 渲染角色 | 策略变化 | 码位 | 体积 |
| --- | --- | --- | --- | --- |
| Snell-Bold | `font-time`（日期，按 config dateFormat 渲染） | 用字 ∪ A-Za-z0-9 ∪ 日期标点 → 用字 ∪ 数字 ∪ 日期标点 | 70 → 18 | 12.6 → **2.2 KB** |
| STIX-Italic | `font-navbar`（导航/页脚/404，固定串） | 用字 ∪ ASCII ∪ 排版符号 → 用字 ∪ 数字 ∪ 标题标点 | 115 → 27 | 18.8 → **5.0 KB** |

不动的：Snell-Black（R5 已收）、STIX（serif 正文全 ASCII 安全红线，且 sans 模式零请求）、
EarlySummer-Subset（R5 已收）。安全边距说明：dateFormat 若切换为含英文月份的变体
（如 `MMM D YYYY`），需重跑 `gen:uifonts`——已在 font-subset.md 与脚本注释中写明；
未重跑时日期回退系统衬线渲染（优雅降级，非破损）。

## 验证

- `font-cascade-check.mjs`：sans **45/45**（webfont 21.8KB/页）、serif **45/45**
  （worst 707.0 / median 109.6KB，宽度探针通过，无 console 错误）；
- `pnpm lint` 0 问题、`pnpm check` 0 错误、`pnpm build` 45 页正常；
- fvar 红线：STIX-Italic 变量轴存活断言通过（Snell 系为静态 CFF，按源字体存在性校验）。

## 复现

```bash
node benchmark/run-all.mjs --label=r7-before   # 即 r6-after 快照
python scripts/subset-ui-fonts.py && pnpm build
node benchmark/run-all.mjs --label=r7-after
node benchmark/font-cascade-check.mjs --json=benchmark/results/r7-gate-sans.json
```
