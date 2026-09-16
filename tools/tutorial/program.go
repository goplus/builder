package tutorial

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/goplus/builder/tools/xgoexec"
)

// capabilityKind 决定一次 capability 调用期间的执行语义。
//
// 划分标准是"调用在等待谁"：只等宿主自身计算的调用有界且很快，持有执行令牌
// 直接调即可；等待外部主体（学习者、LLM）的调用无界，必须让出执行令牌，
// 让其他运行在等待期间照常执行。展示类调用之间不再由框架串行：重叠时怎么办
// 是宿主 capability 自己的策略（见契约 module_TutorialFramework.ts）。
type capabilityKind int

const (
	// kindFast 只等宿主自身计算：持令牌直接调用，全程不让位。
	// 未在 capabilityKinds 登记的能力取零值即此类——忘记登记的退化方向是
	// "少了交错"而不是"多了重入"，错也错在保守侧。
	kindFast capabilityKind = iota
	// kindWaiting 等待外部主体（学习者或 LLM）：调用期间让出执行令牌，
	// 也是运行取消生效的地方（见 yieldWhile）。
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

// errRunEnded 是"本次运行到此为止"的哨兵：被取消的运行在等待点、被
// SkipWhileBusy 拒绝的运行在加入点，都用它结束自己。runFrame 认出它就静默
// 收尾，不记为致命错误，作者不会看到任何报错。
var errRunEnded = errors.New("tutorial: run ended early")

// courseProgram 是一次课程运行的全部状态：注册的回调、执行令牌、
// 完成/致命错误标志，以及调用 capability 的方式。
//
// 执行模型：课程回调以"运行"为单位执行，任一瞬间**只有执行令牌的持有者**在跑课程
// 代码——令牌的 release→acquire 构成 happens-before 链，课程代码里的共享变量
// 因此没有数据竞争，作者不需要任何同步原语。每次触发为每段回调起一个新运行，
// 运行在等待类 capability 期间让出令牌挂起，同一段回调的多次运行因此可能并存；
// 它们如何相处由运行组的策略决定（见 runGroup）。运行的启动顺序是结构性的：
// 只有投递 goroutine 与 Course.Start 会启动运行（startRuns），一次触发内按注册
// 顺序，每个运行跑到第一次让出或结束再起下一个。
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
	// shutdown 在完成或致命错误时关闭一次，通知投递 goroutine 与排队中的运行退出。
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

// registration 是一段注册的回调，以及注册时给定的运行组（没给就是 nil）。
// 注册时给的组在运行的第一条语句之前加入；回调里 enter() 加入的组不经这里。
type registration[T any] struct {
	handler func(T)
	group   *runGroup
}

// register 登记一段回调。可以在课程运行中（回调里）调用：本次触发按快照投递，
// 新注册的从下一次触发开始生效。
func register[T any](p *courseProgram, group *runGroup, handler func(T), attach func(*handlers, *registration[T])) {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	attach(&p.handlers, &registration[T]{handler: handler, group: group})
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
	// cancelled 由运行组的 CancelPrevious 置位；运行在下一个等待点看到它就结束。
	// cancelCh 同时关闭，让在 OneAtATime 队列里等待的运行也能醒来。
	cancelled  atomic.Bool
	cancelCh   chan struct{}
	cancelOnce sync.Once
	// yielded 在运行第一次让出令牌或结束时关闭：投递方据此启动下一段回调
	// （spx 的 JoinYieldedOrDone）。
	yielded   chan struct{}
	yieldOnce sync.Once
	// groups 是本次运行持有的运行组，运行结束时依次释放。只在持令牌时读写。
	groups []*runGroup
}

func newRun() *run {
	return &run{cancelCh: make(chan struct{}), yielded: make(chan struct{})}
}

// cancel 只由运行组在 CancelPrevious 下调用。
func (r *run) cancel() {
	r.cancelOnce.Do(func() {
		r.cancelled.Store(true)
		close(r.cancelCh)
	})
}

// markYielded 只由 runFrame（结束）与 yieldWhile（第一次让出）调用。
func (r *run) markYielded() {
	r.yieldOnce.Do(func() { close(r.yielded) })
}

// runFrame 执行一次运行：取得执行令牌、准入检查、执行回调、释放持有的组、归还令牌。
//
// panic（capability 失败或课程代码自身的错误）在这里兜住并记为致命错误：运行跑在
// 自己的 goroutine 上，直接放任 panic 会绕过主 goroutine 的退出路径；统一记下来由
// awaitShutdown 在主 goroutine 上重新抛出，执行器看到的仍然是"课程程序 panic →
// exit error"。errRunEnded 是例外：那是运行按策略提前结束，静默收尾。
//
// 注意 defer 的顺序：markYielded 最先登记、最后执行——运行结束一定放行投递方；
// releaseExec 其次；收尾闭包最后登记、最先执行，因此释放组与清 current 都发生在
// 持令牌期间，失败的运行不会把令牌带走冻结整个课程。
func (p *courseProgram) runFrame(r *run, body func()) {
	defer r.markYielded()
	p.acquireExec()
	defer p.releaseExec()
	// 准入检查必须在**拿到令牌之后**：出队时的检查在等令牌期间可能过期——
	// 别的运行在这段等待里完成了课程或记了致命错误，此时这一次不该再开始。
	// 尚未开始就被取消的运行同样不再开始：启动就是它的第一个等待点。
	if p.terminated() || r.cancelled.Load() {
		return
	}
	p.current = r
	defer func() {
		recovered := recover()
		for _, g := range r.groups {
			g.release(r)
		}
		p.current = nil
		if recovered != nil && recovered != errRunEnded {
			p.recordFatal(recovered)
		}
	}()
	body()
}

// yieldWhile 是运行**唯一**的让出点：交还执行令牌、执行 wait、拿回令牌并恢复
// current。取消在这里生效——发起等待之前与等待返回之后各查一次，看到取消标记
// 就以 errRunEnded 结束本次运行，因此等待返回的结果不会被使用，作者传入的结构体
// 也不会被回填（"被取消的运行，其挂起中的调用结果被丢弃"）。
//
// 令牌一定在 wait 之前交还：等待类调用可能长达分钟，持着令牌等就是冻结全部回调。
func (p *courseProgram) yieldWhile(wait func()) {
	r := p.current
	if r != nil && r.cancelled.Load() {
		panic(errRunEnded)
	}
	if r != nil {
		r.markYielded()
	}
	p.releaseExec()
	func() {
		defer p.acquireExec()
		wait()
	}()
	p.current = r
	if r != nil && r.cancelled.Load() {
		panic(errRunEnded)
	}
}

// runGroup 是运行组：一个共享的策略作用域。运行从加入起持有组，到运行结束释放；
// 组的策略决定"有运行持有组时，新运行加入"该怎么办。同一个组可以被不同事件的
// 回调共用（onLog 与 onExit 都判定完成的那种课程），这是作者用 newRunGroup 建的组；
// 注册时直接给策略的，则是该段回调私有的匿名组。
//
// groupMu 是叶子锁：持锁区间只读写字段、操作切片、关闭 granted 通道；取消与等待
// 都在锁外进行。
type runGroup struct {
	p      *courseProgram
	policy RunPolicy

	groupMu sync.Mutex
	holder  *run
	waiters []*groupWaiter // OneAtATime 下排队等待的运行，按加入顺序
}

type groupWaiter struct {
	r       *run
	granted chan struct{}
}

// Enter 实现 RunGroup：把当前运行加入组。只能在课程回调里（持令牌）调用。
func (g *runGroup) Enter() {
	g.join(g.p.current)
}

// join 按组的策略处理一次加入。三种策略的结果作者都不用检查：
//   - CancelPrevious：给持有者打取消标记，本次运行接管组；
//   - SkipWhileBusy：有持有者就以 errRunEnded 结束本次运行；
//   - OneAtATime：有持有者就排队，并让出令牌等到轮到自己（或被取消、课程结束）。
//
// 已持有组的运行再次加入没有效果。
func (g *runGroup) join(r *run) {
	if r == nil {
		panic("tutorial: RunGroup.enter called outside a course callback")
	}
	switch g.policy {
	case CancelPrevious:
		g.groupMu.Lock()
		holder := g.holder
		g.holder = r
		g.groupMu.Unlock()
		if holder != nil && holder != r {
			holder.cancel()
		}
	case SkipWhileBusy:
		g.groupMu.Lock()
		busy := g.holder != nil && g.holder != r
		if !busy {
			g.holder = r
		}
		g.groupMu.Unlock()
		if busy {
			panic(errRunEnded)
		}
	case OneAtATime:
		g.groupMu.Lock()
		if g.holder == nil || g.holder == r {
			g.holder = r
			g.groupMu.Unlock()
			break
		}
		w := &groupWaiter{r: r, granted: make(chan struct{})}
		g.waiters = append(g.waiters, w)
		g.groupMu.Unlock()
		granted := false
		g.p.yieldWhile(func() {
			select {
			case <-w.granted:
				granted = true
			case <-r.cancelCh:
				g.abandon(w)
			case <-g.p.shutdown:
				g.abandon(w)
			}
		})
		if !granted {
			panic(errRunEnded)
		}
	default:
		return // 零值策略：并发，加入没有意义
	}
	r.hold(g)
}

// hold 记下本次运行持有的组，结束时释放；重复加入同一组只记一次。
func (r *run) hold(g *runGroup) {
	for _, held := range r.groups {
		if held == g {
			return
		}
	}
	r.groups = append(r.groups, g)
}

// abandon 把一个还没轮到就要离开的等待者从队列里摘掉。等待者已被放行时
// （granted 与离开同时发生）什么都不做：它此刻已是持有者，随后正常结束并释放。
func (g *runGroup) abandon(w *groupWaiter) {
	g.groupMu.Lock()
	defer g.groupMu.Unlock()
	for i, waiter := range g.waiters {
		if waiter == w {
			g.waiters = append(g.waiters[:i], g.waiters[i+1:]...)
			return
		}
	}
}

// release 在运行结束时释放组：OneAtATime 下把组交给队首等待者并放行它。
func (g *runGroup) release(r *run) {
	g.groupMu.Lock()
	defer g.groupMu.Unlock()
	if g.holder != r {
		return
	}
	g.holder = nil
	if g.policy == OneAtATime && len(g.waiters) > 0 {
		next := g.waiters[0]
		g.waiters = g.waiters[1:]
		g.holder = next.r
		close(next.granted)
	}
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

// startRuns 为一次触发启动全部注册回调的运行：按注册顺序，每个运行跑到第一次
// 让出或结束（yielded）之后再起下一个——这就是 spx 的 JoinYieldedOrDone。
// 注册时给了组的回调在运行的第一条语句之前加入组；OneAtATime 下排队即让出，
// 不会拖住同一触发里的其他回调。
//
// 只由投递 goroutine 与 Course.Start 调用，所以启动顺序是结构性的。
func startRuns[T any](p *courseProgram, regs []*registration[T], event T) {
	for _, reg := range regs {
		if !p.admitRun() {
			return
		}
		r := newRun()
		go func() {
			defer p.runs.Done()
			p.runFrame(r, func() {
				if reg.group != nil {
					reg.group.join(r)
				}
				reg.handler(event)
			})
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
// （完成后宿主对展示类 no-op 即回，所以很快）把剩余语句执行完；排队中的运行
// 看到 shutdown 直接退出；投递 goroutine 退出。致命错误路径不等：直接在主
// goroutine 上重新抛出，挂起的运行随进程终止。
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
	// 数据竞争。先解码进私有缓冲，拿回令牌后再回填。被取消的运行在 yieldWhile
	// 里就结束了，走不到回填这一步。
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
