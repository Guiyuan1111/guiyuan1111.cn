# 字体预载收窄 R5 实测对比报告（v1.0.15 → v1.0.16）

> 日期：2026-09-30 · 快照与门禁 JSON 见 [`benchmark/results/`](../../benchmark/results/)（`r5-*.json`）。
> 红线：安全性 / 稳定性 / 兼容性（视觉与行为零回归），改动后以真实浏览器门禁
> （sans 45/45 + serif 45/45）验证。基线门禁证据沿用 v1.0.15 留档的 `r4-gate-sans.json`。

## TL;DR

| 口径 | 优化前（v1.0.15） | 优化后（v1.0.16） | 变化 |
| --- | --- | --- | --- |
| 每页引用资产 gzip（最重页） | 124.4 KB | 93.2 KB | **-25.1%** |
| 每页引用资产 gzip（中位数，45 页） | 83.7 KB | 52.5 KB | **-37.3%** |
| 真实浏览器每页 webfont 传输（wire bytes，sans） | 79.1 KB | 46.1 KB | **-41.7%** |
| 首屏预载字体合计（raw） | 59.2 KB | 27.2 KB | **-54.1%** |

注：页面数 42 → 45（v1.0.15 后新增 3 篇文章），基线/对比均为全量页面口径，不受影响。

## 背景：剩余页面权重的构成

v1.0.15 R1–R4 完成后，生产（sans）模式每页引用资产的构成约为：
正文 HTML（gzip，内容决定）+ **预载字体 59.2 KB** + CSS 12.5 KB + JS 6.2 KB。
预载三个字体（EarlySummer-Subset 24.8 + Snell-Black 17.9 + Snell-Bold 16.5）占中位数页面的
**47%**，是内容之外最大的可优化项。

## 改动内容

### 1. UI 显示字体子集语义化收窄（`scripts/subset-ui-fonts.py`）

原脚本对四个 UI 字体一律取「实际用字 ∪ 全 ASCII ∪ 排版符号」。本轮改为**按渲染角色分策略**：

| 字体 | 渲染角色 | 新策略 | 码位 | 体积 |
| --- | --- | --- | --- | --- |
| Snell-Black | `font-title`（仅站点标题，config 固定串） | 用字 ∪ 数字 ∪ 标题标点 | 117 → 27 | 17.9 → **3.1 KB** |
| Snell-Bold | `font-time`（日期；dateFormat 可选英文月份） | 用字 ∪ A-Za-z0-9 ∪ 日期标点 | 116 → 70 | 16.5 → **12.6 KB** |
| STIX | serif 模式正文 Latin | 保留 ∪ ASCII ∪ 排版符号（不动） | 116 | 17.5 → 17.1 KB |
| STIX-Italic | `font-navbar`（导航/页脚/404） | 保留 ∪ ASCII ∪ 排版符号（不动） | 115 | 19.3 → 18.8 KB |

安全性依据：Snell-Black 只渲染 `src/config.ts` 的固定标题串，改标题本就必须重跑
`gen:uifonts`（既有流程，非新增风险）；日期字体保守保留全部字母数字。
脚本的 fvar 存活断言与 `want ⊆ got` cmap 覆盖断言原样保留。

### 2. EarlySummer-Subset 重建：数据驱动字集 + name 表最小化

- 旧子集 54 字中约 20 字是**上游主题多语言遗留**（「再組版印刷の美を甦らせる」等日文/繁体），
  本站永不渲染。新字集改为**从 dist 实测 `font-title`/`font-navbar` 文本收集 CJK**（18 字）
  ∪ 常用 CJK 标点安全边距（，。！？：；、·—…（））＝ **34 码位**；
- name 表从「全量多语言 legacy」收敛为仅 UniqueID（`--name-IDs=3` 等价策略，Python API）；
- 红线断言：fvar（wght 250–900）完整保留、cmap 与 wanted 逐码位一致、
  `font.css` 的 unicode-range 由新 cmap 重新生成（严格同步）；
- 体积 24.8 → **11.2 KB**（-55%）。

### 3. 回归修复：`gen-page-fonts.py` 解析分片双 CSS（serif 模式）

v1.0.15 R4 把 47 个分片 `@font-face` 从 `font.css` 拆到 `earlysummer-shards.css`，
但 `gen-page-fonts.py` 仍只解析 `font.css` → 分片流量恒算 0 KB → 所有页面被 skip，
**serif 页面字体自 R4 起实际无法再生**（R4 门禁通过是因为沿用了 R2 时代生成的旧字体，
本轮首次重生成时暴露）。修复为同时解析两个 CSS；用当前 45 页内容重新生成
（manifest 45 页 7.19MB），serif 门禁随之从 R4 的 median 169.0 KB 降至 **133.8 KB**。

## 验证

- `font-cascade-check.mjs`：sans **45/45 PASS**（webfont 46.1 KB/页）、serif **45/45 PASS**
  （每页恰好 1 个页面字体、0 分片泄漏、宽度探针通过、无 console 错误）；
- `pnpm check` 0 错误；`pnpm lint` 通过；`pnpm build` 45 页正常；
- 变量字体红线：全部子集 fvar 存活（Snell 为静态 CFF 无 fvar，断言按源字体存在性校验）。

## 复现

```bash
pnpm build                                   # 基线
node benchmark/run-all.mjs --label=r5-baseline
python scripts/subset-ui-fonts.py            # 本轮改动
pnpm build && node benchmark/run-all.mjs --label=r5-after
node benchmark/font-cascade-check.mjs --json=benchmark/results/r5-gate-sans.json
# serif 模式：config.ts 切 fontStyle 后 pnpm build → gen:pagefonts → build → 门禁 --json=r5-gate-serif.json
```
