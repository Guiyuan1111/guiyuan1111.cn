# EarlySummer 显示字体子集的重建方法

## 背景

站点标题、导航等固定 UI 文字（`font-title` / `font-navbar`）使用的字体链是
（`uno.config.ts:44-47`）：

```
Snell-Black → EarlySummer-Subset → EarlySummer → ui-serif/Georgia/…/serif
```

- **Latin 部分**（如 `Guiyuan1111`）由 `Snell-Black`（`public/fonts/Snell-Black-SF.woff2`）承担，
  它的 `unicode-range` 覆盖 `U+0020-007E`。
- **CJK 部分** 由 `EarlySummer-Subset`（`public/fonts/EarlySummer-VF-Split/EarlySummer-VF-Subset.woff2`）
  承担——这是一个**只装了固定 UI 用字**的极小子集（预加载，v1.0.5 时 24.8KB / 54 字）。
- 子集没覆盖到的字会回退到 `EarlySummer` 的分片（`public/fonts/EarlySummer-VF-Split/*.woff2`，
  共 70 个文件，按 unicode-range 切分）。

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

2. 汇总目标字符：`src/i18n/ui.ts` 各语言的 `title`/`subtitle`/`posts`/`tags`/`about` 的
   **CJK 部分**（Latin 由 Snell 承担，不必进子集）。

3. 生成子集：
   ```bash
   python -m fontTools.subset EarlySummerSerif-VF.otf \
     --text-file=chars.txt --flavor=woff2 \
     --output-file=EarlySummer-VF-Subset.woff2 \
     --layout-features='*' --name-IDs='*' --name-legacy --name-languages='*' \
     --notdef-glyph --notdef-outline --recommended-glyphs
   ```

4. 同步三处：
   - 覆盖 `public/fonts/EarlySummer-VF-Split/EarlySummer-VF-Subset.woff2`
   - 用子集 cmap **重新生成** `src/styles/font.css:39` 的 `unicode-range`
     （必须与 cmap 逐码位一致）
   - 更新 `public/fonts/Font Subset List/EarlySummer Subset.txt`（三行：zh / zh-tw / ja）

5. 自检：
   ```bash
   # unicode-range 与 cmap 必须 MATCH，且新字全部在内
   # 构建后 dist 中该 woff2 字节数应与源一致，dist/_astro/*.css 应含新码位
   pnpm build
   ```

## 注意

- 分片与子集都是**变量字体**（`wght 250–900`），重建时必须保留 `fvar`/`avar`/`CFF2`/`HVAR`，
  否则 `font-bold`（700）会失效。
- 分片是 CFF2 而非 glyf，**无法用 `fontTools.merge` 离线从分片拼出子集**，必须取源字体。
- 用新版（如 1.008）重建会与仓库里现存的 1.003 分片产生字形差异，务必对齐版本。
