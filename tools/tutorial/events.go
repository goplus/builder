package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// pendingEventLimit 是课程程序就绪前可暂存的事件上限。取值与 eventQueueSize 相同：
// 补投发生在 lane 刚启动、队列全空的时候，暂存区永远不可能把它们撑爆。
const pendingEventLimit = eventQueueSize

// eventDeliverer 把一条原始载荷解码并投递给指定程序，跑在宿主的 goroutine 上。
type eventDeliverer func(p *courseProgram, payload json.RawMessage) error

// eventDeliverers 是契约里全部事件的解码与投递逻辑。键的集合就是框架向执行器
// 注册的事件名全集，client_contract_test.go 会核对它与契约一致。
//
// "全部注册"是硬性要求：宿主并不知道课程订阅了什么，也不该知道；课程没订阅的
// 事件由 deliverAll 找不到 lane 而静默放弃，这与作者的直觉一致。
var eventDeliverers = map[string]eventDeliverer{
	"editor.runtime.start": decodeThen("editor.runtime.start", func(p *courseProgram, _ struct{}) error {
		return deliverAll(p, p.handlerSnapshot().runtimeStart, struct{}{})
	}),
	"editor.runtime.exit": decodeThen("editor.runtime.exit", func(p *courseProgram, event runtimeExitEvent) error {
		return deliverAll(p, p.handlerSnapshot().runtimeExit, event.Code)
	}),
	"editor.runtime.log": decodeThen("editor.runtime.log", func(p *courseProgram, event runtimeLogEvent) error {
		return deliverAll(p, p.handlerSnapshot().runtimeLog, event.Log)
	}),
	"copilot.roundFinish": decodeThen("copilot.roundFinish", func(p *courseProgram, round CopilotRound) error {
		return deliverAll(p, p.handlerSnapshot().copilotRound, round)
	}),
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

// decodeThen 让四个事件共用同一套解码逻辑；T 是各自的载荷类型。
// payload 为空或 "null"（editor.runtime.start 就是 null）时跳过解码，用零值即可。
func decodeThen[T any](name string, deliver func(*courseProgram, T) error) eventDeliverer {
	return func(p *courseProgram, payload json.RawMessage) error {
		var event T
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &event); err != nil {
				return fmt.Errorf("decode event %q: %w", name, err)
			}
		}
		return deliver(p, event)
	}
}

// events 是进程级的事件入口。
//
// handler 在包初始化时就向执行器注册好：本包是原生编进 xgoexec.wasm 的，init 早于
// 任何课程程序的 build 与 run。于是宿主的 run() 一 resolve，投递就一定有人接——
// 而执行器的 run() 在解释器 goroutine 起来的那一刻就 resolve，那时课程程序还没跑到
// 注册回调。落在这段窗口里的投递不能丢，也不能插队，见 eventRegistry。
//
// 执行器的注册表本身是进程级的（那是执行器的桥，不是我们的状态）：每个课程运行在
// 自己的 Worker/WASM 实例里，一个实例只跑一个课程；同一进程跑多个程序只发生在测试里。
var events = &eventRegistry{}

func init() {
	for name, deliver := range eventDeliverers {
		xgoexec.RegisterEventHandler(name, func(payload json.RawMessage) error {
			return events.dispatch(name, deliver, payload)
		})
	}
}

// eventRegistry 记录当前课程程序及其就绪状态，并暂存就绪前到达的事件。
//
// 三个阶段：attach 之前（进程里还没有程序），以及 attach 之后、goLive 之前
// （MainEntry 正在注册回调），投递一律进暂存区；goLive 把暂存区按序排空后才切换为
// 直投。宿主在 run() resolve 之后任何时刻投递的事件，都会在程序就绪后按到达顺序送达。
//
// registryMu 是叶子锁：持锁区间只读写字段、操作切片，解码与投递都在锁外进行；
// scheduling_invariants_test.go 用调用白名单守住这一点。
type eventRegistry struct {
	registryMu sync.Mutex
	program    *courseProgram
	live       bool
	pending    []pendingEvent
}

type pendingEvent struct {
	name    string
	deliver eventDeliverer
	payload json.RawMessage
}

// attach 让 p 成为当前程序并进入"未就绪"阶段。只由 XGot_Course_Main 在 MainEntry 之前调用。
func (r *eventRegistry) attach(p *courseProgram) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	r.program = p
	r.live = false
}

// dispatch 是执行器回调进来的入口。就绪则直投，否则暂存；暂存区满说明宿主在一个
// 迟迟不启动的程序上狂投，报错让它知道，而不是无限缓冲。
func (r *eventRegistry) dispatch(name string, deliver eventDeliverer, payload json.RawMessage) error {
	p, err := r.route(name, deliver, payload)
	if err != nil || p == nil {
		return err
	}
	return deliver(p, payload)
}

// route 在锁内决定一条事件的去向：返回非 nil 程序表示直投，nil 表示已暂存。
func (r *eventRegistry) route(name string, deliver eventDeliverer, payload json.RawMessage) (*courseProgram, error) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if r.program != nil && r.live {
		return r.program, nil
	}
	if len(r.pending) >= pendingEventLimit {
		return nil, fmt.Errorf("course program is not running: %d events pending before start", pendingEventLimit)
	}
	// 载荷来自执行器的桥，不假设它在返回后仍然有效，复制一份。
	r.pending = append(r.pending, pendingEvent{name: name, deliver: deliver, payload: append(json.RawMessage(nil), payload...)})
	return nil, nil
}

// goLive 补投 p 就绪前暂存的事件，然后切换为直投。只由 Course.Start 在投递课程开始之后调用。
//
// 循环是为了保序：补投期间新到的事件仍进暂存区，下一轮再按序补投，直到暂存区为空
// 才置 live——直投的事件绝不会越过暂存中的事件。
func (r *eventRegistry) goLive(p *courseProgram) {
	for {
		batch, done := r.takePending(p)
		for _, event := range batch {
			if err := event.deliver(p, event.payload); err != nil {
				// 补投失败只可能是致命错误已经记下（此时 lane 队列是空的，容量不会不够）。
				// 记下来而不是吞掉，awaitShutdown 抛出的仍是最早的那个。
				p.recordFatal(fmt.Errorf("event %q: %w", event.name, err))
			}
		}
		if done {
			return
		}
	}
}

// takePending 在锁内取走暂存区；暂存区已空时置 live 并返回 done。
// p 已被别的程序取代时也返回 done（只会发生在同一进程跑多个程序的测试里）。
func (r *eventRegistry) takePending(p *courseProgram) (batch []pendingEvent, done bool) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if r.program != p {
		return nil, true
	}
	if len(r.pending) == 0 {
		r.live = true
		return nil, true
	}
	batch, r.pending = r.pending, nil
	return batch, false
}
