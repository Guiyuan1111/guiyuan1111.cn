# Retypeset

![Cover Image](assets/images/v1/retypeset-en-desktop.webp)
![Cover Image](assets/images/v1/retypeset-en-mobile.webp)

<!-- 主题原版的 6 种语言 README 已随多语言停用一并归档，v1.0.14 起存放于本地 备份/i18n-backup/docs/（不入库，git 历史仍可取回），见 note/disabled-features.md -->
主题原版的多语言 README 已归档（本地 `备份/` 文件夹，不入库），本项目仅维护当前这一份。

Retypeset is a static blog theme based on the [Astro](https://astro.build/) framework. Inspired by [Typography](https://astro-theme-typography.vercel.app/), Retypeset establishes a new visual standard and reimagines the layout of all pages, creating a reading experience reminiscent of paper books, reviving the beauty of typography. Details in every sight, elegance in every space.

## Demo

- [Retypeset](https://retypeset.radishzz.cc/en/)
- [Retipografía](https://retypeset.radishzz.cc/es/)
- [Переверстка](https://retypeset.radishzz.cc/ru/)
- [重新编排](https://retypeset.radishzz.cc/)
- [重新編排](https://retypeset.radishzz.cc/zh-tw/)
- [再組版](https://retypeset.radishzz.cc/ja/)

## Features

- Built with Astro and UnoCSS
- Support for SEO, Sitemap, OpenGraph, RSS, MDX, LaTeX, Mermaid, and TOC
- i18n support *(本站当前已禁用，见下文)*
- Light / Dark mode
- Elegant view transitions
- Rich theme customization
- Optimized typography
- Responsive design
- Comment system *(本站已永久停用，见下文)*

## 本项目自定义（Project Customizations）

本仓库基于上游主题 [radishzzz/astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset) 搭建。

### 功能裁剪

均以注释方式保留原代码，详见 [note/disabled-features.md](note/disabled-features.md)：

- **多语言永久停用**（v1.0.1–v1.0.7，**v1.0.9 删除代码**）：站点只生成中文页面，且确定不再开启多语言。v1.0.6 把 45 篇外语文章 + 6 份 README 翻译 + 切换按钮图标共 52 个文件 `git mv` 集中到 `i18n-backup/`（v1.0.14 起移至本地 `备份/` 文件夹，不入库）；v1.0.7 把 `src/pages/[...lang]/` 7 个路由改名为普通路径；v1.0.9 配置唯一化重构**删除了 `src/i18n/` 四个文件与 `astro.config` 的 i18n 块**（`<html lang="zh-CN">` 硬编码进 Layout），`src/` 中已无任何 i18n 代码引用。实测构建页面数 103 → 18（-83%）、构建时间约 -50%，见 [性能实测报告](note/report/perf/2026-09-27-i18n-sound-disable-verification.md)。
- **禁用界面音效**：页面加载不再预载 10 个音效 WAV 文件（注释保留，可随时恢复）。
- **评论系统永久停用**（v1.0.8）：站点不使用评论功能。评论组件 4 个（412 行）+ `comment.css`（208 行）+ giscus 主题资源共 7 个文件 `git mv` 到 `comment-backup/`（v1.0.14 起移至本地 `备份/` 文件夹，不入库）；`config.ts`/`types`/`Layout`/`posts/[slug]` 的接入点注释保留；依赖 `@waline/client`、`twikoo` 已移除。构建产物不再有任何评论请求。
- **上游演示内容已删除**（v1.0.9）：`posts/guides/`、`posts/examples/` 与草稿 Universal Post 均为主题示例（含上游 URL、图床与失效的评论说明），已从 git 历史可找回；写新文章用 `pnpm new-post <标题>`。
- **首批内容已发布**（v1.0.11）：「文哲」文集 21 篇（鲁迅、史铁生、周国平、朱自清、张爱玲、郁达夫、钱理群、茨威格、普希金等），由 `备份/` 下 docx 源稿转换，双标签「文哲 + 作者」归档。命名/标签/诗歌/排版等写作规范见 [note/writing-guide.md](note/writing-guide.md)。

### 构建与部署优化

- **构建期字体移出部署产物**（v1.0.2）：OG 图渲染专用的 16MB NotoSansSC OTF 从 `public/` 迁至 `src/assets/fonts/`，部署产物字体体积 21MB → 4MB。
- **构建命令瘦身**（v1.0.2）：`astro check` 从 dev/build 拆出为独立 `pnpm check`（在 CI 中执行）；移除与 Astro/Vite 默认压缩重复的 `astro-compress`。
- **KaTeX 样式按需加载**（v1.0.3）：数学样式表仅注入带 `math: true` frontmatter 的文章页。**写作须知：含数学公式的文章需在 frontmatter 中加 `math: true`**。
- **og:image 静态化**（v1.0.3）：非文章页分享图统一使用构建期生成的 `/og/home.png`，已移除 apiflash 第三方截图回退（含上游主题遗留的硬编码 key）。
- **CI 门禁**（v1.0.3）：GitHub Actions 双 job（lint + typecheck / build），见 `.github/workflows/ci.yml`。
- **图片管线收敛**（v1.0.4）：14 张内容源图统一收敛到 1600px（原 3000-5088px 直出），远程图床大图本地化至 `src/content/posts/_images/`，`remotePatterns` 收紧 hostname 白名单；产物内容图片 10.44MB → 2.81MB（-73%）。（演示文章删除后 `_images/` 已清空，白名单域名已随站点化清空）
- **移除无效字体预载**（v1.0.4）：STIX 双字体仅被 markdown 装饰引用且默认 sans 模式用不到，每页 112KB 预载移除（Head.astro 注释保留恢复方法）。
- **CSS 按页分割**（v1.0.4）：markdown/comment/extension 三个仅文章页需要的样式下沉到 posts/[slug]、about、index，全局 Layout.css 124KB → 95.5KB。
- **CI 缓存**（v1.0.4）：astro-og-canvas 产物与 Astro 内容层在 Actions 间缓存。
- **gallery wheel 监听条件挂载 + 移除 partytown**（v1.0.9）：`passive:false` wheel 监听仅在存在 `.gallery-container` 的页面挂载；统计 ID 清空后 Partytown 运行时（每页 loader + 产物 ~108K）连同依赖、补丁一并移除。
- **字体加载四轮优化**（v1.0.15，R1–R4）：① EarlySummer 47 个分片按文章语料共现频率重切（`scripts/split-earlysummer.py`，移除 cn-font-split 依赖）；② serif 模式页面级精确子集（`scripts/gen-page-fonts.py` 每页一个 woff2，`scripts/apply-page-fonts.mjs` 构建后注入，缺字自动回退分片；仅 serif 模式注入，默认 sans 零成本）；③ 四个 UI 显示字体按站点实际用量子集为 `*.subset.woff2`（`scripts/subset-ui-fonts.py`，保留变量轴）；④ 47 个分片 `@font-face` 拆入 `src/styles/earlysummer-shards.css`，仅 serif 构建产出，sans 生产构建 Layout.css gzip 33.9KB→7.6KB。每页引用资产 gzip 中位数 179.6KB→85.7KB（-52.2%），真实浏览器每页 webfont 传输 191.1KB→79.1KB（-58.6%），实测对比见 [note/report/perf/2026-09-29-font-performance-r1-r4.md](note/report/perf/2026-09-29-font-performance-r1-r4.md)。
- **字体预载语义化收窄**（v1.0.16，R5）：UI 子集按渲染角色分策略（Snell-Black 仅服务固定标题串 17.9→3.1KB），EarlySummer-Subset 剔除上游多语言遗留字符（24.8→11.2KB）；首屏预载 59.2→27.2KB（-54%），每页引用资产中位数 83.7→52.5KB（-37.3%），真实 webfont 79.1→46.1KB（-41.7%）；并修复 `gen-page-fonts.py` 自 R4 拆分后无法再生 serif 页面字体的回归。见 [note/report/perf/2026-09-30-font-preload-slimming-r5.md](note/report/perf/2026-09-30-font-preload-slimming-r5.md)。
- **部署体积清理**（v1.0.17，R6）：sans 构建清理 dist 内未引用的 serif 页面字体（-7.2MB）、og PNG 调色板重编码（-1.38MB）、KaTeX woff/ttf 遗留裁剪（-0.78MB）、源字体移出 public（-340KB）；部署产物 20.31→10.64MB（-47.6%），访客侧逐字节零回归；基准套件新增 `deploy-weight.mjs`（总量/分类型/死重探针）。见 [note/report/perf/2026-09-30-deploy-weight-r6.md](note/report/perf/2026-09-30-deploy-weight-r6.md)。
- **剩余固定串字集收窄**（v1.0.18，R7）：Snell-Bold（日期）与 STIX-Italic（导航/页脚）按渲染角色收窄字集（12.6→2.2KB、18.8→5.0KB）；每页引用资产中位数 52.5→42.1KB，真实 webfont 46.1→21.8KB/页。R5–R7 三轮累计：每页引用资产中位数 -49.7%、webfont -72.4%、部署产物 -47.6%。见 [note/report/perf/2026-09-30-webfont-charset-r7.md](note/report/perf/2026-09-30-webfont-charset-r7.md)。
- **访客性能基准与字体门禁**（v1.0.15）：`benchmark/` 零依赖基准套件（page-weight / font-traffic / run-all）+ CDP 真实浏览器红线门禁 `font-cascade-check.mjs`（本地无头 Chrome/Edge 逐页断言字体请求级联与渲染来源，双模式 42/42 页），历次快照 JSON 入库 `benchmark/results/` 作为证据；用法见 [benchmark/README.md](benchmark/README.md)。
- **基准断言门禁入 CI + 字集采集修复**（v1.0.19，R8）：`run-all.mjs --assert` 绝对红线（死重探针零容忍/覆盖率 ≥95%）+ 可选基线漂移（×1.15/×1.25/×1.5）断言，CI build job 合并前拦截结构性倒退；门禁演练揪出 `subset-ui-fonts.py` class_chars str/int 类型错误——v1.0.16 起站点标题拉丁字母、页脚整段、阅读时长 "min" 字形静默回退，本版修复并经端到端字集漂移演练验证。见 [note/report/perf/2026-09-30-benchmark-assert-r8.md](note/report/perf/2026-09-30-benchmark-assert-r8.md)。
- **不可达资产清扫**（v1.0.20，R9）：文本级引用闭包分析（`benchmark/reachability.mjs`）接入构建尾部，自动删除任何页面不会请求的产物资产（本轮 KaTeX CSS+字体 276KB，未来写数学时自愈式保留）；deploy-weight 新增 `orphanAstroAssets` 探针并纳入 CI 红线。部署产物 10.62→10.35MB（对比 v1.0.15 累计 -49.1%），访客侧逐字节不变。见 [note/report/perf/2026-09-30-unreachable-sweep-r9.md](note/report/perf/2026-09-30-unreachable-sweep-r9.md)。
- **加载时序基准**（v1.0.21，R10）：`page-timing.mjs`（CDP 逐页 FCP/LCP/wire 双口径，区分本页成本与 prefetchAll 预取）+ `compare-timing.mjs`（共享页中位数对比 + 真实网络带宽估算）；worktree 重建 v1.0.14 完成全战役端到端对比——本页 wire 传输 -61.5%，Slow 4G 预估 FCP 1.8s→0.7s（-60.5%）。见 [note/report/perf/2026-09-30-page-timing-r10.md](note/report/perf/2026-09-30-page-timing-r10.md)。

### 站点身份（v1.0.9 已收尾）

- **配置单源**：v1.0.9 删除 `i18nTitle`/`locale`/`moreLocales`/`apiflashKey` 等死字段后，`src/config.ts` 成为全站唯一配置源，标题（`Guiyuan1111的博客`）、副标题（`百无一用是深情，不屑一顾最相思`）、描述均直接生效；改文案须同步重建 EarlySummer 显示字体子集，方法见 [note/font-subset.md](note/font-subset.md)。
- **作者遗留已清理**：Umami 统计 ID 与自建脚本域名、Google/Bing 验证码、`twitterID` 已清空（留空即不输出/不加载），页脚 GitHub 链接指向本仓库、作者 Email 链接已移除，图床白名单域名已清空，关于页已重写。完整清单见 [note/site-identity.md](note/site-identity.md)。
- 保留的致谢：页脚 "Powered by Astro and Retypeset"、feed generator 字符串与 `pnpm update-theme` 上游地址。

**全部笔记入口见 [note/README.md](note/README.md)**（按场景速查）；版本履历见 [note/release/](note/release/)；性能分析与实测报告见 [note/report/perf/](note/report/perf/)；基准与门禁用法见 [benchmark/README.md](benchmark/README.md)。

主题本身的完整功能说明与使用文档见上方各语言 README 及上游仓库。

## Performance

<br>
<p align="center">
  <a href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fretypeset.radishzz.cc%2Fen%2F&form_factor=desktop">
    <img width="710" alt="Retypeset Lighthouse Score" src="assets/images/retypeset-lighthouse-score.svg">
  <a>
</p>

## Getting Started

1. [Fork](https://github.com/radishzzz/astro-theme-retypeset/fork) this repository, or use this template to create a new repository.
2. Run the following commands in your terminal:

   ```bash
   # Clone the repository
   git clone <repository-url>

   # Navigate to the project directory
   cd <repository-name>

   # Install pnpm globally (if not already installed)
   npm install -g pnpm

   # Install dependencies
   pnpm install

   # Start the development server
   pnpm dev
   ```

3. Refer to the [Theme Guide](https://retypeset.radishzz.cc/en/posts/theme-guide/) to customize your blog and create new posts.
4. Refer to the [Astro Deployment Guides](https://docs.astro.build/en/guides/deploy/) to deploy your blog to Netlify, Vercel, or other platforms.

&emsp;[![Deploy to Netlify](assets/images/deploy-netlify.svg)](https://app.netlify.com/start) [![Deploy to Vercel](assets/images/deploy-vercel.svg)](https://vercel.com/new)

## Updates

Retypeset releases [new features](https://github.com/radishzzz/astro-theme-retypeset/issues/18) from time to time. Simply run `pnpm update-theme` to update the theme. If you encounter merge conflicts, please refer to [this video](https://youtu.be/lz5OuKzvadQ?si=sH_ALNgqxrYqNVQT) for manual resolution.

## Credits

- [Typography](https://github.com/moeyua/astro-theme-typography)
- [Fuwari](https://github.com/saicaca/fuwari)
- [Redefine](https://github.com/EvanNotFound/hexo-theme-redefine)
- [AstroPaper](https://github.com/satnaing/astro-paper)
- [heti](https://github.com/sivan/heti)
- [EarlySummerSerif](https://github.com/GuiWonder/EarlySummerSerif)

## Star History

<p align="center">
<a href="https://star-history.com/#radishzzz/astro-theme-retypeset&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=radishzzz/astro-theme-retypeset&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=radishzzz/astro-theme-retypeset&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=radishzzz/astro-theme-retypeset&type=Date" />
  </picture>
</p>
