// Package tutorial 是 Tutorial Class Framework（课程类框架）。
//
// 一节目标式课程（Playground Course）就是一段用本包写成的 XGo 程序：课程代码负责
// 交代任务、观察学习者做了什么、并决定何时算达成目标。框架把这些调用翻译成前端
// capability，再把宿主事件按顺序投递回课程程序自己的 goroutine 上。
//
// 三层关系：
//
//	课程代码（main_course.gox，ixgo 解释执行）
//	  ↓ 方法调用
//	本包（编译进 xgoexec.wasm 的原生 Go）
//	  ↓ capability（阻塞式，走 xgoexec 的 JSON 桥）
//	前端宿主（Tutorial 模块组装的 TutorialFrameworkHost）
//
// 契约见 docs/develop/tutorial-v2：module_TutorialFramework.ts 是宿主侧接口，
// tutorial-class-framework.go 是作者侧 API，两者要与本包保持一致。
package tutorial

// XGoPackage 标记本包是一个 XGo 包（新式写法，旧式为 GopPackage）。
// classfile 机制依赖它来识别可作为工程类框架使用的包。
const XGoPackage = true

// Course 是每个课程程序继承的类。
//
// XGo classfile 会生成类似这样的代码，把本类型嵌进课程自己的类里：
//
//	type Course struct { tutorial.Course }
//	func (this *Course) MainEntry() { ...课程代码... }
//	func (this *Course) Main() { tutorial.Gopt_Course_Main(this) }
//
// namespace 字段必须**导出（大驼峰）**：XGo 只会把方法调用自动转成大驼峰
// （showMessage → ShowMessage），字段访问不会转。所以课程代码里写的是
// Editor.CodeEditor.filterAPIs——前两段是字段、大写，最后一段是方法、小写。
//
// 运行状态放在 courseProgram 字段里，各 namespace 在 initCourse 时拿到它的指针；
// 这与 spx 的结构一致：spx 的 Game 也是自己持有 scriptEventRegistry，
// Game 与各精灵通过 scriptEventBindings 共享同一份注册表。
type Course struct {
	Editor    Editor
	Copilot   Copilot
	Spotlight Spotlight

	courseProgram courseProgram
}

// CourseProto 是 XGo 生成的课程类需要满足的接口。
//
// 三个方法的来源各不相同：
//   - initCourse 与 Start 由本包的 Course 提供，通过内嵌被提升到生成的课程类上；
//   - MainEntry 由 XGo 生成，函数体就是作者写在 main_course.gox 顶层的代码。
//
// initCourse 未导出，因此只有内嵌了 tutorial.Course 的类型才可能满足本接口——
// 这既是 spx 里 Gamer.initGame 的同款做法，也让入口函数能从"陌生的用户类"里
// 取出内嵌的 *Course 实例来完成接线。
type CourseProto interface {
	initCourse() *Course
	MainEntry()
	Start()
}

// contentRequest 是"只带一段文本"的 capability 请求形状。
// 字段名 content 沿用 #3424 骨架里已经确立的 wire 约定，宿主按此解码。
type contentRequest struct {
	Content string `json:"content"`
}

// initCourse 初始化运行状态并把各 namespace 接到同一份状态上，返回内嵌的 Course。
func (p *Course) initCourse() *Course {
	p.courseProgram.init()
	p.Editor.init(&p.courseProgram)
	p.Copilot.courseProgram = &p.courseProgram
	p.Spotlight.courseProgram = &p.courseProgram
	return p
}

// OnStart 注册课程开场回调。
//
// 它在 MainEntry 执行完（也就是所有回调都注册完）之后才被调用，因此课程代码可以
// 放心地在 onStart 里立刻做判定相关的事，不用担心此时事件回调还没挂上。
//
// 可以注册多个，按注册顺序依次执行。
func (p *Course) OnStart(handler func()) {
	p.courseProgram.addHandler(func(h *handlers) { h.courseStart = append(h.courseStart, handler) })
}

// ShowPrelude 展示开场任务引导，等学习者确认后才返回。
// 与 ShowMessage 的区别只在宿主的呈现形态（开场引导 vs 普通对话框），
// 框架这侧只是两个不同的 capability 名。
func (p *Course) ShowPrelude(preludeMessage string) {
	p.courseProgram.mustCallCapability("course_showPrelude", contentRequest{Content: preludeMessage}, nil)
}

