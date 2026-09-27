# 已禁用的功能

> ⚠️ **状态（v1.0.9 起）**：多语言（第 1 节）与评论系统（第 3 节）为**永久停用且代码已删除**——
> v1.0.9 配置唯一化重构后，相关源码不再以注释形式保留，恢复需从 **git 历史（tag `v1.0.8`）** 取回
> 对应文件。界面音效（第 2 节）仍为注释保留、暂时禁用。
> 两处内容归档（`i18n-backup/`、`comment-backup/`）不受影响，恢复步骤见各自 README。

---

## 1. 多语言（永久停用，代码已于 v1.0.9 删除）

### 五个阶段

| 阶段 | 时间 | 内容 |
| --- | --- | --- |
| ① 性能裁剪 | 2026-09-27（v1.0.1） | `moreLocales` 清空、语言切换按钮注释、schema 放宽 |
| ② 内容归档 | 2026-09-27（v1.0.4） | 45 篇外语文章 `git mv` 移出构建管线 |
| ③ 永久停用 | 2026-09-27（v1.0.6） | 文件集中备份到 `i18n-backup/`，清理页面里的语言概念 |
| ④ 路由去 i18n | 2026-09-27（v1.0.7） | `src/pages/[...lang]/` 7 个路由改名为普通路径，lang 参数与语言版 `getStaticPaths` 全部移除 |
| ⑤ **配置唯一化重构** | 2026-09-27（v1.0.9） | **`src/i18n/` 4 个文件删除**；`astro.config.ts` 的 i18n 块删除（`<html lang="zh-CN">` 硬编码进 `Layout.astro`）；`ui.ts` 文案改为组件内中文直值（Navbar/TOC）与 `config.ts` 直读（Header/Head/feed）；`i18n/path.ts` 由新的 `src/utils/path.ts`（无 lang 参数）替代；content schema 的 `lang` 收紧为 `'' | 'zh'`；死字段 `site.i18nTitle`、`global.locale`、`global.moreLocales` 删除 |

### v1.0.9 删除/替代清单

| 原位置 | 处理 | 现位置 |
| --- | --- | --- |
| `src/i18n/ui.ts`（11 语言文案表） | 删除；只有 zh 条目被读取 | Navbar/TOC 标签改为组件内中文直值；标题/副标题/描述直读 `src/config.ts`（`i18nTitle` 开关删除后 `config.ts` 成为唯一来源）；feed 标题/描述同 |
| `src/i18n/path.ts`（getTagPath/getPostPath/getLocalizedPath） | 删除 | `src/utils/path.ts`（同名函数，去掉 lang 参数） |
| `src/i18n/lang.ts`（getLangFromPath 等） | 删除 | 无调用方（页面语言概念已随 v1.0.7 消失） |
| `src/i18n/config.ts`（langMap、Language 类型、评论 locale map） | 删除 | `content.config.ts` 的 lang 枚举内联为 `z.enum(['', 'zh'])`；评论 locale map 随评论系统一并作废 |
| `astro.config.ts` 的 `i18n` 块 | 删除 | `<html lang="zh-CN">` 硬编码于 `Layout.astro`；`uno.config.ts` 的 `cjk:` 变体只依赖 html lang 属性，不受影响 |
| `src/config.ts` 的 `site.i18nTitle` / `global.locale` / `global.moreLocales` | 删除 | 标题/副标题/描述无条件读 `config.ts`；`base` 是唯一保留的派生导出 |
| `utils/content.ts` 的 lang 筛选与 `getTagSupportedLangs` | 删除 | schema 已限制 `lang ∈ {'', 'zh'}`，无需运行时筛选；slug 查重 fail-fast 保留 |
| `utils/description.ts` 的 CJK/other 双长度 | 简化 | 站点恒为中文，每场景固定长度（list/meta 120、og/feed 70） |
| 组件的 `transition:name` 后缀 `-${lang}` | 删除 | 前后端一致去掉后缀，视图过渡名不变效果 |

### 文件备份：`i18n-backup/`（不受 v1.0.9 影响）

