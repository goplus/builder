# Code Search

Code Search 是 XBuilder 的项目代码搜索能力。它面向 XBuilder 项目中的源码和选定项目元数据，提供可解释、可定位、可审计的文本搜索和结构化搜索能力。

本文档定义 Code Search 的产品与系统边界。它描述目标状态和关键语义，不定义最终数据库 schema、完整 OpenAPI 契约或具体实现任务。

## 背景与目标

XBuilder 项目代码目前保存在项目文件集合中。`Project.files` 和 `ProjectRelease.files` 都是 `path -> universal URL` 形式的文件映射，文件内容可能以内联 `data:` URL 保存，也可能通过 `kodo://` 等对象存储地址引用。现有 `/projects` 的 `keyword` 参数只搜索项目展示名或名称模式，不搜索项目源码。

XBuilder 需要一套通用的项目代码搜索能力，用于在用户项目中查找具体源码、结构化代码形态、可解析的匹配位置和可聚合的结果。第一个预期客户端是 XBuilder 管理台，但 Code Search 本身不是某个 admin 页面专用功能，也不应该被建模为某个框架的专用报告。

目标包括：

- 支持跨 XBuilder 项目源搜索源码和选定项目元数据
- 支持代码导向的文本搜索，并返回具体匹配位置和片段
- 支持语法级结构化搜索，并返回匹配范围、captures 和诊断信息
- 将文本搜索、结构化搜索和未来的语义过滤分层建模
- 明确 latest project content 和 release snapshot 的来源身份
- 明确可搜索文件、文件角色、语言检测和排除策略
- 通过索引提供稳定、可分页、可解释的搜索结果
- 暴露索引覆盖、陈旧、失败和部分结果状态
- 支持面向 admin 的首个使用界面，同时保持后端能力通用
- 保护私有项目源码和派生索引中的用户内容
- 为 `tree-sitter-xgo`、XGo 语义分析和后续代码迁移能力留下演进空间

非目标包括：

- 不定义 spx 专用 API 使用统计报告
- 不把后端 API 做成 spx 或任意单个 XGo classfile framework 专用接口
- 不把 Code Search 等同于社区项目搜索或 `/projects` keyword 搜索
- 不提供自然语言、embedding 或 LLM 语义相似搜索作为权威匹配机制
- 不要求第一阶段支持 resolved symbol 级精确匹配
- 不要求第一阶段支持完整 ast-grep 或 Semgrep 兼容
- 不把 lint、severity、message、fix、rule pack 或 codemod 作为第一阶段搜索契约
- 不在默认结果中暴露完整源码、原始 file collection、universal URL 或 signed URL
- 不让搜索引擎、对象存储或外部索引后端成为绕过后端授权的读取路径

## 核心概念

| 概念 | 含义 |
| - | - |
| Code Search | XBuilder 的项目代码搜索能力，覆盖文本搜索、语法级结构化搜索和未来的语义过滤 |
| 项目源 project source | 可被搜索的项目代码来源，如 latest project content 或 release snapshot |
| latest project content | `Project.files` 表示的当前项目文件集合，是可变来源 |
| release snapshot | `ProjectRelease.files` 表示的项目发布快照，是发布时复制出的文件集合 |
| source identity | 标识一次匹配来自哪个项目源、哪个文件、哪个内容版本和哪个索引版本的信息 |
| file collection | `path -> universal URL` 形式的项目文件集合 |
| searchable file | 被 Code Search 纳入索引和查询的文件 |
| file role | 文件在 XBuilder 项目模型中的角色，如 spx project code、spx sprite code、project config、sprite config、asset metadata、generated internal metadata 或 binary asset |
| text search | 面向源码文本的字面量、标识符、字符串、路径相关或正则搜索 |
| structural matching | 基于语法树的结构化匹配，用代码形态或语法节点描述要查找的源代码结构 |
| semantic filtering | 在文本搜索和结构化匹配候选结果上，使用 XGo 语义信息确认 resolved symbol、类型、接收者或 classfile 语义 |
| capture | 结构化匹配中命名的子树或子片段，带有源代码范围和文本 |
| coverage | 一次搜索实际覆盖了哪些项目源、哪些文件、哪些语言和哪些索引状态 |
| search index | 从项目源派生出的可搜索状态，不是项目源码的权威存储 |
| reindex | 因源内容变化、文件选择策略变化、解析器变化、matcher 变化或索引格式变化而重新生成派生索引 |

