# astro-theme-retypeset 深度分析总览

> ⚠️ **本套报告是 2026-09-27 00:13 的分析快照**，当时项目为 v1.0.0、无版本控制、无 CI。
> 此后已迭代至 **v1.0.15**，下文部分细节已过时。**分析本目录下任意报告前，请先看这张表。**
>
> | 已发生的变化 | 导致本套报告哪些内容失效 |
> | --- | --- |
> | 已有 `.git` 仓库与 GitHub Actions 双 job 门禁（v1.0.3） | 「无版本控制、无 CI/CD」这一核心结论已不成立 |
> | 构建链改为 `astro build && pnpm apply-lqip`；`astro check` 拆为独立 `pnpm check`；`astro-compress` 已移除（v1.0.2） | 「三段式构建」、Compress 集成、构建阶段序列 |
> | **多语言永久停用**：`src/pages/[...lang]/` 7 个路由改名为普通路径，`slugToLangsMap`/`supportedLangs`/hreflang 已移除（v1.0.6–v1.0.7） | 全部路由路径与 `getStaticPaths` 说明、i18n 调用链、语言切换机制 |
> | **评论系统永久停用**：`src/components/Comment/` 与 `comment.css` 归档、`config.ts` comment 块注释（v1.0.8） | 「评论三选一」、评论 locale map、配置驱动开关条目 |
> | **配置唯一化重构（v1.0.9）**：`src/i18n/` 删除、astro.config i18n 块删除、`i18nTitle`/`moreLocales`/`apiflashKey` 死字段删除、lang 传递链移除；上游演示文章与 partytown 集成删除 | 所有涉及 `src/i18n/`、`[...lang]`、语言切换、统计开关的描述；页面数基线（现为 4 页） |
> | 45 篇外语文章由 `src/content/_archive/` 迁至 `i18n-backup/`（v1.0.6） | 目录树中的内容归档路径 |
> | 站点身份已部分站点化（`site.url`、`site.author`、首页标题） | 示例中引用的作者域名与标题 |
> | **字体链重构（v1.0.15）**：EarlySummer 47 分片重切 + serif 页面级子集 + UI 字体 `*.subset.woff2` 子集 + 分片声明拆入 `src/styles/earlysummer-shards.css`（仅 serif 构建产出）；`font.css` 仅剩 UI faces 与 Subset；新增 `benchmark/` 基准与门禁、`scripts/` 四个字体脚本，构建尾部多一步 `apply-page-fonts.mjs`（serif 模式） | 本套报告中涉及 `font.css` 结构、字体预载清单、scripts/ 目录清单、构建步骤的描述 |
>
> **与版本无关、仍然准确**：六层架构划分、remark/rehype 管道顺序与各插件职责、LQIP 位打包协议、
> memoize 缓存策略、错误处理三层分治、常量表与函数级调用链中的算法部分。
>
> **当前项目状态**请以 [note/README.md](../../README.md) 的索引与 [note/release/](../../release/) 为准；
> 功能停用与恢复见 [note/disabled-features.md](../../disabled-features.md)。

| 项 | 值 |
| --- | --- |
| 分析时间 | 2026-09-27 00:13 |
| 分析范围 | `D:\Guiyuan1111\guiyuan1111.cn` 全部源码（src/、scripts/、patches/、配置文件），排除 node_modules、dist、.astro |
| 分析模式 | 七阶段完整分析：项目发现 → 架构 → 运行原理 → 工作流 → AI 替代 → Skill Blueprint → 校验 |
| 项目规模 | 约 117 个代码/内容文件；26 个 .astro、22 个 .ts、7 个 .mjs、55 个 .md、9 个 .css；TS/JS/astro 源码约 5100 行 |
| 技术栈 | Astro 6 + TypeScript strict + UnoCSS(attributify + preset-theme) + MDX + pnpm 10 + sharp + astro-og-canvas + feed |
| 项目性质 | astro-theme-retypeset（开源 Astro 博客主题）实例站点；分析时为 v1.0.0 且无 `.git`、无 `.github/workflows` —— **〔现状 v1.0.15〕已有 git 仓库与 GitHub Actions 双 job 门禁，仍无 Dockerfile** |

## 报告目录

