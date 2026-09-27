# 项目笔记索引

guiyuan1111.cn（基于 astro-theme-retypeset 的静态博客）的全部项目笔记入口。

> **当前版本：v1.0.8**（2026-09-27）。版本详情见 [release/](./release/)；
> **多语言与评论系统已永久停用**，界面音效暂时禁用，总清单见 [disabled-features.md](./disabled-features.md)。

---

## 按场景速查

| 我想… | 看这里 |
| --- | --- |
| 知道哪些功能被禁用了、怎么恢复 | [disabled-features.md](./disabled-features.md) |
| 改站点标题 / 作者 / 域名 / 统计等个人信息 | [site-identity.md](./site-identity.md) |
| 改了标题或 UI 文案，怕字体不对 | [font-subset.md](./font-subset.md) |
| 按版本查改动 | [release/](./release/) |
| 做性能优化、看历史实测数据 | [report/perf/](./report/perf/) |
| 了解项目架构与运行原理 | [codebase-analysis/](./codebase-analysis/)（⚠️ 已标注过时，先读其总览横幅） |
| 恢复被归档的多语言文件 | [../i18n-backup/README.md](../i18n-backup/README.md) |
| 恢复被归档的评论系统 | [../comment-backup/README.md](../comment-backup/README.md) |

---

## 日常必读

| 文件 | 内容 |
| --- | --- |
| [disabled-features.md](./disabled-features.md) | **功能停用总账**。多语言（4 阶段：性能裁剪 → 内容归档 → 文件备份 → 路由去 i18n）、评论系统、界面音效的改动位置、保留项原因与恢复方法 |
| [site-identity.md](./site-identity.md) | **个人信息位置清单**。`config.ts` 与 `ui.ts` 中每个字段的行号、影响范围、当前是否已站点化 |
| [font-subset.md](./font-subset.md) | **EarlySummer 显示字体子集重建方法**。改标题/副标题必看：版本对齐、子集命令、unicode-range 同步与自检 |

## 版本履历

[release/](./release/) 共 8 版，每版一份变更与实测记录：

| 版本 | 主题 |
| --- | --- |
| [1.0.1](./release/1.0.1.md) | 禁用多语言与界面音效 |
| [1.0.2](./release/1.0.2.md) | 字体移出 public、拆 astro check、删 astro-compress |
| [1.0.3](./release/1.0.3.md) | KaTeX 按需、OG 静态化、上线 CI |
| [1.0.4](./release/1.0.4.md) | 图片管线收敛、CSS 按页分割、CI 缓存、外语文章归档 |
| [1.0.5](./release/1.0.5.md) | 首页标题副标题站点化 + 字体子集重建 |
| [1.0.6](./release/1.0.6.md) | 多语言永久停用：文件备份 `i18n-backup/`、清理页面语言概念 |
| [1.0.7](./release/1.0.7.md) | 路由去 i18n：`[...lang]/` 改名为普通路径 |
| [1.0.8](./release/1.0.8.md) | 评论系统永久停用：归档 `comment-backup/`、移除依赖 |

## 分析报告

### 性能（[report/perf/](./report/perf/)）

| 文件 | 状态 |
| --- | --- |
| [2026-09-27-performance-analysis.md](./report/perf/2026-09-27-performance-analysis.md) | 静态分析 + 业界方案对比。P0/P1 **全部已落地**；P2 中评论类条目已作废，wheel passive 与字体预载仍待实施 |
| [2026-09-27-i18n-sound-disable-verification.md](./report/perf/2026-09-27-i18n-sound-disable-verification.md) | v1.0.1 实测基线：页面 103 → 18（-83%）、构建约 -50%。数据仍被后续版本引用 |

### 代码库分析（[codebase-analysis/](./codebase-analysis/)）

> ⚠️ **这是 2026-09-27 00:13 的分析快照（v1.0.0），已部分过时**。
> 每份报告顶部都加了过时横幅与变更对照表；**架构分层、remark/rehype 管道、LQIP 协议、
> memoize 缓存等与版本无关的设计分析仍然准确**，路由/构建链/评论/i18n 相关内容需以本索引与
> [disabled-features.md](./disabled-features.md) 为准。

| 文件 | 现状 |
| --- | --- |
| [index.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/index.md) | 总览 + 变更对照表；核心发现与关键建议已按现状标注 |
| [01-architecture.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/01-architecture.md) | 分层架构准确；第 5 节路由表、第 6 节依赖图已过时 |
| [02-operation-principles.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/02-operation-principles.md) | LQIP / 管道 / 错误处理准确；构建链与 i18n 机制已就地更正 |
| [03-workflow.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/03-workflow.md) | 过时最严重的一份，命令表、构建失败语义、版本控制与 CI 结论均已更正 |
| [04-ai-substitution.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/04-ai-substitution.md) | M4（i18n 翻译）与 M8 评论部分已作废；M1/M2/M3/M5 仍可参考 |
| [blueprints/](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/blueprints/index.md) | 01/02/03/05 仍可参考；**04 i18n 翻译蓝图已作废** |

---

## 归档目录（仓库根，不参与构建）

| 目录 | 内容 | 数量 |
| --- | --- | --- |
| [../i18n-backup/](../i18n-backup/) | 外语文章与关于页、主题 README 翻译、语言切换图标 | 52 |
| [../comment-backup/](../comment-backup/) | 评论组件 4 个、`comment.css`、giscus 主题资源 | 7 |

两处均含 README：清单、原位置、恢复步骤。
