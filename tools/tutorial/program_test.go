package tutorial

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/goplus/builder/tools/xgoexec"
)

// capabilityCall 记录课程程序发起过的一次 capability 调用。
type capabilityCall struct {
	name    string
	request string
}

// capabilityHold 让测试把某个 capability 变成"挂起直到放行"：
// 每次调用到达时向 started 发一个信号，然后阻塞等 release 放行一次。
// 用它模拟展示类能力等学习者、LLM 能力等生成的真实节奏。
type capabilityHold struct {
	started chan struct{}
	release chan struct{}
}

// fakeHost 冒充前端宿主：记录课程发起的 capability 调用，并用预设的响应作答，
// 从而让课程程序能脱离 Worker/WASM 在普通的 go test 里跑起来。
//
// 这正是 courseProgram.callCapability 做成字段的意义所在——真实的桥只在 js/wasm
// 下可用，没有这个缝隙，执行模型和完成语义就只能靠浏览器手工验证。
type fakeHost struct {
	mu        sync.Mutex
	calls     []capabilityCall
	responses map[string]string
	fail      map[string]error
	holds     map[string]*capabilityHold
}

func newFakeHost() *fakeHost {
	return &fakeHost{
		responses: map[string]string{},
		fail:      map[string]error{},
		holds:     map[string]*capabilityHold{},
	}
}

// holdCapability 让 name 的每次调用挂起：started 上出现一个信号表示一次调用
// 已经到达并挂起，release() 放行一次调用。
func (p *fakeHost) holdCapability(name string) (started <-chan struct{}, release func()) {
	hold := &capabilityHold{
		started: make(chan struct{}, 16),
		release: make(chan struct{}, 16),
	}
	p.mu.Lock()
	p.holds[name] = hold
	p.mu.Unlock()
	return hold.started, func() { hold.release <- struct{}{} }
}

func (p *fakeHost) call(name string, request, result any) error {
	encoded, err := json.Marshal(request)
	if err != nil {
		return err
	}

	p.mu.Lock()
	p.calls = append(p.calls, capabilityCall{name: name, request: string(encoded)})
	response, hasResponse := p.responses[name]
	failure := p.fail[name]
	hold := p.holds[name]
	p.mu.Unlock()

	if hold != nil {
		hold.started <- struct{}{}
		<-hold.release
	}
	if failure != nil {
		return failure
	}
	if result == nil || !hasResponse {
		return nil
	}
	return json.Unmarshal([]byte(response), result)
}

func (p *fakeHost) names() []string {
	p.mu.Lock()
	defer p.mu.Unlock()
	names := make([]string, len(p.calls))
	for i, call := range p.calls {
		names[i] = call.name
	}
	return names
}

func (p *fakeHost) requestOf(name string) (string, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, call := range p.calls {
		if call.name == name {
			return call.request, true
		}
	}
	return "", false
}

// testCourse 手工复刻 XGo 为课程程序生成的形状：框架的 Course 被嵌进一个类里，
// 该类的 MainEntry 承载作者写的课程代码。测试用闭包充当 MainEntry，
// 这样每个用例都能像写课程一样注册回调。
type testCourse struct {
	Course
	mainEntry func(*testCourse)
}

func (p *testCourse) MainEntry() { p.mainEntry(p) }

// newTestCourse 组装一个课程程序，并把它的 capability 桥换成假宿主。
//
// 换桥的时机只能是 MainEntry：initCourse 在那之前刚把运行状态（含真实的桥）初始化好，
// 而课程代码要到 MainEntry 才开始跑，所以这里是最早、也是唯一合适的注入点。
func newTestCourse(host *fakeHost, mainEntry func(*testCourse)) *testCourse {
	return &testCourse{mainEntry: func(course *testCourse) {
		course.courseProgram.callCapability = host.call
		mainEntry(course)
	}}
}

// startCourse 异步启动一个课程程序，返回其结束信号。
func startCourse(host *fakeHost, mainEntry func(*testCourse)) <-chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		XGot_Course_Main(newTestCourse(host, mainEntry))
	}()
	return done
}

// runCourse 按执行器的方式跑一个课程程序，并在程序退出后返回。超时兜底是为了
// 让"程序没能正常退出"表现为一条测试失败，而不是把整个 go test 挂死。
func runCourse(t *testing.T, host *fakeHost, mainEntry func(*testCourse)) {
	t.Helper()
	awaitDone(t, startCourse(host, mainEntry))
}

