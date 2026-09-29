# 字体性能优化 R1–R4 实测对比报告（v1.0.14 → v1.0.15）

> 日期：2026-09-29 · 快照与门禁 JSON 全部存于 [`benchmark/results/`](../../benchmark/results/)，
> 复现命令见文末。红线：安全性 / 稳定性 / 兼容性（视觉与行为零回归），每轮改动后均以
> 真实浏览器门禁（42/42 页）验证后才提交。

## TL;DR

| 口径 | 优化前（v1.0.14） | 优化后（v1.0.15） | 变化 |
| --- | --- | --- | --- |
| 每页引用资产 gzip（42 页最重页） | 221.2 KB | 127.4 KB | **-42.4%** |
| 每页引用资产 gzip（42 页中位数） | 179.6 KB | 85.7 KB | **-52.2%** |
| 真实浏览器每页 webfont 传输（wire bytes） | 191.1 KB | 79.1 KB | **-58.6%** |
| 站点 CSS 足迹（gzip） | 33.9 KB | 12.5 KB | **-63.1%** |
| 每页引用字体（raw） | 131.8 KB | 59.2 KB | **-55.1%** |
| serif 模式（假设切换）最重页分片流量 | 2 256 KB | ≈169 KB（页面级子集） | **≈-92%** |

JS（6.2 KB gz）与图片管线本轮未动，零变化即零回归。

## 度量口径（为什么有两套数字）

- **page-weight**（`benchmark/run-all.mjs`）：统计每页 HTML 引用的 link/script/img 资产 + 内联脚本的
  gzip 体积。**不含 CSS 级联按 unicode-range 触发的字体下载**，因此字体流量以门禁数据为准。
- **门禁**（`benchmark/font-cascade-check.mjs`）：本地起静态服务器 + headless Chrome（CDP），
  逐页加载，按 `Network.requestWillBeSent/loadingFinished` 记录真实 wire bytes
  （`encodedDataLength`）。这是**真实浏览器行为的地面真值**。
- **双模式诚实口径**：生产站 `fontStyle: 'sans'`（正文走系统无衬线栈，EarlySummer 家族
  零流量）；serif 是站长可切换的假设模式。两套门禁分别断言两种模式，禁止互相冒领成绩。

## 四轮改动（每轮一个独立优化面）

### R1 · 分片重切分（按页面聚类，commit 4c3533e）

原分片继承自 cn-font-split 的均匀切分，文章动辄命中 69 个分片。改为**同源验证 + 按页面
共现频率聚类**重切为 47 片：

- serif 假设口径最重页分片流量 2 256 KB → 1 217 KB（-46%），中位数 1 688 KB → 1 067 KB；
- 站点全量并集分片下载量 2 307 KB → 1 309 KB（爬完全站所需分片总量）；
- 移除了 `cn-font-split` 运行时依赖，切分脚本入库（`scripts/split-earlysummer.py`）可复现。

### R2 · 页面级精确子集 + 条件注入（双模式门禁建立）

- `scripts/gen-page-fonts.py` 为每篇文章生成**只含该页字符**的 woff2（约 293 B/字），
  `scripts/apply-page-fonts.mjs` 构建后注入页面级 `@font-face`（无 unicode-range、声明在
  分片之后，靠层叠“后声明者胜”生效，缺字自动回退分片自愈）；
- serif 模式每页只拉 1 个页面字体：门禁实测最重页 762–781 KB、中位数 ≈169 KB
  （对比 R1 后的 1 217 KB / 1 067 KB）；
- **sans 生产模式零注入**：`fontStyle !== 'serif'` 时注入器直接退出，页面字体在默认模式下
  本就是死字节；
- 门禁本身防“假通过”：`document.fonts.check()` 对多 unicode-range 家族失效、汉字宽advance
  恒为 1em 无法区分字体，改用 Latin 宽度探针（'Guiyuan1111'）；资源清单在探针之前采集
  （探针本身会触发它要断言的下载）。

### R3 · UI 字体子集（commit 见 git log，gate 186.7 → 77.3 KB/页）

`scripts/subset-ui-fonts.py` 对三个 UI 显示字体按**站点实际用字 ∪ ASCII ∪ 排版符号**做子集：

| 字体 | 原体积 | 子集后 |
| --- | --- | --- |
| Snell-Black（标题） | ~68 KB | 18.1 KB |
| Snell-Bold（时间） | ~40 KB | 16.6 KB |
| STIX-Italic（导航） | ~52 KB | 19.5 KB（按需） |
| STIX（装饰） | ~46 KB | 17.7 KB（按需） |

- 真实浏览器每页 webfont：**191.1 KB → 79.1 KB（-58.6%）**（`r3-gate-fonts-before/after.json`）；
- page-weight：max 226.6 → 153.6 KB，median 184.9 → 111.9 KB；
- 红线自检：fvar 存活（变量轴 400–700 不丢）、`want ⊆ got` cmap 校验、
  `document.fonts` 状态 + 宽度探针双确认渲染无回退。

