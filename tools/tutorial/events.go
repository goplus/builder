package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// pendingEventLimit 是投递队列的容量。回调在等待类 capability 期间会让出执行权，
// 投递 goroutine 因此能持续把队列排空，正常课程远够不着这个上限。打满意味着课程
// 程序真的失控（比如某个运行死循环不让出，投递方等不到它的 yielded），此时必须
// 报错给宿主而不是静默丢弃：丢掉的可能正是课程在等的判定信号，那是最难排查的一类故障。
const pendingEventLimit = 1024

// eventDeliverer 把一条原始载荷解码并为它启动运行，跑在投递 goroutine 上。
type eventDeliverer func(p *courseProgram, payload json.RawMessage) error

// eventDeliverers 是契约里全部事件的解码与启动逻辑。键的集合就是框架向执行器
// 注册的事件名全集，client_contract_test.go 会核对它与契约一致。
//
// "全部注册"是硬性要求：宿主并不知道课程订阅了什么，也不该知道；课程没订阅的
// 事件没有回调可起，自然被放弃，这与作者的直觉一致。
var eventDeliverers = map[string]eventDeliverer{
	"editor.runtime.start": decodeThen("editor.runtime.start", func(p *courseProgram, _ struct{}) error {
		startRuns(p, p.handlerSnapshot().runtimeStart, struct{}{})
		return nil
	}),
	"editor.runtime.exit": decodeThen("editor.runtime.exit", func(p *courseProgram, event runtimeExitEvent) error {
		startRuns(p, p.handlerSnapshot().runtimeExit, event.Code)
		return nil
	}),
	"editor.runtime.log": decodeThen("editor.runtime.log", func(p *courseProgram, event runtimeLogEvent) error {
		startRuns(p, p.handlerSnapshot().runtimeLog, event.Log)
		return nil
	}),
	"copilot.roundFinish": decodeThen("copilot.roundFinish", func(p *courseProgram, round CopilotRound) error {
		startRuns(p, p.handlerSnapshot().copilotRound, round)
		return nil
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
// 注册回调。落在这段窗口里的投递不能丢，也不能插队：它们和之后的投递一起躺在同一条
// 队列里，等课程程序就绪后由投递 goroutine 按到达顺序处理。
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

// eventRegistry 记录当前课程程序，并持有唯一的投递队列。
//
// 宿主的投递只入队（宿主 goroutine 立刻返回）；就绪后由 goLive 起的投递 goroutine
// 按到达顺序取出、解码并启动运行。这条队列同时就是"就绪前暂存区"：attach 之前
// 与 goLive 之前入队的事件，等投递 goroutine 起来后第一批处理。
//
// registryMu 是叶子锁：持锁区间只读写字段、操作切片，解码与投递都在锁外进行；
// scheduling_invariants_test.go 用调用白名单守住这一点。
type eventRegistry struct {
	registryMu sync.Mutex
	program    *courseProgram
	pending    []pendingEvent
	// wake 是给当前程序的投递 goroutine 的"有新事件"信号，cap-1 且非阻塞发送：
	// 只表示"该看一眼队列"，不承载事件本身。每次 attach 换一条新的，被取代的
	// 程序若还留有投递 goroutine，也只会等在旧通道上，不会吞掉新程序的信号。
	wake chan struct{}
}

type pendingEvent struct {
	name    string
	deliver eventDeliverer
	payload json.RawMessage
}

// attach 让 p 成为当前程序。只由 XGot_Course_Main 在 MainEntry 之前调用。
//
// 进程里还没有程序时，队列里是就绪前暂存的事件，留给 p；已有程序（同一进程跑
// 多个程序，只在测试里发生）时，队列里是上一个程序结束后没来得及处理的事件，
// 属于它而不属于 p，丢掉。
func (r *eventRegistry) attach(p *courseProgram) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if r.program != nil {
		r.pending = nil
	}
	r.program = p
	r.wake = make(chan struct{}, 1)
}

// dispatch 是执行器回调进来的入口，跑在宿主的 goroutine 上：入队并唤醒投递方。
// 当前程序已进终态时静默放弃——学习者的游戏可能还在输出日志，宿主没做错什么。
// 队列满说明宿主在一个不消费的程序上狂投，报错让它知道，而不是无限缓冲。
func (r *eventRegistry) dispatch(name string, deliver eventDeliverer, payload json.RawMessage) error {
	if p := r.current(); p != nil && p.terminated() {
		return nil
	}
	wake, err := r.enqueue(name, deliver, payload)
	if err != nil {
		return err
	}
	if wake != nil {
		select {
		case wake <- struct{}{}:
		default:
		}
	}
	return nil
}

func (r *eventRegistry) current() *courseProgram {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	return r.program
}

// enqueue 在锁内入队，并返回该唤醒的通道（还没有程序时为 nil，事件等 attach 后处理）。
func (r *eventRegistry) enqueue(name string, deliver eventDeliverer, payload json.RawMessage) (chan struct{}, error) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if len(r.pending) >= pendingEventLimit {
		return nil, fmt.Errorf("course event queue is full: the course program is not consuming events")
	}
	// 载荷来自执行器的桥，不假设它在返回后仍然有效，复制一份。
	r.pending = append(r.pending, pendingEvent{name: name, deliver: deliver, payload: append(json.RawMessage(nil), payload...)})
	return r.wake, nil
}

// goLive 为 p 启动投递 goroutine：按到达顺序处理队列里的事件，直到课程进入终态或
// p 被别的程序取代（只会发生在同一进程跑多个程序的测试里）。只由 Course.Start
// 在投递课程开始之后调用，所以课程开始的运行一定先于任何宿主事件的运行启动。
//
// 投递失败（载荷解码不了）记为致命错误：那是宿主的 bug，静默吞掉只会让课程
// 看起来"没反应"。
func (r *eventRegistry) goLive(p *courseProgram) {
	if !p.admitRun() {
		return
	}
	go func() {
		defer p.runs.Done()
		for {
			batch, wake, ok := r.takePending(p)
			if !ok {
				return
			}
			for _, event := range batch {
				if err := event.deliver(p, event.payload); err != nil {
					p.recordFatal(err)
					return
				}
			}
			select {
			case <-wake:
			case <-p.shutdown:
				return
			}
		}
	}()
}

// takePending 在锁内取走整条队列，连同 p 的唤醒通道；p 已被别的程序取代时返回 ok=false。
func (r *eventRegistry) takePending(p *courseProgram) (batch []pendingEvent, wake chan struct{}, ok bool) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if r.program != p {
		return nil, nil, false
	}
	batch, r.pending = r.pending, nil
	return batch, r.wake, true
}
