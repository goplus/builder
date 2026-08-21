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
// 运行状态放在 program 字段里，各 namespace 在 initCourse 时拿到它的指针；
// 这与 spx 的结构一致：spx 的 Game 也是自己持有 scriptEventRegistry，
// Game 与各精灵通过 scriptEventBindings 共享同一份注册表。
type Course struct {
	Editor    Editor
	Copilot   Copilot
	Spotlight Spotlight

	program courseProgram
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
	p.program.init()
	p.Editor.init(&p.program)
	p.Copilot.program = &p.program
	p.Spotlight.program = &p.program
	return p
}

// OnStart 注册课程开场回调。
//
// 它在 MainEntry 执行完（也就是所有回调都注册完）之后才被调用，因此课程代码可以
// 放心地在 onStart 里立刻做判定相关的事，不用担心此时事件回调还没挂上。
//
// 可以注册多个，按注册顺序依次执行。
func (p *Course) OnStart(handler func()) {
	p.program.addHandler(func(h *handlers) { h.courseStart = append(h.courseStart, handler) })
}

// ShowPrelude 展示开场任务引导，等学习者确认后才返回。
// 与 ShowMessage 的区别只在宿主的呈现形态（开场引导 vs 普通对话框），
// 框架这侧只是两个不同的 capability 名。
func (p *Course) ShowPrelude(preludeMessage string) {
	p.program.mustCallCapability("course_showPrelude", contentRequest{Content: preludeMessage}, nil)
}

// ShowMessage 展示对话框，等学习者确认后才返回。
//
// 阻塞是刻意的：契约规定展示类能力一律等学习者看完再继续，不做"自动推进"。
// 这样课程代码写下来就是顺序脚本，作者不需要理解异步。
func (p *Course) ShowMessage(message string) {
	p.program.mustCallCapability("course_showMessage", contentRequest{Content: message}, nil)
}

// ShowVideo 播放课程内的讲解视频，等学习者看完或关闭后才返回。
// videoPath 是课程包内的相对路径（如 assets/step-to.mp4）；
// 若 #3437 合入，这里会变成"已声明的视频资源名"，只是参数含义变，签名不变。
func (p *Course) ShowVideo(videoPath string) {
	p.program.mustCallCapability("course_showVideo", struct {
		VideoPath string `json:"videoPath"`
	}{VideoPath: videoPath}, nil)
}

// Complete 标记课程完成。
//
// 完成语义（契约里的"方案 A"）：调用后**当前回调会继续执行到底**，然后事件循环退出、
// 程序结束，执行器把这次运行报成 completed。之所以不在这里直接终止，是因为 Complete
// 是在作者回调的调用栈里被调用的，强行退出会让"complete 之后的语句到底执不执行"
// 变成一件说不清的事。
//
// 重复调用会被忽略，见 courseProgram.markCompleted。
func (p *Course) Complete() {
	if !p.program.markCompleted() {
		return
	}
	p.program.mustCallCapability("course_complete", struct{}{}, nil)
}

// CompleteWith 是带一句反馈的 Complete，语义完全相同。
// 典型用法是先用 Copilot.generateText 根据学习者的最终代码生成评语，再传进来。
func (p *Course) CompleteWith(message string) {
	if !p.program.markCompleted() {
		return
	}
	p.program.mustCallCapability("course_completeWith", contentRequest{Content: message}, nil)
}

// Start 运行课程程序：先执行开场回调，然后进入事件循环。
//
// 事件循环是整个框架的核心约束所在：
//   - **单消费者**：所有课程回调都在这一个 goroutine 上跑，因此课程代码天然是
//     单线程的，作者不需要考虑并发。
//   - **保序**：队列是 FIFO，日志按宿主投递的先后顺序交给课程——契约里
//     editor.runtime.log "按追加顺序、每条恰好一次"就是靠这里保证的。
//   - **完成即退出**：每处理完一个回调就检查完成标志，一旦完成就返回，
//     积压的事件不再处理（契约规定完成后的事件应被放弃）。
//
// 如果课程在 MainEntry 或 onStart 里就完成了，循环一次都不会进。
func (p *Course) Start() {
	for _, handler := range p.program.handlerSnapshot().courseStart {
		if p.program.isCompleted() {
			break
		}
		handler()
	}

	p.program.mu.Lock()
	events := p.program.events
	p.program.mu.Unlock()

	for !p.program.isCompleted() {
		callback, ok := <-events
		if !ok {
			return
		}
		callback()
	}
}

// Gopt_Course_Main 是 classfile 约定的程序入口，由 XGo 生成的 Main 调用。
//
// 顺序很重要：先拿到内嵌实例、初始化状态并注册全部事件，再执行 MainEntry（作者代码
// 在这里注册各种回调），最后进入 Start。反过来的话，MainEntry 里注册的回调会被
// initCourse 的重置清掉。
func Gopt_Course_Main(course CourseProto) {
	course.initCourse().program.registerEvents()
	course.MainEntry()
	course.Start()
}
