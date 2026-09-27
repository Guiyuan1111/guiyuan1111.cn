# Retypeset

![Cover Image](assets/images/v1/retypeset-en-desktop.webp)
![Cover Image](assets/images/v1/retypeset-en-mobile.webp)

<!-- 主题原版的 6 种语言 README 已随多语言停用一并归档至 i18n-backup/docs/，见 note/disabled-features.md -->
主题原版的[多语言 README](i18n-backup/docs/)已归档，本项目仅维护当前这一份。

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
- Comment system

## 本项目自定义（Project Customizations）

本仓库基于上游主题 [radishzzz/astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset) 搭建。

### 功能裁剪（注释保留，可随时恢复）

均以注释方式保留原代码，详见 [note/disabled-features.md](note/disabled-features.md)：

- **多语言永久停用**（v1.0.6 + v1.0.7）：站点只生成中文页面，且确定不再开启多语言。v1.0.6 注释了语言切换按钮、hreflang、`slugToLangsMap`/`supportedLangs` 传递链，并把 45 篇外语文章 + 6 份 README 翻译 + 切换按钮图标共 52 个文件 `git mv` 集中到 [i18n-backup/](i18n-backup/)；v1.0.7 进一步把 `src/pages/[...lang]/` 7 个路由改名为普通路径、移除 lang 参数与语言版 `getStaticPaths`，**`src/pages/` 下已无任何 i18n 引用**。`src/i18n/` 四个文件与 `astro.config` 的 i18n 块因仍有 16 处静态引用**不能删除**，已加「永久停用」横幅说明。实测构建页面数 103 → 18（-83%）、构建时间约 -50%，见 [性能实测报告](note/report/perf/2026-09-27-i18n-sound-disable-verification.md)。
- **禁用界面音效**：页面加载不再预载 10 个音效 WAV 文件。

### 构建与部署优化

- **构建期字体移出部署产物**（v1.0.2）：OG 图渲染专用的 16MB NotoSansSC OTF 从 `public/` 迁至 `src/assets/fonts/`，部署产物字体体积 21MB → 4MB。
- **构建命令瘦身**（v1.0.2）：`astro check` 从 dev/build 拆出为独立 `pnpm check`（在 CI 中执行）；移除与 Astro/Vite 默认压缩重复的 `astro-compress`。
- **KaTeX 样式按需加载**（v1.0.3）：数学样式表仅注入带 `math: true` frontmatter 的文章页。**写作须知：含数学公式的文章需在 frontmatter 中加 `math: true`**。
- **og:image 静态化**（v1.0.3）：非文章页分享图统一使用构建期生成的 `/og/home.png`，已移除 apiflash 第三方截图回退（含上游主题遗留的硬编码 key）。
- **CI 门禁**（v1.0.3）：GitHub Actions 双 job（lint + typecheck / build），见 `.github/workflows/ci.yml`。
- **图片管线收敛**（v1.0.4）：14 张内容源图统一收敛到 1600px（原 3000-5088px 直出），远程图床大图本地化至 `src/content/posts/_images/`，`remotePatterns` 收紧 hostname 白名单；产物内容图片 10.44MB → 2.81MB（-73%）。
- **移除无效字体预载**（v1.0.4）：STIX 双字体仅被 markdown 装饰引用且默认 sans 模式用不到，每页 112KB 预载移除（Head.astro 注释保留恢复方法）。
- **CSS 按页分割**（v1.0.4）：markdown/comment/extension 三个仅文章页需要的样式下沉到 posts/[slug]、about、index，全局 Layout.css 124KB → 95.5KB。
- **CI 缓存**（v1.0.4）：astro-og-canvas 产物与 Astro 内容层在 Actions 间缓存。
- **未启用语言文章归档**（v1.0.4，v1.0.6 迁入统一备份目录）：45 篇 en/es/ja/ru/zh-tw 文章先移至 `src/content/_archive/` 脱离构建管线，v1.0.6 进一步连同 README 翻译等一起 `git mv` 到 [i18n-backup/](i18n-backup/)（保留历史），见 [note/disabled-features.md](note/disabled-features.md)。

### 站点身份

- **首页标题与副标题**（v1.0.5）：`Guiyuan1111的博客` / `百无一用是深情，不屑一顾最相思`，改在 `src/i18n/ui.ts` 的 `zh` 条目（因 `i18nTitle: true`，`src/config.ts` 的 `site.title` 不生效）。改文案须同步重建 EarlySummer 显示字体子集，方法见 [note/font-subset.md](note/font-subset.md)。
- **站点身份已部分站点化**：`site.url`（`https://guiyuan1111.cn`）与 `site.author` 已改。仍指向主题作者的有：`site.title/subtitle/description`（因 `i18nTitle: true` 不生效）、Waline 评论地址、Umami 统计 ID 与脚本域名、Google/Bing 验证码、`twitterID`、页脚 GitHub/邮箱链接、图片白名单域名，完整清单见 [note/site-identity.md](note/site-identity.md)。

版本履历见 [note/release/](note/release/)；性能分析与优化建议见 [note/report/perf/](note/report/perf/)。

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
