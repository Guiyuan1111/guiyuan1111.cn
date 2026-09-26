# Blueprint 05：og-image 生成器调参 Skill

## 基本信息

| 项 | 值 |
| --- | --- |
| 名称 | og-image-tuner-skill（OG 社交卡片调参与扩展） |
| 替代对象 | `src/pages/og/[...image].ts` 的调参/扩展流程（生成逻辑本身保留） |
| 评级 | 🧑‍💻 AI 辅助（23/30，见 [../04-ai-substitution.md](../04-ai-substitution.md) M5） |
| 优先级 | P2 |
| 复杂度 | 中低 |

## 触发场景与推荐 description

调整 OG 卡片样式、排查社交平台卡片不显示、为特定分类定制卡片时触发。

```yaml
name: og-image-tuner-skill
description: >
  调整 astro-theme-retypeset 的 Open Graph 卡片图（astro-og-canvas）样式与字体，
  排查 og:image 不显示问题，或按 tag/分类扩展定制模板。当用户说"改 OG 卡片样式"、
  "分享到社交平台没有图"、"og 图中文乱码"、"定制文章卡片"时使用。
```

## 输入输出契约

### 输入

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | `tune \| diagnose \| extend` | 是 | 调参 / 排查 / 扩展模板 |
| options | object | tune 时必填 | 见下方数据模型 |
| slug | string | diagnose 时必填 | 问题文章 |

### 数据模型（TypeScript）

```ts
interface OgTuneOptions {
  titleColor?: [number, number, number]
  descriptionColor?: [number, number, number]
  bgColor?: [number, number, number]
  borderColor?: [number, number, number]
  borderWidth?: number
  logoSize?: number
  fontFamily?: 'Noto Sans SC'   // 受限：fonts 数组只注册了 Noto 两个字重
}

interface OgDiagnoseResult {
  expectedUrl: string     // <site><base>/og/<slug>.png
  fileGenerated: boolean  // dist/og/<slug>.png 是否存在
  metaTagOk: boolean      // Head.astro og:image 是否指向本站生成器
  possibleCauses: string[]
}
```

### 生成机制事实（Skill 内置知识）

- 端点：`src/pages/og/[...image].ts:22` 的 `OGImageRoute({ param: 'image', pages })`，pages 来自全部文章（`:7-18`），路径 `/og/<post.id>.png`；
- 文案：标题 + `getPostDescription(post, 'og')`（限长 CJK 70 / 其他 140，`src/utils/description.ts:18-21`）；
- 字体：`public/fonts/NotoSansSC-{Bold,Regular}.otf`（`[...image].ts:49-52`），中文字形靠它——乱码 = 字体缺失或路径错误；
- 消费：文章页 `src/layouts/Head.astro:37-38`；非文章页走 apiflash 截图（`Head.astro:39-41`，注意 `:41` 硬编码了上游演示用 access key，生产应配置自己的 `themeConfig.seo.apiflashKey`）。

### 错误码表（diagnose）

| 现象 | 可能原因 → 处置 |
| --- | --- |
| `dist/og/<slug>.png` 不存在 | 未重新构建 / 文章是 draft（生产剔除）→ 重跑 build |
| PNG 存在但社交平台不显示 | 缓存（平台侧）或 og:image URL 拼接错误 → 校验 `Head.astro:37-38` 的 URL 与 `astro.config.ts:29` 的 site/base 一致 |
| 卡片文字乱码/方块 | Noto 字体文件缺失或 `families` 名不匹配 → 检查 `[...image].ts:36-52` |
| 非文章页无图 | `themeConfig.seo.apiflashKey` 未配置 → 提示配置或接受默认演示 key 的风险 |

## 依赖清单

- 内部：`src/pages/og/[...image].ts`（调参目标）、`src/layouts/Head.astro:37-41`（消费端）、`src/utils/description.ts`（文案限长）、`public/fonts/NotoSansSC-*.otf`、`public/icons/og-logo.png`
- 外部：astro-og-canvas + canvaskit-wasm（已装）；apiflash（可选，仅非文章页）
- 工具权限：Read、Edit（仅 `src/pages/og/[...image].ts` 与 `src/config.ts` 的 seo 段）、Bash（pnpm build 验证）、Glob（dist 检查）

## Skill 工作流设计

```text
Workflow Steps:
1. action=diagnose → 校验链路四步：dist PNG 存在性 → og:image URL 正确性 →
   字体注册完整性 → 平台缓存提示，输出 OgDiagnoseResult
2. action=tune → 备份当前 getImageOptions 参数 → 应用 OgTuneOptions（RGB 三元组
   范围校验 0-255）→ 建议 pnpm build 后抽查 2-3 张 PNG
3. action=extend → 设计 per-tag 模板：按 posts 集合 tags 生成 pages 条目的
   定制 getImageOptions（遵循 OGImageRoute 既有 API，不改变路由形状）
4. 收尾：报告改动 diff 摘要与验证步骤

Constraints:
- 不改变路由路径 /og/<post.id>.png（Head.astro:37-38 依赖此形状）
- 字体 families 只能引用 fonts 数组注册的名字（canvaskit 限制）
- RGB 数组一律 0-255 整数三元组
- 发现 Head.astro:41 硬编码 apiflash key 时提醒用户替换为自有 key，不直接删除
  （会破坏非文章页 fallback 行为，需用户决策）
```

## 使用示例

✅ Do This：

> 用户："微信里分享文章，卡片图是灰的。"
> Skill：diagnose → "dist/og/故乡.png 存在；og:image 指向 https://retypeset.radishzz.cc/og/故乡.png，URL 含中文未编码可能被拒——建议对 abbrlink 类文章使用纯 ASCII slug，或确认平台对 punycode/中文路径的支持"，并给出 2 条可选修复。

❌ Not This：

> 不要把 `OGImageRoute` 改成自定义 API 路由或换成运行时截图服务——超出调参范围且破坏 SSG。
> 不要给 `fonts` 加未注册的 family 名（如 'Snell'）却忘了加入 `fonts` 数组。
> 不要把 borderWidth 设为 0 以上巨大值导致文字被裁——先抽查 PNG 再提交。

## 参考材料

- `src/pages/og/[...image].ts`（全文 55 行：pages 构建 + OGImageRoute 配置）
- `src/layouts/Head.astro:34-41`（og:image 决策链：文章页本站生成 → apiflash）
- `src/utils/description.ts:9-26`（og 场景摘要限长常量）
- `astro-og-canvas` 文档（getImageOptions 各字段的权威说明）
