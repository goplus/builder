package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// eventQueueSize 是待处理事件队列的容量。
//
// 为什么需要一个**很大**的队列：课程程序在调用 capability 期间是阻塞的，而阻塞可能
// 很久。Copilot 生成一次文本是几秒；更长的是展示类能力——契约规定 showMessage 要等
// 学习者确认才返回，学习者去做别的事，这一等可能是几分钟。这段时间里事件循环停摆，
// 但学习者的游戏还在跑、还在 println，日志会源源不断地投递进来。
//
// 而契约承诺 editor.runtime.log "每条新增日志恰好触发一次、按追加顺序"——一旦队列
// 打满、投递被拒，这条承诺就破了，丢掉的可能正是课程在等的判定信号。所以上限要取到
// 现实场景够不着的量级：1024 个待处理回调也不过几十 KB，而"课程程序真的卡死"仍然会
// 在有限步数内触到上限、以错误的形式暴露出来，不会被无限缓冲掩盖。
const eventQueueSize = 1024

// courseProgram 是一次课程运行的全部状态：注册的回调、待处理事件队列、完成标志，
// 以及调用 capability 的方式。
//
// 它挂在 Course 实例上（而不是做成包级单例），各 namespace 通过指针共享它——
// 这与 spx 的做法一致：spx 的回调也存在 Game 实例持有的 scriptEventRegistry 里，
// Game 与各精灵通过 scriptEventBindings 里的指针共享同一份注册表。
type courseProgram struct {
	mu        sync.Mutex
	handlers  handlers
	events    chan func()
	completed bool

	// callCapability 是通往前端的桥。做成字段而不是直接调 xgoexec.CallCapability，
	// 是为了给测试留缝隙：真实的桥只在 js/wasm 构建下可用（非 wasm 构建里 xgoexec
	// 提供的是一个直接报错的 stub），单测得能把它换成假的宿主实现。
	callCapability func(name string, request, result any) error
}

// handlers 保存课程程序注册的全部回调，包括课程自己的 onStart 与三类宿主事件的回调。
//
// 集中放在一处有两个好处：读代码时"回调在哪"只有一个答案；框架在课程代码执行**之前**
// 就能把所有事件注册到 xgoexec（契约要求"未订阅的事件也要接受而不是报未知事件"），
// 注册时的闭包只要捕获 courseProgram 即可，不需要知道课程订阅了什么。
//
// 每个事件存的是一**串**回调而不是一个：课程代码里的 onXxx 就是普通方法调用，作者
// 完全可能对同一个事件写两段处理（比如两条判定各写一段），此时两段都该生效。
// 这与 spx 一致——spx 的 OnStart 等每次调用都往 sinks 里加一个，而不是覆盖。
type handlers struct {
	courseStart  []func()
	runtimeStart []func()
	runtimeExit  []func(code int)
	runtimeLog   []func(log string)
	copilotRound []func(round CopilotRound)
}

