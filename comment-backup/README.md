# 评论系统备份

本目录存放**永久停用评论功能**后从构建流程中移出的文件，仅作备份，**不参与构建、不参与类型检查、不参与代码检查**。

> 背景与恢复清单见 [note/disabled-features.md](../note/disabled-features.md) 第 3 节。
> 站点确定不会使用评论功能（2026-09-27 决定）。

## 内容

| 路径 | 数量 | 原位置 | 说明 |
| --- | --- | --- | --- |
| `components/Index.astro` | 1 | `src/components/Comment/` | 评论入口：按 `comment.enabled` 与各平台凭据非空渲染三家 |
| `components/Giscus.astro` | 1 | 同上 | GitHub Discussions 评论（119 行） |
| `components/Twikoo.astro` | 1 | 同上 | Twikoo 自建后端（114 行） |
| `components/Waline.astro` | 1 | 同上 | Waline，**停用前是实际在用的一家**（149 行） |
| `comment.css` | 1 | `src/styles/` | 三家评论区定制样式，208 行 |
| `giscus/theme-dark.css`、`giscus/theme-light.css` | 2 | `public/giscus/` | giscus 主题样式（约 14KB，原本会随构建复制进 dist） |

合计 **7 个文件**，组件 412 行 + 样式 208 行。

## 同时从活动代码中移除的部分

| 位置 | 处理 |
| --- | --- |
| `src/config.ts` | `comment: { enabled, giscus, twikoo, waline }` 整块注释 |
| `src/types/index.d.ts` | `comment` 类型字段整块注释 |
| `src/layouts/Layout.astro` | `MarginBottom` 的 `themeConfig.comment.enabled` 三元表达式注释，统一为 `mb-12` |
| `src/pages/posts/[slug].astro` | `import Comment`、`import '@/styles/comment.css'`、`<Comment />` 三处注释 |
| `src/i18n/config.ts` | `giscusLocaleMap` / `twikooLocaleMap` / `walineLocaleMap` 三套语言映射整块注释（**该文件已于 v1.0.9 随 `src/i18n/` 删除，恢复时需 `git checkout v1.0.8 -- src/i18n/config.ts` 取回**） |
| `package.json` | 移除 `@waline/client` 与 `twikoo` 依赖（`pnpm install` 已同步 lockfile） |
| `tsconfig.json` / `eslint.config.mjs` | `comment-backup` 与 `i18n-backup` 加入 exclude / ignores |

## 恢复方法

> ⚠️ v1.0.9 起 `src/i18n/` 已删除，第 4 步中「取消 `src/i18n/config.ts` 注释」改为
> `git checkout v1.0.8 -- src/i18n/config.ts` 取回该文件（详见 note/disabled-features.md 第 3 节）。

1. `git mv comment-backup/components src/components/Comment`
2. `git mv comment-backup/comment.css src/styles/comment.css`
3. `git mv comment-backup/giscus public/giscus`
4. 取消注释 `src/config.ts` 的 comment 块、`src/types/index.d.ts` 的 comment 字段、
   `src/i18n/config.ts` 的三套语言映射、`src/layouts/Layout.astro` 的 `MarginBottom`、
   `src/pages/posts/[slug].astro` 的三处
5. `pnpm add @waline/client@^3.13.0 twikoo@^1.7.7`
6. `pnpm check && pnpm build` 验证

## 部署侧注意

停用后**构建产物中不再有任何评论相关请求**：没有 Waline/Twikoo 脚本、没有评论 CSS、
没有 `public/giscus/` 静态文件。文章页底部由原来的 `mb-10`（有评论）变为 `mb-12`（无评论）。
