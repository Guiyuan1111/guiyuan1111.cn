# 性能优化分析报告（静态分析 + 业界方案对比）

> **实施状态（2026-09-27 更新）**：P0 三项已于 v1.0.2 落地（移字体出 public、拆 astro check、删 astro-compress）；P1 三项已于 v1.0.3 落地（KaTeX 按需、OG 静态化去 apiflash、CI）；复查新增的 P1 五项已于 v1.0.4 落地（源图 1600px 收敛 + 远程图本地化、STIX 预载移除、CSS 按页分割、CI 缓存、未启用语言文章归档）。P2 项（OG 图转 JPG、Widget 下沉、feed memoize、评论组件懒加载等）仍待实施。见 [note/release/1.0.2.md](../../release/1.0.2.md)、[note/release/1.0.3.md](../../release/1.0.3.md)、[note/release/1.0.4.md](../../release/1.0.4.md)。
>
> **更正**：下方基线数据中"站点未配置统计"有误——复查确认 Umami 处于启用状态且用的是上游作者 ID 残留（`src/config.ts` 的 `umamiAnalyticsID`），待清理。
>
> **〔2026-09-27 第二次更新，现为 v1.0.8〕**
> - **P2 中的评论类条目（#6 Twikoo 懒加载、#7 Waline `/full` 入口）与 P1-5 apiflash 已全部作废**：评论系统于 v1.0.8 永久停用（组件归档 `comment-backup/`、依赖移除），apiflash 回退已于 v1.0.3 移除。见 [note/disabled-features.md](../../disabled-features.md)。
> - **P1-6「补最小 CI」已完成**（v1.0.3 + v1.0.4 缓存）；文中「本项目无 `.git`、无 CI」均为分析时基线，**现已不成立**，正文中相关处已就地标注。
> - 其余 P2 项（wheel passive、字体预载、partytown、chunkSizeWarningLimit）仍待实施——其中字体预载已由 v1.0.4 的 STIX 预载移除部分解决。
> - 本文其余为只读静态分析存档，行号以分析时快照为准。
>
> **〔2026-09-28 第三次更新，现为 v1.0.9——P2 清尾，本报告建议全部关闭〕**
> - **#8 wheel passive 已落地**：`MediaEmbed.astro` 改为仅当页面存在 `.gallery-container` 时挂载 `passive:false` 监听（`astro:page-load`/`before-swap` 增减），其余页面保持合成器滚动。
> - **#10 partytown 已移除**：统计 ID 于站点化收尾时清空，Partytown 运行时（每页内联 loader + 产物 `~partytown/` 约 108K）成为死重，集成、`@astrojs/partytown` 依赖与 `patches/` 补丁一并移除；将来接统计的恢复方法已写入 `astro.config.ts` 注释。
> - **#9 字体预载核实为无剩余项**：现存 3 个预载（EarlySummer 子集、Snell-Black、Snell-Bold）分别服务首屏标题/日期/UI 文案字体链，#5 处 STIX 预载移除后本项已闭环。
> - **#11 chunkSizeWarningLimit 维持现状**：仅容纳 mermaid 动态 chunk，站内图表文章占比低，不构成实际告警源。
> - 基线中的「16MB 字体在 public」「页面 103 页」等数据属 v1.0.0 快照，现状见 [note/release/1.0.9.md](../../release/1.0.9.md)。

- **分析对象**：guiyuan1111.cn（astro-theme-retypeset v1.0.0）
- **分析日期**：2026-09-27
- **分析方式**：只读静态分析，所有优化建议均先查询互联网已有实现，择优选取；未改动任何源码
- **基线数据**：49 篇文章 × 6 种语言 ≈ 300+ 构建页面；`public/` 共 21MB（100% 为字体）；〔更正〕统计已启用（见下方更正），且 **Waline 当时并非空配置**（`serverURL` 指向主题作者服务器）——评论系统已于 v1.0.8 永久停用

---

## 结论速览