### R4 · 分片 CSS 仅 serif 模式加载（commits 042b811 / ae04091 / d156a42）

47 个分片 `@font-face`（67 KB 原始 / ≈26 KB gzip）只在 serif 正文栈被引用，sans 模式下是
Layout.css 里的死重量：

- 拆出 `src/styles/earlysummer-shards.css`，Layout 以 `?url` 引入、Head 按
  `fontStyle === 'serif'` 条件输出 `<link>`；Astro 按实际渲染决定产物——**sans 构建连这个
  CSS 文件都不产出**；
- Layout.css gzip 33.9 KB → 7.6 KB；page-weight 再降 26.2 KB/页（max 153.6 → 127.4，
  median 111.9 → 85.7）；
- serif 门禁与 R3 持平（worst 780.7 KB / median 169.0 KB），sans 门禁 79.1 KB 持平——零回归。

过程中踩中并修复一个真实缺陷：Head.astro 注释里出现了 `</head>` 字面量，
`apply-page-fonts.mjs` 按首个字符串匹配注入，把页面字体样式注进了注释内部导致层叠失效
（门禁立即抓到 41/42 FAIL + 分片泄漏）。修复 = 注释改写 + 注入锚点改为**最后一个**
head 闭合标签（正文中的字面量总被转义为实体，最后一个必为真实闭合）。

## 全轨迹数据（快照 → JSON）

| 快照 | page-weight max | median | serif 假设分片 max | serif 假设分片 median |
| --- | --- | --- | --- | --- |
| [baseline](../../../benchmark/results/baseline.json)（v1.0.14） | 221.2 KB | 179.6 KB | 2 256.4 KB | 1 688.3 KB |
| [r1-font-split](../../../benchmark/results/r1-font-split.json) | 226.6 KB | 184.9 KB | 1 217.0 KB | 1 067.2 KB |
| [r2-conditional-sans](../../../benchmark/results/r2-conditional-sans.json) | 226.6 KB | 184.9 KB | 1 217.0 KB* | 1 067.2 KB* |
| [r3-ui-font-subsets](../../../benchmark/results/r3-ui-font-subsets.json) | 153.6 KB | 111.9 KB | — | — |
| [r4-shards-split](../../../benchmark/results/r4-shards-split.json) | 127.4 KB | 85.7 KB | 1 217.0 KB* | 1 067.2 KB* |

\* R2 起 serif 实际流量以门禁为准（页面字体取代分片），分片指标仅作回退路径参考。

R1/R2 的 page-weight 不降反微升（+5.3 KB）：重切分让 font.css 多了 @font-face 声明行，
其成本最终由 R4 的条件加载清零——三轮复合后才见全貌，这正是复合优化的意义。

真实浏览器门禁（wire bytes / 页，42 页全过）：

| 门禁快照 | 模式 | worst | median |
| --- | --- | --- | --- |
| [r3-gate-fonts-before](../../../benchmark/results/r3-gate-fonts-before.json) | sans | 191.1 KB | 191.1 KB |
| [r3-gate-fonts-after](../../../benchmark/results/r3-gate-fonts-after.json) | sans | 79.1 KB | 79.1 KB |
| [r4-gate-sans](../../../benchmark/results/r4-gate-sans.json) | sans | 79.1 KB | 79.1 KB |
| [r4-gate-serif](../../../benchmark/results/r4-gate-serif.json) | serif | 780.7 KB | 169.0 KB |

（sans 模式每页字体完全一致 = 3 个预加载 UI 字体 + 按需 STIX，故 worst = median。）

## 复现

```bash
pnpm build                                   # 当前 sans 生产模式
node benchmark/run-all.mjs --label=<标签>     # page-weight + serif 假设口径快照
node benchmark/font-cascade-check.mjs        # sans 门禁（读 src/config.ts 判定模式）
# serif 门禁：把 src/config.ts 的 fontStyle 改 'serif' → pnpm build → 门禁 → 改回 'sans' → 重建
```

度量细节与判据说明见 [`benchmark/README.md`](../../../benchmark/README.md)。

## 收尾评估（为什么停在这里）

- 每页剩余成本主要是**内容比例项**：最重页 127.4 KB 中 HTML 自身 49.4 KB gz（整篇小说文本）、
  字体 59.2 KB（3 个已子集预载 + 按需 STIX）、CSS 12.5 KB、JS 6.2 KB；
- 内联脚本（主题防闪烁 1.8 KB + Astro 组件小脚本）提取外链会引入请求瀑布，净收益为负，
  且主题脚本必须内联以保证首绘前设置 class——不动；
- `EarlySummer-Subset`（24.9 KB）预载每页承担 UI 汉字首绘，已是最小必要集。

字体/CSS 轴已系统性做完：切分 → 页面级子集 → UI 子集 → 条件加载，四轮互相衔接且各自闭环。