## 能力边界

Code Search 的后端能力应该保持通用。它接收来源范围、项目过滤、文件过滤、文本查询、结构化 matcher 和执行控制，返回匹配结果、诊断、覆盖信息和可选聚合摘要。具体客户端可以在此基础上组织出不同工作流，例如 admin 排查、项目迁移评估、框架兼容性审查或未来的代码迁移辅助。

Code Search 不应把某个工作流固化为后端契约。即使第一批实际需求来自维护 spx 这类 XBuilder 支持的 XGo classfile framework，后端 API 也不应该出现只能表达某个 framework 报告的结构。framework 相关能力应作为文件角色、语言、结构化 matcher 或未来语义过滤的组合出现。

Code Search 与社区项目搜索不同。社区项目搜索面向作品发现，查询对象是项目展示名、作者、可见性、排序和社区行为。Code Search 查询对象是项目源内的源码和选定项目元数据，结果需要具体文件、范围、snippet、captures、诊断和覆盖状态。

Code Search 与 XGo 编译器、XGo LSP 和 Tree-sitter grammar 的边界也需要清晰。Code Search 负责编排索引、检索、匹配、授权、结果和可观测状态。XGo 编译器或语言服务负责语义事实。`tree-sitter-xgo` 如果存在，负责提供 XGo 源码的 concrete syntax tree 和 Tree-sitter 生态兼容层。

## 系统边界

Code Search 处在 XBuilder 项目模型、项目文件存储、后台索引、查询 API 和客户端体验之间。

XBuilder 项目和发布仍然是源码来源的权威。`Project.files` 表示当前项目文件集合，`ProjectRelease.files` 表示发布快照文件集合。Code Search 索引只是这些来源的派生数据。

Code Search API 是查询和管理派生索引的权威入口。它负责授权、来源范围、过滤、matcher 校验、结果形态、覆盖信息、审计边界和完整源码读取边界。外部索引后端、对象存储、解析器或 matcher 都不应该成为客户端直接依赖的公共契约。

后台索引器负责从项目源读取 file collection，解析 universal URL，识别可搜索文件，提取可索引文本和必要元数据，运行语法解析或语义分析，并写入可搜索状态。索引器可以使用后台任务执行，但任务执行状态不应成为项目源是否可搜索的唯一权威。

搜索索引负责加速检索，不负责最终授权判断。PostgreSQL、`pg_trgm`、Zoekt、Tantivy 或 OpenSearch 都可以作为实现候选，但 API 不应暴露具体索引引擎、引擎查询语言或引擎评分模型。

XBuilder 管理台是第一客户端。它应该作为通用 Code Search 能力上的操作界面，而不是把后端能力变成 admin-only 或 spx-only。

## 可搜索语料

Code Search 的语料来自 XBuilder 项目源。项目源至少包括：

- latest project content，来自 `Project.files`
- release snapshot，来自 `ProjectRelease.files`

latest project content 是可变来源，保存项目后可能变化。release snapshot 是发布时复制出的来源，应该按发布快照理解。相同项目、相同路径在 latest project content 和不同 release snapshot 中可能代表不同内容。

一次查询必须显式声明或由 API 明确默认 source scope。结果也必须带回 source identity，不能只返回 owner、project 和 file path。否则调用方无法判断命中来自当前项目内容、某个发布快照，还是某个已经被后续保存覆盖的旧内容。

文件内容解析必须通过 universal URL 处理。一个 `data:` URL 可能直接包含文本源码或 JSON 元数据，一个 `kodo://` URL 可能指向较大的文本文件或二进制资产。索引器不能把存储 scheme 当成语言检测或文件角色判断依据。

对象存储只应该参与索引或重建索引时的内容读取。搜索请求如果已经有足够的索引文本、snippet 和结构化事实，不应该在热路径上反复读取对象存储。

## 文件选择与语言检测

Code Search 应索引用户相关的源码和选定项目元数据，而不是索引项目文件集合中的所有文件。

当前 XBuilder spx 项目的主要代码文件是：

- `main.spx`，表示 project 或 stage 级代码
- `<sprite>.spx`，表示 sprite 级代码