func awaitDone(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// dispatch 从"宿主"投递一个事件，走的是 xgoexec.DispatchEvent 这个真实入口。
// 事件 handler 在包初始化时就已注册（见 events.go），这里不需要等待或重试。
func dispatch(t *testing.T, name string, payload string) {
	t.Helper()
	if err := xgoexec.DispatchEvent(name, []byte(payload)); err != nil {
		t.Fatalf("dispatch %q: %v", name, err)
	}
}

// resetEventRegistry 把进程级事件入口恢复到"还没有任何程序"的状态，
// 用来模拟一个刚启动、课程程序尚未 attach 的 wasm 实例。
func resetEventRegistry() {
	events.registryMu.Lock()
	defer events.registryMu.Unlock()
	events.program, events.pending = nil, nil
}

// await 等一个信号，超时视为测试失败。
func await(t *testing.T, signal <-chan struct{}, what string) {
	t.Helper()
	awaitOne(t, signal, what)
}

// awaitOne 等一个带值的信号并返回它，超时视为测试失败。
func awaitOne[T any](t *testing.T, signal <-chan T, what string) T {
	t.Helper()
	select {
	case value := <-signal:
		return value
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", what)
		var zero T
		return zero
	}
}

func TestCompletionEndsTheProgram(t *testing.T) {
	host := newFakeHost()

	runCourse(t, host, func(course *testCourse) {
		course.OnStart(func() {
			course.ShowPrelude("Move Lita to Mushroom.")
			course.CompleteWith("Nicely done.")
		})
	})

	want := []string{"course_showPrelude", "course_completeWith"}
	got := host.names()
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("capability calls = %v, want %v", got, want)
	}
	if request, _ := host.requestOf("course_completeWith"); request != `{"content":"Nicely done."}` {
		t.Errorf("completeWith request = %s", request)
	}
}

func TestCompletionIsIdempotent(t *testing.T) {
	host := newFakeHost()

	runCourse(t, host, func(course *testCourse) {
		course.OnStart(func() {
			course.Complete()
			// 课程代码漏写 else、或积压事件让判定回调再触发一次时，
			// 不能出现第二次完成（学习者会看到两次完成弹窗）。
			course.CompleteWith("second")
		})
	})

	if got, want := fmt.Sprint(host.names()), "[course_complete]"; got != want {
		t.Errorf("capability calls = %s, want %s", got, want)
	}
}

func TestRuntimeLogsArriveInOrder(t *testing.T) {
	var logs []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {
			logs = append(logs, log)
			if log == "third" {
				course.Complete()
			}
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.log", `{"log":"first"}`)
			dispatch(t, "editor.runtime.log", `{"log":"second"}`)
			dispatch(t, "editor.runtime.log", `{"log":"third"}`)
		})
	})

	if got, want := fmt.Sprint(logs), "[first second third]"; got != want {
		t.Errorf("logs = %s, want %s", got, want)
	}
}

func TestEventsAfterCompletionAreNotDelivered(t *testing.T) {
	var logs []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {
			logs = append(logs, log)
			course.Complete()
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.log", `{"log":"reached-target"}`)
			dispatch(t, "editor.runtime.log", `{"log":"stray"}`)
		})
	})

	if got, want := fmt.Sprint(logs), "[reached-target]"; got != want {
		t.Errorf("logs = %s, want %s", got, want)
	}
}

func TestUnsubscribedEventsAreAccepted(t *testing.T) {
	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.OnStart(func() {
			// 课程什么都没订阅：宿主依然要能投递成功，事件被安静地丢掉。
			// 宿主并不知道课程订阅了什么，也不该因此收到错误。
			dispatch(t, "editor.runtime.start", `null`)
			dispatch(t, "editor.runtime.exit", `{"code":0}`)
			dispatch(t, "copilot.roundFinish", `{"userMessage":"hi","resultMessages":["hello"]}`)
			course.Complete()
		})
	})
}

