# 基准断言门禁 + 字集 used 采集修复 R8 实测报告（v1.0.18 → v1.0.19）

> 日期：2026-09-30 · 快照与门禁 JSON 存于 [`benchmark/results/`](../../benchmark/results/)（`r8-final.json` / `r8-gate-sans.json`）。
> 红线：安全性 / 稳定性 / 兼容性（视觉与行为零回归）。

## TL;DR

R8 把 benchmark 从「记录工具」升级为「回归门禁」，并用负向演练证明门禁真的能拦。
门禁演练反向揪出一个潜伏三个版本的真 bug：`subset-ui-fonts.py` 的 `class_chars`
返回 str 字符而 `build_charset` 与 int 码点 cmap 求交——**str ∩ int = ∅**，导致
v1.0.16 起三处真实渲染文本的字形一直静默回退。修复后重新子集，端到端字集漂移
演练（新字符 → 回退 → 重新子集 → 恢复）全部按预期工作，CI 接入零依赖断言。

| 口径 | v1.0.18 | v1.0.19 | 变化 |
| --- | --- | --- | --- |
| 每页引用资产 gzip（45 页中位数） | 42.1 KB | 43.8 KB | +4.2%（回退修复的诚实代价，见下） |
| 真实浏览器每页 webfont（wire） | 21.8 KB | 31.3 KB | +9.5 KB（STIX-Italic 页脚字形覆盖恢复） |
| 部署足迹 | 10.61 MB | 10.62 MB | +9.6 KB（子集字母增量） |
| font-traffic 最小页覆盖率 | 95.8% | 95.8% | 不变 |
| 字体渲染正确性 | **3 处文本回退（bug）** | 全部由 webfont 渲染 | 修复 |

对比本轮优化起点 v1.0.15 的累计值仍为：每页资产中位数 **-47.7%**（83.7→43.8KB）、
webfont **-60.4%**（79.1→31.3KB）、部署 **-47.6%**。性能红线未破——增量全部用于
恢复被 v1.0.16 错误丢弃的字形覆盖，属于正确性成本而非回归。

## 一、断言模式设计（`benchmark/run-all.mjs --assert`）

```
node benchmark/run-all.mjs --assert              # 绝对红线（CI 用，内容增长零误报）
node benchmark/run-all.mjs --assert=<label>      # 额外对比 benchmark/results/<label>.json 基线
```

**绝对红线（零容忍）**——只断言「结构性倒退」，与内容增长无关，因此可在 CI 长期运行：

| 红线 | 拦截的倒退 |
| --- | --- |
| 无页面产出 | 构建失败 |
| sans 构建出现 `fonts/earlysummer-pages/` | apply-page-fonts 清理步骤被跳过（v1.0.17 策略） |
| dist 出现 Snell/STIX 源字体 | 源字体被放回 public（v1.0.17 策略） |
| dist 出现 KaTeX woff/ttf | optimize-dist 遗留裁剪被跳过（v1.0.17 策略） |
| font-traffic 最小页覆盖率 < 95% | 某页可见字符无任何 face 声明覆盖 |

**基线漂移（可选）**——`--assert=<label>` 追加对比入库基线：每页中位数 > 基线 ×1.15、
最大值 > ×1.25、部署总量 > ×1.5 即失败。容差刻意宽松，只拦结构性膨胀，不拦正常写作。

## 二、负向演练：门禁真的能拦（exit 1）

| 植入的缺陷 | 断言输出 | 结果 |
| --- | --- | --- |
| 复制源字体 `Snell-Black-SF.woff2` 进 `dist/fonts/` | `✗ source fonts deployed: 56.7KB` | exit 1 ✅ |
| sans dist 植入 `fonts/earlysummer-pages/` 目录 | `✗ sans build ships 4.0KB of unreferenced serif page fonts` | exit 1 ✅ |
| `dist/_astro/` 植入 `KaTeX_Main-Regular.ttf` | `✗ katex woff/ttf legacy fonts deployed: 8.0KB` | exit 1 ✅ |

三类缺陷全部被拦截且消息指明根因归属的脚本；清除植入后复跑恢复 exit 0。
基线模式 `--assert=final-v1018` 对当前构建通过（中位数 43.8KB < 42.1×1.15）。

## 三、演练揪出的真 bug：class_chars 字集静默丢弃（v1.0.16–v1.0.18）

设计兼容性演练时核对子集 cmap，发现 Snell-Black 子集（站点标题字体）**一个拉丁
字母都没有**。回溯根因：

```python
# scripts/subset-ui-fonts.py（修复前）
def class_chars(src, cls):
    chars.update(H.unescape(TAG_RE.sub('', m.group(2))))   # 返回 str 字符
    ...
want = (used | safety) & cmap    # cmap 是 int 码点集合 → str ∩ int = ∅
```

