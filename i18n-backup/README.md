# 多语言文件备份

本目录存放**永久停用多语言**后从构建流程中移出的文件，仅作备份，**不参与任何构建**。

> 背景与恢复方法见 [note/disabled-features.md](../note/disabled-features.md)。
> 站点确定不会再开启多语言（2026-09-27 决定）。

## 内容

| 路径 | 数量 | 原位置 | 说明 |
| --- | --- | --- | --- |
| `content/posts/` | 40 | `src/content/posts/` | en/es/ja/ru/zh-tw 各 8 篇（`examples/` 4 篇 + `guides/` 4 篇） |
| `content/about/` | 5 | `src/content/about/` | 各语言关于页 |
| `docs/` | 6 | `assets/docs/` | 主题 README 的 6 种语言翻译 |
| `icons/language-switcher.svg` | 1 | `src/assets/icons/` | 语言切换按钮图标，切换按钮已注释 |

合计 **52 个文件**。

## 为什么不参与构建

- `content/` 下的文件在 `src/content/_archive/` 时就在两个 glob 集合的 base 之外
  （`src/content.config.ts:10` 的 `./src/content/posts`、`:39` 的 `./src/content/about`），
  移到本目录后离 `src/` 更远，更不可能被误加载。
- `docs/` 与 `icons/` 只被 `README.md:6` 和一处注释引用，无构建期依赖。

## 恢复方法（如将来需要）

1. `git mv i18n-backup/content/posts src/content/_archive/posts`
   `git mv i18n-backup/content/about src/content/_archive/about`
   （先放回 `_archive`，再按 `note/disabled-features.md` 的步骤恢复多语言）
2. `git mv i18n-backup/docs assets/docs`
3. `git mv i18n-backup/icons/language-switcher.svg src/assets/icons/`
4. 按 [note/disabled-features.md](../note/disabled-features.md) 取消注释 `moreLocales`、
   语言切换按钮与 content schema，并同步重建 EarlySummer 字体子集
   （见 [note/font-subset.md](../note/font-subset.md)）。