func TestRuntimeExitAndCopilotRoundPayloads(t *testing.T) {
	var exitCode int
	var round CopilotRound
	seen := 0

	runCourse(t, newFakeHost(), func(course *testCourse) {
		// 两段回调相互独立、完成顺序不承诺；回调都在执行令牌下运行，
		// 共享计数的读改写是安全的。两段都执行过才完成。
		note := func() {
			seen++
			if seen == 2 {
				course.Complete()
			}
		}
		course.Editor.Runtime.OnExit__0(func(code int) {
			exitCode = code
			note()
		})
		course.Copilot.OnRoundFinish__0(func(finished CopilotRound) {
			round = finished
			note()
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.exit", `{"code":2}`)
			dispatch(t, "copilot.roundFinish", `{"userMessage":"why","resultMessages":["because","ok"]}`)
		})
	})

	if exitCode != 2 {
		t.Errorf("exit code = %d, want 2", exitCode)
	}
	if round.UserMessage != "why" || fmt.Sprint(round.ResultMessages) != "[because ok]" {
		t.Errorf("round = %+v", round)
	}
}

func TestEventQueueOverflowIsReported(t *testing.T) {
	overflow := make(chan error, 1)

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {})
		course.OnStart(func() {
			// 开场回调全程持有执行令牌，onLog 的运行无法开始，投递方等不到它让出，队列只进不出。
			var err error
			for i := 0; err == nil && i < pendingEventLimit*2; i++ {
				err = xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"flood"}`))
			}
			overflow <- err
			course.Complete()
		})
	})

	if err := <-overflow; err == nil {
		t.Error("expected the host to be told the event queue is full")
	}
}

func TestCapabilityFailureStopsTheCourse(t *testing.T) {
	host := newFakeHost()
	host.fail["course_showMessage"] = fmt.Errorf("no dialog")

	done := make(chan any, 1)
	go func() {
		defer func() { done <- recover() }()
		XGot_Course_Main(newTestCourse(host, func(course *testCourse) {
			course.OnStart(func() { course.ShowMessage("hi") })
		}))
	}()

	select {
	case recovered := <-done:
		if recovered == nil {
			t.Error("a failed capability must not be silently ignored")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// TestCoursesDoNotShareState 验证运行状态确实是实例级的：两个课程实例各自持有
// 自己的回调与完成标志，互不干扰。这是从包级状态改成实例级之后最该守住的性质。
func TestCoursesDoNotShareState(t *testing.T) {
	firstHost, secondHost := newFakeHost(), newFakeHost()

	first := newTestCourse(firstHost, func(course *testCourse) {
		course.OnStart(func() { course.ShowMessage("first") })
	})
	second := newTestCourse(secondHost, func(course *testCourse) {
		course.OnStart(func() { course.ShowMessage("second") })
	})

	// 只初始化不运行：此时两者都还没完成，各自的回调也只登记在自己身上。
	first.initCourse()
	second.initCourse()
	first.courseProgram.runFrame(newRun(), first.MainEntry)
	second.courseProgram.runFrame(newRun(), second.MainEntry)

	for _, reg := range first.courseProgram.handlerSnapshot().courseStart {
		first.courseProgram.runFrame(newRun(), func() { reg.handler(struct{}{}) })
	}
	if !first.courseProgram.markCompleted() {
		t.Fatal("the first course was already completed")
	}
	if second.courseProgram.isCompleted() {
		t.Error("completing one course must not complete another")
	}
	if got, want := fmt.Sprint(firstHost.names()), "[course_showMessage]"; got != want {
		t.Errorf("first host calls = %s, want %s", got, want)
	}
	if got := fmt.Sprint(secondHost.names()); got != "[]" {
		t.Errorf("second host received %s, want no calls", got)
	}
}

// TestHandlersAccumulate 验证同一事件上注册的多段处理都会生效，课程开始也不例外。
// 课程代码里的 onXxx 就是普通方法调用，作者对同一事件写两段是自然写法（例如两条
// 判定线索分开写），任何一段被静默丢掉都是难查的故障。spx 的事件注册同样是累加的。
// 各段回调相互独立、完成顺序不承诺（多段 onStart 之间也一样），所以只断言每段都
// 恰好执行了一次；完成要等四段都到齐，否则先完成的一方会让尚未开始的帧被准入检查放弃。
func TestHandlersAccumulate(t *testing.T) {
	var trace []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		note := func(entry string) {
			trace = append(trace, entry)
			if len(trace) == 4 {
				course.Complete()
			}
		}
		course.OnStart(func() { note("start-1") })
		course.OnStart(func() {
			note("start-2")
			dispatch(t, "editor.runtime.log", `{"log":"hit"}`)
		})
		course.Editor.Runtime.OnLog__0(func(log string) { note("log-A:" + log) })
		course.Editor.Runtime.OnLog__0(func(log string) { note("log-B:" + log) })
	})

	if len(trace) != 4 {
		t.Fatalf("trace = %v, want 4 entries", trace)
	}
	for _, want := range []string{"start-1", "start-2", "log-A:hit", "log-B:hit"} {
		if got := strings.Count(fmt.Sprint(trace), want); got != 1 {
			t.Errorf("trace = %v: %s appears %d times, want exactly once", trace, want, got)
		}
	}
}

// TestCourseStartHandlersRunIndependently 验证课程开始与其他事件走同一条路：
// 一段 onStart 挂在展示类 capability 上等学习者时，另一段 onStart 不必等它返回。
// 两段谁先拿到令牌不承诺，但无论哪种顺序，第二段的信号都必须在放行展示之前到达；
// 开场回调若仍在主 goroutine 上顺序执行，这个等待会超时。
func TestCourseStartHandlersRunIndependently(t *testing.T) {
	host := newFakeHost()
	preludeShown, releasePrelude := host.holdCapability("course_showPrelude")
	otherRan := make(chan struct{}, 1)

	done := startCourse(host, func(course *testCourse) {
		course.OnStart(func() {
			course.ShowPrelude("welcome")
			course.Complete()
		})
		course.OnStart(func() { otherRan <- struct{}{} })
	})

	await(t, preludeShown, "the first onStart to suspend in showPrelude")
	await(t, otherRan, "the second onStart to run while the prelude is still up")
	releasePrelude()
	awaitDone(t, done)
}

// TestCallbackRegisteredDuringRunReceivesEvents 验证课程运行中（回调里）注册的回调
// 同样得到 worker：晚注册的 onLog 能收到之后投递的日志。作者会这样写——等开场
// 说明看完再开始判定。这是 addLane 里 lanesStarted 为 true 的那条路径，没有它，
// 晚注册的回调会挂进 handlers 却永远无人执行。
func TestCallbackRegisteredDuringRunReceivesEvents(t *testing.T) {
	host := newFakeHost()
	registered := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.OnStart(func() {
			course.Editor.Runtime.OnLog__0(func(log string) {
				if log == "hit" {
					course.Complete()
				}
			})
			close(registered)
		})
	})

	await(t, registered, "the late onLog registration")
	dispatch(t, "editor.runtime.log", `{"log":"hit"}`)
	awaitDone(t, done)
}

// TestSameEventHandlersRunIndependently 验证同一事件上注册的多段回调相互独立：
// 一段挂在等待类 capability 上时，另一段照常处理同一条触发。
func TestSameEventHandlersRunIndependently(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	otherSeen := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {
			course.Copilot.GenerateText("judge " + log)
			course.Complete()
		})
		course.Editor.Runtime.OnLog__0(func(string) {
			otherSeen <- struct{}{}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"go"}`)
	await(t, generateStarted, "the first handler to suspend in generateText")
	// 第一段还挂着，第二段必须已经（或照常能够）处理同一条日志。
	awaitOne(t, otherSeen, "the second handler to run independently")
	releaseGenerate()
	awaitDone(t, done)
}

