# Blueprint 01：new-post 文章创建器 Skill

## 基本信息

| 项 | 值 |
| --- | --- |
| 名称 | new-post-skill（Retypeset 文章创建器） |
| 替代对象 | `pnpm new-post`（`scripts/new-post.ts`，52 行） |
| 评级 | 🤖 完全 AI 化（29/30，见 [../04-ai-substitution.md](../04-ai-substitution.md) M1） |
| 优先级 | P0 |
| 复杂度 | 低 |

## 触发场景与推荐 description

用户想创建新文章、开新草稿、为已有文章补多语言骨架时触发。

```yaml
name: new-post-skill
description: >
  为 astro-theme-retypeset 博客创建新文章。当用户说"写一篇新文章"、"新建 post"、
  "创建草稿"、"给 xx 文章加英文版骨架"、"new-post"时使用。会按 content schema 生成
  合规 frontmatter，可自动起草 description 与 tags，支持多语言文件命名约定。
```

## 输入输出契约

### 输入

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 文章标题，可含子目录（如 `guides/主题指南`） |
| lang | string | 否 | 目标语言码，默认 `''`（universal）；合法值见 `src/i18n/config.ts:2-14` |
| tags | string[] | 否 | 缺省时由 AI 根据标题/意图起草 |
| draft | boolean | 否 | 默认 false |
| description | string | 否 | 缺省时 AI 起草一句话简介（后续可被 `src/utils/description.ts:69-93` 的自动摘要替代） |

### 数据模型（TypeScript）

```ts
interface NewPostInput {
  title: string
  lang?: '' | 'de' | 'en' | 'es' | 'fr' | 'ja' | 'ko' | 'pl' | 'pt' | 'ru' | 'zh' | 'zh-tw'
  tags?: string[]
  draft?: boolean
  description?: string
  abbrlink?: string
}

interface NewPostResult {
  filePath: string          // src/content/posts/<title>[-<lang>].md
  frontmatter: string
  warnings: string[]        // 如"检测到同名不同语言文件，建议对齐 tags"
}
```

### 输出 frontmatter 字段约束（来源：`src/content.config.ts:8-28`）

| 字段 | 规则 |
| --- | --- |
| `title` | 必填字符串 |
| `published` | 必填日期，取当前时间 ISO 格式 |
| `abbrlink` | 可选；仅 `^[a-z0-9\-]*$`（`content.config.ts:24-27`） |
| `pin` | 0-99 整数，默认 0 |
| `lang` | 枚举或 `''`；文件名带 `-<lang>` 后缀时必须一致 |

### 错误码表

| 错误 | 处理 |
| --- | --- |
| `E_EXISTS` 目标文件已存在 | 拒绝创建，报告路径，建议改名（对齐 `new-post.ts:20-23` 行为） |
| `E_INVALID_LANG` 非法语言码 | 拒绝并列出 11 个合法值 |
| `E_ABBRLINK` 不合正则 | 拒绝并提示小写字母/数字/连字符 |
| `E_SUBDIR` 路径越界（含 `..`） | 拒绝 |

## 依赖清单

- 内部模块：`src/config.ts`（读 `themeConfig.global.toc` 作为 toc 默认值，同 `new-post.ts:38`）
- 内容约定：文件命名 `<标题>-<lang>.md`（实例见 `src/content/posts/examples/`）
- 外部服务：无
- 工具权限：Read、Write（仅 `src/content/posts/` 下）、Glob（查同名文件）

## Skill 工作流设计

```text
Workflow Steps:
1. 解析输入 → 校验 lang/abbrlink 合法性（错误码 E_INVALID_LANG / E_ABBRLINK）
2. Glob 扫描 src/content/posts/ 检查同名/同 slug 文件 → 命中则报 E_EXISTS
3. 若未提供 description/tags → 基于标题起草（一句话、与站点语言一致）
4. 组装 frontmatter（字段全集对齐 new-post.ts:29-42 模板 + schema 默认值）
5. Write 写入 src/content/posts/<路径>
6. 若 lang ≠ ''，额外提示可调用 i18n-translate-skill（Blueprint 04）翻译正文
7. 收尾报告：文件路径、下一步建议（pnpm dev 预览 / new-post 手动编辑）

Constraints:
- 绝不覆盖已存在文件（硬约束，承自 new-post.ts:20-23）
- 只在 src/content/posts/ 下写文件
- frontmatter 必须通过 content.config.ts schema（可运行 pnpm astro check 复核）
- 不修改 scripts/ 或主题源码
```

## 使用示例

✅ Do This：

> 用户："建一篇新文章，标题《禅与摩托车维修艺术》，标签 [随笔, 哲学]，先存草稿。"
> Skill：写入 `src/content/posts/禅与摩托车维修艺术.md`，frontmatter 含 `tags: [随笔, 哲学]`、`draft: true`、`published: <今天>`、`toc: true`（读取 `src/config.ts:70` 的全局值）。

❌ Not This：

> 不要在用户只说"新建文章"时直接编造正文内容并发布（`draft: false`）——默认草稿态或先询问。
> 不要生成 `abbrlink: 'Hometown!'`（含大写与非法字符，违反 `content.config.ts:24-27`）。
> 不要覆盖已存在的 `故乡-zh.md`。

## 参考材料

- `scripts/new-post.ts`（被增强的原脚本，全文 52 行）
- `src/content.config.ts:6-29`（posts schema）
- `src/config.ts:59-75`（global 配置：locale/toc 等默认值来源）
- `src/content/posts/examples/故乡-zh.md`（命名与 frontmatter 实例）
