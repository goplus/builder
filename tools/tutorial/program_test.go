package tutorial

import (
	"encoding/json"
	"fmt"
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
		Gopt_Course_Main(newTestCourse(host, mainEntry))
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
// 短暂重试是因为测试里课程程序是异步启动的，可能还没注册好事件处理器。
func dispatch(t *testing.T, name string, payload string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		err := xgoexec.DispatchEvent(name, []byte(payload))
		if err == nil {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("dispatch %q: %v", name, err)
		}
		time.Sleep(time.Millisecond)
	}
}

// await 等一个信号，超时视为测试失败。
func await(t *testing.T, signal <-chan struct{}, what string) {
	t.Helper()
	select {
	case <-signal:
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", what)
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
		course.Editor.Runtime.OnLog(func(log string) {
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
		course.Editor.Runtime.OnLog(func(log string) {
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
	exitSeen := make(chan struct{})

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnExit(func(code int) {
			exitCode = code
			close(exitSeen)
		})
		course.Copilot.OnRoundFinish(func(finished CopilotRound) {
			// exit 与 roundFinish 是不同事件、允许交错，用信号确保断言前
			// exit 回调已经执行过。
			<-exitSeen
			round = finished
			course.Complete()
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
		course.Editor.Runtime.OnLog(func(log string) {})
		course.OnStart(func() {
			// 开场回调全程持有执行令牌，onLog 的帧无法开始，队列只进不出。
			var err error
			for i := 0; err == nil && i < eventQueueSize*2; i++ {
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
		Gopt_Course_Main(newTestCourse(host, func(course *testCourse) {
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
	first.courseProgram.runFrame(first.MainEntry)
	second.courseProgram.runFrame(second.MainEntry)

	for _, handler := range first.courseProgram.handlerSnapshot().courseStart {
		first.courseProgram.runFrame(handler)
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

// TestHandlersAccumulate 验证同一事件上注册的多段处理都会生效、且按注册顺序执行。
// 课程代码里的 onXxx 就是普通方法调用，作者对同一事件写两段是自然写法（例如两条
// 判定线索分开写），任何一段被静默丢掉都是难查的故障。spx 的事件注册同样是累加的。
func TestHandlersAccumulate(t *testing.T) {
	var trace []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.OnStart(func() { trace = append(trace, "start-1") })
		course.OnStart(func() {
			trace = append(trace, "start-2")
			dispatch(t, "editor.runtime.log", `{"log":"hit"}`)
		})
		course.Editor.Runtime.OnLog(func(log string) { trace = append(trace, "log-A:"+log) })
		course.Editor.Runtime.OnLog(func(log string) {
			trace = append(trace, "log-B:"+log)
			course.Complete()
		})
	})

	if got, want := fmt.Sprint(trace), "[start-1 start-2 log-A:hit log-B:hit]"; got != want {
		t.Errorf("trace = %s, want %s", got, want)
	}
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
		course.Editor.Runtime.OnLog(func(log string) {
			logNum++
			logSeen <- struct{}{}
		})
		course.Copilot.OnRoundFinish(func(CopilotRound) {
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

// TestSameEventStaysSerialized 验证同一事件的触发严格排队：前一次处理还挂在
// 等待类 capability 上时，后一次不会开始——判定回调因此不需要任何防重入守卫。
func TestSameEventStaysSerialized(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var order []string
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			order = append(order, "begin:"+log)
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
	releaseGenerate()
	awaitDone(t, done)

	want := "[begin:slow end:slow begin:fast end:fast]"
	if got := fmt.Sprint(order); got != want {
		t.Errorf("order = %s, want %s", got, want)
	}
}

// TestPresentationCallsAreSerialized 验证展示串行通道：两个回调各自要弹窗时，
// 第二个展示调用等第一个结束才到达宿主——宿主永远不用处理并发弹窗。
func TestPresentationCallsAreSerialized(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	ready := make(chan struct{})
	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart(func() {
			course.ShowMessage("first")
		})
		course.Editor.Runtime.OnExit(func(int) {
			course.ShowMessage("second")
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	await(t, messageShown, "the first showMessage to reach the host")
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	// 第二个弹窗必须还没到达宿主：它在展示通道上排队。
	select {
	case <-messageShown:
		t.Fatal("the second showMessage reached the host while the first dialog was open")
	case <-time.After(50 * time.Millisecond):
	}
	releaseMessage()
	await(t, messageShown, "the second showMessage to reach the host")
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
		course.Editor.Runtime.OnStart(func() {
			course.Copilot.GenerateText("first")
		})
		course.Editor.Runtime.OnExit(func(int) {
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