// TestWaitingCapabilityYieldsToOtherEvents 验证执行模型的核心承诺：一个回调
// 挂在展示类 capability 上等学习者时，其他事件的回调照常执行；挂起的回调恢复后
// 读到的共享状态是新鲜的。
func TestWaitingCapabilityYieldsToOtherEvents(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	logNum := 0
	logSeen := make(chan struct{}, 16)
	var observed int
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {
			logNum++
			logSeen <- struct{}{}
		})
		course.Copilot.OnRoundFinish__0(func(CopilotRound) {
			course.ShowMessage("look at this")
			observed = logNum
			course.Complete()
		})
		// xgoexec 的事件注册表是进程级的：等本课程真的跑起来再投递，
		// 免得事件被上一个测试留下的已完成程序静默吞掉。
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "copilot.roundFinish", `{"userMessage":"hi","resultMessages":["hello"]}`)
	await(t, messageShown, "showMessage to reach the host")
	// 弹窗仍在挂起中，日志事件必须照常被处理。
	for i := 0; i < 3; i++ {
		dispatch(t, "editor.runtime.log", `{"log":"tick"}`)
	}
	for i := 0; i < 3; i++ {
		await(t, logSeen, "a log callback to run during the dialog")
	}
	releaseMessage()
	awaitDone(t, done)

	if observed != 3 {
		t.Errorf("logNum observed after showMessage = %d, want 3", observed)
	}
}

