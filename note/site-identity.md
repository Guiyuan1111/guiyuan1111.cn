# 站点个人信息位置清单

本文件列出所有承载"个人信息 / 站点身份"的代码位置，用于站点化改造时逐项核对。

> **状态（v1.0.9，2026-09-28）**：
> - **站点化已收尾**。标题/副标题/描述单源于 `config.ts`（`i18nTitle` 开关已随 v1.0.9 重构删除）；
>   Umami/验证码/Twitter ID 已清空、页脚已指向本仓库、图床白名单已清空、关于页已重写。
> - 唯一保留的主题痕迹：页脚 "Powered by Astro and Retypeset" 致谢链接、feed generator 字符串、
>   `package.json` 的上游 `name/repository`（均属正常署名，见第 4 节）。
> - 待用户自行补充：Google/Bing 验证码（如需站长工具）、自建统计 ID、关于页正文细节
>   （邮箱已于 v1.0.10 补上：页脚 + 关于页联系一栏）。

---

## 1. 核心：`src/config.ts`（全站唯一事实源）

| 字段 | 当前值 | 影响范围 | 状态 |
| --- | --- | --- | --- |
| `site.title` / `subtitle` / `description` | `Guiyuan1111的博客` / `百无一用是深情，不屑一顾最相思` / `更新Guiyuan1111的技术博客和哲学日常` | 页面大标题、`<title>`、og、RSS 标题与描述（v1.0.9 起无条件生效，原 `i18nTitle` 开关已删除） | ✅ 单源生效 |
| `site.author` | `Guiyuan1111` | `<meta name="author">`、feed `author` | ✅ |
| `site.url` | `https://guiyuan1111.cn` | canonical、RSS/Atom link、sitemap、og:url | ✅ |
| `seo.twitterID` | `''` | 留空不输出 `<meta name="twitter:site">` | ✅ 已清空（原为作者账号） |
| `seo.verification.google/bing` | `''` | 留空不输出验证 meta | ✅ 已清空（原作者的码验证不了本站） |
| `seo.umamiAnalyticsID` | `''` | 留空不加载统计 | ✅ 已清空（此前访问数据计入作者账号） |
| `footer.links[GitHub]` | `Guiyuan1111/guiyuan1111.cn` | 页脚社交链接 | ✅ 已指向本仓库 |
| `footer.links[Email]` | `guiyuan1111@qq.com`（v1.0.10 补上，渲染为 mailto 链接） | 页脚社交链接 | ✅ 已加上 |
| `preload.imageHostURL` | `''` | 留空则 astro.config 不设 remotePatterns 白名单 | ✅ 已清空（内容图片全部本地化） |
| `preload.customUmamiAnalyticsJS` | `''` | 留空不加载 | ✅ 已清空（作者自建统计实例） |
| ~~`site.i18nTitle`~~ / ~~`global.locale`~~ / ~~`global.moreLocales`~~ / ~~`seo.apiflashKey`~~ | 已删除 | — | ✅ v1.0.9 死字段清理 |
| ~~`comment` 整块~~ | 注释保留 | — | ✅ 已随评论系统停用（v1.0.8） |

## 2. 正文内容

| 位置 | 状态 |
| --- | --- |
| `src/content/about/about-zh.md` | ✅ 已重写为个人简介（v1.0.9），内含 TODO 注释待本人补充细节 |
| `src/content/posts/guides|examples/` | ✅ 上游演示文章已整目录删除（v1.0.9），RSS/Sitemap 不再含上游 URL、图床与演示 ID |

## 3. 保留的致谢（属正常署名，不建议改）

- `src/components/Footer.astro` —— "Powered by Astro and Retypeset" 链接。
- `src/utils/feed.ts` —— feed generator 字符串 `Astro-Theme-Retypeset`。
- `scripts/update-theme.ts` —— upstream remote 地址，属设计意图。
- `package.json` —— `name` 与 `repository` 仍为上游仓库（影响 `pnpm update-theme`）。

## 4. 改动后需要重新生成的资源

**改标题/副标题/UI 文案会牵动显示字体子集**：CJK 部分走 EarlySummer-Subset 重建流程，Latin/UI 显示字体跑 `pnpm gen:uifonts`（v1.0.15 起 Snell/STIX 均为按站点用字的 `*.subset.woff2`），见 [font-subset.md](./font-subset.md)。