func (p *courseProgram) init() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.handlers = handlers{}
	p.events = make(chan func(), eventQueueSize)
	p.completed = false
	p.callCapability = xgoexec.CallCapability
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
	registerEvent(p, "editor.runtime.start", func(struct{}) {
		for _, handler := range p.handlerSnapshot().runtimeStart {
			if p.isCompleted() {
				return
			}
			handler()
		}
	})
	registerEvent(p, "editor.runtime.exit", func(event runtimeExitEvent) {
		for _, handler := range p.handlerSnapshot().runtimeExit {
			if p.isCompleted() {
				return
			}
			handler(event.Code)
		}
	})
	registerEvent(p, "editor.runtime.log", func(event runtimeLogEvent) {
		for _, handler := range p.handlerSnapshot().runtimeLog {
			if p.isCompleted() {
				return
			}
			handler(event.Log)
		}
	})
	registerEvent(p, "copilot.roundFinish", func(round CopilotRound) {
		for _, handler := range p.handlerSnapshot().copilotRound {
			if p.isCompleted() {
				return
			}
			handler(round)
		}
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

// registerEvent 把一个宿主事件接到课程回调上。
//
// 这里有个关键的线程边界：**解码发生在宿主的 goroutine 上，回调执行在课程程序自己的
// goroutine 上**。xgoexec 收到 JS 侧 dispatchEvent 后会直接调用这里注册的函数，
// 我们在那个 goroutine 里只做两件轻量的事——解码载荷、把闭包塞进队列——然后立刻返回，
// 让宿主的 dispatchEvent 尽快 resolve。真正的课程回调由 Course.Start 的循环取出执行，
// 从而保证课程代码始终是单线程、顺序执行的。
//
// 用泛型是为了让四个事件共用这套解码 + 入队逻辑；T 是各自的载荷类型。
// payload 为空或 "null"（editor.runtime.start 就是 null）时跳过解码，用零值即可。
func registerEvent[T any](p *courseProgram, name string, dispatch func(T)) {
	xgoexec.RegisterEventHandler(name, func(payload json.RawMessage) error {
		var event T
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &event); err != nil {
				return fmt.Errorf("decode event %q: %w", name, err)
			}
		}
		return p.enqueue(func() { dispatch(event) })
	})
}

// enqueue 把一个回调放进队列，返回的 error 会一路传回宿主的 dispatchEvent。
//
// 三种情况分别对应不同的语义：
//   - 程序还没启动（events == nil）：宿主投递早了，这是错误，得让它知道。
//   - 已经完成：课程已结束、事件循环不会再取，但这**不是**错误——学习者的游戏
//     可能还在输出日志，宿主没做错任何事，静默丢弃即可。
//   - 队列满：课程程序跟不上（多半是卡在某个慢 capability 里）。这时必须报错而不是
//     阻塞或静默丢弃：阻塞会把宿主的 dispatchEvent 一起拖住，静默丢弃则可能悄悄
//     吞掉判定信号，让课程永远等不到完成条件——那是最难排查的一类故障。
func (p *courseProgram) enqueue(callback func()) error {
	p.mu.Lock()
	events, completed := p.events, p.completed
	p.mu.Unlock()

	switch {
	case events == nil:
		return fmt.Errorf("course program is not running")
	case completed:
		return nil
	}
	select {
	case events <- callback:
		return nil
	default:
		return fmt.Errorf("course event queue is full: the course program is not consuming events")
	}
}

// handlerSnapshot 返回回调集合的快照。
//
// 取快照（而不是持锁调用回调）是为了避免回调里再调 onLog 之类的注册方法时自锁；
// 同时它也让"遍历过程中又注册了新回调"这件事有确定的语义：本轮按快照执行，
// 新注册的从下一次事件开始生效。
func (p *courseProgram) handlerSnapshot() handlers {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.handlers
}

// addHandler 供各 namespace 的 OnXxx 方法追加回调。追加而不是覆盖，
// 这样同一事件上的多段处理都会按注册顺序生效。
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
	defer p.mu.Unlock()
	if p.completed {
		return false
	}
	p.completed = true
	return true
}

func (p *courseProgram) isCompleted() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.completed
}

// mustCallCapability 把 capability 失败当作课程程序的致命错误。
//
// 为什么是 panic 而不是返回 error：作者侧 API 里没有错误通道（DSL 要保持"看起来就是
// 顺序代码"），而一次失败意味着课程要求的展示/编辑器操作**没有发生**——比如提示没弹出来、
// API 没过滤掉。此时继续往下跑，等于在一个错误的前提上判定学习者。panic 会被执行器捕获
// 并报成 runtime 阶段错误，宿主能据此结束课程，这比默默错下去好。
func (p *courseProgram) mustCallCapability(name string, request, result any) {
	if err := p.callCapability(name, request, result); err != nil {
		panic(err)
	}
}