// TestRunsOfOneCallbackOverlapByDefault 验证没有策略时同一段回调的多次运行可以并存：
// 前一次挂在等待类 capability 上时，后一次照常开始并跑完（spx 语义）。
func TestRunsOfOneCallbackOverlapByDefault(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var order []string
	fastDone := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {
			order = append(order, "begin:"+log)
			if log == "slow" {
				course.Copilot.GenerateText("judge")
			}
			order = append(order, "end:"+log)
			if log == "fast" {
				fastDone <- struct{}{}
			}
			if log == "slow" {
				course.Complete()
			}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"slow"}`)
	await(t, generateStarted, "generateText to reach the host")
	dispatch(t, "editor.runtime.log", `{"log":"fast"}`)
	await(t, fastDone, "the second run to finish while the first is suspended")
	releaseGenerate()
	awaitDone(t, done)

	want := "[begin:slow begin:fast end:fast end:slow]"
	if got := fmt.Sprint(order); got != want {
		t.Errorf("order = %s, want %s", got, want)
	}
}

// TestOneAtATimeRunsInOrder 验证 OneAtATime：前一次运行还挂在等待类 capability 上时，
// 后一次排队，等前一次结束才开始，因此完成顺序等于触发顺序。
func TestOneAtATimeRunsInOrder(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var order []string
	fastBegan := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__1(OneAtATime, func(log string) {
			order = append(order, "begin:"+log)
			if log == "fast" {
				fastBegan <- struct{}{}
			}
			if log == "slow" {
				course.Copilot.GenerateText("judge")
			}
			order = append(order, "end:"+log)
			if log == "fast" {
				course.Complete()
			}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"slow"}`)
	await(t, generateStarted, "generateText to reach the host")
	dispatch(t, "editor.runtime.log", `{"log":"fast"}`)
	select {
	case <-fastBegan:
		t.Fatal("the queued run began while the earlier run was still going")
	case <-time.After(50 * time.Millisecond):
	}
	releaseGenerate()
	awaitDone(t, done)

	want := "[begin:slow end:slow begin:fast end:fast]"
	if got := fmt.Sprint(order); got != want {
		t.Errorf("order = %s, want %s", got, want)
	}
}

// TestOneAtATimeQueuedRunYields 验证 OneAtATime 的排队是让出令牌的等待：
// 一段回调的运行在排队时，同一条日志的其他回调照常处理。
func TestOneAtATimeQueuedRunYields(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	otherSeen := make(chan string, 4)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__1(OneAtATime, func(log string) {
			course.Copilot.GenerateText("judge " + log)
			if log == "second" {
				course.Complete()
			}
		})
		course.Editor.Runtime.OnLog__0(func(log string) { otherSeen <- log })
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"first"}`)
	await(t, generateStarted, "the first run to suspend in generateText")
	dispatch(t, "editor.runtime.log", `{"log":"second"}`)
	// 第二次运行在 OneAtATime 的队列里等着，另一段回调必须已经处理了两条日志。
	awaitOne(t, otherSeen, "the other callback to see the first log")
	awaitOne(t, otherSeen, "the other callback to see the second log while a run is queued")
	releaseGenerate()
	await(t, generateStarted, "the queued run to proceed once the earlier run ends")
	releaseGenerate()
	awaitDone(t, done)
}

// TestCancelPreviousEndsTheStaleRun 验证 CancelPrevious：新触发的运行开始时，
// 上一次还挂在等待上的运行被取消，等待返回后它的剩余语句不再执行。
func TestCancelPreviousEndsTheStaleRun(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var trace []string
	ready := make(chan struct{})
	newDone := make(chan struct{}, 1)

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__1(CancelPrevious, func(log string) {
			trace = append(trace, "begin:"+log)
			course.Copilot.GenerateText("judge " + log)
			trace = append(trace, "after:"+log)
			if log == "new" {
				newDone <- struct{}{}
			}
		})
		course.Editor.Runtime.OnExit__0(func(int) { course.Complete() })
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"old"}`)
	await(t, generateStarted, "the old run to suspend in generateText")
	dispatch(t, "editor.runtime.log", `{"log":"new"}`)
	await(t, generateStarted, "the new run to suspend in generateText")
	releaseGenerate()
	releaseGenerate()
	await(t, newDone, "the new run to finish")
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	awaitDone(t, done)

	got := fmt.Sprint(trace)
	if strings.Contains(got, "after:old") || !strings.Contains(got, "after:new") {
		t.Errorf("trace = %s: the cancelled run must stop at its wait, the new run must finish", got)
	}
}

