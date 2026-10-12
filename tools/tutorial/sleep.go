package tutorial

import (
	"time"

	"github.com/goplus/ixgo"
)

// init turns time.Sleep in Course code into a pause: ixgo resolves every call
// to time.Sleep in interpreted code, direct or through a function value, to
// courseSleep instead. Compiled code, this package included, keeps the real
// time.Sleep.
//
// Without this, an author reaching for the familiar time.Sleep would hold the
// execution token for the whole pause and stall every other callback. The
// other ways to block (channel operations, <-time.After included, select, long
// loops) are language operations rather than calls, so they cannot be
// redirected; the contract warns against them instead.
func init() {
	ixgo.RegisterExternal("time.Sleep", courseSleep)
}

// courseSleep is time.Sleep for Course code. A run holding the execution token
// pauses as wait does; any other caller, such as a goroutine the Course
// started itself, sleeps plainly, since time.Sleep is ordinary Go rather than
// a framework call.
func courseSleep(d time.Duration) {
	if p := events.current(); p != nil && p.holding() {
		p.pause(d)
		return
	}
	time.Sleep(d)
}
