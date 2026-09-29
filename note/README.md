# 项目笔记索引

guiyuan1111.cn（基于 astro-theme-retypeset 的静态博客）的全部项目笔记入口。

> **当前版本：v1.0.13**（2026-09-29）。版本详情见 [release/](./release/)；
> **多语言与评论系统已永久停用且代码已删除**（恢复需从 git 历史取回，见
> [disabled-features.md](./disabled-features.md)），界面音效暂时禁用；
> `src/config.ts` 已是全站唯一配置源，站点化已收尾。

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
| 找被归档的多语言文件 | [../备份/i18n-backup/README.md](../备份/i18n-backup/README.md) |
| 找被归档的评论系统 | [../备份/comment-backup/README.md](../备份/comment-backup/README.md) |

---

## 日常必读

| 文件 | 内容 |
| --- | --- |
| [disabled-features.md](./disabled-features.md) | **功能停用总账**。多语言（5 阶段：性能裁剪 → 内容归档 → 文件备份 → 路由去 i18n → **v1.0.9 配置唯一化删除 i18n 层**）、评论系统、界面音效的改动位置与恢复方法 |
| [site-identity.md](./site-identity.md) | **个人信息位置清单**。站点化已收尾：标题/描述单源生效，作者遗留（统计/验证码/页脚/图床）已清空或替换 |
| [font-subset.md](./font-subset.md) | **EarlySummer 显示字体子集重建方法**。改标题/副标题必看：版本对齐、子集命令、unicode-range 同步与自检 |

## 版本履历

[release/](./release/) 共 12 版，每版一份变更与实测记录：

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
| [1.0.9](./release/1.0.9.md) | **配置唯一化重构**：删 `src/i18n/` 与死字段、站点化收尾、清演示文章、wheel passive、移除 partytown |
| [1.0.10](./release/1.0.10.md) | 补上站长邮箱（页脚 + 关于页） |
| [1.0.11](./release/1.0.11.md) | 发布首批内容：「文哲」文集 21 篇（docx 转换 + 双标签归档） |
| [1.0.12](./release/1.0.12.md) | 文章正文段落首行缩进 2 字符 |
| [1.0.13](./release/1.0.13.md) | 诗歌顶格：含硬换行（`\`）的段落豁免缩进 |

## 分析报告

### 性能（[report/perf/](./report/perf/)）

| 文件 | 状态 |
| --- | --- |
| [2026-09-27-performance-analysis.md](./report/perf/2026-09-27-performance-analysis.md) | 静态分析 + 业界方案对比。P0/P1 全部已落地；**P2 已随 v1.0.9 清尾**（评论类作废、wheel passive 与 partytown 已做、字体预载核实无剩余项） |
| [2026-09-27-i18n-sound-disable-verification.md](./report/perf/2026-09-27-i18n-sound-disable-verification.md) | v1.0.1 实测基线：页面 103 → 18（-83%）、构建约 -50%。数据仍被后续版本引用 |

### 代码库分析（[codebase-analysis/](./codebase-analysis/)）

> ⚠️ **这是 2026-09-27 00:13 的分析快照（v1.0.0），已部分过时**。
> 每份报告顶部都加了过时横幅与变更对照表；**架构分层、remark/rehype 管道、LQIP 协议、
> memoize 缓存等与版本无关的设计分析仍然准确**，路由/构建链/评论/i18n 相关内容需以本索引、
> [disabled-features.md](./disabled-features.md) 与 [release/1.0.9.md](./release/1.0.9.md) 为准
> （v1.0.9 起 `src/i18n/` 已删除、i18n 块已移除）。

| 文件 | 现状 |
| --- | --- |
| [index.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/index.md) | 总览 + 变更对照表；核心发现与关键建议已按现状标注 |
| [01-architecture.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/01-architecture.md) | 分层架构准确；第 5 节路由表、第 6 节依赖图已过时 |
| [02-operation-principles.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/02-operation-principles.md) | LQIP / 管道 / 错误处理准确；构建链与 i18n 机制已就地更正 |
| [03-workflow.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/03-workflow.md) | 过时最严重的一份，命令表、构建失败语义、版本控制与 CI 结论均已更正 |
| [04-ai-substitution.md](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/04-ai-substitution.md) | M4（i18n 翻译）与 M8 评论部分已作废；M1/M2/M3/M5 仍可参考 |
| [blueprints/](./codebase-analysis/astro-theme-retypeset-2026-09-27_001301/blueprints/index.md) | 01/02/03/05 仍可参考；**04 i18n 翻译蓝图已作废** |

---

## 归档目录（本地 `备份/` 文件夹，v1.0.14 起移入；已 gitignore 不入库，git 历史仍可取回）

| 目录 | 内容 | 归档文件数 |
| --- | --- | --- |
| [../备份/i18n-backup/](../备份/i18n-backup/) | 外语文章与关于页、主题 README 翻译、语言切换图标 | 52（目录共 53，含其 README） |
| [../备份/comment-backup/](../备份/comment-backup/) | 评论组件 4 个、`comment.css`、giscus 主题资源 | 7（目录共 8，含其 README） |

两处均含 README：清单、原位置、恢复步骤。
注意：v1.0.9 起恢复它们还需先从 git 历史（tag `v1.0.8`）取回 `src/i18n/`，见 [disabled-features.md](./disabled-features.md)。