// TestCancelledRunDiscardsPendingResult 验证被取消的运行不回填等待返回的结果：
// 作者传给 generateJSON 的结构体在取消后保持原样。
func TestCancelledRunDiscardsPendingResult(t *testing.T) {
	type verdict struct {
		Praise string `json:"praise"`
	}
	host := newFakeHost()
	host.responses["copilot_generateJSON"] = `{"praise":"filled"}`
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateJSON")

	oldResult, newResult := &verdict{}, &verdict{}
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__1(CancelPrevious, func(log string) {
			target := newResult
			if log == "old" {
				target = oldResult
			}
			course.Copilot.GenerateJSON("judge "+log, target)
			if log == "new" {
				course.Complete()
			}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"old"}`)
	await(t, generateStarted, "the old run to suspend in generateJSON")
	dispatch(t, "editor.runtime.log", `{"log":"new"}`)
	await(t, generateStarted, "the new run to suspend in generateJSON")
	releaseGenerate()
	releaseGenerate()
	awaitDone(t, done)

	if oldResult.Praise != "" {
		t.Errorf("cancelled run filled its result with %q; the pending result must be discarded", oldResult.Praise)
	}
	if newResult.Praise != "filled" {
		t.Errorf("newResult.Praise = %q, want the generated value", newResult.Praise)
	}
}

// TestSkipWhileBusyDropsTriggers 验证 SkipWhileBusy：有运行在途时新触发的运行就地结束，
// 回调体不执行；在途运行结束后新触发又照常处理。
func TestSkipWhileBusyDropsTriggers(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var trace []string
	seen := make(chan string, 4)
	firstEnded := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__1(SkipWhileBusy, func(log string) {
			trace = append(trace, "begin:"+log)
			course.Copilot.GenerateText("judge " + log)
			trace = append(trace, "end:"+log)
			if log == "first" {
				firstEnded <- struct{}{} // 组在运行结束、归还令牌之前释放，之后的触发不会再被跳过
			}
			if log == "third" {
				course.Complete()
			}
		})
		// 注册在后的这段回调看到日志时，前一段对同一条日志的加入决定已经做出。
		course.Editor.Runtime.OnLog__0(func(log string) { seen <- log })
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"first"}`)
	await(t, generateStarted, "the first run to suspend in generateText")
	awaitOne(t, seen, "the observer to see the first log")
	dispatch(t, "editor.runtime.log", `{"log":"second"}`)
	awaitOne(t, seen, "the observer to see the second log")
	releaseGenerate()
	await(t, firstEnded, "the first run to end and free the group")
	dispatch(t, "editor.runtime.log", `{"log":"third"}`)
	await(t, generateStarted, "the third run to suspend in generateText")
	releaseGenerate()
	awaitDone(t, done)

	want := "[begin:first end:first begin:third end:third]"
	if got := fmt.Sprint(trace); got != want {
		t.Errorf("trace = %s, want %s", got, want)
	}
}

// TestRunGroupSharedAcrossCallbacks 验证作者建的运行组可以跨事件共用，且在过滤之后
// 加入：onLog 的判定在途时，onExit 的判定就地结束；无关日志不受影响。
func TestRunGroupSharedAcrossCallbacks(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var trace []string
	exitSeen := make(chan struct{}, 2)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		judging := course.NewRunGroup(SkipWhileBusy)
		course.Editor.Runtime.OnLog__0(func(log string) {
			if log != "reached" {
				trace = append(trace, "ignored:"+log)
				return
			}
			judging.Enter()
			trace = append(trace, "judging:log")
			course.Copilot.GenerateText("judge")
			course.Complete()
		})
		course.Editor.Runtime.OnExit__0(func(int) {
			judging.Enter()
			trace = append(trace, "judging:exit")
		})
		course.Editor.Runtime.OnExit__0(func(int) { exitSeen <- struct{}{} })
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"reached"}`)
	await(t, generateStarted, "the log judgement to suspend in generateText")
	dispatch(t, "editor.runtime.log", `{"log":"noise"}`)
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	await(t, exitSeen, "the exit to be processed while the log judgement is in flight")
	releaseGenerate()
	awaitDone(t, done)

	want := "[judging:log ignored:noise]"
	if got := fmt.Sprint(trace); got != want {
		t.Errorf("trace = %s, want %s", got, want)
	}
}

// TestCallbacksStartInRegistrationOrder 验证同一触发内各段回调按注册顺序启动，
// 前一段跑到第一次等待后下一段才开始，且下一段在前一段挂起期间照常运行。
func TestCallbacksStartInRegistrationOrder(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	var trace []string
	secondRan := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(string) {
			trace = append(trace, "first")
			course.ShowMessage("look")
		})
		course.Editor.Runtime.OnLog__0(func(string) {
			trace = append(trace, "second")
			secondRan <- struct{}{}
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"go"}`)
	await(t, messageShown, "the first callback to suspend in showMessage")
	await(t, secondRan, "the second callback to run while the first is suspended")
	releaseMessage()
	awaitDone(t, done)

	if got, want := fmt.Sprint(trace), "[first second]"; got != want {
		t.Errorf("trace = %s, want %s", got, want)
	}
}