这些 `.spx` 文件应作为 XGo 语法处理。spx 是 XGo classfile framework，`main.spx` 是 project classfile，其他 sprite `.spx` 是 work classfile。这个角色影响文件元数据和未来语义分析，但不应该要求独立于 XGo 的另一套语法解析器。

现有 Stage 加载逻辑还兼容 `index.spx`、`main.gmx` 和 `index.gmx` 等历史 stage code 路径。是否纳入第一阶段索引是文件选择策略问题。若纳入，应保留原始 file path，并将其识别为 stage code 兼容路径。

已知 XBuilder JSON 文件应该按文件角色分类，而不是因为扩展名是 `.json` 就全部当成代码文件：

- `assets/index.json` 表示项目级配置，如 stage config、zorder、camera、tilemap path 和 runtime settings
- `assets/sprites/<name>/index.json` 表示 sprite 配置，如物理设置、碰撞形状、造型、动画和动画绑定
- sound、tilemap 等资源 JSON 表示资源级元数据，如资源路径、声音元数据、tilemap layers 和 decorators

这些 JSON 文件可以用于元数据提取、兼容性检查、迁移评估，以及可选的文本搜索或 JSON 结构化搜索。它们不应被当作 XGo 源码，也不应只按扩展名粗暴纳入。

生成的内部文件默认不应纳入普通 Code Search，例如 `builder-ai-description.md` 和 `builder-ai-description.hash`。图片、音频、视频等二进制资产也不属于代码语料。

索引器应保存明确的检测结果。检测结果至少应表达文件是否被纳入普通搜索、是否可文本搜索、是否可结构化搜索、检测语言、文件角色、使用的 parser 或 grammar，以及解析或检测诊断。

语言检测和文件角色判断不属于 Tree-sitter grammar 的职责。`tree-sitter-xgo` 应只负责解析 XGo 源码语法。`main.spx` 是否是 project classfile、某个 `.spx` 是否是 sprite classfile、某个 JSON 是否应索引，都属于 XBuilder 项目模型和文件选择策略。

## 搜索语义

Code Search 的搜索语义分为三层：

1. 文本搜索
2. 语法级结构化搜索
3. 未来的语义过滤

文本搜索用于在源码文本和选定元数据文本中查找字面量、标识符、selector、package path、字符串字面量、注释或 JSON key。它应该是代码导向、确定性、可解释的搜索，不应使用 stemming、synonym expansion、embedding similarity 或自然语言改写。

文本搜索中的多词行为必须显式。空白不应该悄悄改变为 phrase search、token search、AND、OR 或 fuzzy matching。第一阶段可以把查询作为一个 literal expression。后续如果支持 term query、phrase query、boolean query 或正则搜索，应作为明确模式。

大小写、标识符边界和标点行为也必须显式。`github.com/goplus/spx/v2`、`broadcast`、`Sprite.step`、字符串字面量和 JSON key 这类代码文本不能依赖搜索引擎默认 analyzer 意外决定匹配语义。

结构化搜索用于通过代码形态查找源代码结构。它应该匹配语法树中的 node 或 subtree，并返回源代码范围、captures、snippet 和诊断。第一阶段的结构化搜索应保持语法级，不应声称已经理解 resolved symbol、类型、隐式 receiver、framework package lookup 或 classfile lowering。

面向人编写的结构化查询可以参考 ast-grep-like pattern。它比原始 Tree-sitter query 更接近代码写法，适合 admin 页面中的查询编辑。第一阶段不需要承诺完整 ast-grep 兼容，除非实现确实使用 ast-grep。一个明确记录的子集是可以接受的，前提是未支持能力必须被校验拒绝，而不是静默忽略。

结构化查询的有用子集可以包含：

- `pattern`，用于代码形态匹配
- `context` 和 `selector`，用于需要解析上下文的片段
- metavariables 和 captures
- capture constraints，如 node kind、text regex 和 nested pattern
- 位于 matcher 外部的 source scope、project filter、file filter、language 和 path 过滤

Tree-sitter query 仍然是重要的低层参考。它可以描述 node kind、field、capture、anonymous node、wildcard 和 parser error node。它适合内部调试、高级能力或实现层，但作为 admin 首选查询格式会偏语法树细节。