52 个内容文件（45 篇外语文章与关于页 + 6 份 README 翻译 + 语言切换图标）已用 `git mv` 归档，
清单见 [i18n-backup/README.md](../i18n-backup/README.md)。

### 恢复方法（仅作记录，不打算执行；工作量较 v1.0.8 显著增大）

1. **取回 i18n 层源码**：`git checkout v1.0.8 -- src/i18n/`（4 个文件），并把
   `astro.config.ts`、`content.config.ts`、`src/config.ts`、`src/types/index.d.ts`、
   `Layout.astro`（`<html lang>`）、各组件/页面按 v1.0.8 与当前的 diff 回改；或直接基于 `v1.0.8` 分支重做后续改动。
2. `src/config.ts`：恢复 `locale` / `moreLocales` / `i18nTitle` 字段与 `allLocales` 等导出。
3. `astro.config.ts`：恢复 i18n 块（`langMap` 展开为 locales）。
4. 路由：把 7 个普通路径移回 `src/pages/[...lang]/`，重建带 `params.lang` 的 `getStaticPaths`
   与 `slugToLangsMap`/`supportedLangs` 传递链（v1.0.7 步骤）。
5. `i18n-backup/`：按其 README 把内容文件 `git mv` 回 `_archive` 再放回 `src/content/`。
6. `content.config.ts`：lang 枚举放开为全部语言。
7. 重建 EarlySummer 显示字体子集（多语言 UI 文案字符要进子集），见 [font-subset.md](./font-subset.md)。

### 效果（实测）

- 构建页面数从 6 语言 × 每页 103 页降至**仅中文**（v1.0.8 时为 18 页；v1.0.9 删除演示文章后为 4 页）。
- 构建时间 93.4s → 46.5s（约 -50%，v1.0.1 实测），见 [性能实测报告](./report/perf/2026-09-27-i18n-sound-disable-verification.md)。
- `<html lang="zh-CN">` 正常保留；sitemap、RSS、og 全部单语言，0 个 hreflang。
- **v1.0.9 后 `src/` 与 `astro.config.ts` 中已无任何 i18n 代码引用**（仅剩指向本文件的说明注释）。

---

## 2. 界面音效（暂时禁用，注释保留）

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

---

## 3. 评论系统（永久停用，2026-09-27 决定；v1.0.9 后恢复需动 git 历史）

站点不会使用评论功能。v1.0.8 将评论组件整套移出构建并归档到 [comment-backup/](../comment-backup/)；
v1.0.9 配置唯一化重构删除了 `src/i18n/`，评论组件依赖的三套 locale map 文件随之不存在（见下）。

### 文件备份：`comment-backup/`（不受 v1.0.9 影响）

7 个文件（评论组件 4 个 412 行 + `comment.css` 208 行 + giscus 主题 2 个）已用 `git mv` 归档，
清单与步骤见 [comment-backup/README.md](../comment-backup/README.md)。

### 接入点状态

| 位置 | 状态 |
| --- | --- |
| `src/config.ts` 的 `comment` 整块 | 注释保留（含恢复说明） |
| `src/types/index.d.ts` 的 `comment` 类型字段 | 注释保留 |
| `src/layouts/Layout.astro` 的 `MarginBottom` | 已恒定 `mb-12`，原三元注释保留 |
| `src/pages/posts/[slug].astro` 的 `<Comment />` 与 `comment.css` | 注释保留 |
| ~~`src/i18n/config.ts` 三套 locale map~~ | **v1.0.9 已随 `src/i18n/` 删除** |

### 恢复方法（6 步；第 5 步为 v1.0.9 新增）

1. `git mv` 组件/样式/资源回原位（见 comment-backup/README.md）。
2. 取消 `config.ts`、`types/index.d.ts`、`Layout.astro`、`posts/[slug].astro` 四处注释。
3. `pnpm add @waline/client@^3.13.0 twikoo@^1.7.7`。
4. `git checkout v1.0.8 -- src/i18n/config.ts` 取回三套 locale map（或改组件内联语言判断）。
5. `pnpm check && pnpm build` 验证。
