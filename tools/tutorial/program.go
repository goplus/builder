package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// capabilityKind 决定一次 capability 调用期间的执行语义。
//
// 划分标准是"调用在等待谁"：只等宿主自身计算的调用有界且很快，持有执行令牌
// 直接调即可；等待外部主体（学习者、LLM）的调用无界，必须让出执行令牌，
// 让其他运行在等待期间照常执行。展示类调用之间不由框架串行：重叠时怎么办
// 是宿主 capability 自己的策略（见契约 module_TutorialFramework.ts）。
type capabilityKind int

const (
	// kindFast 只等宿主自身计算：持令牌直接调用，全程不让位。
	// 未在 capabilityKinds 登记的能力取零值即此类——忘记登记的退化方向是
	// "少了交错"而不是"多了重入"，错也错在保守侧。
	kindFast capabilityKind = iota
	// kindWaiting 等待外部主体（学习者或 LLM）：调用期间让出执行令牌。
	kindWaiting
)

// capabilityKinds 是能力的执行语义登记表，新增能力时在这里显式分类。
// client_contract_test.go 会核对表中键名都是真实存在的 capability。
var capabilityKinds = map[string]capabilityKind{
	"course_showPrelude":   kindWaiting,
	"course_showMessage":   kindWaiting,
	"course_showVideo":     kindWaiting,
	"copilot_generateText": kindWaiting,
	"copilot_generateJSON": kindWaiting,
}

// courseProgram 是一次课程运行的全部状态：注册的回调、执行令牌、
// 完成/致命错误标志，以及调用 capability 的方式。
//
// 执行模型：课程回调以"运行"为单位执行，任一瞬间**只有执行令牌的持有者**在跑课程
// 代码——令牌的 release→acquire 构成 happens-before 链，课程代码里的共享变量
// 因此没有数据竞争，作者不需要任何同步原语。每次触发为每段回调起一个新运行，
// 运行在等待类 capability 期间让出令牌挂起，同一段回调的多次运行因此可能并存。
//
// TODO(#3509): 同一段回调的多次运行如何相处（取消过期的、排队、忙时忽略）尚未规定，
// 契约也不承诺；运行策略与运行组的设计在 #3509 讨论，已有实现在分支
// issue-3417-run-policies。在此之前，并存运行之间的竞态由课程代码自己处理。
//
// 运行的启动顺序目前是投递方的实现细节（见 startRuns），契约同样不承诺。
//
// 它挂在 Course 实例上（而不是做成包级单例），各 namespace 通过指针共享它——
// 这与 spx 的做法一致：spx 的回调也存在 Game 实例持有的 scriptEventRegistry 里。
type courseProgram struct {
	schedulerMu sync.Mutex
	handlers    handlers
	started     bool
	completed   bool
	fatal       any

	// execToken 是执行令牌：cap-1 channel 做二元信号量，初始含一枚。
	// 等待者由 runtime 排队唤醒；框架不依赖任何跨运行的唤醒顺序承诺。
	execToken chan struct{}
	// current 是令牌持有者的运行。只在持令牌时读写，因此不需要锁：
	// runFrame 进入时设置，yieldWhile 拿回令牌后恢复。
	current *run
	// shutdown 在完成或致命错误时关闭一次，通知投递 goroutine 退出。
	shutdown     chan struct{}
	shutdownOnce sync.Once
	// runs 计数在途的运行 goroutine 与投递 goroutine，awaitShutdown 用它等收尾。
	runs sync.WaitGroup

	// callCapability 是通往前端的桥。做成字段而不是直接调 xgoexec.CallCapability，
	// 是为了给测试留缝隙：真实的桥只在 js/wasm 构建下可用（非 wasm 构建里 xgoexec
	// 提供的是一个直接报错的 stub），单测得能把它换成假的宿主实现。
	callCapability func(name string, request, result any) error
}

// handlers 保存课程程序注册的全部回调。课程自己的 onStart 也在其中：课程开始
// 就是一个由 Course.Start 投递一次的事件，与宿主事件走同一条路，不做特殊处理。
//
// 每个事件存的是一**串**回调而不是一个：课程代码里的 onXxx 就是普通方法调用，作者
// 完全可能对同一个事件写两段处理（比如两条判定各写一段），此时两段都该生效。
// 这与 spx 一致——spx 的 OnStart 等每次调用都往 sinks 里加一个，而不是覆盖。
type handlers struct {
	courseStart  []*registration[struct{}]
	runtimeStart []*registration[struct{}]
	runtimeExit  []*registration[int]
	runtimeLog   []*registration[string]
	copilotRound []*registration[CopilotRound]
}