语义过滤是结构化候选之后的可选层。它用 XGo 语义信息确认某个 capture 是否解析到特定 package symbol、type、method、field、receiver 或 framework-provided member。语义过滤结果应暴露状态，如 syntax-only、semantic-confirmed、semantic-unavailable、semantic-failed 或 ambiguous。

语义过滤不属于第一阶段语法级结构化搜索的必需条件。即使语义层暂不可用，Code Search 也应能返回 syntax-level 匹配，并清楚标识这些结果不是语义精确结果。

## `tree-sitter-xgo` 与 XGo 语义

如果第一阶段包含语法级结构化搜索，`tree-sitter-xgo` 值得作为 XGo 官方语法工件评估，而不是只作为 XBuilder 后端内部实现细节。

Tree-sitter grammar 将语言的 concrete source syntax 暴露给多种工具。它可以支持语法树查询、语法高亮、locals、injections、tags、浏览器侧 Wasm 解析、Tree-sitter 编辑器生态和 ast-grep custom language。对于 Code Search，它可以提供稳定的语法树基础，也可以让 admin 页面获得更好的本地校验和预览体验。

基于 XGo classfile 语法，一个 `tree-sitter-xgo` 应足够覆盖语法层。XGo classfile frameworks 共享同一类源代码形态。framework 差异来自文件分类、registry metadata、base class、work class、隐式 receiver 查找、生成方法和 project/work assembly。这些是语义和 lowering 问题，不应拆成每个 framework 一套 grammar。

`tree-sitter-xgo` 应覆盖 XGo 和 classfile 的共享源码语法，包括普通 XGo 文件、XGo classfile、省略 package clause 的 classfile、classfile declaration 之前的 imports、top-level statements、field declarations、tags，以及 classfile-only static method declaration，如 `func .Name(...)`。

`tree-sitter-xgo` 不应编码 framework-specific 或语义行为。例如它不应判断一个文件是 project classfile 还是 work classfile，不应判断某个 class extension 属于哪个 framework registration，不应判断 base class 或 work class，不应判断某个 identifier 是否通过隐式 receiver 或 framework package lookup 解析，也不应判断某个匹配是否解析到特定 package symbol。

XGo 语义分析仍然是语义事实的来源。spx 项目的 `.spx` 文件不是孤立脚本。它们的含义依赖 classfile framework metadata、自动导入、生成成员、project/work 组合和 workspace 文件集合。Code Search 的 resolved symbol 分析应该使用与 XBuilder editor-side language service 一致的项目级上下文，而不是孤立解析某个 `.spx` 文件。

## 查询模型与 API 边界

Code Search 的 API 不应把文本搜索、结构化 matcher、路径过滤、项目过滤、来源范围和未来语义过滤压缩进一个自由字符串。请求结构应该把这些关注点分开，让校验、授权、索引、执行和 UI 反馈都可解释。

请求模型应包含以下逻辑部分：

- source scope，如 latest project content、release snapshot 或二者组合
- project filters，如 owner、project identity、project type、visibility、project full name 或 release full name
- file filters，如 path、language、file role、text-searchable status 或 structurally-searchable status
- text query，用于 literal、identifier-oriented、phrase、boolean 或 regex 搜索
- structural matcher，用于语法级结构化匹配
- future semantic filters，用于 resolved symbol 或 XGo 语义过滤
- execution controls，如 result limit、pagination、timeout、partial result policy 和 execution mode

结构化 matcher 需要独立 validation 能力。调用方应该能在执行宽范围搜索之前校验 pattern、unsupported features、parser availability、language mismatch 和 file role mismatch。校验诊断应该足够让 admin 页面给出快速反馈。

执行模式需要明确。简单文本搜索和窄范围结构化搜索可以同步返回分页结果。跨所有用户项目的宽范围结构化搜索可能需要超时、部分结果、异步执行或更严格的过滤要求。API 不应把未覆盖、超时或失败包装成普通空结果页。

API 不应暴露底层引擎是否使用 PostgreSQL、Zoekt、Tantivy、OpenSearch、Tree-sitter query 或 ast-grep。公共契约应暴露 Code Search 概念，如 source identity、match range、captures、diagnostics、coverage、counts、grouping 和 freshness。

## 结果模型

Code Search 的核心结果应该是 match-oriented。一个 result item 表示某个项目源中某个文件里的一个具体匹配，而不是只表示一个项目或一个文件。