| # | 发现 | 影响 | 收益 | 优先级 |
|---|------|------|------|--------|
| 1 | 16MB 构建期专用字体放在 `public/` 被原样部署 | 部署体积 -76% | 部署产物 21MB → ~5MB | 🥇 P0 |
| 2 | `astro check` 串在 dev 和 build 命令里 | dev 启动与构建变慢 | 每次省 5-30s | 🥇 P0 |
| 3 | `astro-compress` 与 Astro/Vite 默认压缩重复劳动 | 构建变慢，收益≈0 | 构建提速，产物不变 | 🥇 P0 |
| 4 | KaTeX CSS 全站注入（含无公式页面） | 每页多 ~23KB gzip + 字体请求 | 无公式页面减负 | 🥈 P1 |
| 5 | 非文章页 og:image 指向第三方截图 API（apiflash） | 社交爬虫抓取慢、依赖他人配额 | og:image 即时可用 | 🥈 P1 |
| 6 | Twikoo 脚本 eager 加载（Waline 已是懒加载） | 每个文章页多 ~100KB JS | 评论场景减负 | 🥈 P1（本站暂无评论，主题层改进） |
| 7 | Waline 使用 `/full` 全量入口 | 评论场景多加载体积 | 数十 KB | 🥉 P2（本站暂无评论） |
| 8 | 全局 non-passive wheel 监听 | 滚动主线程开销 | 滚动更顺滑 | 🥉 P2 |
| 9 | 每页预加载 5 个字体（~280KB） | 首屏带宽浪费风险 | 减少未用预载 | 🥉 P2 |
| 10 | 未配置统计仍引入 partytown | 每页多几 KB | 微量 | 🥉 P2 |
| 11 | 无 CI/CD，check 无处安放 | 流程问题 | — | 🥈 P1（配套） |

**已经做得很好、不建议改动的**（经与业界方案对比确认）：LQIP 实现方案、内容查询 memoize、Partytown、lite-youtube-embed、中文字体 unicode-range 切分、OG 图构建期生成、mermaid 懒加载策略（图少场景）。详见文末。

---

## P0-1：把构建期专用的 16MB 字体移出 `public/`

**证据**：

