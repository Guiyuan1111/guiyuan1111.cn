# EarlySummer 显示字体子集的重建方法

## 背景

站点标题、导航等固定 UI 文字（`font-title` / `font-navbar`）使用的字体链是
（`uno.config.ts:44-47`）：

```
Snell-Black → EarlySummer-Subset → EarlySummer → ui-serif/Georgia/…/serif
```

- **Latin 部分**（如 `Guiyuan1111`）由 `Snell-Black` 承担——v1.0.15 起使用按站点用字
  子集化的 `public/fonts/Snell-Black-SF.subset.woff2`（v1.0.19 时 4.3KB，原字体约 57 KB）。
- **CJK 部分** 由 `EarlySummer-Subset`（`public/fonts/EarlySummer-VF-Split/EarlySummer-VF-Subset.woff2`）
  承担——这是一个**只装了固定 UI 用字**的极小子集（预加载，v1.0.16 时 11.2KB / 34 码位：
  dist 实测 `font-title`/`font-navbar` 的 CJK 18 字 ∪ 常用 CJK 标点边距；上游多语言遗留
  字符已剔除）。
- 子集没覆盖到的字会回退到 `EarlySummer` 的分片（`public/fonts/EarlySummer-VF-Split/*.woff2`，
  共 47 个分片 + 1 个 Subset；分片声明在 `src/styles/earlysummer-shards.css`，
  **仅 serif 模式加载**——v1.0.15 起该 CSS 由 `Head.astro` 按 `fontStyle` 条件引用，
  默认 sans 模式整段不产出）。

**风险点**：`EarlySummer-Subset` 的 `unicode-range` 必须与子集 cmap 严格一致。
一旦改了标题/副标题/导航文案而没重建子集，新字会全部回退到分片——
v1.0.5 实测需额外拉取 **11 个分片、376KB**，且首屏标题字体闪烁。

## 重建步骤

1. 取源字体。必须与 `public/fonts/EarlySummer-VF-Split/` 下分片**同版本**：
   ```bash
   python -c "from fontTools.ttLib import TTFont; f=TTFont('public/fonts/EarlySummer-VF-Split/1268e5072156188d601f1eeb4473655d.woff2'); print([r.toUnicode() for r in f['name'].names if r.nameID==5])"
   # → ['Version 1.003']
   ```
   对应上游 <https://github.com/GuiWonder/EarlySummerSerif/releases/tag/1.003>
   的 `EarlySummerSerifVF.zip`（31MB），解出 `EarlySummerSerif-VF.otf`（CFF2 变量字体）。

2. 汇总目标字符（v1.0.16 起数据驱动）：对**已构建的 dist** 扫描 `font-title` / `font-navbar`
   元素文本，取其 **CJK 部分** ∪ 常用 CJK 标点安全边距（，。！？：；、·—…（））。
   Latin 由 Snell 承担，不必进子集。改了标题/副标题/导航文案后按第 5 步自检并重建。

3. 生成子集（name 表最小化，v1.0.16 起不再保留全量 legacy name）：
   ```bash
   python -m fontTools.subset scripts/data/EarlySummer-universe.woff2 \
     --text-file=chars.txt --flavor=woff2 \
     --output-file=EarlySummer-VF-Subset.woff2 \
     --layout-features='*' --name-IDs=3 \
     --notdef-glyph --notdef-outline --recommended-glyphs
   ```
   源字体可直接用仓库内 `scripts/data/EarlySummer-universe.woff2`（1.003 全量 VF，与分片同版本）。

4. 同步三处：
   - 覆盖 `public/fonts/EarlySummer-VF-Split/EarlySummer-VF-Subset.woff2`
   - 用子集 cmap **重新生成** `src/styles/font.css` 里 Subset 块的 `unicode-range`
     （必须与 cmap 逐码位一致）
   - 更新 `scripts/data/font-subset-lists/EarlySummer Subset.txt`
     （v1.0.17 起该清单随源字体一并移出 `public/`，不再随站部署）

5. 自检：
   ```bash
   # unicode-range 与 cmap 必须 MATCH，且新字全部在内
   # 构建后 dist 中该 woff2 字节数应与源一致，dist/_astro/*.css 应含新码位
   pnpm build
   ```

## UI 显示字体子集（v1.0.15 起，与上面独立）

Snell-Black / Snell-Bold / STIX-Italic / STIX 四个 UI 字体按**分字体字集策略**子集化
（`scripts/subset-ui-fonts.py`，`pnpm gen:uifonts`；v1.0.16/R5 与 v1.0.18/R7 两轮收窄定型）：

| 字体 | 渲染角色 | 字集策略 | v1.0.19 体积 |
| --- | --- | --- | --- |
| Snell-Black | `font-title`（站点标题，config 固定串） | 用字 ∪ 数字 ∪ 标题标点 | 4.3KB（34 码位） |
| Snell-Bold | `font-time`（日期+阅读时长，config dateFormat 固定格式） | 用字 ∪ 数字 ∪ 日期标点 | 2.6KB（21 码位） |
| STIX-Italic | `font-navbar`（导航/页脚/404，固定串） | 用字 ∪ 数字 ∪ 标题标点 | 12.8KB（66 码位） |
| STIX | serif 正文 Latin | 用字 ∪ ASCII ∪ 排版符号（保守不动） | 17.1KB（116 码位） |

**历史教训（v1.0.19 修复）**：v1.0.16–v1.0.18 的 `class_chars` 返回 str 字符，
与 int 码点 cmap 求交为空，`used` 被**静默丢弃**（字集只剩数字+标点），站点标题
拉丁字母、页脚整段、阅读时长 "min" 回退了三个版本才被 R8 演练揪出——参见
[report/perf/2026-09-30-benchmark-assert-r8.md](./report/perf/2026-09-30-benchmark-assert-r8.md)。

**改了标题、副标题、导航/页脚文案或 `dateFormat` 后必须重跑一次**，且顺序是
**先 `pnpm build` 再 `pnpm gen:uifonts`**——脚本扫描的是 `dist/**/*.html` 的用字
（先改 font.css 后 build 会让旧 range 进产物），生成后需**再 build 一次**让新
unicode-range 落进 dist。脚本自动改写 font.css 的 unicode-range，含 fvar 存活与
cmap 覆盖校验；未重跑时缺字沿字体链回退系统衬线（优雅降级），`--assert` 的覆盖率
红线与 CDP 门禁会拦截异常。体积对比见
[report/perf/2026-09-30-webfont-charset-r7.md](./report/perf/2026-09-30-webfont-charset-r7.md)。

## 注意

- 分片与子集都是**变量字体**（`wght 250–900`），重建时必须保留 `fvar`/`avar`/`CFF2`/`HVAR`，
  否则 `font-bold`（700）会失效。
- 分片是 CFF2 而非 glyf，**无法用 `fontTools.merge` 离线从分片拼出子集**，必须取源字体。
- 用新版（如 1.008）重建会与仓库里现存的 1.003 分片产生字形差异，务必对齐版本。
- 重切分片用 `scripts/split-earlysummer.py`（其 `--old-css` 指向
  `src/styles/earlysummer-shards.css`）；serif 模式的页面级子集用
  `pnpm gen:pagefonts`（`scripts/gen-page-fonts.py`，v1.0.16 起同时解析
  `font.css` 与 `earlysummer-shards.css` 两个 `@font-face` 源——R4 拆分后只读
  `font.css` 会把分片流量误算为 0 而全部 skip）+ 构建尾部的
  `scripts/apply-page-fonts.mjs`（注入锚点是 HTML 中**最后一个** head 闭合标签，
  注释里不要写该字面量）。