| 报告 | 内容 | 链接 |
| --- | --- | --- |
| 01-architecture.md | 六层架构、目录树、astro.config 解析、路由与 getStaticPaths、模块依赖图、5 条函数级调用链、跨模块契约 | [查看](./01-architecture.md) |
| 02-operation-principles.md | 构建序列、Markdown→HTML 21 步变换流水线、LQIP 位打包协议、OG 生成、状态持久化、错误处理分层、i18n 机制、生命周期介入点 | [查看](./02-operation-principles.md) |
| 03-workflow.md | dev/build 构建语义〔现为两段式〕、pre-commit、内容创作/格式化工作流、主题更新、补丁管理、决策树与常量表、异常恢复路径 | [查看](./03-workflow.md) |
| 04-ai-substitution.md | 12 模块 6 维度评分、评估卡片、函数级下钻与接口契约、ROI 矩阵、三阶段改造路线图 | [查看](./04-ai-substitution.md) |
| blueprints/ | 5 个 Skill Blueprint（文章创建/排版格式化/LQIP 编排/i18n 翻译/OG 调参）与实施索引 | [查看](./blueprints/index.md) |

## 核心发现

1. **配置单源驱动的分层架构**：`src/config.ts` 是全项目唯一事实源，被 astro.config、uno.config、content.config、Head、utils、new-post 脚本共同引用；KaTeX、Partytown、统计等为配置驱动的可选开关（`src/layouts/Head.astro`）。
   **〔现状〕评论三选一已于 v1.0.8 永久停用**，`comment` 配置块已注释；`config.ts` 因中文注释与停用说明已从 206 行增至约 230 行。
2. **最精巧的设计是 LQIP 位打包协议**：构建后脚本把 3 个采样像素按 11/11/10 bit 打包成 8 位 hex 注入 HTML 内联样式（`scripts/apply-lqip.ts:35-83`），CSS 侧用 `color()` 函数按位解包绘制三色渐变（`src/styles/lqip.css:7-72`），两侧互为镜像且以 `src/assets/lqip-map.json` 做增量缓存，整套机制幂等可重跑。
   **〔现状〕完全未变，仍是本项目最值得保留的设计。**
3. ~~**i18n 以"默认语言无前缀 + universal 内容"为核心**~~ **〔已作废〕多语言于 v1.0.6–v1.0.7 永久停用**：
   `[...lang]` rest 路由已改名为普通路径，`getLangRouteParam` 已注释，`slugToLangsMap` 已删除，
   45 篇外语文章归档至 `i18n-backup/`。slug 查重 fail-fast 这一条**仍然有效**（`src/pages/posts/[slug].astro`）。
4. **错误处理三层分治**：构建期严格（**slug 重复 throw**；原「astro check 短路」已改为独立 `pnpm check` + CI 门禁，v1.0.3）、内容级宽容（插件/脚本单点失败 warn 跳过）、浏览器端自愈（sessionStorage 坏数据主动清除重建，`src/components/Widgets/GithubCard.astro`）。
5. ~~**工程流程存在两处结构性缺口**~~ **〔已全部修复〕**：`.git` 仓库与 GitHub Actions 双 job 门禁均已具备（v1.0.3），另有 `simple-git-hooks` pre-commit 与每版 tag + GitHub Release 流程。

## 关键建议〔已按现状标注〕

1. ✅ **已达成**：版本控制已恢复，`src/assets/lqip-map.json` 已入库（构建间增量缓存的持久化载体，`scripts/apply-lqip.ts`）。
2. ✅ **已达成**：GitHub Actions 双 job（`lint + typecheck` / `build`）+ astro-og-canvas 与内容层缓存（v1.0.3、v1.0.4）。
3. ❌ **作废**：多语言已永久停用，[blueprints/04-i18n-translate-skill.md](./blueprints/04-i18n-translate-skill.md) 不再适用。
4. ✅ **仍然成立**：new-post/format-posts/apply-lqip 三个运维脚本约束完备、幂等安全，是零风险的 AI 改造对象（04 报告 Phase 1，尚未实施）。
5. ✅ **已达成**：apiflash 回退与硬编码 key 已于 v1.0.3 移除，非文章页统一使用构建期生成的 `/og/home.png`；
   `config.ts` 的 `apiflashKey` 已成无人读取的废弃字段。
