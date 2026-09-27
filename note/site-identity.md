# 站点个人信息位置清单

本文件列出所有承载"个人信息 / 站点身份"的代码位置，用于站点化改造时逐项核对。
截至 v1.0.5，**仅首页标题与副标题已改**，其余全部仍指向主题作者 radishzz。

---

## 1. 核心：`src/config.ts`（全站唯一事实源）

| 行 | 字段 | 当前值 | 影响范围 | 状态 |
| --- | --- | --- | --- | --- |
| `:7` | `site.title` | `Retypeset` | **仅当 `i18nTitle: false` 时生效**（当前为 true，故未被使用） | 待改 |
| `:11` | `site.description` | 主题英文宣传语 | 同上，`i18nTitle: true` 时不生效 | 待改 |
| `:13` | `site.i18nTitle` | `true` | 决定标题/副标题/描述取自 `src/i18n/ui.ts` 还是本文件 | 保持 true |
| `:15` | `site.author` | `radishzz` | `<meta name="author">`、feed `author` | 待改 |
| `:17` | `site.url` | `https://retypeset.radishzz.cc` | **最关键**：`astro.config.ts:21` 的 `site`，进而决定 canonical、RSS/Atom 的 link 与 guid、sitemap URL、og:url、hreflang —— 全部仍指向作者域名 | 待改 |
| `:107` | `comment.waline.serverURL` | `https://retypeset-comment.radishzz.cc` | 评论提交到作者的 Waline 服务器（giscus/twikoo 为空串，不会启用） | 待改 |
| `:125` | `seo.twitterID` | `@radishzz_` | `twitter:site` meta | 待改 |
| `:130` | `seo.verification.google` | 作者的 GSC 码 | 站点验证 meta（用作者的码验证不了本站，属无效残留） | 待改/清空 |
| `:133` | `seo.verification.bing` | 作者的 Bing 码 | 同上 | 待改/清空 |
| `:146` | `seo.umamiAnalyticsID` | `dab0e4b9-…` | **访问统计计入作者的 Umami 账号** | 待改 |
| `:172` | `footer.links[GitHub]` | 上游仓库地址 | 页脚社交链接 | 待改（可保留主题署名） |
| `:176` | `footer.links[Email]` | `email@radishzz.cc` | 页脚邮件链接 | 待改 |
| `:192` | `preload.imageHostURL` | `image.radishzz.cc` | `astro.config.ts:22-25` 的图片 `remotePatterns` 白名单；仍允许该域名的远程图进构建管线 | 待改 |
| `:200` | `preload.customUmamiAnalyticsJS` | `https://views.radishzz.cc/script.js` | 统计脚本来源，与 `:146` 配套指向作者自建实例 | 待改 |

## 2. 标题与副标题（本次已改）

- `src/i18n/ui.ts:96-97`（`zh` 条目）：`title` / `subtitle`
  - 因 `i18nTitle: true`，首页大标题、`<title>` 标签、og:title、RSS 标题全部由这里决定，
    **而不是** `src/config.ts:7`。
  - 已改为 `Guiyuan1111的博客` / `百无一用是深情，不屑一顾最相思`。
- 消费点：`src/components/Header.astro:10-11`（页面大标题）、`src/layouts/Head.astro:30-35`
  （`<title>`、og:title）、`src/utils/feed.ts:118`（订阅源标题）。

## 3. 仍是主题宣传文案的正文内容

| 位置 | 内容 | 建议 |
| --- | --- | --- |
| `src/i18n/ui.ts:98`（`zh` 的 `description`） | "Retypeset是一款基于Astro框架的静态博客主题……再现版式之美" | 作为全站 meta description 与 RSS 描述，建议改成本站简介 |
| `src/content/about/about-zh.md:5` | 关于页正文，整段主题介绍 | 建议改成本人介绍 |
| `src/content/posts/guides/*.md`、`examples/*.md` | 上游示例文章，内含上游 URL / 图床 / 演示 ID | 属主题自带演示内容，可整目录删除或保留 |

## 4. 代码内引用上游（一般可保留）

- `src/components/Footer.astro:72` —— "Powered by Astro and Retypeset" 署名链接，属正常致谢。
- `src/components/Comment/Giscus.astro:54-55` —— giscus 主题 CSS 从上游 jsDelivr 拉取；
  本地已有副本 `public/giscus/theme-{dark,light}.css`，当前未启用 giscus，无实际影响。
- `src/utils/feed.ts:125` —— feed generator 字符串 `Astro-Theme-Retypeset`。
- `scripts/update-theme.ts:16` —— upstream remote 地址，属设计意图。
- `package.json:2,6` —— `name` 与 `repository` 仍为上游仓库。

## 5. 改动后需要重新生成的资源

**改标题/副标题/UI 文案会牵动显示字体子集**，见 [font-subset.md](./font-subset.md)。