// ShowMessage 展示对话框，等学习者确认后才返回。
//
// 阻塞是刻意的：契约规定展示类能力一律等学习者看完再继续，不做"自动推进"。
// 这样课程代码写下来就是顺序脚本，作者不需要理解异步。
func (p *Course) ShowMessage(message string) {
	p.courseProgram.mustCallCapability("course_showMessage", contentRequest{Content: message}, nil)
}

// ShowVideo 播放课程内的讲解视频，等学习者看完或关闭后才返回。
//
// videoName 是**已声明的视频资源名**而不是文件路径：视频以
// assets/videos/<name>/index.json 的形式声明，作者写 showVideo "step-to"。
// 这样课程语言服务能在写课时就检查视频是否存在、名字有没有拼错，
// 而不是等到课程跑起来才失败。
func (p *Course) ShowVideo(videoName string) {
	p.courseProgram.mustCallCapability("course_showVideo", struct {
		VideoName string `json:"videoName"`
	}{VideoName: videoName}, nil)
}

// Complete 标记课程完成。
//
// 完成语义：调用后新事件不再投递、积压事件被放弃；**已在执行或挂起中的回调
// 把剩余语句执行完**（此时宿主对展示类 capability no-op 即回），全部收尾后
// 程序结束，执行器把这次运行报成 completed。之所以不在这里直接终止，是因为
// Complete 是在作者回调的调用栈里被调用的，强行退出会让"complete 之后的语句
// 到底执不执行"变成一件说不清的事。
//
// 重复调用会被忽略，见 courseProgram.markCompleted。
func (p *Course) Complete() {
	if !p.courseProgram.markCompleted() {
		return
	}
	p.courseProgram.mustCallCapability("course_complete", struct{}{}, nil)
}

// CompleteWith 是带一句反馈的 Complete，语义完全相同。
// 典型用法是先用 Copilot.generateText 根据学习者的最终代码生成评语，再传进来。
//
// 参数名与契约（tutorial-class-framework.go）一致取 message，载荷沿用展示类能力
// 统一的 {content} 形状；宿主侧若按其他字段名读取，应向契约对齐。
func (p *Course) CompleteWith(message string) {
	if !p.courseProgram.markCompleted() {
		return
	}
	p.courseProgram.mustCallCapability("course_completeWith", contentRequest{Content: message}, nil)
}

// Start 运行课程程序：启动各事件通道，按注册顺序执行开场回调，然后等课程结束。
//
// 执行模型的三条约束（详见 courseProgram 与 eventLane 的注释）：
//   - **单执行、多在途**：任一瞬间只有执行令牌的持有者在跑课程代码（共享变量
//     因此没有数据竞争）；回调在等待类 capability（展示、LLM）期间让出令牌挂起，
//     其他事件的回调照常执行。
//   - **保序**：同一事件的触发严格按到达顺序处理，同一事件上的多个回调按注册
//     顺序执行——契约里 editor.runtime.log "按追加顺序、每条恰好一次"由此保证。
//     不同事件的回调之间没有顺序承诺，可能在等待点交错。
//   - **完成即收尾**：complete 之后新事件不再投递、积压事件被放弃；已在执行或
//     挂起的回调把剩余语句执行完（此时宿主对展示类 capability no-op 即回），
//     全部收尾后程序结束。
//
// 开场回调在调用方 goroutine 上依次执行；某个开场回调在等待类 capability 上
// 挂起时，事件回调可以先行执行。
func (p *Course) Start() {
	program := &p.courseProgram
	program.startLanes()
	for _, handler := range program.handlerSnapshot().courseStart {
		if program.isCompleted() || program.fatalValue() != nil {
			break
		}
		program.runFrame(handler)
	}
	program.awaitEnd()
}

// Gopt_Course_Main 是 classfile 约定的程序入口，由 XGo 生成的 Main 调用。
//
// 顺序很重要：先拿到内嵌实例、初始化状态并注册全部事件，再执行 MainEntry（作者代码
// 在这里注册各种回调），最后进入 Start。反过来的话，MainEntry 里注册的回调会被
// initCourse 的重置清掉。MainEntry 也以帧的形式执行——作者在顶层直接调用
// showMessage 之类的能力同样成立。
func Gopt_Course_Main(course CourseProto) {
	program := &course.initCourse().courseProgram
	program.registerEvents()
	program.runFrame(course.MainEntry)
	course.Start()
}
