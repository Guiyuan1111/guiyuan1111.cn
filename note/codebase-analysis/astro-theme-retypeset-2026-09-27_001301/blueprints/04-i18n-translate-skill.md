# Blueprint 04：i18n 内容翻译 Skill

## 基本信息

| 项 | 值 |
| --- | --- |
| 名称 | i18n-translate-skill（多语言文章同步翻译） |
| 替代对象 | 当前无工具（纯手工流程，见 [../03-workflow.md](../03-workflow.md) 2.3 节） |
| 评级 | 🧑‍💻 AI 辅助，收益最高（22/30，见 [../04-ai-substitution.md](../04-ai-substitution.md) M4） |
| 优先级 | P0 |
| 复杂度 | 中 |

## 触发场景与推荐 description

把已有文章翻译成站点支持的其他语言、补齐多语言文件组时触发。

```yaml
name: i18n-translate-skill
description: >
  为 astro-theme-retypeset 翻译文章到其他支持语言（11 种），生成符合命名约定
  <标题>-<lang>.md 的译文文件，保留指令/代码块/abbrlink。当用户说"翻译这篇
  文章"、"补个英文版"、"同步到 zh-tw"、"加日语版"时使用。
```

## 输入输出契约

### 输入

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| source | string | 是 | 源文件路径（src/content/posts/ 下） |
| targets | string[] | 是 | 目标语言码列表（合法值：`src/i18n/config.ts:2-14` 的 11 键） |
| style | `faithful \| fluent` | 否 | 直译 vs 意译倾向，默认 fluent |
| glossary | Record<string,string> | 否 | 术语表（如人名、书名） |

### 数据模型（TypeScript）

```ts
interface TranslateResult {
  created: { file: string, lang: string }[]
  skipped: { lang: string, reason: 'exists' | 'invalid' }[]
  slug: string               // 与源一致的 abbrlink/文件 slug
}
```

### 硬性不变式（决定构建聚合是否正确）

| 不变式 | 依据 |
| --- | --- |
| 译文文件名 = `<源标题>-<lang>.md` | 命名约定实例：`src/content/posts/examples/` 4 组 × 6 语言 |
| 译文 `abbrlink` 与源文件完全一致 | 同 slug 才能聚合语言集合（`src/pages/[...lang]/posts/[slug].astro:28-54`） |
| 译文 frontmatter `lang` = 目标码 | schema 枚举（`src/content.config.ts:23`） |
| 指令（`:::note`、`::github{}` 等）、代码块、行内代码、LaTeX、链接 URL 不翻译 | 管道依赖这些语法（`astro.config.ts:63-79`） |
| `published` 保留源值，`updated` 可设为翻译日期 | 排序与展示语义 |

### 错误码表

| 错误 | 处理 |
| --- | --- |
| `E_EXISTS` 目标语言版本已存在 | 跳过并报告，不覆盖 |
| `E_INVALID_LANG` 非法语言码 | 拒绝该目标，继续其余 |
| `E_SOURCE_MISSING` 源文件不存在 | 终止 |
| `E_SLUG_CONFLICT` 译文 slug 与源不一致 | 自检失败时终止写入并报告 |

## 依赖清单

- 内部：`src/content.config.ts`（schema）、`src/i18n/config.ts`（语言全集）、`src/utils/content.ts:42-70`（`checkPostSlugDuplication` 可作自检）
- 外部服务：无（翻译由模型自身完成）
- 工具权限：Read、Write（仅 `src/content/posts/`）、Glob、Bash（可选：`pnpm astro check` 复核）

## Skill 工作流设计

```text
Workflow Steps:
1. Read 源文件 → 解析 frontmatter 与正文结构（指令/代码块清单）
2. 校验 targets 语言码 → 过滤出尚不存在的语言版本（Glob 检查，已存在→E_EXISTS 跳过）
3. 逐语言翻译：
   a. 正文段落翻译（style/glossary 生效），指令名/属性/代码/公式/URL 原样保留
   b. frontmatter 复制源文件，改写：lang=<目标码>，title/description 译为目标语言，
      abbrlink 原样，tags 按目标语言惯例转写（保持与源文章同组语义）
4. 自检：逐文件确认 abbrlink 与文件 slug 一致、lang 字段正确（E_SLUG_CONFLICT 则回滚该文件）
5. 可选：Bash 跑 pnpm astro check 验证 schema
6. 报告：created/skipped 清单 + 提示"同 slug 语言集合在下次构建时自动聚合"

Constraints:
- 不修改源文件与其他语言既有译文（硬约束）
- 译文不得引入源文件没有的指令或图片引用
- 目标语言已存在时绝不静默覆盖
- 若源为 universal（lang: ''）文章，提示用户改译通常无意义（universal 全语言可见），
  需用户确认后把源改造为带 lang 的具体语言文件
```

## 使用示例

✅ Do This：

> 用户："把《故乡》翻译成英文版。"
> Skill：读 `故乡-zh.md` → 写 `故乡-en.md`，frontmatter：`lang: en`、`abbrlink` 与源一致、`title: Hometown`；正文中 `:::tip[提示]` 结构保留，提示文字译为英文；报告"下次构建后 /en/posts/<slug>/ 可见，语言切换按钮将自动包含 en（slug 聚合逻辑 `[slug].astro:28-54`）"。

❌ Not This：

> 不要把译文的 `abbrlink` 改成英文意译新 slug——会脱离语言聚合组（不变式表第 2 条）。
> 不要翻译 `::github{repo="radishzzz/astro-theme-retypeset"}` 的 repo 属性值。
> 不要为 `lang: ''` 的 `Universal Post.md` 生成"英文版"——universal 已全语言可见，应先与用户确认源文件的 lang 改造。

## 参考材料

- `src/pages/[...lang]/posts/[slug].astro:16-69`（slug→语言聚合机制，翻译文件的最终消费者）
- `src/i18n/config.ts:1-14`（语言全集）、`src/i18n/path.ts:27-33`（getPostPath 的 URL 规则）
- `src/content.config.ts:6-29`（schema）、`src/utils/content.ts:42-70`（查重自检可复用）
- 现成多语言组实例：`src/content/posts/examples/容忍与自由-{en,es,ja,ru,zh,zh-tw}.md`
