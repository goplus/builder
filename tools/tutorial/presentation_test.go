package tutorial

import "testing"

func TestPresentationRequests(t *testing.T) {
	for _, tt := range []struct {
		name       string
		call       func(*testCourse)
		capability string
		want       string
	}{
		{"prelude", func(c *testCourse) { c.ShowPrelude__0("A") }, "course_showPrelude", `{"messages":["A"],"buttonText":null}`},
		{"prelude action", func(c *testCourse) { c.ShowPrelude__1("A", "Start") }, "course_showPrelude", `{"messages":["A"],"buttonText":"Start"}`},
		{"pages", func(c *testCourse) { c.ShowPrelude__2([]string{"A", "B"}) }, "course_showPrelude", `{"messages":["A","B"],"buttonText":null}`},
		{"pages action", func(c *testCourse) { c.ShowPrelude__3([]string{"A", "B"}, "Next") }, "course_showPrelude", `{"messages":["A","B"],"buttonText":"Next"}`},
		{"message", func(c *testCourse) { c.ShowMessage__0("A") }, "course_showMessage", `{"content":"A","buttonText":null}`},
		{"message action", func(c *testCourse) { c.ShowMessage__1("A", "Next") }, "course_showMessage", `{"content":"A","buttonText":"Next"}`},
		{"video", func(c *testCourse) { c.ShowVideo__0("intro") }, "course_showVideo", `{"videoName":"intro","buttonText":null}`},
		{"video action", func(c *testCourse) { c.ShowVideo__1("intro", "Start") }, "course_showVideo", `{"videoName":"intro","buttonText":"Start"}`},
	} {
		t.Run(tt.name, func(t *testing.T) {
			host := newFakeHost()
			runCourse(t, host, func(c *testCourse) { c.OnStart(func() { tt.call(c); c.Complete() }) })
			if got, _ := host.requestOf(tt.capability); got != tt.want {
				t.Fatalf("request = %s, want %s", got, tt.want)
			}
		})
	}
}
