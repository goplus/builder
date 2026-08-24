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

// fakeHost 冒充前端宿主：记录课程发起的 capability 调用，并用预设的响应作答，
// 从而让课程程序能脱离 Worker/WASM 在普通的 go test 里跑起来。
//
// 这正是 courseProgram.callCapability 做成字段的意义所在——真实的桥只在 js/wasm
// 下可用，没有这个缝隙，事件循环和完成语义就只能靠浏览器手工验证。
type fakeHost struct {
	mu        sync.Mutex
	calls     []capabilityCall
	responses map[string]string
	fail      map[string]error
}

func newFakeHost() *fakeHost {
	return &fakeHost{
		responses: map[string]string{},
		fail:      map[string]error{},
	}
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
	p.mu.Unlock()

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

// runCourse 按执行器的方式跑一个课程程序，并在程序退出后返回。
//
// 必须放在 goroutine 里跑：Start 会阻塞在事件循环上，直到课程完成。超时兜底是为了
// 让"程序没能正常退出"表现为一条测试失败，而不是把整个 go test 挂死。
func runCourse(t *testing.T, host *fakeHost, mainEntry func(*testCourse)) {
	t.Helper()
	done := make(chan struct{})
	go func() {
		defer close(done)
		Gopt_Course_Main(newTestCourse(host, mainEntry))
	}()
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
	if request, _ := host.requestOf("course_completeWith"); request != `{"feedback":"Nicely done."}` {
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

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnExit(func(code int) { exitCode = code })
		course.Copilot.OnRoundFinish(func(finished CopilotRound) {
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
	release := make(chan struct{})
	overflow := make(chan error, 1)

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			if log == "block" {
				// 模拟一次慢 capability（比如一轮 LLM 生成）：这段时间里
				// 事件循环停摆，队列只进不出，最终会被打满。
				<-release
			}
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.log", `{"log":"block"}`)
			var err error
			for i := 0; err == nil && i < eventQueueSize*2; i++ {
				err = xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"flood"}`))
			}
			overflow <- err
			close(release)
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
	first.MainEntry()
	second.MainEntry()

	for _, handler := range first.courseProgram.handlerSnapshot().courseStart {
		handler()
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
