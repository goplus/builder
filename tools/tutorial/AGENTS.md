# Scheduler discipline

Course callbacks execute as runs under a cooperative scheduler; design rationale lives in `program.go`'s comments.
These are the rules of change.

- Course callbacks execute only through `runFrame`. At any instant, only the `execToken` holder runs course code.
  Every trigger starts a new run of each registered callback, so runs of one callback may overlap. How such runs
  relate (run policies and run groups) is deferred to #3509; do not add ad-hoc guards in the framework meanwhile
- `yieldWhile` is the single yield point: it releases `execToken` before any wait that can block for long and
  restores `current` afterwards. Only `tryCallCapability` (waiting on the host) and `pause` (waiting on a timer) may
  call it; main-goroutine lifecycle handshakes call the bridge from `Course.Start` without touching the token
- The contract forbids course code to start goroutines (`go`, `time.AfterFunc`), but nothing stops it, and such
  goroutines run outside the scheduler. Every exported method course code can call must refuse them before doing
  anything else: its first call is `requireRun`, or `tryCallCapability`/`mustCallCapability`/`register` (whose own
  first call is `requireRun` or another of them), or another such method. The invariant checker enforces both halves. `holding` compares goroutine IDs with `holder`, which only
  `acquireExec`, `releaseExec` and `init` write
- Only framework calls yield. Do not redirect Go's own blocking calls (say `time.Sleep` through
  `ixgo.RegisterExternal`): channel operations, timers and I/O could not follow, and a rule with one exception is
  harder for authors than none. Authors pause with `wait`; the contract lists what blocks
- Runs are started only by `startRuns`, from `Course.Start` and the event deliverers, in registration order, each to
  its first yield (`yielded`) before the next. That order is an implementation detail the contract does not promise
  (see #3509); keep `startRuns` the sole start path and never spawn course code elsewhere
- Hold no lock across a blocking operation: `schedulerMu` regions stay free of channel ops, `select`, `Wait`, token
  ops, and other locks; `registryMu` is a leaf lock whose regions may only touch fields and call the allowlisted
  builtins. Waiting, decoding, and delivery happen outside every lock
- `scheduling_invariants_test.go` machine-checks these rules by identifier name. When it fails, suspect your change
  first; when a locking change is legitimate, update the checker's rules in the same commit
- Decode a waiting capability's response only after reacquiring `execToken`. Never write course-visible memory while
  the token is released
- Check the terminal state after acquiring the token, not before. `admitRun` does the terminal check and
  `runs.Add` under one lock; on the completion path, re-check `fatal` after `runs.Wait()`
- Event handlers are registered with xgoexec once, in `init` (`events.go`); the executor's `run()` resolves before
  the program registers anything, so the dispatch queue simply accumulates until `goLive` starts the dispatcher.
  `attach` belongs to `XGot_Course_Main`, `goLive` to `Start`. The host never delivers directly: `dispatch` only
  enqueues and wakes the dispatcher

# Capabilities and contracts

- Internal `lifecycle_*` handshakes run only from `Course.Start`, outside Course runs: wait for Host capabilities, then acknowledge all start callbacks reaching their first yield or return. They are not author-facing fast/waiting capabilities.
- Classify every new capability: waiting on the learner or the LLM goes in `capabilityKinds` as `kindWaiting`,
  host-computation-only goes in the test's `fastCapabilities` list. `TestEveryCapabilityIsClassified` enforces this.
  The framework never serializes presentation calls; how overlapping `course.show*` calls behave is the host's policy
- A capability failure is fatal (`mustCallCapability`) unless its cause lies outside the author's control, in which
  case the ability returns it as an error (`tryCallCapability`). Today only Copilot generation does. A mistake in
  the Course code (an invalid argument, a call from a goroutine the Course started) stays fatal either way
- Wire names and request shapes are a two-sided contract between the Go files and `client.ts`; change both sides
  together. `client_contract_test.go` extracts and compares them automatically
- The contracts in `docs/develop/tutorial-v2` are the source of truth. Align parameter names and shapes to the
  contract, never to a downstream prototype
- `skills/tutorial-course/` is the course-author guide, kept as a skill: people read it, and spx-gui links the
  directory in as the Course Editor's authoring skill. Any change to the author-facing surface of this package
  (exported methods, events and their payload fields, exported constants and types, `index.json` fields, course asset
  conventions) updates it in the same commit and passes the guide compile test in `tools/xgoexec-bundle`
  (`TestGuideCoursesBuild`), which builds every ```go block in it as a Course

# Testing this package

- Inject the fake host only inside `MainEntry` (the `callCapability` field); earlier there is no course state yet
- The event registry is process-global and keeps the previous test's program attached until the next course
  attaches. A test dispatching from outside course code must first await a readiness signal from its own course
  (or call `resetEventRegistry`), or the event goes to the previous, completed program and is silently dropped.
  Dispatching from inside `MainEntry` or a callback is always safe: the queue accumulates until the dispatcher starts
- After releasing a held capability, do not assume the run has ended: synchronize on a signal the run sends at its
  end before dispatching a trigger whose outcome depends on that run having released the token
- A test that fails by timeout leaves its course alive; a later test that sees events vanish should suspect that
  zombie first
- Never block on a channel while holding the token inside a course callback; simulate a slow host with
  `holdCapability` instead
- Give behavior tests a timeout fallback, and run concurrency-sensitive tests with `-race`

# Build chain

- After changing this package's exported surface, rerun `go generate` in `tools/xgoexec-bundle` (qexp); CI's
  `tools-tutorial-test` job fails on a stale export file
- `client.ts` is a self-contained unit consumed by spx-gui through a symlink: it must not import anything from
  spx-gui (structural typing keeps it compatible with `XGoFramework`)
