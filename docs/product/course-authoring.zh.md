# 课程制作指南 Course Authoring

本文是**课程作者的操作手册**：一门课由哪些数据组成、结构化配置怎么写、以及从零制作一门课的完整流程。教程功能的产品概念（Copilot、会话、干预梯度等）见 [用户教程](./tutorial.zh.md)。

## 一门课由什么组成

一门课程（Course）包含：

* **标题**（title）与**缩略图**（thumbnail）；
* **入口**（entrypoint）：课程打开的编辑器地址，指向一个课程项目（如 `/editor/curator/Lita-Course-03/sprites/Lita/code`）。课程项目承载舞台布置、精灵、以及用户要补全的起始代码；课程内编辑运行在无副作用模式，重开课程即还原；
* **提示词**（prompt）：一段结构化文本，同时服务两个读者——**开头的 `jsonc` 配置块**给前端（机器读，课程开始瞬间生效），**其余散文**给 Copilot（当作教案读）。

课程按**系列**（Course Series）组织。系列可通过课程管理页导出为 `.xbcs.zip` 文件（内含 `course-series.json`、全部课程项目 `.xbp`、缩略图），也可从该文件导入。

## jsonc 配置块

提示词开头的第一个 ` ```jsonc ` 代码块会被前端解析为课程配置，**课程开始的瞬间即被应用，不经过 Copilot、没有任何延迟**。所有字段均可省略；解析失败等同于空配置，不会阻断开课。

```jsonc
{
  // 开课时隐藏的工作区区域；可用值见 workspace-layout 的 hideableWorkspaceAreas
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],

  // 开课时 Copilot 面板是否展开。缺省收起（后台静默运行）；以 Copilot 为主题的课声明 "open"
  "copilot": "open",

  // 完成判定方式："code"（缺省，系统看运行输出判定）或 "copilot"（由 Copilot 判定）
  "judge": "code",

  // judge 为 "code" 时的完成信号：单次运行内，包含 log 子串的「不同输出行」达到 count 条即完成。
  // 缺省（不写 complete）时的信号是项目自行打印的完成哨兵 @@builder:course-complete@@
  "complete": { "log": "捡到萝卜", "count": 4 },

  // 开课时「API References」面板收窄到的 API 集合（全课程会用到的并集，不是当前步骤的子集）
  "apis": ["step", "turn"],

  // 开课时自动播放的知识点讲解视频（本课新知识点），按顺序逐个弹出，已看过的自动跳过
  "videos": ["step"]
}
```

### `apis` / `videos` 的条目写法

每个条目匹配 API References 面板中的条目（及其全部重载），三种写法任选：

| 写法 | 示例 | 匹配规则 |
|---|---|---|
| 裸名 | `step` | 点名的最后一段等于它（`Sprite.step` ✓） |
| 点名 | `Sprite.step` | 完整点名相等 |
| 定义 ID | `xgo:github.com/goplus/spx/v2?Sprite.step#0` | 精确匹配；不带 `#重载号` 则匹配全部重载 |

**语言结构类条目没有点名**，用它们的规范名：

| 面板条目 | 条目名 |
|---|---|
| `if condition {}` | `if_statement` |
| `if condition {} else {}` | `if_else_statement` |
| `var name type` | `var_declaration` |
| `for v in list {}` | `for_iterate` |

spx 函数（`step`、`turn`、`stepTo`、`turnTo`、`repeat`、`waitUntil`、`distanceTo`、`say`、`animateAndWait`……）以及课程项目自定义的方法（如 `IsMature`、`Water`）直接写裸名即可。

`videos` 的条目与 `apis` 同一套名字。视频取自全局知识点视频库（按定义 ID 索引）；库中没有的条目在演示模式下播放共用演示视频，标题取条目名。用户看过的知识点会被记住，之后的课程不再重复弹出。

### 完成判定怎么选

* **`judge: "code"`（首选）**：完成与否能从游戏运行结果看出来时用它。系统直接从运行输出判定，成功对话框**即时**弹出（不等任何 LLM 往返），Copilot 随后收到「Course completed」事件、补一句评语进对话框。两种信号：
  * **`complete.log` + `count`**：适合「收集 N 个东西」类目标——游戏每达成一步打印一行（如 `捡到萝卜 Radish2`），单次运行内**不同**的匹配行数达到 `count` 即完成。重新运行会重新计数，跨运行不累计。
  * **完成哨兵（缺省）**：项目自己的逻辑判断目标达成时打印 `@@builder:course-complete@@`。适合完成条件复杂、游戏内已有判定逻辑的课。
