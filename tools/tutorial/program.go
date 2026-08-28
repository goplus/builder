package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// eventQueueSize 是每条回调通道的待处理队列容量。
//
// 回调在等待类 capability（见 capabilityKinds）期间会让出执行权，其他回调的
// 处理照常进行，所以队列在等待期间是持续排空的，正常课程远够不着这个上限。
// 打满意味着课程程序真的失控（比如回调死循环），此时必须报错而不是静默丢弃：
// 丢掉的可能正是课程在等的判定信号，那是最难排查的一类故障。
const eventQueueSize = 1024

// capabilityKind 决定一次 capability 调用期间的执行语义。
//
// 划分标准是"调用在等待谁"：只等宿主自身计算的调用有界且很快，持有执行令牌
// 直接调即可；等待外部主体（学习者、LLM）的调用无界，必须让出执行令牌，
// 让其他回调在等待期间照常执行。
type capabilityKind int

const (
	// kindFast 只等宿主自身计算：持令牌直接调用，全程不让位。
	// 未在 capabilityKinds 登记的能力取零值即此类——忘记登记的退化方向是
	// "少了交错"而不是"多了重入"，错也错在保守侧。
	kindFast capabilityKind = iota
	// kindSlow 等待外部主体（LLM）：调用期间让出执行令牌。
	kindSlow
	// kindPresentation 等待学习者的展示类：让位规则同 kindSlow，并额外经过
	// 展示串行通道——同一时刻至多一个展示在进行，宿主永远不会收到并发弹窗。
	// 通道锁只能在不持令牌时等待（见 mustCallCapability 的顺序），所以展示类
	// 必然让位：这不是约定，而是本枚举的构造保证——不存在"展示但不让位"的取值。
	kindPresentation
)

// capabilityKinds 是能力的执行语义登记表，新增能力时在这里显式分类。
// client_contract_test.go 会核对表中键名都是真实存在的 capability。
var capabilityKinds = map[string]capabilityKind{
	"course_showPrelude":   kindPresentation,
	"course_showMessage":   kindPresentation,
	"course_showVideo":     kindPresentation,
	"copilot_generateText": kindSlow,
	"copilot_generateJSON": kindSlow,
}

// courseProgram 是一次课程运行的全部状态：注册的回调通道、执行令牌、
// 完成/致命错误标志，以及调用 capability 的方式。
//
// 执行模型：课程回调以"帧"为单位执行，任一瞬间**只有执行令牌的持有者**在跑课程
// 代码——令牌的 release→acquire 构成 happens-before 链，课程代码里的共享变量
// 因此没有数据竞争，作者不需要任何同步原语。但存活的帧可以有多个：等待类
// capability 调用期间帧让出令牌挂起，其他回调照常执行。串行的单位是**单个注册的
// 回调**（见 handlerLane）：同一段回调的多次触发严格排队，不同回调——包括同一
// 事件上注册的多段——相互独立，可在等待点交错。
//
// 它挂在 Course 实例上（而不是做成包级单例），各 namespace 通过指针共享它——
// 这与 spx 的做法一致：spx 的回调也存在 Game 实例持有的 scriptEventRegistry 里。
type courseProgram struct {
	mu        sync.Mutex
	handlers  handlers
	started   bool
	completed bool
	fatal     any

	// token 是执行令牌：cap-1 channel 做二元信号量，初始含一枚。
	// 选 channel 而不是 Mutex：等待者按 FIFO 唤醒，调度更可预测。
	token chan struct{}
	// presentationMu 是展示串行通道：course_show* 调用依次通过，
	// 持有期横跨"等学习者看完"的全程。等待它之前必须先交还执行令牌。
	presentationMu sync.Mutex
	// ending 在完成或致命错误时关闭一次，通知各回调通道的 worker 退出。
	ending  chan struct{}
	endOnce sync.Once
	// workers 计数回调通道的 worker goroutine，awaitEnd 用它等在途回调收尾。
	workers sync.WaitGroup
	// laneStarters 收集程序启动前注册的回调通道的 worker 启动函数；
	// lanesStarted 置位后，新注册的通道直接启动自己的 worker。
	laneStarters []func()
	lanesStarted bool

	// callCapability 是通往前端的桥。做成字段而不是直接调 xgoexec.CallCapability，
	// 是为了给测试留缝隙：真实的桥只在 js/wasm 构建下可用（非 wasm 构建里 xgoexec
	// 提供的是一个直接报错的 stub），单测得能把它换成假的宿主实现。
	callCapability func(name string, request, result any) error
}