- `public/fonts/NotoSansSC-Bold.otf` = 8.2MB，`public/fonts/NotoSansSC-Regular.otf` = 8.0MB，合计 16MB，占 `public/`（21MB）的 76%
- 全库检索仅一处引用：`src/pages/og/[...image].ts:50-51`（OG 图构建期渲染用的字体文件）
- Astro 官方语义：[`public/` 目录的文件会被原样复制进 `dist/` 直接部署](https://docs.astro.build/en/basics/astro-files/#the-public-directory)。这两个 OTF 仅构建期消费，放进 public 等于给每个访客的部署源多背 16MB

**择优过程**：

- 方案 A（业界通用做法）：构建期资源放 `src/` 内，按文件系统路径引用 —— [Astro 官方项目结构文档](https://docs.astro.build/en/basics/astro-files/#project-structure)推荐 `src/` 存放"仅构建期使用的资源"
- 方案 B：换用 WOFF2 子集字体 —— OG 图标题是任意中文文本，动态子集需要额外流程，复杂度高
- **选取方案 A**：`astro-og-canvas` 按路径加载字体，把两个 OTF 移到如 `src/assets/fonts/` 并同步修改 `[...image].ts:50-51` 的相对路径即可，改动量最小、零运行时影响

**预期收益**：部署产物与发布包从 21MB 降到约 5MB（-76%）；Git 仓库工作区同步瘦身。

---

## P0-2：把 `astro check` 从 dev/build 命令链中拆出

**证据**：`package.json:7-8`

```json
"dev": "astro check && astro dev",
"build": "astro check && astro build && pnpm apply-lqip",
```

`astro check` 跑的是完整的 TS 语言服务诊断（全项目静态分析），而 `astro build`/`astro dev` 用 esbuild/Vite 做快速转译（不做类型检查）。串在前面意味着：每次 `pnpm dev` 冷启动前多等一次全量类型检查；每次构建多串行执行一个重步骤。

**择优过程**（[Astro CLI 参考](https://docs.astro.build/en/reference/cli-reference/#astro-check)：`astro check` 本就是独立的检查命令；[Astro 官方 CI 指南](https://docs.astro.build/en/guides/ci/)将其作为独立 CI 步骤）：

- 方案 A：check 放 CI 单独 job，build 只跑 `astro build` —— 社区主流做法，deploy 快、质量门禁不丢
- 方案 B：维持现状 —— 类型错误在编辑器（Astro VS Code 插件实时诊断）和 dev overlay 都可见，命令链里再跑一遍是重复
- **选取方案 A**：`"dev": "astro dev"`、`"build": "astro build && pnpm apply-lqip"`，`astro check` 放到 lint/CI 阶段（本项目目前无 CI，见 P1-6）

**预期收益**：dev 启动少等一次全量类型检查；构建缩短一个串行大步骤（本项目规模约省 5-30s/次，随文章数增长线性放大）。

---

## P0-3：移除 `astro-compress` 集成

**证据**：`astro.config.ts:55-61` 启用了 `Compress({ CSS: true, HTML: true, JavaScript: true })`。

**择优过程**（互联网方案对比）：

- Astro 默认已压缩 HTML：[`compressHTML` 默认开启](https://docs.astro.build/en/reference/configuration-reference/#compresshtml)，构建产物 HTML 本身就是压缩过的
- Vite 默认已压缩 JS/CSS：[`build.minify` 默认 `'esbuild'`](https://vite.dev/config/build-options.html#build-minify)，产物 JS/CSS 已是压缩态
- `astro-compress` 用 terser/html-minifier-terser 在构建后**串行重扫全部 dist 文件**做二次压缩 —— 对已压缩产物收益趋近于零，构建时间却实打实增加（terser 比 esbuild 慢一个量级）
- 生态共识：压缩交给框架默认值 + CDN/服务器层 gzip/Brotli（传输压缩比构建期压缩更高效且可缓存）
- 另一个细节：`apply-lqip.ts:221` 会用 `root.toString()` 重写 HTML，恰好发生在 astro-compress 压缩之后，会把部分压缩成果再展开 —— 两步集成的执行顺序互相打折

**选取**：删除该集成与依赖，依赖 Astro/Vite 默认压缩，传输压缩交给托管层（Cloudflare Pages / Netlify / Nginx 都默认开启）。

**预期收益**：构建时间减少（少一遍全量 dist 扫描与 terser 压缩），产物体积几乎不变。

---

## P1-4：KaTeX CSS 按需加载

**证据**：`src/layouts/Head.astro:63` —— `katex: true` 时每个页面（首页、标签页、无公式文章）都注入 `katex.min.css`（~23KB gzip，外加按需的 KaTeX 字体请求）。本站 `src/config.ts` 中 `global.katex: true` 为全站开关。

**择优过程**：

- 现有可取之处：已用 `media="print" onload` 异步加载技巧，不阻塞渲染 —— 保留
- 方案 A：内容集合 schema 加 `math: boolean` frontmatter，仅在含公式文章的模板注入 KaTeX CSS —— Hugo 生态（`math: true` 页面参数）与多个 Astro 博客主题的通行做法
- 方案 B：维持全站注入 —— 简单，但让全体页面为少数页面买单
- **选取方案 A**（若近期文章多用公式则可保持现状，属低风险改进）

**预期收益**：无公式页面减少 ~23KB gzip CSS 与字体探测请求。

---

## P1-5：非文章页 og:image 依赖第三方截图 API

**证据**：`src/layouts/Head.astro:37-41` —— 有 `postSlug` 的页面用本地预渲染 OG 图（好），但首页/标签页等回退到 `api.apiflash.com` 实时截图 URL（用的是上游作者写死的 key，见 `Head.astro:41`）。

**性能影响**：社交平台爬虫抓取 og:image 时触发实时截图生成（`wait_until=network_idle`，秒级延迟），且该第三方配额随时可能失效 → 分享卡片变空图。

**择优**：

- 方案 A：为首页/标签页也生成静态 OG 图（`astro-og-canvas` 构建期已就绪，加几行 pages 条目即可）
- 方案 B：删除回退，仅文章页有 og:image
- **选取方案 A**：构建期静态生成，零外部依赖、零延迟（同时顺带解决上一轮报告提到的密钥遗留问题）

---

## P1-6：补一个最小 CI（check/lint 与 build 分离的落脚点）

本项目无 `.git` 仓库、无 CI 配置。P0-2 拆出的 `astro check` 与 `eslint` 需要一个执行位置。**择优**：GitHub Actions 官方模板（[Astro 官方 CI 指南](https://docs.astro.build/en/guides/ci/)提供的 workflow），一个 job 跑 `astro check` + `eslint`，一个 job 跑 `astro build`。这既是流程改进，也让 P0-2/P0-3 的收益成立。

---

## P2（低优先级 / 主题层改进）

| # | 发现 | 证据 | 建议 |
|---|------|------|------|
| 7 | ~~Waline 用 `/full` 全量入口~~ **〔已作废 v1.0.8〕** | ~~`Waline.astro:2`~~ 组件已归档至 `comment-backup/components/`，依赖已移除 | 评论系统永久停用，无需优化 |
| 6 | ~~Twikoo 脚本 eager 加载~~ **〔已作废 v1.0.8〕** | ~~`Twikoo.astro`~~ 同上 | 同上 |
| 8 | 全局 non-passive wheel 监听 | `MediaEmbed.astro:126`（每页挂 `{ passive: false }` wheel 监听，仅为图库横向滚动服务） | 仅在页面存在 `.gallery-container` 时挂载，其余页面保持合成器滚动 |
| 9 | 每页预加载 5 个字体（~280KB） | `Head.astro:58-62` | 只预加载首屏真实使用的 1-2 个（标题字体 + 正文衬线），其余靠 `unicode-range` 按需；浏览器对未使用 preload 会在控制台告警 |
| 10 | 未配置统计仍集成 partytown | `astro.config.ts:49-53` | 若确定不用 GA/Umami 可移除（每页省几 KB）；将来要接统计则保留（Partytown 本身是业界最佳实践） |
| 11 | `chunkSizeWarningLimit: 600` 掩盖大 chunk 告警 | `astro.config.ts:105-107` | 主要为容纳 mermaid 动态 chunk。mermaid 择优结论见下 |

**mermaid 渲染策略专项（择优结论：维持现状）**：本项目用 [`rehype-mermaid` 的 `pre-mermaid` 策略](https://github.com/remcohaszing/rehype-mermaid)（`astro.config.ts:73`）+ 客户端动态 `import('mermaid')`（`MediaEmbed.astro:23`）。对比方案是默认的 `inline-svg` 构建期渲染（Playwright 无头浏览器把图渲染成纯 SVG）：访客零 JS，但每次构建要起无头浏览器、依赖重。社区里注重构建速度与零浏览器依赖的站点多选 `pre-mermaid`，注重访客流量且图多的选 `inline-svg`。**本站含图文章占比低，当前"仅含图页面按需加载 mermaid"已是更优点；若将来图表文章增多再切换 `inline-svg`**。

---

## 对比后确认"已经是业界最优、不建议动"的部分

| 现有实现 | 对比的业界方案 | 结论 |
|---------|--------------|------|
| LQIP：3 像素位打包 8 位 hex + CSS `color()` 解码（`scripts/apply-lqip.ts:35-83`、`src/styles/lqip.css`） | BlurHash / ThumbHash 需要客户端 JS 或 WASM 解码才能显示 | 现方案[零 JS、纯 CSS 解码](https://frzi.medium.com/lqip-css-73dc6dda2529)、带增量缓存，对纯静态站**优于** BlurHash/ThumbHash |
| `src/utils/cache.ts` memoize + `content.ts` 全查询缓存 | 每页重复 `getCollection`+`render` | 已是最佳实践，300+ 页构建免重复渲染 |
| Partytown 跑统计脚本 | 直接 `<script>` 加载 GA | [Web worker 隔离第三方脚本](https://partytown.qwik.dev/)，业界最佳实践 |
| lite-youtube-embed facade | 直接嵌 YouTube iframe | 减少 ~1MB 初始加载，业界标准 facade 模式 |
| 中文字体按 `unicode-range` 切分（EarlySummer-VF-Split 3.7MB→按需加载） | 整包中文 woff2（MB 级一次下载） | 已是中文 webfont 标准方案 |
| OG 图构建期静态生成（`astro-og-canvas`） | 运行时截图服务 | 静态生成快且稳（仅非文章页回退有 apiflash 问题，见 P1-5） |
| Astro `prefetch` viewport 预取 | 无预取 / hover 预取 | 静态博客开启 viewport 预取是合理的体验取舍 |

---

## 建议实施顺序

1. ✅ **P0 三项已完成**（v1.0.2）：移字体出 public、拆 check、删 astro-compress
2. ✅ **P1 已全部完成**（v1.0.3 + v1.0.4）：OG 静态化回退、CI 最小模板 + 缓存、KaTeX 按需、图片管线收敛、STIX 预载移除、CSS 按页分割
3. ⚠️ **P2 现状**：评论类两项（Twikoo 懒加载、Waline 入口）**已随评论系统永久停用而作废**；
   仍值得做的是 wheel passive 化与字体预载精简。主题层改进若要回报上游，走 `pnpm update-theme` 的 upstream 流程

> 本报告为只读分析，未改动任何源码。所有文件行号以 2026-09-27 的代码快照为准。
