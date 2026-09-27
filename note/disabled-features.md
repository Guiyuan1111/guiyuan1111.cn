# 已禁用的功能

本文件记录所有通过**注释**方式禁用的功能，原代码均已保留，可随时恢复。

> ⚠️ **多语言已升级为「永久停用」**（2026-09-27 决定）：站点不会再开启多语言。
> 界面音效仍是「暂时禁用」，见第 2 节。

---

## 1. 多语言（永久停用，2026-09-27）

### 三个阶段

| 阶段 | 时间 | 内容 |
| --- | --- | --- |
| ① 性能裁剪 | 2026-09-27（v1.0.1） | `moreLocales` 清空、语言切换按钮注释、schema 放宽 |
| ② 内容归档 | 2026-09-27（v1.0.4） | 45 篇外语文章 `git mv` 移出构建管线 |
| ③ 永久停用 | 2026-09-27（v1.0.6） | 文件集中备份到 `i18n-backup/`，清理页面里的语言概念 |
| ④ 路由去 i18n | 2026-09-27（v1.0.7） | `src/pages/[...lang]/` 7 个路由改名为普通路径，lang 参数与语言版 `getStaticPaths` 全部移除；`src/pages/` 下已无任何 i18n 引用 |

### 改动位置

| 文件 | 改动 |
| --- | --- |
| `src/config.ts` | `moreLocales` 原值 `['en', 'es', 'ja', 'ru', 'zh-tw']` 已注释，当前为 `[]`（核心开关，全站页面/RSS/hreflang 均由它驱动） |
| `src/components/Button.astro` | 语言切换按钮渲染块 + `Props.supportedLangs` + `Language` 类型导入均已注释 |
| `src/layouts/Layout.astro` | `supportedLangs` 声明、解构与向 `<Button>` 的传参均已注释 |
| `src/pages/[...lang]/posts/[slug].astro` | `slugToLangsMap` 同 slug 多语言聚合整块注释（约 27 行）、`supportedLangs` 的 props 与 Layout 传参注释、`Language` 类型导入注释 |
| `src/pages/[...lang]/tags/[tag].astro` | `getTagSupportedLangs` 调用与导入、`<Layout supportedLangs>` 传参注释 |
| `src/layouts/Head.astro` | hreflang 备选链接块注释；`allLocales`/`defaultLocale` 导入移除 |
| `src/content.config.ts` | 内容 schema 的 `lang` 校验从 `allLocales` 放宽为 `langMap` 全部已知语言，避免残留多语言文章报错；原行已注释 |
| `src/i18n/*.ts`（4 个文件） | 顶部各加「多语言已永久停用」横幅，说明为何不能删除 |
| **`src/pages/` 路由改名（v1.0.7）** | `[...lang]/` 目录改回普通路径：`index.astro`、`about.astro`、`posts/[slug].astro`、`tags/index.astro`、`tags/[tag].astro`、`rss.xml.ts`、`atom.xml.ts`。非动态路由的语言版 `getStaticPaths` 直接删除；`posts/[slug]` 与 `tags/[tag]` 去掉 `lang` 参数，`currentLang` 改取 `defaultLocale` |
| `src/i18n/lang.ts` 的两个函数（v1.0.7） | `getLangRouteParam`、`getLangFromLocale` 在路由去 i18n 后零调用方，已连同 `langMap` 导入一起注释 |

### 文件备份：`i18n-backup/`

已用 `git mv` 集中归档（保留历史），**不参与任何构建**，清单见 [i18n-backup/README.md](../i18n-backup/README.md)：

| 内容 | 数量 | 原位置 |
| --- | --- | --- |
| 外语文章与关于页 | 45 | `src/content/_archive/` |
| 主题 README 翻译 | 6 | `assets/docs/` |
| 语言切换按钮图标 | 1 | `src/assets/icons/language-switcher.svg` |

保留原地（是站点正文，**不可移动**）：9 篇 posts（8 篇 `lang: zh` + 1 篇 `lang` 留空且 `draft: true` 的 Universal Post）与 1 篇 about-zh。

### 未改动的部分（刻意保留，删了会挂）