// registration 是一段注册的回调。
type registration[T any] struct {
	handler func(T)
}

// register 登记一段回调。可以在课程运行中（回调里）调用：本次触发按快照投递，
// 新注册的从下一次触发开始生效。
func register[T any](p *courseProgram, handler func(T), attach func(*handlers, *registration[T])) {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	attach(&p.handlers, &registration[T]{handler: handler})
}

func (p *courseProgram) init() {
	// 令牌在进入锁区之前就填好：schedulerMu 的持锁区间内不做任何 channel 操作，
	// 这是 scheduling_invariants_test.go 机器检查的不变式之一。
	execToken := make(chan struct{}, 1)
	execToken <- struct{}{}

	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	p.handlers = handlers{}
	p.started = true
	p.completed = false
	p.fatal = nil
	p.execToken = execToken
	p.current = nil
	p.shutdown = make(chan struct{})
	p.shutdownOnce = sync.Once{}
	p.callCapability = xgoexec.CallCapability
}

func (p *courseProgram) acquireExec() { <-p.execToken }

// releaseExec 归还执行令牌。非阻塞发送兼作动态断言：令牌槽已满说明出现了
// "未持有却归还"（配对错误），这是框架 bug，立刻炸出来比默默多出一枚
// 令牌（互斥失效）好。
func (p *courseProgram) releaseExec() {
	select {
	case p.execToken <- struct{}{}:
	default:
		panic("tutorial: execToken released without a matching acquireExec")
	}
}

// run 是回调的一次运行：投递方为每次触发、每段回调各起一个，跑在自己的 goroutine 上。
type run struct {
	// yielded 在运行第一次让出令牌或结束时关闭：投递方据此启动下一段回调
	// （见 startRuns）。
	yielded   chan struct{}
	yieldOnce sync.Once
}

func newRun() *run {
	return &run{yielded: make(chan struct{})}
}

// markYielded 只由 runFrame（结束）与 yieldWhile（第一次让出）调用。
func (r *run) markYielded() {
	r.yieldOnce.Do(func() { close(r.yielded) })
}

// runFrame 执行一次运行：取得执行令牌、准入检查、执行回调、归还令牌。
//
// panic（capability 失败或课程代码自身的错误）在这里兜住并记为致命错误：运行跑在
// 自己的 goroutine 上，直接放任 panic 会绕过主 goroutine 的退出路径；统一记下来由
// awaitShutdown 在主 goroutine 上重新抛出，执行器看到的仍然是"课程程序 panic →
// exit error"。
//
// 注意 defer 的顺序：markYielded 最先登记、最后执行——运行结束一定放行投递方；
// releaseExec 其次；收尾闭包最后登记、最先执行，因此 recover 与清 current 都发生在
// 持令牌期间，失败的运行不会把令牌带走冻结整个课程。
func (p *courseProgram) runFrame(r *run, body func()) {
	defer r.markYielded()
	p.acquireExec()
	defer p.releaseExec()
	// 准入检查必须在**拿到令牌之后**：出队时的检查在等令牌期间可能过期——
	// 别的运行在这段等待里完成了课程或记了致命错误，此时这一次不该再开始。
	if p.terminated() {
		return
	}
	p.current = r
	defer func() {
		recovered := recover()
		p.current = nil
		if recovered != nil {
			p.recordFatal(recovered)
		}
	}()
	body()
}

// yieldWhile 是运行**唯一**的让出点：交还执行令牌、执行 wait、拿回令牌并恢复 current。
// 令牌一定在 wait 之前交还：等待类调用可能长达分钟，持着令牌等就是冻结全部回调。
func (p *courseProgram) yieldWhile(wait func()) {
	r := p.current
	if r != nil {
		r.markYielded()
	}
	p.releaseExec()
	func() {
		defer p.acquireExec()
		wait()
	}()
	p.current = r
}

// admitRun 在同一把锁内判断终态并登记一个 goroutine 到 runs：终态后 awaitShutdown
// 可能已在 Wait，Add 若落在其后就是 WaitGroup 误用。返回 false 表示不该再起。
func (p *courseProgram) admitRun() bool {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	if p.terminatedLocked() {
		return false
	}
	p.runs.Add(1)
	return true
}

// startRuns 为一次触发启动全部注册回调的运行，只由投递 goroutine 与 Course.Start 调用。
//
// 当前的启动方式是按注册顺序，每个运行跑到第一次让出或结束（yielded）之后再起
// 下一个。这样投递方总能在一段回调挂起后继续处理后续触发，课程开始的运行也一定
// 先于宿主事件的运行启动。这是实现细节：契约不承诺同一触发内各段回调的启动顺序，
// 课程代码不应依赖它（相关设计见 #3509）。
func startRuns[T any](p *courseProgram, regs []*registration[T], event T) {
	for _, reg := range regs {
		if !p.admitRun() {
			return
		}
		r := newRun()
		go func() {
			defer p.runs.Done()
			p.runFrame(r, func() { reg.handler(event) })
		}()
		select {
		case <-r.yielded:
		case <-p.shutdown:
			return
		}
	}
}