一个匹配结果应包含：

- source identity，包括 source kind、project identity 和 release identity
- file path、file role、language 和 parser 或 matcher 信息
- matched range，包括行列或可映射到源码的范围
- snippet 和 matched text
- captures，包括 capture name、range 和 text
- match kind，如 text match 或 structural match
- semantic status，如果语义过滤或语义标注参与执行
- freshness 和 coverage 信息，如 indexed time、source hash、index format version、stale status、parse diagnostics 或 matcher diagnostics

默认结果不应返回完整 source file、完整 file collection、universal URL 或 signed URL。完整源码读取应该是单独授权的操作，且需要清楚的审计边界。

结果需要支持 grouping 和 counts，但 grouping 不应替代核心匹配结果。客户端可能按 project、owner、file、source kind、language、file role、match kind、parser status 或 semantic status 分组。后端可以返回通用 summaries，但不应把某个工作流的聚合方式固化成唯一结果。

计数语义必须明确。match count、file count、source count、project count 和 owner count 不是同一个数字。一个项目可以有多个 source，一个 source 可以有多个文件，一个文件可以有多个匹配。release snapshot 是否纳入、是否与 latest project content 去重，也会改变 project count。

分页结果中的 totals 必须说明含义。普通 XBuilder list API 的 `ByPage<T>` 使用 exact `total`，但 Code Search 对宽范围结构化查询、部分执行、超时或外部索引后端不一定总能提供完整精确 total。API 应区分 exact、approximate、unavailable 和 incomplete。

没有匹配、没有覆盖、索引陈旧、索引失败、结构化 parser 不可用、文件被策略排除，是不同状态。结果和 summary 必须让调用方能区分这些状态。

## 索引与维护

Code Search 索引是派生数据。项目源码的 source of truth 仍然是 `Project.files` 和 `ProjectRelease.files`。

搜索请求应该读取已索引的可搜索状态，而不是在请求路径上扫描所有 project files、解析所有 universal URL 或重建源码索引。项目保存、发布创建和普通用户编辑流程也不应等待解析、匹配或索引更新完成。

索引状态应由 Code Search 域拥有。它需要记录哪个 source 被索引、哪个 file collection 或 file content 生成了索引、哪个索引逻辑版本生成了索引，以及当前状态是 current、stale、failed 还是 in progress。

索引维护至少包含三类流程：

1. 初始 backfill，用于既有 latest project sources 和选定 release sources
2. 增量维护，用于 source content 变化、release 创建、删除、rename 或 visibility 变化
3. 重建索引，用于 file selection policy、language detection、parser、matcher 或 index schema 变化

内容变化需要重新索引。metadata-only 变化可能只需要更新 source identity、authorization metadata 或 visibility metadata。parser、matcher 或 file selection policy 变化即使没有源文件变化，也可能要求 reindex。

索引必须是幂等且版本感知的。索引结果应绑定 source identity、source content hash 或 version，以及 index format version。如果更新的 source content 或更新的 index format 已经存在，旧任务结果不能覆盖当前可搜索状态。

手动 reindex 应作为运维控制存在。它应该触发后台索引工作，而不是在请求内联执行。reindex 可以按单个 project source、owner、project scope、failed records、stale records 或旧 index format version 定位。

搜索执行和 reindex 请求是不同操作。搜索请求询问当前可搜索状态中的匹配。reindex 请求要求后端刷新派生数据。搜索应在索引或重建进行中继续可用，并通过 coverage 信息说明哪些 source 当前未索引、陈旧、失败或仍在索引中。

## 权限、隐私与审计

全局项目代码搜索是对用户创建内容的特权读取路径。它不是普通项目元数据查询。

XBuilder 当前项目访问模型包含 owner 和 visibility。公开项目可被非 owner 读取，私有项目通常要求 owner。release snapshot 没有独立 visibility，应跟随所属项目。admin 级 Code Search 如果纳入私有项目，就引入了跨用户读取源码的新路径。

权限边界必须显式。能够访问 `/admin/*` 或管理 Account 资源，不应自动获得 Code Search 权限。Code Search 需要独立 capability，或明确映射到某个经过文档定义的 capability。

搜索索引与源文件具有相同隐私等级。索引文本、snippet、captures、parse tree 和 extracted facts 都可能包含用户源码或项目元数据。如果使用外部搜索后端，该后端不能成为绕过后端授权和审计的第二读取路径。

