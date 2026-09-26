# Blueprint 03：apply-lqip 图片处理编排 Skill

## 基本信息

| 项 | 值 |
| --- | --- |
| 名称 | apply-lqip-skill（LQIP 构建后编排与巡检） |
| 替代对象 | `pnpm apply-lqip`（`scripts/apply-lqip.ts`，276 行）的**调度层**（算法不动） |
| 评级 | 🤖 完全 AI 化（25/30，见 [../04-ai-substitution.md](../04-ai-substitution.md) M3） |
| 优先级 | P1 |
| 复杂度 | 中低 |

## 触发场景与推荐 description

构建完成后注入图片占位、诊断 LQIP 日志、排查占位色缺失时触发。

```yaml
name: apply-lqip-skill
description: >
  在 astro-theme-retypeset 构建后生成并注入图片 LQIP 占位样式。当用户说"跑一下
  apply-lqip"、"构建后图片没占位色"、"检查 lqip-map"、"构建失败了帮我看日志"时使用。
  负责调度 scripts/apply-lqip.ts、解读输出、按需重跑与诊断，不修改位打包算法。
```

## 输入输出契约

### 输入

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | `run \| diagnose \| stats` | 否 | 默认 run |
| rebuildMap | boolean | 否 | true 时删除/备份 `src/assets/lqip-map.json` 后全量重建 |

### 数据模型（TypeScript）

```ts
interface LqipStats {
  total: number
  cached: number
  new: number
  applied: number            // 本次 HTML 注入次数
  mapEntries: number         // lqip-map.json 条目数
  failedImages: string[]     // 日志中 ⚠️ 的图片
}

type LqipAction = 'run' | 'diagnose' | 'stats'
```

### 领域知识（Skill 必须内置的协议事实）

- 编码：`sharp.resize(3,3)` 取左上/中心/右下 3 像素，按 11/11/10 bit 打包为 8 位 hex（`scripts/apply-lqip.ts:35-83`）；
- 解码：`src/styles/lqip.css:7-72` 用 CSS `color()` 位运算还原三色绘制渐变——**两侧位布局互为镜像，任何一侧改动都需同步**；
- 持久化：`src/assets/lqip-map.json`（webUrl → hex），构建间增量复用（`:95-130`）；
- 幂等：重复运行零变化（`:157,185-187`），重跑安全。

### 错误码表（脚本输出 → 诊断结论）

| 日志特征 | 结论 | Skill 动作 |
| --- | --- | --- |
| `No images found to process`（`:243`） | dist 无 webp | 提示先跑 build；检查 `astro build` 是否成功 |
| `⚠️ Failed to process image: <path>`（`:86`） | 单图 sharp 失败 | 列出路径，建议检查图片完整性；不阻塞 |
| `⚠️ Failed to process <html>`（`:225`） | 单 HTML 失败 | 列出文件，建议重跑（幂等） |
| `❌ LQIP processing failed` + exit(1)（`:274-275`） | 全局异常 | 读取堆栈，常见原因：dist 不存在/权限 |
| `All images already have LQIP styles`（`:266`） | 幂等命中 | 无需动作，报告完成 |

## 依赖清单

- 内部：`scripts/apply-lqip.ts`（黑盒调用）、`src/assets/lqip-map.json`（只读诊断/重建）、`src/styles/lqip.css`（协议参考）
- 外部：node/tsx 运行环境、sharp（已装）
- 前置：`dist/` 必须已由 `pnpm build` 产出（脚本 cwd 依赖，`:15-17`）
- 工具权限：Bash（pnpm apply-lqip）、Read（map/日志）、Glob（dist 检查）、Write（仅限备份/重建 map，需用户确认）

## Skill 工作流设计

```text
Workflow Steps:
1. 前置检查：Glob dist/_astro/**/*.webp 与 dist/**/*.html 是否存在 → 不存在则引导先 build
2. action=run → Bash 执行 pnpm apply-lqip，捕获退出码与输出
3. 按错误码表解读输出，生成结构化报告（LqipStats）
4. action=diagnose → 针对失败图/失败 HTML 给出修复建议；rebuildMap 时先备份原 map
5. 收尾：报告 map 条目数与可入库建议（lqip-map.json 应提交以获得增量缓存）

Constraints:
- 算法冻结：不修改 apply-lqip.ts 的打包函数与 lqip.css 的解包（硬约束）
- 幂等安全：任何时刻重跑均无害，优先建议重跑而非热修
- map 重建需用户确认（丢弃缓存的操作）
- 不在 apply-lqip 之前清理 dist（会破坏增量缓存判断）
```

## 使用示例

✅ Do This：

> 用户："构建成功了，但首页图片没有渐变占位。"
> Skill：检查 dist 存在 → 跑 `pnpm apply-lqip` → 输出"Found 42 images (16 cached, 26 new)... Successfully applied to 26 images"，并提示 `src/assets/lqip-map.json` 新增 26 条，建议提交。

❌ Not This：

> 不要为了"修复"一张图的占位色去手改 `lqip-map.json` 里的 hex 值（32bit 位打包，人工构造必然错位）。
> 不要在 build 之前单独跑 apply-lqip 然后报告"找不到图片"当作 bug。
> 不要用 sed 批量修改 dist/ 下的 HTML 注入样式——绕过脚本会破坏幂等与 map 一致性。

## 参考材料

- `scripts/apply-lqip.ts`（全文 276 行；main 调用链见 [../01-architecture.md](../01-architecture.md) 第 8.1 节）
- `src/styles/lqip.css`（解码端，`--lqip-c0/c1/c2` 位还原）
- `src/assets/lqip-map.json`（持久化缓存实例，16 条）
- `package.json:15`（apply-lqip 命令）与 `package.json:9`（build 三段链中的位置）