// TestPresentationCallsMayOverlap 验证框架不再串行展示类调用：两个回调各自弹窗时，
// 两个 showMessage 同时挂在宿主上，怎么处理重叠是宿主 capability 的策略。
func TestPresentationCallsMayOverlap(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	ready := make(chan struct{})
	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart__0(func() {
			course.ShowMessage("first")
		})
		course.Editor.Runtime.OnExit__0(func(int) {
			course.ShowMessage("second")
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	await(t, messageShown, "the first showMessage to reach the host")
	await(t, messageShown, "the second showMessage to reach the host while the first is open")
	releaseMessage()
	releaseMessage()
	awaitDone(t, done)
}

// TestSlowCapabilitiesRunConcurrently 验证非展示类的等待能力可以并发在途：
// 两个回调各自等一次 LLM 生成时，两个请求同时挂在宿主上。
func TestSlowCapabilitiesRunConcurrently(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	ready := make(chan struct{})
	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart__0(func() {
			course.Copilot.GenerateText("first")
		})
		course.Editor.Runtime.OnExit__0(func(int) {
			course.Copilot.GenerateText("second")
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	// 两个 generateText 必须都在宿主上挂起——等待类能力互不阻塞。
	await(t, generateStarted, "the first generateText to reach the host")
	await(t, generateStarted, "the second generateText to reach the host")
	releaseGenerate()
	releaseGenerate()
	awaitDone(t, done)
}

// TestFatalDuringCompletionIsReported 验证完成路径上迟到的致命错误不被吞掉：
// Complete 先进入终态再调 course_complete，这一下若失败，程序必须以错误退出
// 而不是被报成 completed。
func TestFatalDuringCompletionIsReported(t *testing.T) {
	host := newFakeHost()
	host.fail["course_complete"] = fmt.Errorf("completion rejected")

	done := make(chan any, 1)
	go func() {
		defer func() { done <- recover() }()
		XGot_Course_Main(newTestCourse(host, func(course *testCourse) {
			course.OnStart(func() { course.Complete() })
		}))
	}()

	select {
	case recovered := <-done:
		if recovered == nil {
			t.Error("a failed completion capability must not be reported as completed")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// TestQueuedEventDroppedWhenCompletionWinsTheToken 验证令牌后的准入检查：
// 一个事件已出队、其帧正在等令牌，此时别的帧完成了课程——等到令牌的帧
// 必须放弃执行，而不是在课程结束后又跑一段回调。
func TestQueuedEventDroppedWhenCompletionWinsTheToken(t *testing.T) {
	// 本测试从测试 goroutine 投递而不等就绪信号：先把事件入口清成"还没有程序"，
	// 早到的投递进暂存区、就绪后补投，而不是落到上一个测试留下的程序上。
	resetEventRegistry()
	host := newFakeHost()
	holding := make(chan struct{})
	proceed := make(chan struct{})
	exitRan := make(chan struct{}, 1)

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart__0(func() {
			close(holding) // 本次运行持有令牌，等测试放行
			<-proceed
			course.Complete()
		})
		course.Editor.Runtime.OnExit__0(func(int) {
			exitRan <- struct{}{}
		})
		course.OnStart(func() {})
	})

	// 等 runtime.start 的运行持有令牌后，再投递 exit：它的运行要么已在等令牌，
	// 要么还没被投递方启动——两种情况下完成之后都不该再执行。
	dispatch(t, "editor.runtime.start", `null`)
	await(t, holding, "the start callback to hold the token")
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	close(proceed) // 持令牌的运行现在完成课程并归还令牌
	awaitDone(t, done)

	select {
	case <-exitRan:
		t.Error("a callback started after completion despite the admission check")
	default:
	}
}

// TestGenerateJSONDecodesUnderTheToken 验证等待类调用的响应回填发生在令牌之下：
// 作者把同一个结构体共享给两段回调时，让位期间另一段的写入与桥的解码
// 不构成数据竞争（本用例主要靠 -race 守护），且生成结果最终写入成功。
func TestGenerateJSONDecodesUnderTheToken(t *testing.T) {
	type feedback struct {
		Praise string `json:"praise"`
	}
	host := newFakeHost()
	host.responses["copilot_generateJSON"] = `{"praise":"generated"}`
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateJSON")

	shared := &feedback{}
	touched := make(chan struct{})
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart__0(func() {
			course.Copilot.GenerateJSON("judge", shared)
			course.Complete()
		})
		course.Editor.Runtime.OnLog__0(func(string) {
			shared.Praise = "poked by another callback"
			touched <- struct{}{}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	await(t, generateStarted, "generateJSON to reach the host")
	// 生成挂起期间，另一段回调写同一个结构体——解码若不回到令牌下，这里就是竞态。
	dispatch(t, "editor.runtime.log", `{"log":"poke"}`)
	await(t, touched, "the other callback to write the shared struct")
	releaseGenerate()
	awaitDone(t, done)

	if shared.Praise != "generated" {
		t.Errorf("shared.Praise = %q, want the generated value", shared.Praise)
	}
}

// TestCompletionSettlesPendingWait 验证完成时已在途的等待调用被宿主 settle 后，
// 挂起的帧把剩余语句执行完、程序正常以 completed 收尾（契约要求宿主在完成后
// 尽快 settle 全部在途调用）。
func TestCompletionSettlesPendingWait(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")
	resumed := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart__0(func() {
			course.ShowMessage("still open")
			resumed <- struct{}{}
		})
		course.Editor.Runtime.OnExit__0(func(int) {
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	await(t, messageShown, "showMessage to reach the host")
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	// 课程已完成，但 showMessage 还挂着；宿主按契约 settle 它。
	releaseMessage()
	awaitDone(t, done)
	await(t, resumed, "the suspended callback to finish its remaining statements")
}

// TestEventsBeforeReadyAreDeliveredInOrder 验证就绪前到达的事件不丢、不乱序：
// 执行器的 run() 在程序跑到注册回调之前就 resolve，宿主此刻的投递必须在程序
// 就绪后按到达顺序送达。这里从 MainEntry 里、在 onLog 注册之前投递，模拟的正是
// 那段窗口——旧实现下这些日志在投递时找不到 lane，会被静默放弃。
func TestEventsBeforeReadyAreDeliveredInOrder(t *testing.T) {
	var logs []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		dispatch(t, "editor.runtime.log", `{"log":"first"}`)
		dispatch(t, "editor.runtime.log", `{"log":"second"}`)
		course.Editor.Runtime.OnLog__0(func(log string) {
			logs = append(logs, log)
			if log == "third" {
				course.Complete()
			}
		})
		dispatch(t, "editor.runtime.log", `{"log":"third"}`)
	})

	if got, want := fmt.Sprint(logs), "[first second third]"; got != want {
		t.Errorf("logs = %s, want %s", got, want)
	}
}

// TestEventsBeforeAnyProgramAreHeld 验证进程里还没有程序时的投递同样被暂存：
// 宿主在 run() resolve 后立刻投递，而解释器还没执行到 XGot_Course_Main。
func TestEventsBeforeAnyProgramAreHeld(t *testing.T) {
	resetEventRegistry()
	dispatch(t, "editor.runtime.log", `{"log":"early"}`)

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog__0(func(log string) {
			if log == "early" {
				course.Complete()
			}
		})
	})
}

// TestPendingEventsAreBounded 验证暂存区有上限：宿主对一个迟迟不启动的程序狂投，
// 超限的投递报错而不是无限缓冲。
func TestPendingEventsAreBounded(t *testing.T) {
	resetEventRegistry()
	t.Cleanup(resetEventRegistry)

	for i := 0; i < pendingEventLimit; i++ {
		if err := xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"x"}`)); err != nil {
			t.Fatalf("dispatch %d: %v", i, err)
		}
	}
	if err := xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"x"}`)); err == nil {
		t.Fatal("a dispatch beyond the pending limit must fail")
	}
}