| 保留项 | 原因 |
| --- | --- |
| `astro.config.ts` 的 `i18n` 块 | `Layout.astro` 的 `<html lang>` 依赖它；注释掉会丢失 lang 属性，导致 `uno.config.ts` 的 `cjk:` 变体（`:lang(zh)` 等）失效、Header/Navbar 中文排版样式掉。它不参与页面生成，无性能开销 |
| `src/i18n/` 全部工具代码 | 仍有 **16 处静态值引用**（astro.config、content.config、Footer、utils/page、utils/description、PostList/TagList、3 个评论组件、Navbar/Header/TOC/Head、feed、types）。`src/pages/` 已完全不引用 i18n，但组件与工具层仍依赖，删除必然构建失败 |
| `src/i18n/ui.ts` 的 11 语言文案 | 被 Navbar/Header/TOC/Head/feed 5 处静态引用；只有 zh 条目被读取，其余为死数据但无害 |
| `src/pages/` 中的 `currentLang` | 各路由取 `defaultLocale` 后传给内容查询与 `PostList`/`TagList` 的 `lang` prop，是正文筛选条件的一部分，与 i18n 机制本身无关 |

### 恢复方法（仅作记录，不打算执行）

1. `i18n-backup/`：按 [i18n-backup/README.md](../i18n-backup/README.md) 把三个子目录 `git mv` 回原位。
2. `src/config.ts`：取消注释 `moreLocales: ['en', 'es', 'ja', 'ru', 'zh-tw']`，删除紧接的空数组行。
3. `src/components/Button.astro`：取消语言切换按钮块、`Props`、`Language` 与 path 导入的注释。
4. `src/layouts/Layout.astro`、`posts/[slug].astro`、`tags/[tag].astro`：按各文件内 `[多语言已永久停用]` 注释提示，恢复 `supportedLangs` 与 `slugToLangsMap` 传递链。
5. `src/layouts/Head.astro`：恢复 hreflang 块及第 4 行的 `allLocales`/`defaultLocale` 导入。
6. **恢复 `[...lang]/` 路由**（v1.0.7 改名的部分，难度最高）：把 7 个路由文件移回 `src/pages/[...lang]/`，
   重建各文件的 `getStaticPaths`（按 `allLocales` 展开并带 `params.lang`）、`posts/[slug]` 的 `slugToLangsMap`
   与 `supportedLangs` 传递链，`rss.xml.ts`/`atom.xml.ts` 恢复 lang 参数，并恢复
   `src/i18n/lang.ts` 中已注释的 `getLangRouteParam`/`getLangFromLocale` 与 `langMap` 导入。
7. `src/content.config.ts`：按文件内注释改回 `import` 行与两处 `lang` 字段。
8. 重建 EarlySummer 显示字体子集（多语言 UI 文案字符要进子集），见 [font-subset.md](./font-subset.md)。

### 效果（实测）

- 构建页面数从 6 语言 × 每页 降至 **18 页**（仅中文，即原 1/6）。
- 构建时间 93.4s → 46.5s（约 -50%），见 [性能实测报告](./report/perf/2026-09-27-i18n-sound-disable-verification.md)。
- 产物中不再有 `/en/`、`/ja/` 等目录，sitemap 全为中文 URL、0 个 hreflang 备选链接。
- `<html lang="zh-CN">` 正常保留；中文文章（`lang: ''` 或 `'zh'`）不受影响，其他语言文章不再生成页面。

---

## 2. 界面音效（2026-09-27）

点击/打字机音效（`SoundEffect` 组件）会在桌面端空闲时预加载 `public/sounds/` 下的 10 个 WAV 文件，且触发范围窄（仅明暗切换按钮与评论输入框）、无可配置开关，故禁用。

### 改动位置

| 文件 | 改动 |
| --- | --- |
| `src/layouts/Layout.astro` | `SoundEffect` 的 import 与 `<SoundEffect />` 使用均已注释（组件本身未改动） |

### 说明

- `public/sounds/` 下的 10 个 WAV 原样保留；构建时仍会复制到 `dist/sounds/`（共约 9.4KB 静态文件），但页面上已无任何代码会去加载它们。
- `src/components/Widgets/SoundEffect.astro` 组件源码原样保留，未再被打包。

### 恢复方法

1. `src/layouts/Layout.astro`：取消 `import SoundEffect ...` 与 `<SoundEffect />` 两处注释。