授权应在搜索执行和结果详情读取时执行，而不只是在建立索引时执行。索引中的 visibility 和 owner metadata 可以用于过滤，但最终权限判断仍应由后端负责。visibility 变化、项目删除和角色变化必须在索引清理完成前也能影响可见性。

搜索结果默认不应暴露 raw file collection、universal URL、signed URL 或完整源码。`data:` URL 可以直接包含完整文本，`kodo://` URL 可以指向用户内容。默认结果应返回 source identity、file path、range、snippet、captures 和 diagnostics。

Code Search 应写入 admin audit logs。审计记录应避免保存完整源码、完整 snippet、captures、signed URL 或用户内容。适合审计的字段包括 source scope、visibility scope、language、matcher mode、query hash、result count、是否包含 private project content、是否 partial、duration 和 actor。

普通用户可见搜索和 privileged admin search 应区分。后端能力可以通用，但实际 searchable corpus 必须来自调用者的 authorization context。普通用户可能只能搜索自己的项目和公开项目，admin workflow 才能在具备 capability 和审计的前提下搜索更广范围。

## Admin 体验

第一个客户端可以是 XBuilder 管理台页面。该页面应是通用 Code Search 能力上的工具界面，不是 spx 专用报告页面。

现有 `/admin/*` 页面是 capability-gated 的操作页面，通常包含 URL-backed filters、pagination、refresh、loading、error states、table/detail navigation 和权限提示。Code Search 管理台页面应沿用这种操作台形态，但查询界面会比普通资源列表更复杂。

管理台需要组合结构化请求，而不是只提供一个搜索框。合理控件包括：

- source scope 选择
- owner、project、visibility 和 project type 过滤
- file path、language、file role 和 searchable status 过滤
- text query 输入和模式选择
- structural matcher 编辑器
- validation 按钮或自动校验反馈
- result limit、timeout 和 partial result 设置
- grouping 和 summary 展示

轻量状态应该写入 URL，例如 filters、source scope、pagination 和 selected mode。长文本或多行结构化 pattern 不一定要完整塞进 query parameters。可复现性重要，但不应扭曲请求模型。

结构化 matcher 需要先验证再执行宽范围查询。页面应展示 pattern diagnostics、unsupported features、parser availability 和 file-language mismatch。`tree-sitter-xgo` 或 matcher 不可用时，应作为 parser 或 matcher coverage 显示，而不是表现成没有结果。

如果浏览器侧 Tree-sitter-compatible XGo grammar 可用，客户端可以提供本地解析、query validation 和 match preview。这只是编辑体验辅助。后端校验仍然是权威，因为真实搜索运行在后端索引、后端 parser version、matcher version、文件选择策略和授权上下文上。

结果检查是管理台体验的核心。每个结果都应能作为一个 source file 中的一个 match 被查看，带有 project identity、source kind、file path、matched range、snippet、captures、freshness state 和 diagnostics。管理台可以按 project 或 file 分组展示，但后端核心结果不应只返回 project-level counts。

导航必须 source-aware。latest project content 的命中可以链接到当前项目或编辑器上下文。release snapshot 的命中不能被呈现为来自可变的 latest project files。结果需要足够的 source identity，让客户端决定链接到项目页、编辑器、release history 或只读源码预览。

## 生态参考

Code Search 应贴近业内成熟代码搜索和结构化搜索约定，但不需要复制任何单一产品。

GitHub Code Search 和 Sourcegraph Code Search 都将查询文本与 repo、language、path、symbol、content、visibility、count 或 timeout 等过滤条件区分开。这支持 Code Search 将 source scope、project filters、file filters、text query、structural matcher 和 execution controls 分开建模，而不是复制单字符串查询语言。

GitHub 和 Sourcegraph 的文本搜索也说明，代码搜索应该保持解释性。正则、boolean 行为、path 过滤、language 过滤、大小写和结果限制都应明确，而不是依赖自然语言检索或 embedding similarity。

ast-grep 和 Semgrep 是人类编写结构化查询的重要参考。二者都使用 code-like patterns 和 metavariables。Code Search 可以采用 ast-grep-like 子集作为结构化查询风格，但不应把 lint、severity、message、fix、taint 或 rule pack 引入第一阶段搜索契约。

