package tutorial

// Editor 汇集与"学习者所在的项目编辑器"有关的能力。
//
// 四个子 namespace 的分工是评审里逐条谈定的：
//   - Project：读**项目模型**的内容，按业务概念（精灵名）寻址；
//   - Runtime：观察学习者项目的**运行**（启动、退出、日志）；
//   - CodeEditor：控制**编辑器 UI**本身（过滤 API、格式化）；
//   - Ruler：舞台上的度量教具。
//
// 特别注意 Project 与 CodeEditor 的边界：读代码归 Project（因为 SpxProject 的既有
// 接口都是围绕业务概念及其名字定义的），控 UI 归 CodeEditor。"读学习者当前正在编辑的
// 那份代码"这个语义**刻意还没提供**——它取决于 code-editor 如何暴露 attached UI 与
// active document，等那边定了再补。
type Editor struct {
	Project    Project
	Runtime    Runtime
	CodeEditor CodeEditor
	Ruler      Ruler
}

// init 把四个子 namespace 接到课程的运行状态上，由 Course.initCourse 调用。
func (p *Editor) init(program *courseProgram) {
	p.Project.courseProgram = program
	p.Runtime.courseProgram = program
	p.CodeEditor.courseProgram = program
	p.Ruler.courseProgram = program
}

// Project 读取学习者正在编辑的会话项目。
type Project struct {
	courseProgram *courseProgram
}

// GetCode 返回指定精灵在会话项目中的当前代码。
//
// 用精灵名而不是文件路径寻址，是为了跟 SpxProject 的既有接口风格一致；作者不需要知道
// "Lita" 对应的是 Lita.spx 这个 spx 约定。精灵不存在时 capability 会失败 → panic，
// 这样作者拼错名字会在 Preview 阶段就炸出来，而不是拿到空串继续跑。
func (p *Project) GetCode(sprite string) string {
	var code string
	p.courseProgram.mustCallCapability("editor_project_getCode", struct {
		Sprite string `json:"sprite"`
	}{Sprite: sprite}, &code)
	return code
}

// ListSprites 列出会话项目里的精灵名。
//
// 存在的理由是一类具体课程：目标是"让学习者自己创建一个精灵"时，作者无法预知学习者
// 会起什么名字，只能运行时问项目要。
func (p *Project) ListSprites() []string {
	var sprites []string
	p.courseProgram.mustCallCapability("editor_project_listSprites", struct{}{}, &sprites)
	return sprites
}

// Runtime 观察学习者项目的运行状态。
//
// 这三个 OnXxx 只是把回调登记到课程的运行状态里，真正的事件注册在程序启动时就一次性
// 完成了（见 program.go 的 registerEvents）。因此"课程没订阅某事件"和"课程订阅了"
// 对宿主而言毫无区别，宿主不需要知道课程内部订阅了什么。
type Runtime struct {
	courseProgram *courseProgram
}

// OnStart 注册"学习者的项目开始运行"的回调，可注册多个，按注册顺序依次执行。
func (p *Runtime) OnStart(handler func()) {
	p.courseProgram.addHandler(func(h *handlers) { h.runtimeStart = append(h.runtimeStart, handler) })
}

// OnExit 注册"学习者的项目退出"的回调，code 是退出码。可注册多个。
func (p *Runtime) OnExit(handler func(code int)) {
	p.courseProgram.addHandler(func(h *handlers) { h.runtimeExit = append(h.runtimeExit, handler) })
}

// OnLog 注册"学习者的项目输出了一条日志"的回调，每条恰好触发一次、按输出顺序。
//
// 这是判定的主通道：课程项目的场景代码在关键事件发生时 println 一个约定好的字符串
// （比如 "reached-target"），课程代码在这里等这个信号，就能知道学习者"做到了什么"。
// 只有 kind=log 的输出会进来，运行错误不走这条通道，以免污染判定。
//
// 可以注册多个：一节课有两条判定线索时，分开写两段比挤在一个 if-else 里清楚。
// 同一条日志会按注册顺序依次交给它们。
func (p *Runtime) OnLog(handler func(log string)) {
	p.courseProgram.addHandler(func(h *handlers) { h.runtimeLog = append(h.runtimeLog, handler) })
}

// CodeEditor 控制学习者写代码的编辑器。
type CodeEditor struct {
	courseProgram *courseProgram
}

// FilterAPIs 限制编辑器辅助（API Reference、补全等）里出现的 API，
// 让一节课只暴露它要教的东西，降低认知负担。
//
// 每个条目是完整的 definition identifier，形如
// "xgo:github.com/goplus/spx/v3?Sprite.stepTo"；省略 #<overloadId> 表示该名字的
// 全部重载。之所以不支持 "stepTo" 这样的简写，是因为把简写解析成完整标识需要一份
// 映射逻辑，而那份逻辑无法可靠地假定 package 一定是 spx、receiver 一定是 Sprite。
// 作者的书写负担由 Course Editor 的写课辅助来解决。
func (p *CodeEditor) FilterAPIs(apis []string) {
	p.courseProgram.mustCallCapability("editor_codeEditor_filterAPIs", struct {
		APIs []string `json:"apis"`
	}{APIs: apis}, nil)
}

// FormatWorkspace 格式化学习者的代码，格式化完成后返回。
func (p *CodeEditor) FormatWorkspace() {
	p.courseProgram.mustCallCapability("editor_codeEditor_formatWorkspace", struct{}{}, nil)
}

// Ruler 是舞台上的标尺——帮学习者建立坐标与距离直觉的教具。
type Ruler struct {
	courseProgram *courseProgram
}

// Show 在舞台上显示标尺。
func (p *Ruler) Show() {
	p.courseProgram.mustCallCapability("editor_ruler_show", struct{}{}, nil)
}

// Hide 收起标尺。
func (p *Ruler) Hide() {
	p.courseProgram.mustCallCapability("editor_ruler_hide", struct{}{}, nil)
}