* **`judge: "copilot"`**：完成条件**无法**从运行输出判断时才用——例如目标是「给 Copilot 发一条消息」，或者要求「必须用了某种写法」（起始代码本来就能通关、要看代码是否改用了新学的 API）。此时在提示词里写清判定标准，Copilot 达标即弹出成功对话框（会有一次 LLM 往返的延迟，这是该模式的固有成本）。

### 声明了 `apis` / `videos` 的课走「快路径」

只要配置声明了 `apis` 或 `videos` 中的任意一个，前端就接管全部开场布置，Copilot 的开场协议随之切换为**纯静默**（只回进度判定 + 保持沉默，无需任何工具调用）——开场又快又干净。两个字段都没有声明的旧课程维持旧行为（Copilot 在开场回复里收窄面板、播放视频），行为不变但慢。**新课程一律声明**。

## 提示词的散文部分（给 Copilot 的教案）

配置块之后是给 Copilot 读的教案。推荐的节结构（参考 Code: Lita 系列）：

```markdown
<course-prelude>开课前展示给用户的一句引导语。</course-prelude>

## 目标
本课教什么、为什么这样设计。教学意图写清楚，Copilot 的引导质量取决于它对课的理解。

## 当前代码
起始代码是什么、用户需要做什么改动、参考答案（注明「标准答案之一，非唯一」）。

## 完成判定（唯一标准）
judge: "code" 的课：说明完成由系统自动判定、Copilot 不要自己宣布、收到
「Course completed」事件后回一句评语即可。
judge: "copilot" 的课：写清 Copilot 应依据什么判定、满足后立即用成功对话框祝贺。

## 引导要点（可选）
分级引导时按什么顺序给提示、哪些时刻值得等一等、什么坑是故意留的。
```

写作要点：

* **不要**再写「开场收窄 API 到……」「开场播放……视频」这类节——它们已由配置声明并自动执行，散文里再写会与 Copilot 的开场协议冲突；
* 完成判定为 `code` 时，务必写明「不需要也不应由你宣布完成」，防止 Copilot 抢跳重复弹框；
* 参考答案永远注明非唯一，判定以结果为准——这决定了 Copilot 是否会错误否定用户的等价解法；
* 提示词上限 4000 字符。

## 制作一门新课的流程

1. **做课程项目**：布置舞台与精灵，写好起始代码（用户看到的样子），让游戏在关键进展处 `println` 出可判定的输出行（或在达成目标时打印完成哨兵）；
2. **定完成判定**：能从运行输出判断 → `judge: "code"` + `complete`；不能 → `judge: "copilot"` + 在散文里写清标准；
3. **写配置块**：`hide` / `apis`（全课并集）/ `videos`（仅本课新知识点）；
4. **写教案散文**：按上面的节结构；
5. **加入系列**并排序；导出 `.xbcs.zip` 存档。

## Code: Lita 系列现状（2026-07 结构化改造后）

系列 32「Code: Lita」共 28 课（课程 ID 211–238，项目 `curator/Lita-Course-01` 至 `-28`），全部完成结构化：

* **25 门课** `judge: "code"` + `complete: { "log": "捡到萝卜", "count": N }`，N 为该课萝卜数（1／3／4／5），完成弹窗零延迟；
* **3 门课** `judge: "copilot"`（无法从运行输出判定）：第 1 课（目标是给 Copilot 发消息）、第 13 课（要看到代码里配了 `turnTo`）、第 19 课（起始代码本就能通关，要看到改用 `repeat`）；
* **27 门课**声明了 `apis`（第 1 课不涉及代码，无面板可收窄），**12 门课**声明了 `videos`（对应各课新知识点：step、turn、stepTo、turnTo、if、if/else、var、repeat、for in、waitUntil、distanceTo、Water）；
* 原提示词中的「新知识点（开场演示视频）」「本课涉及的 API」两节已删除（进入配置），「完成判定」节按判定方式重写；其余教案内容（目标、当前代码、引导要点、彩蛋）原样保留。
