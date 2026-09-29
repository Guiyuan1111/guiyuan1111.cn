# 加载时序基准 R10 实测报告（v1.0.14 → v1.0.20 全战役前后）

> 日期：2026-09-30 · 快照存于 [`benchmark/results/`](../../benchmark/results/)
> （`r10-timing-v1014.json` / `r10-timing-current.json` / `r10-compare.json`）。
> R1–R9 各轮的对比口径是**字节**；本轮补上最后一个维度——**用户感知的加载时序**，
> 并用全战役起点 v1.0.14 做端到端前后对比。

## TL;DR

新增 `benchmark/page-timing.mjs`（CDP 真浏览器，缓存禁用，逐页 FCP / LCP /
DOMContentLoaded / load / wire）与 `benchmark/compare-timing.mjs`（快照对比 +
真实网络预估）。在 git worktree 里重建 v1.0.14 起点、与当前 v1.0.20 各跑全站：

| 口径（41 页共享页面中位数） | v1.0.14 | v1.0.20 | 变化 |
| --- | --- | --- | --- |
| 本页 wire 传输（load 时刻，raw） | 348 KB | 134 KB | **-61.5%** |
| FCP（本地服务，传输≈免费） | 44 ms | 36 ms | -18% |
| 预估 FCP · 重拥堵 ~400kbps | 7171 ms | 2780 ms | **-61.2%** |
| 预估 FCP · Slow 4G ~1.6Mbps | 1826 ms | 722 ms | **-60.5%** |
| 预估 FCP · 普通 4G ~8Mbps | 400 ms | 173 ms | **-56.8%** |

本地服务的 FCP 差距（-18%）小于字节差距，因为 localhost 传输近乎免费——字节
优化的收益在真实网络上兑现：**Slow 4G 下首屏从约 1.8 秒降到约 0.7 秒**。
（预估口径：本地 FCP + wire/带宽；不含 TLS/服务器思考时间，属保守下界差。）

## 度量方法

- **`page-timing.mjs`**：一次性静态服务器 + 无头 Chrome/Edge（CDP flat session）。
  每页独立 target：禁用磁盘缓存、注入 paint/LCP 观察器、`Page.bringToFront` +
  焦点仿真（**后台标签不产生绘制条目**——FCP 恒为 0 的坑，调试后以
  `Emulation.setFocusEmulationEnabled` 修复）、load 事件 + 1.5s 静默窗后收集
  `performance` 时间线与 `Network.loadingFinished` 累计字节。
- **双口径 wire**：站点开启 `prefetchAll`（视口预取全部内链，站内导航瞬时完成——
  主题 UX 决策，R1–R4 已论证保留）。因此 wire 分两个口径：`transferKB`（load
  事件时刻快照 = **本页成本**）与 `wireWithPrefetchKB`（终值 = 含预取的带宽占用）。
  指标对比一律用前者；预取量单独可见。
- **对比口径**：v1.0.14 有 41 页、当前 45 页，取交集 41 页逐页配对，中位数。

## 各版本页数与最重页

- 当前最重 LCP（本地）：188ms `posts/加缪的日记/`、160ms `posts/我二十一岁那年/`、
  124ms `posts/红玫瑰与白玫瑰/`——均为长文 HTML 解析主导，无传输瓶颈页。
- 本轮零站点代码改动：R10 是纯度量维度升级（两个新基准脚本 + 三份快照），
  访客侧与部署产物逐字节不变（`--assert` 与字节基准复核通过）。

## 复现

```bash
pnpm build
node benchmark/page-timing.mjs --json=benchmark/results/timing.json
git worktree add TEMP/v1014 v1.0.14 && (cd TEMP/v1014 && pnpm i --frozen-lockfile && pnpm build)
node benchmark/page-timing.mjs --dist=TEMP/v1014/dist --json=benchmark/results/timing-v1014.json
node benchmark/compare-timing.mjs --old=... --new=... --json=benchmark/results/compare.json
git worktree remove --force TEMP/v1014   # 测完清理
```
