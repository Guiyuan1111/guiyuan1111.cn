# 项目笔记索引

guiyuan1111.cn（基于 astro-theme-retypeset 的静态博客）的全部项目笔记入口。

> **当前版本：v1.0.20**（2026-09-30）。版本详情见 [release/](./release/)；
> **多语言与评论系统已永久停用且代码已删除**（恢复需从 git 历史取回，见
> [disabled-features.md](./disabled-features.md)），界面音效暂时禁用；
> `src/config.ts` 已是全站唯一配置源，站点化已收尾。

---

## 按场景速查

| 我想… | 看这里 |
| --- | --- |
| 写文章 / 发文章（命名、标签、诗歌、排版） | [writing-guide.md](./writing-guide.md) |
| 知道哪些功能被禁用了、怎么恢复 | [disabled-features.md](./disabled-features.md) |
| 改站点标题 / 作者 / 域名 / 统计等个人信息 | [site-identity.md](./site-identity.md) |
| 改了标题或 UI 文案，怕字体不对 | [font-subset.md](./font-subset.md) |
| 跑性能基准 / 字体门禁 | [../benchmark/README.md](../benchmark/README.md) |
| 按版本查改动 | [release/](./release/) |
| 做性能优化、看历史实测数据 | [report/perf/](./report/perf/) |
| 了解项目架构与运行原理 | [codebase-analysis/](./codebase-analysis/)（⚠️ 已标注过时，先读其总览横幅） |
| 找被归档的多语言文件 | [../备份/i18n-backup/README.md](../备份/i18n-backup/README.md) |
| 找被归档的评论系统 | [../备份/comment-backup/README.md](../备份/comment-backup/README.md) |

---

## 日常必读

| 文件 | 内容 |
| --- | --- |
| [writing-guide.md](./writing-guide.md) | **写作与发文规范**。文件命名与 URL 规则（含"为什么不用文件夹/abbrlink"）、frontmatter 字段约定、诗歌硬换行顶格写法、首行缩进归属 CSS、图片与发文流程 |
| [disabled-features.md](./disabled-features.md) | **功能停用总账**。多语言（5 阶段：性能裁剪 → 内容归档 → 文件备份 → 路由去 i18n → **v1.0.9 配置唯一化删除 i18n 层**）、评论系统、界面音效的改动位置与恢复方法 |
| [site-identity.md](./site-identity.md) | **个人信息位置清单**。站点化已收尾：标题/描述单源生效，作者遗留（统计/验证码/页脚/图床）已清空或替换 |
| [font-subset.md](./font-subset.md) | **EarlySummer 显示字体子集重建方法**。改标题/副标题必看：版本对齐、子集命令、unicode-range 同步与自检 |

## 版本履历

[release/](./release/) 共 14 版，每版一份变更与实测记录：

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
| [1.0.14](./release/1.0.14.md) | 归档文件夹移入本地 `备份/`：排除项与文档链接同步 |
| [1.0.15](./release/1.0.15.md) | **字体性能专项 R1–R4**：分片重切分、页面级子集、UI 字体子集、分片 CSS 条件加载；每页引用资产 -52%，真实 webfont -59%；基准与真浏览器门禁套件入库 |
| [1.0.16](./release/1.0.16.md) | **字体预载收窄 R5**：UI 子集按渲染角色分策略、EarlySummer-Subset 剔除多语言遗留、修复 serif 页面字体再生回归；预载 59.2→27.2KB，每页引用资产中位数再 -37% |
| [1.0.17](./release/1.0.17.md) | **部署体积清理 R6**：sans 清理页面字体、og PNG 调色板重编码、katex 遗留裁剪、源字体移出 public；dist 20.31→10.64MB（-47.6%），访客侧零回归；新增 deploy-weight 基准 |
| [1.0.18](./release/1.0.18.md) | **剩余固定串字集收窄 R7**：Snell-Bold 12.6→2.2KB、STIX-Italic 18.8→5.0KB；webfont 46.1→21.8KB/页（三轮累计 -72.4%），每页引用资产中位数累计 -49.7% |
| [1.0.19](./release/1.0.19.md) | **基准回归门禁 R8 + 字集 used 采集修复**：`--assert` 绝对红线+基线漂移门禁入 CI；修复 class_chars str/int 类型错误（v1.0.16 起标题/页脚/"min" 字形静默回退）；端到端字集漂移演练验证 |
| [1.0.20](./release/1.0.20.md) | **不可达资产清扫 R9**：文本级引用闭包分析（reachability.mjs），构建尾自动删除无引用产物（KaTeX CSS+字体 276KB），自愈式保留未来特性路径；探针+CI 红线固化；部署 10.62→10.35MB，访客侧零变化 |

## 分析报告

### 性能（[report/perf/](./report/perf/)）

| 文件 | 状态 |
| --- | --- |
| [2026-09-30-unreachable-sweep-r9.md](./report/perf/2026-09-30-unreachable-sweep-r9.md) | **v1.0.20 不可达清扫 R9 实测**：引用闭包清扫 KaTeX 死重 -0.27MB（自愈式），部署累计 -49.1%；含 HTML 压缩无潜力与 mermaid 图谱可达两项排查否决记录 |
| [2026-09-30-benchmark-assert-r8.md](./report/perf/2026-09-30-benchmark-assert-r8.md) | **v1.0.19 断言门禁 R8 实测**：`--assert` 绝对红线+基线漂移设计与三类缺陷负向演练；揪出并修复 class_chars 字集静默丢弃（三处文本回退三个版本）；端到端字集漂移演练 |
| [2026-09-30-webfont-charset-r7.md](./report/perf/2026-09-30-webfont-charset-r7.md) | **v1.0.18 字集收窄 R7 实测**：Snell-Bold/STIX-Italic 收窄，webfont -52.7%；含 R5–R7 三轮累计（每页资产 -49.7%、webfont -72.4%、部署 -47.6%） |
| [2026-09-30-deploy-weight-r6.md](./report/perf/2026-09-30-deploy-weight-r6.md) | **v1.0.17 部署体积 R6 实测**：dist 20.31→10.64MB（-47.6%），死重探针逐项归零（mermaid/sounds 有意保留），访客侧零回归；含放弃项记录 |
| [2026-09-30-font-preload-slimming-r5.md](./report/perf/2026-09-30-font-preload-slimming-r5.md) | **v1.0.16 预载收窄 R5 实测**：Snell-Black 17.9→3.1KB、EarlySummer-Subset 24.8→11.2KB，预载 -54%、每页资产中位数 -37.3%、webfont -41.7%；含 gen-page-fonts R4 回归修复记录 |
| [2026-09-29-font-performance-r1-r4.md](./report/perf/2026-09-29-font-performance-r1-r4.md) | **v1.0.15 字体专项四轮实测对比**（R1 分片重切 → R2 页面级子集 → R3 UI 子集 → R4 条件加载）：每页引用资产 -52.2%、真实 webfont -58.6%，双模式口径与门禁判据，快照 JSON 见 `benchmark/results/` |
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
