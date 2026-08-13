# Tutorial v2

> 对应产品设计：[用户教程 User Tutorial（新课程体系）](../product/tutorial-v2.zh.md)。本文承载产品文档之外的实现层设计、决策记录与待决事项；其中的规格草案（如课程包格式）定稿后应沉淀为正式技术设计文档。文中 v1 / v2 为两种课程形态的早期代号：v1 = 引导式课程 Guided Course，v2 = 目标式课程 Playground Course。

## 架构：Tutorial 作为 Editor 插件

Tutorial 不是散落在 Editor 内部的一组特性，而是 Editor 的一个插件：

* Editor 提供一组通用扩展点（能力），不感知 Tutorial 的存在
* Tutorial 插件消费这些扩展点，分别实现两种课程形态的 driver
* 依赖方向单向：Tutorial → Editor 扩展点；Editor 不依赖 Tutorial

Editor 提供的扩展点，按类别：

* **UI 定制**：simple 模式开关（隐藏精灵列表、字号、布局调整）、API Reference 过滤与分类隐藏、标尺
* **运行时信号**：游戏日志流、退出码、运行开始/结束事件
* **代码访问**：读取学习者当前代码文档（供代码检查与 LLM completion 上下文）
* **界面引导**：spotlight 高亮与气泡提示
* **Copilot**：会话与 Topic 机制、自定义工具注册、主动消息、面向课程代码的 chat completion
* **流程挂载**：课程进入/退出，开场、重试、完成等弹窗的挂载点

Tutorial 插件在其上实现：

* Guided driver：基于 Copilot Session + Prompt
* Playground driver：class framework——运行课程代码，向其提供消息展示、运行时信号监听、代码检查、LLM completion、完成流程等原子能力

能力池是共享的：spotlight、视频播放、Copilot 等能力按扩展点定义一次，两个 driver 各取所需，避免同一能力做成两套。

LLM completion 由 copilot 模块提供类似 side chat 的 chat completion 功能（共享课程信息、XGo/spx 知识等上下文，但不出现在用户与 Copilot 的交互/对话中）；不排除将来增加单独的 LLM 模块，为课程作者提供"干净"的 LLM 能力。

## 课程数据与课程包（草案，规格待定）

课程包是课程系列的存储与交换格式：将系列内全部课程的内容（课程代码 / Prompt）、课程项目与素材打包为单一文件。布局草案：

```text
series.json          系列元数据：名称、简介、封面、课程顺序
courses/<key>/
  course.json        课程元数据：标题、封面引用、形态（Guided / Playground）
  code/              Playground：课程代码（开场、判定、编辑器能力的编排）
  prompt.md          Guided：课程 Prompt
  project/           Playground：课程项目
  assets/            Playground：课程素材（讲解视频等）
covers/              封面图
```

关键设计：

* **课程代码独立于课程项目。** Demo 阶段课程信息以 jsonc 块内嵌在项目代码中，是"尚无课程存储、只能从项目读取"的权宜之计；正式版中课程代码是独立数据，课程项目回归纯游戏项目。导入器保留对内嵌格式的兼容。
* **课程携带稳定 key，导入是就地更新。** 重复导入按 key 更新对应课程，而非删除重建，课程得以持续迭代而不作废学习进度与外部链接。（Demo 阶段每次导入课程 ID 全部重新生成、进度与链接随之作废，是已被验证的痛点。）
* **课程素材先按课程 asset 实现**（随课程数据存储与分发）。是否统一为公共素材库后续再考虑——公共库便于复用，但灵活度低、画风未必匹配各课程，且存在课程级适配问题（并非任何项目都适用同一段讲解，如 `turn Right` 的示例未必适合所有场景）。

## 创作工具链

* **双通道**：Course Editor 内直接编辑，与"导出课程包 → 本地修改（可由 AI agent 辅助）→ 导入"是并行的两条通道，操作同一格式，互不排斥
* **编排检查**：系列层面可对课程做静态检查并以 lint 警告呈现，如"先用后教"（某课用到的 API 在更早的课程中未讲解过）、判定要求了本课未讲解的写法、重试提示缺失等。Demo 阶段这组检查以脚本形式运行，抓出过真实的编排错误；产品化优先级待定
* **Course Preview 的实现要点**：以学习者身份运行真实的 Tutorial 插件（不另做模拟）；预览中的修改不写回课程数据；预览应可重复（每次从课程初始状态开始）

## 待决问题

* LLM completion 的结果如何可靠地被课程代码消费（结构化输出约束）
* 课程包具体规格
* 向课程提供AI能力时，是SideChat还是直接提供LLM调用，或者全部提供。
