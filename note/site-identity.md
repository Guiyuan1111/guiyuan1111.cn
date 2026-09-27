# 站点个人信息位置清单

本文件列出所有承载"个人信息 / 站点身份"的代码位置，用于站点化改造时逐项核对。

> **状态（v1.0.8，2026-09-27）**：
> - 已站点化：`site.url`、`site.author`、首页标题与副标题。
> - 已移除：Waline 评论地址（随评论系统永久停用一并注释，见 [disabled-features.md](./disabled-features.md) 第 3 节）。
> - 仍待改：Umami 统计、Google/Bing 验证码、Twitter ID、页脚链接、图片白名单域名，以及不生效的
>   `site.title/subtitle/description` 与仍为主题宣传语的 `ui.ts` zh 描述。

---

## 1. 核心：`src/config.ts`（全站唯一事实源）

| 行 | 字段 | 当前值 | 影响范围 | 状态 |
| --- | --- | --- | --- | --- |
| `:11` | `site.title` | `Guiyuan1111的博客` | **仅当 `i18nTitle: false` 时生效**（当前为 true，页面标题取 `src/i18n/ui.ts:110`） | 已填值但不生效 |
| `:13` | `site.subtitle` | `百无一用是深情，不屑一顾最相思` | 同上，实际取 `src/i18n/ui.ts:111` | 已填值但不生效 |
| `:16` | `site.description` | `更新Guiyuan1111的技术博客和哲学日常` | 同上，实际取 `src/i18n/ui.ts:112`——**导致 meta description 仍是主题宣传语** | 已填值但不生效 |
| `:20` | `site.i18nTitle` | `true` | 决定标题/副标题/描述取自 `src/i18n/ui.ts` 还是本文件 | 改成 `false` 即可让上面三项生效 |
| `:22` | `site.author` | `Guiyuan1111` | `<meta name="author">`、feed `author` | ✅ 已站点化 |
| `:25` | `site.url` | `https://guiyuan1111.cn` | **最关键**：`astro.config.ts` 的 `site`，决定 canonical、RSS/Atom 的 link 与 guid、sitemap、og:url | ✅ 已站点化 |
| `:96-130` | `comment` 整块 | **已注释** | 原 Waline `serverURL` 在 `:119`，仍在注释里保留了主题作者的服务器地址 | ✅ 已随评论系统停用 |
| `:135` | `seo.twitterID` | `@radishzz_` | `<meta name="twitter:site">`（`Head.astro:86`） | 待改 |
| `:140` | `seo.verification.google` | 作者的 GSC 码 | `<meta name="google-site-verification">`（`Head.astro:94`）——用作者的码验证不了本站 | 待改/清空 |
| `:143` | `seo.verification.bing` | 作者的 Bing 码 | `<meta name="msvalidate.01">`（`Head.astro:95`） | 待改/清空 |
| `:158` | `seo.umamiAnalyticsID` | `dab0e4b9-…` | **访问统计计入作者的 Umami 账号**（`Head.astro` 以 Partytown 加载） | 待改 |
| `:169` | `seo.apiflashKey` | `''` | **无人读取**，v1.0.3 起已废弃，仅类型兼容 | 可忽略 |
| `:184` | `footer.links[GitHub]` | 上游仓库地址 | 页脚社交链接 | 待改（可保留主题署名） |
| `:189` | `footer.links[Email]` | `email@radishzz.cc` | 页脚邮件链接 | 待改 |
| `:207` | `preload.imageHostURL` | `image.radishzz.cc` | `astro.config.ts` 的图片 `remotePatterns` 白名单 | 待改 |
| `:216` | `preload.customUmamiAnalyticsJS` | `https://views.radishzz.cc/script.js` | 统计脚本来源，与 `:158` 配套指向作者自建实例 | 待改 |

## 2. 标题与副标题：实际生效位置在 `src/i18n/ui.ts`

因为 `i18nTitle: true`，页面大标题、`<title>`、og:title、RSS 标题全部读这里，**不是** `config.ts`：

| 行 | 字段 | 值 |
| --- | --- | --- |
| `src/i18n/ui.ts:110` | `zh` → `title` | `Guiyuan1111的博客` |
| `src/i18n/ui.ts:111` | `zh` → `subtitle` | `百无一用是深情，不屑一顾最相思` |
| `src/i18n/ui.ts:112` | `zh` → `description` | ⚠️ 仍是主题宣传语"Retypeset是一款基于Astro框架的静态博客主题……" |

消费点：`Header.astro:10-11`（页面大标题）、`Head.astro:30-35`（`<title>`、og:title）、`feed.ts:118`（订阅源标题）。

**两条路二选一**：
1. 把 `config.ts:20` 的 `i18nTitle` 改成 `false` → 上面 `config.ts:11/13/16` 三个已填值立即生效（推荐，配置单源）；
2. 保持 `true`，改 `ui.ts:112` 的 zh `description`（标题副标题两边一致，可不动）。

代价：选 1 后若将来重新开启多语言，所有语言会共用同一套标题与描述。

## 3. 仍是主题宣传文案的正文内容

| 位置 | 内容 | 建议 |
| --- | --- | --- |
| `src/i18n/ui.ts:112` | 全站 meta description 与 RSS 描述 | 建议改成本站简介（或走第 2 节方案 1） |
| `src/content/about/about-zh.md:5` | 关于页正文，整段主题介绍 | 建议改成本人介绍 |
| `src/content/posts/guides/*.md`、`examples/*.md` | 上游示例文章，内含上游 URL / 图床 / 演示 ID，`Theme Guide-zh.md` 正文还写着怎么配评论 | 演示内容，可整目录删除；删后 RSS 中的评论关键字也会一并消失 |

## 4. 代码内引用上游（一般可保留）

- `src/components/Footer.astro:72` —— "Powered by Astro and Retypeset" 署名链接，属正常致谢。
- `src/utils/feed.ts:125` —— feed generator 字符串 `Astro-Theme-Retypeset`。
- `scripts/update-theme.ts:13-16` —— upstream remote 地址，属设计意图。
- `package.json:2,6` —— `name` 与 `repository` 仍为上游仓库。
- ~~`src/components/Comment/Giscus.astro:54-55`~~ —— 已随评论系统移至
  [`comment-backup/components/Giscus.astro:54-55`](../comment-backup/)（giscus 主题 CSS 从上游 jsDelivr 拉取），
  不再参与构建。

## 5. 改动后需要重新生成的资源

**改标题/副标题/UI 文案会牵动显示字体子集**，见 [font-subset.md](./font-subset.md)。