// handlers 保存课程程序注册的全部回调，包括课程自己的 onStart 与宿主事件的回调。
//
// 每个事件存的是一**串**回调而不是一个：课程代码里的 onXxx 就是普通方法调用，作者
// 完全可能对同一个事件写两段处理（比如两条判定各写一段），此时两段都该生效。
// 这与 spx 一致——spx 的 OnStart 等每次调用都往 sinks 里加一个，而不是覆盖。
// 宿主事件的每段回调各占一条 handlerLane，泛型参数是回调的入参类型。
type handlers struct {
	courseStart  []func()
	runtimeStart []*handlerLane[struct{}]
	runtimeExit  []*handlerLane[int]
	runtimeLog   []*handlerLane[string]
	copilotRound []*handlerLane[CopilotRound]
}

func (p *courseProgram) init() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.handlers = handlers{}
	p.started = true
	p.completed = false
	p.fatal = nil
	p.token = make(chan struct{}, 1)
	p.token <- struct{}{}
	p.ending = make(chan struct{})
	p.endOnce = sync.Once{}
	p.laneStarters = nil
	p.lanesStarted = false
	p.callCapability = xgoexec.CallCapability
}

func (p *courseProgram) acquire() { <-p.token }
func (p *courseProgram) release() { p.token <- struct{}{} }

// runFrame 以帧为单位执行一段课程回调：取得执行令牌、执行、归还。
//
// panic（capability 失败或课程代码自身的错误）在这里兜住并记为致命错误：
// 帧可能跑在回调通道的 worker goroutine 上，直接放任 panic 会绕过主 goroutine
// 的退出路径；统一记下来由 awaitEnd 在主 goroutine 上重新抛出，执行器看到的
// 仍然是"课程程序 panic → exit error"。注意 defer 的顺序：先声明归还令牌、
// 后声明 recover，LIFO 保证 recover 先跑、令牌总能归还，失败的帧不会把令牌
// 带走冻结整个课程。
func (p *courseProgram) runFrame(run func()) {
	p.acquire()
	defer p.release()
	defer func() {
		if r := recover(); r != nil {
			p.recordFatal(r)
		}
	}()
	run()
}

// handlerLane 是**单个注册回调**的处理通道：一个 FIFO 队列加一个专属 worker。
//
// 串行的单位取"每段注册的回调"而不是"每个事件"：作者对同一事件注册多段处理时，
// 自然期望它们各自独立生效——一段挂在等待类 capability 上时，另一段照常处理
// 后续触发。而**同一段**回调的串行保证是结构性的：worker 是单 goroutine，正在
// 处理一次触发（无论在执行还是挂起在等待里）就不会取下一次，后续触发在队列里
// 排队。因此——
//   - 同一段回调的多次触发严格按到达顺序处理，绝不重入：判定回调里的
//     "查了再做"不需要任何防重入守卫；
//   - editor.runtime.log 的"每条恰好一次、按追加顺序"对每段 onLog 回调各自成立；
//   - 不同回调（无论是否同一事件）相互独立，可在等待点交错。
type handlerLane[T any] struct {
	handler func(T)
	queue   chan T
}

// addLane 注册一段回调：建通道、挂进 handlers、安排 worker。
// 程序启动后（lanesStarted）注册的回调立即获得 worker，从下一次事件开始生效。
func addLane[T any](p *courseProgram, handler func(T), attach func(*handlers, *handlerLane[T])) {
	lane := &handlerLane[T]{
		handler: handler,
		queue:   make(chan T, eventQueueSize),
	}
	start := func() {
		p.workers.Add(1)
		go lane.run(p)
	}
	p.mu.Lock()
	attach(&p.handlers, lane)
	if p.lanesStarted {
		p.mu.Unlock()
		start()
		return
	}
	p.laneStarters = append(p.laneStarters, start)
	p.mu.Unlock()
}

