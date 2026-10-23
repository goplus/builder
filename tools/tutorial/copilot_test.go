package tutorial

import (
	"fmt"
	"strings"
	"testing"
)

func TestGenerateTextReturnsTheText(t *testing.T) {
	host := newFakeHost()
	host.responses["copilot_generateText"] = `"Nice work"`

	var text string
	var err error
	runCourse(t, host, func(course *testCourse) {
		course.OnStart(func() {
			text, err = course.Copilot.GenerateText("give feedback")
			course.Complete()
		})
	})

	if text != "Nice work" || err != nil {
		t.Errorf("GenerateText = %q, %v; want the generated text and no error", text, err)
	}
}

// TestFailedGenerationIsReturnedToTheCourse checks that the Course can fall
// back and complete.
func TestFailedGenerationIsReturnedToTheCourse(t *testing.T) {
	host := newFakeHost()
	host.fail["copilot_generateText"] = fmt.Errorf("capability failed: [42900] quota exceeded")

	var err error
	outcome := courseOutcome(host, func(course *testCourse) {
		course.OnStart(func() {
			var feedback string
			feedback, err = course.Copilot.GenerateText("give feedback")
			if err != nil {
				feedback = "Well done!"
			}
			course.CompleteWith(feedback)
		})
	})

	if failure := awaitOne(t, outcome, "the course to end"); failure != nil {
		t.Fatalf("course failed with %v; a returned generation error must not fail the Course", failure)
	}
	if err == nil || !strings.Contains(err.Error(), "quota exceeded") {
		t.Errorf("err = %v, want the host's failure", err)
	}
	if request, _ := host.requestOf("course_completeWith"); request != `{"content":"Well done!"}` {
		t.Errorf("completeWith request = %s, want the fallback", request)
	}
}

// TestFailedGenerateJSONLeavesTheResultUntouched puts a decodable field first
// in the undecodable response, so a half-filled result would show.
func TestFailedGenerateJSONLeavesTheResultUntouched(t *testing.T) {
	type review struct {
		Praise string `json:"praise"`
		Score  int    `json:"score"`
	}
	cases := map[string]func(*fakeHost){
		"host failure": func(host *fakeHost) {
			host.fail["copilot_generateJSON"] = fmt.Errorf("capability failed: network error")
		},
		"undecodable response": func(host *fakeHost) {
			host.responses["copilot_generateJSON"] = `{"praise":"generated","score":"high"}`
		},
	}
	for name, setup := range cases {
		t.Run(name, func(t *testing.T) {
			host := newFakeHost()
			setup(host)
			result := review{Praise: "fallback", Score: 1}

			var err error
			outcome := courseOutcome(host, func(course *testCourse) {
				course.OnStart(func() {
					err = course.Copilot.GenerateJSON("review this", &result)
					course.Complete()
				})
			})

			if failure := awaitOne(t, outcome, "the course to end"); failure != nil {
				t.Fatalf("course failed with %v; a returned generation error must not fail the Course", failure)
			}
			if err == nil {
				t.Error("GenerateJSON returned no error")
			}
			if result != (review{Praise: "fallback", Score: 1}) {
				t.Errorf("result = %+v, want the values set beforehand", result)
			}
		})
	}
}

// TestUnhandledGenerationErrors checks that an ignored generateJSON error
// leaves result as it was and the Course goes on, and that stopping with the
// error (XGo's expr! panics with it) fails the Course.
func TestUnhandledGenerationErrors(t *testing.T) {
	t.Run("ignored", func(t *testing.T) {
		host := newFakeHost()
		host.fail["copilot_generateJSON"] = fmt.Errorf("capability failed: network error")
		var result struct{ Passed bool }

		outcome := courseOutcome(host, func(course *testCourse) {
			course.OnStart(func() {
				course.Copilot.GenerateJSON("judge this", &result)
				if !result.Passed {
					course.ShowMessage("Not yet, keep trying.")
				}
				course.Complete()
			})
		})

		if failure := awaitOne(t, outcome, "the course to end"); failure != nil {
			t.Fatalf("course failed with %v", failure)
		}
		if got, want := fmt.Sprint(courseCapabilityNames(host)), "[copilot_generateJSON course_showMessage course_complete]"; got != want {
			t.Errorf("capability calls = %s, want %s", got, want)
		}
	})
	t.Run("stopped", func(t *testing.T) {
		host := newFakeHost()
		host.fail["copilot_generateText"] = fmt.Errorf("capability failed: network error")

		outcome := courseOutcome(host, func(course *testCourse) {
			course.OnStart(func() {
				text, err := course.Copilot.GenerateText("say hi")
				if err != nil {
					panic(err)
				}
				course.CompleteWith(text)
			})
		})

		failure := awaitOne(t, outcome, "the course to end")
		if !strings.Contains(fmt.Sprint(failure), "generateText: capability failed: network error") {
			t.Errorf("failure = %v, want the generation error", failure)
		}
		if _, called := host.requestOf("course_completeWith"); called {
			t.Error("the Course went on after stopping with the error")
		}
	})
}

// TestSelfDecodingResultFailsTheCourse also checks that result is left
// untouched.
func TestSelfDecodingResultFailsTheCourse(t *testing.T) {
	host := newFakeHost()
	host.responses["copilot_generateJSON"] = `{"Praise":"generated","Score":5}`
	type review struct {
		Praise string
		Score  grade
	}
	result := review{Praise: "fallback", Score: 1}

	outcome := courseOutcome(host, func(course *testCourse) {
		course.OnStart(func() {
			if err := course.Copilot.GenerateJSON("review this", &result); err != nil {
				course.CompleteWith("fallback")
			}
		})
	})

	if failure := awaitOne(t, outcome, "the course to end"); !strings.Contains(fmt.Sprint(failure), "decodes itself") {
		t.Errorf("failure = %v, want the Course to fail on a result type with its own decoder", failure)
	}
	if result != (review{Praise: "fallback", Score: 1}) {
		t.Errorf("result = %+v, want it untouched", result)
	}
}

// TestInvalidGenerateJSONResultFailsTheCourse also checks that an unsupported
// result never reaches the host.
func TestInvalidGenerateJSONResultFailsTheCourse(t *testing.T) {
	host := newFakeHost()
	type lowercase struct{ score int }

	outcome := courseOutcome(host, func(course *testCourse) {
		course.OnStart(func() {
			if err := course.Copilot.GenerateJSON("judge this", &lowercase{}); err != nil {
				course.CompleteWith("fallback")
			}
		})
	})

	if failure := awaitOne(t, outcome, "the course to end"); failure == nil {
		t.Error("an unsupported result must fail the Course")
	}
	if _, called := host.requestOf("copilot_generateJSON"); called {
		t.Error("an unsupported result reached the host")
	}
}