// awaitShutdown 等课程结束：完成或致命错误。
//
// 完成路径上等全部在途运行自然收尾——挂起的运行在其等待的 capability 返回后
// （完成后宿主对展示类 no-op 即回，所以很快）把剩余语句执行完；投递 goroutine
// 退出。致命错误路径不等：直接在主 goroutine 上重新抛出，挂起的运行随进程终止。
func (p *courseProgram) awaitShutdown() {
	<-p.shutdown
	if fatal := p.fatalValue(); fatal != nil {
		panic(fatal)
	}
	p.runs.Wait()
	// 完成路径上收尾的运行仍可能失败（最典型：course_complete 本身失败——
	// Complete 先关 shutdown 再调 capability）。收尾结束后再查一次，
	// 迟到的致命错误不能被吞成 completed。
	if fatal := p.fatalValue(); fatal != nil {
		panic(fatal)
	}
}

func (p *courseProgram) beginShutdown() {
	p.shutdownOnce.Do(func() { close(p.shutdown) })
}

func (p *courseProgram) recordFatal(value any) {
	p.schedulerMu.Lock()
	if p.fatal == nil {
		p.fatal = value
	}
	p.schedulerMu.Unlock()
	p.beginShutdown()
}

func (p *courseProgram) fatalValue() any {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.fatal
}

// terminated 表示课程已进入终态（完成或致命错误），新的运行不该再开始。
func (p *courseProgram) terminated() bool {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.terminatedLocked()
}

// terminatedLocked 是 terminated 的无锁版本，供已经持有 schedulerMu 的调用方在
// 同一临界区内复用这条判断（如 admitRun 里与 runs.Add 同锁的那一步）。
func (p *courseProgram) terminatedLocked() bool {
	return p.completed || p.fatal != nil
}

// handlerSnapshot 返回回调集合的快照。
//
// 取快照（而不是持锁投递）是为了避免投递期间与注册互锁；同时它也让"投递过程中
// 又注册了新回调"这件事有确定的语义：本次触发按快照投递，新注册的从下一次
// 触发开始生效。
func (p *courseProgram) handlerSnapshot() handlers {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.handlers
}

// markCompleted 把课程标记为已完成，返回值表示"这是不是第一次完成"。
//
// 幂等在这里是刚需：契约允许课程在同一个回调里 complete 之后继续执行剩余语句，
// 而并存的运行也可能各自判定成功；没有这道闸，学习者就会看到两次完成弹窗。
// 先置位再调 capability，这样即使 capability panic 了，重复完成依然被挡住。
func (p *courseProgram) markCompleted() bool {
	p.schedulerMu.Lock()
	if p.completed {
		p.schedulerMu.Unlock()
		return false
	}
	p.completed = true
	p.schedulerMu.Unlock()
	p.beginShutdown()
	return true
}

func (p *courseProgram) isCompleted() bool {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.completed
}

// mustCallCapability 按 capabilityKinds 的登记执行一次 capability 调用，
// 失败视为课程程序的致命错误。
//
// 为什么失败是 panic 而不是返回 error：作者侧 API 里没有错误通道（DSL 要保持
// "看起来就是顺序代码"），而一次失败意味着课程要求的展示/编辑器操作**没有发生**。
// 此时继续往下跑，等于在一个错误的前提上判定学习者。panic 由 runFrame 兜住记为
// 致命错误，最终在主 goroutine 上重新抛出，执行器据此报 runtime 阶段错误。
func (p *courseProgram) mustCallCapability(name string, request, result any) {
	if capabilityKinds[name] == kindFast {
		if err := p.callCapability(name, request, result); err != nil {
			panic(err)
		}
		return
	}

	// 等待类调用在让位期间**不允许写课程可见的内存**：result 可能是作者传入的
	// 共享结构体（generateJSON），而此刻令牌在别的运行手里，桥直接解码进去就是
	// 数据竞争。先解码进私有缓冲，拿回令牌后再回填。
	var raw json.RawMessage
	var target any
	if result != nil {
		target = &raw
	}
	var err error
	p.yieldWhile(func() { err = p.callCapability(name, request, target) })
	if err != nil {
		panic(err)
	}
	if result != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, result); err != nil {
			panic(fmt.Errorf("decode capability %q result: %w", name, err))
		}
	}
}
