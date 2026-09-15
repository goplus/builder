# Scheduler discipline

Course callbacks run as frames under a cooperative scheduler; design rationale lives in `program.go`'s comments. These are the rules of change.

- Course callbacks execute only through `runFrame`. At any instant, only the `execToken` holder runs course code
- Every `onXxx`, course start included, registers a lane through `addLane`; `Start` delivers the single course-start
  trigger through `deliverAll`. Author callbacks have exactly two execution paths, a lane worker's frame and the one
  `MainEntry` frame. Do not add a third, and do not special-case any event
- Release `execToken` before any wait that can block for long (`presentationMu`, the capability bridge). Hold no lock
  across a blocking operation: `schedulerMu` and `eventDeliveryMu` regions must stay free of channel ops, `select`,
  `Wait`, token ops, and bridge calls; `eventDeliveryMu` → `schedulerMu` is the only permitted nesting
- `scheduling_invariants_test.go` machine-checks these rules by identifier name. When it fails, suspect your change
  first; when a locking change is legitimate, update the checker's rules in the same commit
- Decode a waiting capability's response only after reacquiring `execToken`. Never write course-visible memory while
  the token is released
- Check the terminal state after acquiring the token, not before. On the completion path, re-check `fatal` after
  `laneWorkers.Wait()`; the delivery gate must consult started, completed, and fatal together
- Event handlers are registered with xgoexec once, in `init` (`events.go`); the executor's `run()` resolves before
  the program registers anything, so `events` holds every event that arrives before `goLive` and replays it in
  order. `attach` belongs to `XGot_Course_Main`, `goLive` to `Start`; `registryMu` regions only touch fields and
  call `len`/`append`/`fmt.Errorf`/`json.RawMessage`. Decoding and delivery happen outside that lock

# Capabilities and contracts

- Classify every new capability: waiting on the learner or the LLM goes in `capabilityKinds` (presentation uses
  `kindPresentation`; the enum makes presentation-implies-yielding unrepresentable), host-computation-only goes in the
  test's `fastCapabilities` list. `TestEveryCapabilityIsClassified` enforces this
- Wire names and request shapes are a two-sided contract between the Go files and `client.ts`; change both sides
  together. `client_contract_test.go` extracts and compares them automatically
- The contracts in `docs/develop/tutorial-v2` are the source of truth. Align parameter names and shapes to the
  contract, never to a downstream prototype

# Testing this package

- Inject the fake host only inside `MainEntry` (the `callCapability` field); earlier there is no course state yet
- The event registry is process-global and keeps the previous test's program attached until the next course
  attaches. A test dispatching from outside course code must first await a readiness signal from its own course
  (or call `resetEventRegistry`), or the event goes to the previous, completed program and is silently dropped.
  Dispatching from inside `MainEntry` or a callback is always safe: pre-ready events are held and replayed
- Never block on a channel while holding the token inside a course callback; simulate a slow host with
  `holdCapability` instead
- Give behavior tests a timeout fallback, and run concurrency-sensitive tests with `-race`

# Build chain

- After changing this package's exported surface, rerun `go generate` in `tools/xgoexec-bundle` (qexp); CI's
  `tools-tutorial-test` job fails on a stale export file
- `client.ts` is a self-contained unit consumed by spx-gui through a symlink: it must not import anything from
  spx-gui (structural typing keeps it compatible with `XGoFramework`)
