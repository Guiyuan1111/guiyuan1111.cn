# 已暂时禁用的功能

本文件记录所有通过**注释**方式禁用的功能，原代码均已保留，可随时恢复。

---

## 1. 多语言切换（2026-09-27）

为优化性能而禁用。

## 改动位置

| 文件 | 改动 |
| --- | --- |
| `src/config.ts` | `moreLocales` 原值 `['en', 'es', 'ja', 'ru', 'zh-tw']` 已注释，当前为 `[]`（核心开关，全站页面/RSS/hreflang 均由它驱动） |
| `src/components/Button.astro` | 语言切换按钮的渲染块已用 HTML 注释包裹 |
| `src/content.config.ts` | 内容 schema 的 `lang` 校验从 `allLocales`（已启用语言）放宽为 `langMap` 全部已知语言，避免磁盘上仍存在的多语言文章报错；原行已注释 |

## 未改动的部分（刻意保留）

- `astro.config.ts` 的 `i18n` 声明：`Layout.astro` 的 `<html lang>` 与各页面的 `Astro.currentLocale` 依赖它，注释掉会导致 html 丢失 lang 属性；它不参与页面生成，无性能开销。
- `src/i18n/` 全部工具代码、`src/i18n/ui.ts` 的翻译文本：原样保留。

## 恢复方法

1. `src/config.ts`：取消注释 `moreLocales: ['en', 'es', 'ja', 'ru', 'zh-tw']`，删除 `moreLocales: []` 行。
2. `src/components/Button.astro`：去掉语言切换按钮外的 HTML 注释。
3. `src/content.config.ts`：按文件内注释提示改回 `import` 行与两处 `lang` 字段。

## 效果（实测）

- 构建页面数从 6 语言 × 每页 降至 **18 页**（仅中文，即原 1/6）。
- 产物中不再有 `/en/`、`/ja/` 等目录，sitemap 17 个 URL 全为中文、0 个 hreflang 备选链接。
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
