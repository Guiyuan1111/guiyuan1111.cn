# 写作与发文规范

> 适用范围：`src/content/posts/` 下的所有文章。2026-09-29 随「文哲」文集（v1.0.11）确立，
> v1.0.12–v1.0.14 补充排版与归档约定。与 release 笔记冲突时以本文件为准。

## 文件与 URL

- 文章扁平存放在 `src/content/posts/<标题>.md`，**中文文件名**，一篇文章一个文件。
- URL 形如 `/posts/<标题>/`。Astro 的 slug 规则会剥离标题中的 `·`、`（）`、`？` 等符号
  （如《大卫·科波菲尔（节选）》→ `/posts/大卫科波菲尔节选/`）；文件名与页面标题不受影响。
- **为什么不用子文件夹**：文章路由是单段动态路由 `posts/[slug].astro`，带斜杠的 id 无法匹配
  （v1.0.11 前实测：构建直接报 `Missing parameter: slug`）。文件夹组织必须配合 `abbrlink`，
  而 schema 限定 `abbrlink ∈ [a-z0-9-]`，中文标题用不了。分类职责由**标签**承担（见下）。
- **为什么不用 abbrlink**：同上 schema 限制。将来若需要 ASCII 短链，需先改 schema 再统一定规范。

## frontmatter

`pnpm new-post <标题>` 会生成完整模板；实际只需保留这三个字段（其余走 schema 默认或按需添加）：

```yaml
---
title: "文章标题"
published: 2026-09-29
tags:
  - 文哲
  - 作者名
---
```

| 字段 | 约定 |
| --- | --- |
| `title` | 与文件名一致。「作者《作品》」式命名的文件（如《苏珊·桑塔格〈加缪的日记〉》），title 只写作品名 |
| `published` | 源文档用其创建日期；新写文章用当天日期 |
| `tags` | `文哲` + 作者 双标签；作者取文件名前缀或文内署名（docx 元数据的 creator 是录入者账号，不作数） |
| `description` | 留空，主题自动截取摘要（列表/页内 120 字、og/feed 70 字） |
| `draft` | 草稿设 `true`（仅 dev 可见，生产构建自动排除） |
| `math` | 含数学公式的文章**必须**设 `math: true`，否则 KaTeX 样式不加载 |
| `pin` / `toc` / `updated` / `abbrlink` / `lang` | 保持默认（pin 0、toc 跟随全局、lang 留空） |

## 正文排版

- **首行缩进由 CSS 负责**（v1.0.12）：文章页顶层段落自动缩进 2 字符（引用块、列表、图注不缩进）。
  **不要在 markdown 里手写全角空格**。
- **诗歌顶格写法**（v1.0.13）：诗行写在同一个段落里、行尾用 `\` 硬换行，诗节之间空一行分段；
  CSS 识别含 `<br>` 的段落并豁免缩进，散文段落照常缩进。示例见《致恰达耶夫》。
- 文档的标题行与**纯署名行不要写进正文**（frontmatter 已有 title/tags）；
  带附加信息的署名行可原样保留（如《大暑》的"温州大学 徐可加 一等奖"与文末点评、
  史铁生篇文末的作者小传）。

## 图片

- 图片放 `src/content/posts/_images/`，markdown 里用相对路径引用 `![](./_images/xxx.webp)`；
  构建期自动压缩、补宽高与懒加载，`pnpm build` 末尾的 `apply-lqip` 自动生成 LQIP 占位色。
- 新增/更换图片后**必须整站 `pnpm build`**（LQIP 在构建产物上处理），不要只跑 dev。

## 发文流程

1. `pnpm new-post <标题>` 生成模板（或复制既有文章的 frontmatter 改写）；
2. 按上文填写 frontmatter 与正文；
3. `pnpm build` 验证：新增文章 +1 页；出现新标签则 +1 个标签页、+1 张 OG 图；
4. git 提交（内容用 `feat(content):` 前缀），推送 main 即发布（EdgeOne Pages 自动部署）；
5. 版本号与 GitHub Release 用于**站点/主题改动**；纯发文视改动大小决定是否随版本发布
   （首发文集 v1.0.11 即随版本发布了 Release）。