Sourcegraph Structural Search 是性能边界的提醒。跨全部项目的无文本锚点结构化查询应该被视为独立执行形态，需要 filters、limits、partial coverage、timeout 或 asynchronous execution。

CodeQL 代表更重的语义分析模型。它依赖语言特定 database、AST、data flow、control flow、name binding 和 type information。Code Search 第一阶段不应直接走 CodeQL-like 路线，但可以保留未来 semantic facts 和 resolved symbol filtering 的接口空间。

Zoekt、Tantivy、OpenSearch 和 PostgreSQL `pg_trgm` 是实现参考，而不是公共 API 参考。它们可以影响索引实现，但不应该决定 Code Search 的公共概念、结果模型或权限边界。

## 后续演进方向

第一阶段应同时包含文本搜索和语法级结构化搜索的最小可用能力。只有文本搜索会让许多代码形态问题难以表达，直接进入 resolved symbol 级语义搜索又会过早绑定 XGo 编译和 classfile 语义。

语法级结构化搜索应优先围绕 XGo 语法和 `.spx` 文件落地。`tree-sitter-xgo` 如果成熟，可以作为长期语法树基础。如果它尚未成熟，后端实现可以采用更小的内部结构化 matcher 或其他可替换实现，但公共契约仍应保持语法级 matcher 的语义。

语义过滤应作为后续层接入。它用于确认 resolved package、type、method、field、receiver、implicit receiver 或 framework-provided member。语义事实应来自 XGo 拥有的编译器、语言服务或语义分析组件，而不是 Tree-sitter grammar。

索引后端应可替换。小规模或第一阶段可以由 PostgreSQL 管理 metadata、freshness、权限信息、索引状态和部分文本检索。随着数据量和查询复杂度增长，可以评估 Zoekt、Tantivy 或 OpenSearch。API 不应因后端替换而改变核心语义。

未来可以在 Code Search 结果之上构建更高层工作流，例如迁移候选列表、批量 review queue、framework 兼容性审查或代码迁移辅助。自动改写或全局代码编辑属于后续能力，不属于第一阶段 Code Search 契约。

## 待收敛事项

以下事项需要在后续 OpenAPI、后端实现或阶段计划中收敛：

- 第一阶段默认 source scope 是 latest project content、release snapshot 还是两者都支持
- 第一阶段具体纳入哪些 JSON file roles
- 历史 stage code 路径是否进入第一阶段索引
- 文本搜索的第一批模式是 literal、identifier-oriented、phrase、boolean 还是 regex
- 结构化 matcher 的第一批 ast-grep-like 子集范围
- `tree-sitter-xgo` 的成熟度与后端结构化搜索时间线如何协调
- 索引是否存储完整 searchable text、snippet cache、parse tree、extracted facts 或仅存引用
- 初始实现使用 PostgreSQL `pg_trgm` 还是引入独立搜索索引
- 宽范围结构化查询使用同步 partial result、异步执行，还是要求更强过滤条件
- Code Search admin capability 的命名、授权映射和审计字段

这些事项不改变本文档的核心边界。Code Search 应保持通用、分层、source-aware、match-oriented、可审计，并且不把某个 framework 或某个 admin 工作流编码进后端能力。

## 参考资料

- [goplus/builder#3331](https://github.com/goplus/builder/issues/3331)
- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Tree-sitter query syntax](https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html)
- [ast-grep pattern syntax](https://ast-grep.github.io/guide/pattern-syntax.html)
- [Semgrep pattern syntax](https://docs.semgrep.dev/writing-rules/pattern-syntax)
- [GitHub Code Search syntax](https://docs.github.com/en/search-github/github-code-search/understanding-github-code-search-syntax)
- [Sourcegraph Code Search queries](https://sourcegraph.com/docs/code-search/queries)
- [Sourcegraph Structural Search](https://sourcegraph.com/docs/code-search/types/structural)
- [CodeQL overview](https://codeql.github.com/docs/codeql-overview/about-codeql/)
- [PostgreSQL `pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Zoekt](https://github.com/sourcegraph/zoekt)
- [Tantivy](https://github.com/quickwit-oss/tantivy)
- [OpenSearch full-text queries](https://docs.opensearch.org/latest/query-dsl/full-text/)