func (l *handlerLane[T]) run(p *courseProgram) {
	defer p.workers.Done()
	for {
		select {
		case <-p.ending:
			return
		case event := <-l.queue:
			// ending 关闭与队列有货可能同时就绪（select 随机选取），
			// 完成后的积压事件在这里再拦一道。
			if p.isCompleted() {
				continue
			}
			p.runFrame(func() { l.handler(event) })
		}
	}
}

// deliverAll 把一次事件触发投递给它的全部回调通道，返回的 error 会一路传回宿主
// 的 dispatchEvent。
//
// 三种情况分别对应不同的语义：
//   - 程序还没启动：宿主投递早了，这是错误，得让它知道。
//   - 已经完成：课程已结束，但这**不是**错误——学习者的游戏可能还在输出日志，
//     宿主没做错任何事，静默丢弃即可。
//   - 某条队列满：课程程序失控（回调在等待类 capability 期间队列本会持续排空，
//     正常课程够不着上限）。必须报错而不是阻塞或静默丢弃。
func deliverAll[T any](p *courseProgram, lanes []*handlerLane[T], event T) error {
	p.mu.Lock()
	started, completed := p.started, p.completed
	p.mu.Unlock()

	switch {
	case !started:
		return fmt.Errorf("course program is not running")
	case completed:
		return nil
	}
	for _, lane := range lanes {
		select {
		case lane.queue <- event:
		default:
			return fmt.Errorf("course event queue is full: the course program is not consuming events")
		}
	}
	return nil
}

// startLanes 启动此前注册的全部回调通道的 worker，由 Course.Start 调用。
// 在此之前投递的事件安静地躺在队列缓冲里，Start 后按序处理。
func (p *courseProgram) startLanes() {
	p.mu.Lock()
	p.lanesStarted = true
	starters := p.laneStarters
	p.laneStarters = nil
	p.mu.Unlock()
	for _, start := range starters {
		start()
	}
}

// awaitEnd 等课程结束：完成或致命错误。
//
// 完成路径上等全部在途回调自然收尾——挂起的帧在其等待的 capability 返回后
// （完成后宿主对展示类 no-op 即回，所以很快）把剩余语句执行完，然后 worker
// 退出。致命错误路径不等：直接在主 goroutine 上重新抛出，挂起的帧随进程终止。
func (p *courseProgram) awaitEnd() {
	<-p.ending
	if fatal := p.fatalValue(); fatal != nil {
		panic(fatal)
	}
	p.workers.Wait()
}

func (p *courseProgram) signalEnd() {
	p.endOnce.Do(func() { close(p.ending) })
}

func (p *courseProgram) recordFatal(value any) {
	p.mu.Lock()
	if p.fatal == nil {
		p.fatal = value
	}
	p.mu.Unlock()
	p.signalEnd()
}

func (p *courseProgram) fatalValue() any {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.fatal
}

// registerEvents 把契约里的四个事件一次性全部注册到执行器。
//
// "全部注册"是硬性要求：xgoexec.DispatchEvent 遇到没注册过的事件名会直接返回错误，
// 进而让 Tutorial 侧的 dispatchEvent 被 reject。如果框架只在课程调用了 onLog 之后
// 才注册 editor.runtime.log，那么一个没订阅日志的课程会让宿主每次投递都收到错误——
// 宿主并不知道课程订阅了什么，也不该知道。
//
// 注意 xgoexec 的事件注册表本身是进程级的（那是执行器的桥，不是我们的状态）：
// 每个课程运行在自己的 Worker/WASM 实例里，一个实例只跑一个课程，所以最后一次
// 注册指向的就是当前这个 courseProgram。
func (p *courseProgram) registerEvents() {
	registerEvent(p, "editor.runtime.start", func(struct{}) error {
		return deliverAll(p, p.handlerSnapshot().runtimeStart, struct{}{})
	})
	registerEvent(p, "editor.runtime.exit", func(event runtimeExitEvent) error {
		return deliverAll(p, p.handlerSnapshot().runtimeExit, event.Code)
	})
	registerEvent(p, "editor.runtime.log", func(event runtimeLogEvent) error {
		return deliverAll(p, p.handlerSnapshot().runtimeLog, event.Log)
	})
	registerEvent(p, "copilot.roundFinish", func(round CopilotRound) error {
		return deliverAll(p, p.handlerSnapshot().copilotRound, round)
	})
}