`class_chars` 采集的 `used`（按 CSS 类名归属的字面：标题/日期/页脚导航）是 str
字符集，与 int 码点的 cmap 求交后**全部静默丢弃**，字集只剩安全垫（数字+标点）。
v1.0.15 的 R3/R5 报告声称「按站点实际用字做子集」，实际自 v1.0.16 起三处文本
一直回退：

| 受影响文本 | 归属类 | 回退表现 |
| --- | --- | --- |
| 站点标题 "Guiyuan1111" 的拉丁字母 | `font-title`（Snell-Black） | 回退到 EarlySummer-Subset/系统 serif |
| 页脚 "RSS / GitHub / Email / Guiyuan1111 / Powered by Astro and Retypeset" | `font-navbar`（STIX-Italic） | 同上 |
| 列表阅读时长 "8 min" 的 "min" | `font-time`（Snell-Bold） | 同上 |

这是 R8 兼容性红线下最严重的问题——正是用户要求「视觉零回归」而 v1.0.16 违反之处。
CDP 门禁未拦截的原因：sans 模式门禁只断言 EarlySummer 家族零流量与探针字符串
（"Guiyuan1111" 恰好命中的是 EarlySummer-Subset 的覆盖，而非 Snell-Black 的），
未断言每个字体家族各自覆盖其层叠职责内的字符。

### 修复

一行：`chars.update(ord(c) for c in ...)` 让 `class_chars` 返回 int 码点。
重新 `python scripts/subset-ui-fonts.py`（脚本扫描 dist，先 build 再生成）：

| 字体 | v1.0.18（受 bug 影响） | v1.0.19（修复后） | 新增收编的真实用字 |
| --- | --- | --- | --- |
| Snell-Black（标题） | 27 cps / 3.1KB | 34 cps / 4.3KB | `G a i n u y` |
| Snell-Bold（时间） | 18 cps / 2.2KB | 21 cps / 2.6KB | `i m n`（"min"） |
| STIX-Italic（页脚导航） | 27 cps / 5.0KB | 66 cps / 12.8KB | 页脚整段拉丁文 |
| STIX（serif 正文 Latin） | 116 cps / 17.1KB | 116 cps / 17.1KB | 不变（ascii 策略不受影响） |

`font.css` unicode-range 已由脚本同步修补（Head.astro 预载行无变化）。
重建后 CDP 门禁 45/45 页全绿，每页 webfont 31.3KB（4 个字体：EarlySummer-Subset
11.1 + STIX-Italic 13.0 + Snell-Black 4.5 + Snell-Bold 2.8，wire 口径）。

## 四、端到端字集漂移演练（修复管线的全链路验证）

以「站长改标题」为剧本，实证 note/font-subset.md 声明的流程真实可用：

1. **漂移注入**：`site.title` 临时改为 `Guiyuan1111的博客 JjWw` → `pnpm build`。
   验证：新字符进入 dist HTML（3 处），但**不在**部署子集 cmap 与 unicode-range
   中——浏览器按层叠优雅回退，页面无异常；`--assert=final-v1018` 仍通过
   （断言对内容增长零误报）。
2. **重新子集**：`python scripts/subset-ui-fonts.py` → Snell-Black 34→38 cps，
   cmap 收编 J/j/W/w，font.css range 同步补 `U+004A,U+0057,U+006A,U+0077`。
3. **覆盖恢复**：再 `pnpm build`，产物 CSS 已携带新 range——新字符由 webfont
   渲染，回退消除。
4. **还原**：`git checkout -- src/config.ts` → **先重建再重新子集**（脚本扫描
   dist，顺序反了会把漂移字符固化进字集——本次演练实测踩到并已把顺序写进
   font-subset 笔记）→ 子集精确回到修复态（34/21/66/116 cps），JjWw 移出 cmap。
5. 清理全部演练产物后 `--assert=final-v1018` 通过，快照存 `r8-final.json`。

## 五、CI 接线

`.github/workflows/ci.yml` build job 末尾新增：

```yaml
- name: Perf red-line gate
  run: node benchmark/run-all.mjs --assert
```

零依赖（纯 Node，不需要 Python/浏览器），CI 上只跑绝对红线模式——结构倒退
（清理步骤被跳过、源字体回流、覆盖率塌方）在合并前即被拦截。

## 六、复现

```bash
pnpm build
node benchmark/run-all.mjs --assert                 # 绝对红线
node benchmark/run-all.mjs --assert=r8-final        # 对比本轮基线
node benchmark/font-cascade-check.mjs --json=benchmark/results/r8-gate-sans.json
python scripts/subset-ui-fonts.py                   # 改文案后重新子集（先 build）
```
