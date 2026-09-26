# Blueprint 02：format-posts 格式化器 Skill

## 基本信息

| 项 | 值 |
| --- | --- |
| 名称 | format-posts-skill（CJK 排版格式化器） |
| 替代对象 | `pnpm format-posts`（`scripts/format-posts.ts`，105 行） |
| 评级 | 🤖 完全 AI 化（29/30，见 [../04-ai-substitution.md](../04-ai-substitution.md) M2） |
| 优先级 | P0 |
| 复杂度 | 低 |

## 触发场景与推荐 description

发布前整理排版、修正中英文混排空格、批量格式化内容目录时触发。

```yaml
name: format-posts-skill
description: >
  用 autocorrect 规则整理 astro-theme-retypeset 内容的中英文排版（空格、标点）。
  当用户说"格式化文章"、"整理排版"、"修正中英文空格"、"发布前检查排版"、
  "format-posts"时使用。支持全站、指定目录或单文件，支持 dry-run 预览。
```

## 输入输出契约

### 输入

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| target | string | 否 | 目录/文件/glob，默认 `src/content/**/*.{md,mdx}`（对齐 `format-posts.ts:39`） |
| dryRun | boolean | 否 | 默认 false；true 时只报告将修改的文件与 diff 摘要 |

### 数据模型（TypeScript）

```ts
interface FormatResult {
  scanned: number
  changed: string[]      // 已写回的文件路径
  wouldChange: string[]  // dry-run 时的候选
  errors: { file: string, message: string }[]
}
```

### 处理契约（承自 `format-posts.ts:19-63`）

- frontmatter 与正文分离：正则 `/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/m`（`:20`）；
- **frontmatter 字节级原样保留**，仅 `autocorrect.format(正文)`（`:49`）；
- 幂等：内容无变化即跳过不写（`:55-57`）。

### 错误码表

| 错误 | 处理 |
| --- | --- |
| `E_FILE_READ` 读文件失败 | 计入 errors，继续处理其余文件（对齐 `:93-96`） |
| `E_NO_TARGET` 目标不匹配任何文件 | 报告空结果并提示路径 |
| `E_FATAL` 意外异常 | 停止并报告已处理/未处理清单 |

## 依赖清单

- 外部：`autocorrect-node`（已在 devDependencies，`package.json:57`）、`fast-glob`（`package.json:60`）
- 内部：无 src 依赖（脚本独立）
- 工具权限：Read、Glob、Bash（运行 `pnpm format-posts` 或 tsx 内联脚本）、Write（仅 `src/content/`）

## Skill 工作流设计

```text
Workflow Steps:
1. 解析 target → 若为目录/单文件，Glob 确认存在（E_NO_TARGET）
2. dryRun? → 逐文件读取、splitContent、format、比对、收集 wouldChange 报告后结束
3. 否则逐文件写回，收集 changed
4. 单文件异常 → 记入 errors 继续（不中断）
5. 汇总报告：scanned/changed/errors，建议（errors 非空时给出行级定位）

Constraints:
- frontmatter 一字节不动（硬约束）
- 只处理 src/content/ 下的 .md/.mdx
- 保持幂等：对已格式化内容零写入
- 不改动主题源码与配置
```

## 使用示例

✅ Do This：

> 用户："发布前把 guides 目录的文章排版过一遍，先给我看看会改什么。"
> Skill：`dryRun=true` 扫描 `src/content/posts/guides/*.md`，输出"将修改 5 个文件，示例：`Markdown Style Guide-zh.md` 第 12 行 `中文English` → `中文 English`"，等确认后再写回。

❌ Not This：

> 不要把 frontmatter 里的 `title: 中文标题` 改写为 `title: 中文 标题`（frontmatter 契约）。
> 不要顺手"优化"正文措辞——本 Skill 只做排版规范化，改写内容属于创作辅助（04 报告 M7）。
> 不要全量跑 format-posts 后不报告就提交——dry-run 先行是默认习惯。

## 参考材料

- `scripts/format-posts.ts`（全文 105 行，含 splitContent/formatSingleFile/reportResults 完整实现）
- `package.json:16`（format-posts 命令定义）
- `eslint.config.mjs:6`（内容目录被 lint 忽略，格式化责任完全在此脚本）