// runtimeExitEvent 对应契约里 editor.runtime.exit 的载荷 {code}。
type runtimeExitEvent struct {
	Code int `json:"code"`
}

// runtimeLogEvent 对应契约里 editor.runtime.log 的载荷 {log}。
// 契约规定这里只承载 kind=log 的输出，error 输出不进这条判定通道；
// 过滤由 Tutorial 侧在投递前完成，框架收到什么就交给课程什么。
type runtimeLogEvent struct {
	Log string `json:"log"`
}

// registerEvent 把一个宿主事件接到它的投递逻辑上。
//
// 这里有个关键的线程边界：**解码与投递发生在宿主的 goroutine 上，回调执行在
// 各自通道的 worker goroutine 上**。xgoexec 收到 JS 侧 dispatchEvent 后会直接调用
// 这里注册的函数，我们在那个 goroutine 里只做两件轻量的事——解码载荷、投递进
// 各回调通道——然后立刻返回，让宿主的 dispatchEvent 尽快 resolve。
//
// 用泛型是为了让四个事件共用这套解码逻辑；T 是各自的载荷类型。
// payload 为空或 "null"（editor.runtime.start 就是 null）时跳过解码，用零值即可。
func registerEvent[T any](p *courseProgram, name string, deliver func(T) error) {
	xgoexec.RegisterEventHandler(name, func(payload json.RawMessage) error {
		var event T
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &event); err != nil {
				return fmt.Errorf("decode event %q: %w", name, err)
			}
		}
		return deliver(event)
	})
}

// handlerSnapshot 返回回调集合的快照。
//
// 取快照（而不是持锁投递）是为了避免投递期间与注册互锁；同时它也让"投递过程中
// 又注册了新回调"这件事有确定的语义：本次触发按快照投递，新注册的从下一次
// 事件开始生效。
func (p *courseProgram) handlerSnapshot() handlers {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.handlers
}

// addHandler 供 Course.OnStart 追加开场回调。追加而不是覆盖，
// 这样多段开场处理都会按注册顺序生效。
func (p *courseProgram) addHandler(add func(*handlers)) {
	p.mu.Lock()
	defer p.mu.Unlock()
	add(&p.handlers)
}

// markCompleted 把课程标记为已完成，返回值表示"这是不是第一次完成"。
//
// 幂等在这里是刚需：契约允许课程在同一个回调里 complete 之后继续执行剩余语句，
// 而积压的事件也可能让判定回调再触发一次；没有这道闸，学习者就会看到两次完成弹窗。
// 先置位再调 capability，这样即使 capability panic 了，重复完成依然被挡住。
func (p *courseProgram) markCompleted() bool {
	p.mu.Lock()
	if p.completed {
		p.mu.Unlock()
		return false
	}
	p.completed = true
	p.mu.Unlock()
	p.signalEnd()
	return true
}

func (p *courseProgram) isCompleted() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.completed
}

// mustCallCapability 按 capabilityKinds 的登记执行一次 capability 调用，
// 失败视为课程程序的致命错误。
//
// 顺序是死锁规避的关键：**先交还执行令牌，再等待展示通道**。展示通道的持有期
// 横跨"等学习者看完"的全程，若持着令牌去排队，令牌就被攥死、全部回调冻结——
// 而挂起中的展示帧恢复时又要取令牌，形成环。先还令牌，排队就只是这一帧的事。
//
// 为什么失败是 panic 而不是返回 error：作者侧 API 里没有错误通道（DSL 要保持
// "看起来就是顺序代码"），而一次失败意味着课程要求的展示/编辑器操作**没有发生**。
// 此时继续往下跑，等于在一个错误的前提上判定学习者。panic 由 runFrame 兜住记为
// 致命错误，最终在主 goroutine 上重新抛出，执行器据此报 runtime 阶段错误。
func (p *courseProgram) mustCallCapability(name string, request, result any) {
	kind := capabilityKinds[name]
	if kind >= kindSlow {
		p.release()
		defer p.acquire()
	}
	if kind == kindPresentation {
		p.presentationMu.Lock()
		defer p.presentationMu.Unlock()
	}
	if err := p.callCapability(name, request, result); err != nil {
		panic(err)
	}
}
