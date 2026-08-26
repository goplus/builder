# Tutorial lifecycle and Course playground implementation draft

This document is an implementation draft for [#3419](https://github.com/goplus/builder/issues/3419). It refines the [Tutorial module contract](./module_Tutorial.ts) against the current frontend and the Tutorial-project models from [#3438](https://github.com/goplus/builder/pull/3438).

## Conclusions

- The public `Tutorial` module is an application-level entry facade, not the runtime shared by Guided and Playground Courses.
- Its public operations are only `startCourse(courseSeriesID, courseID)` and `endCurrentCourse()`.
- `startCourse` loads the Course Series and Course itself, then branches internally by Course kind. Callers do not pass a `GuidedCourse`, `TutorialProject`, or Course snapshot.
- The current global `Tutorial` class is mostly the Guided Course runtime. It should become an internal `GuidedTutorial` because Guided Courses can run across routes and must restore their state from session storage.
- A Playground Course is route-local. The facade navigates to the Course playground, whose page loads one memory-only `TutorialProject` and owns the Playground runtime.
- A Course Series needs no separate start operation. Starting a Series means starting one of its Courses, normally its first Course; moving to the next Course calls the same `startCourse` operation with the next Course ID.
- The initial release has exactly one Course-program source file: `main_course.gox`.
- Guided Course state remains in session storage. Playground Course project and runtime state remain in memory and are recreated from Course content after refresh.

## Why the current global objects look Guided-specific

The existing `Tutorial` class and `TutorialRoot.vue` solve requirements that belong specifically to Guided Courses:

- the Course may navigate away from the Course-start route and continue across Builder;
- the Copilot session drives the Course flow;
- the active Course and Series survive navigation through session storage;
- global Copilot custom elements, quick input, state indicator, and abandon handling remain registered while that Course is active.

A Playground Course has a different natural lifetime:

- it always runs inside its dedicated playground route;
- leaving that route ends the Course;
- its `TutorialProject`, ownerless `SpxProject`, `EditorState`, XGo executor, and Course-controlled UI are session-local;
- refreshing the route starts again from the authored Course content.

Making the existing global class own both runtimes would force the Playground editor and runtime into global state even though their lifetime is already represented by the route component. The common layer should therefore coordinate entry and exit only; the two runtimes remain different internal mechanisms.

`TutorialRoot.vue` can still be application-global, but its role changes:

- construct and provide the thin `Tutorial` facade;
- construct the internal `GuidedTutorial` and restore its persisted state;
- host the Guided-specific global Copilot integrations;

It does not own `EditorState` or `XGoExecutor` for a Playground Course.

## Proposed public boundary

```ts
export interface Tutorial {
  /** Loads and enters the identified Course. */
  startCourse(courseSeriesID: string, courseID: string): Promise<void>;

  /** Ends the active Course mechanism without choosing the next route. */
  endCurrentCourse(): Promise<void>;
}

export function useTutorial(): Tutorial;
export function provideTutorial(tutorial: Tutorial): void;
```

The IDs are unresolved external inputs. `Tutorial.startCourse` obtains canonical Course and Series data from Course APIs before using them.

There is intentionally no public:

- `startCourseSeries`: the caller starts the desired Course in the Series;
- `GuidedCourse | TutorialProject` argument: Course kind is a Tutorial concern and Playground model construction belongs to its route;
- `currentCourse` or `currentSeries`: branch-specific UI observes its owning internal state;
- editor host/context argument: Playground editor composition remains route-owned;
- Preview overload: Course Editor Preview uses the reusable Playground implementation directly with snapshots.

`endCurrentCourse` ends Guided state when it is active. When the current route is a Playground Course route, it exits that route to the corresponding Course Series page; route leave then disposes the route-local Playground session.

## Start flow

The Course-start route uses the same call for both Course kinds:

```ts
await tutorial.startCourse(courseSeriesID, courseID);
```

`startCourse` performs these steps:

1. End any active Guided Course.
2. Load the Course Series and Course through Course APIs.
3. Verify that the Course belongs to the Series. The Course API contract guarantees their kinds are consistent.
4. Branch by the loaded Course's `kind`.

The facade may keep Course API and router dependencies in its private constructor. They are not part of the public interface.

### Guided Course

For `kind: "guided"`, `startCourse` delegates the loaded Course and Series to the internal `GuidedTutorial`:

1. persist the canonical Course and Series in the existing user session storage;
2. navigate to the Guided Course entrypoint and wait for the destination UI;
3. create the existing proactive Tutorial Copilot Topic;
4. register or activate the Guided-specific global Copilot UI;
5. resolve after the Guided Course session has started.

`GuidedTutorial.endCurrentCourse` closes the Copilot session and clears the persisted Guided state. The thin facade calls it when another Course starts or public `endCurrentCourse` is invoked.

### Playground Course

For `kind: "playground"`, `startCourse` performs only the global entry work:

1. navigate to the Course playground root route identified by the Series and Course IDs;
2. resolve after navigation completes; it does not wait for project loading or XGo startup.

The playground page loads the same Course and Series by route ID, validates the Playground kind and Series membership, and constructs one `TutorialProject`. `CoursePlayground` applies `TutorialProject.config.inEditorPath` to the current route. Project loading, startup, and runtime failures belong to that page.

When the browser directly opens or refreshes a Course playground URL, the page performs this same local loading flow. The page and Playground runtime use its exact `TutorialProject` instance, so the editor and Course program always observe the same session `SpxProject`.

## Course Series progression

Course Series progression is ordinary Course start plus UI knowledge of the Series order.

- Entering a Series starts its first Course with `startCourse(series.id, firstCourseID)`.
- The completion UI reads the canonical Series already held by the active branch.
- Choosing Next calls `startCourse(series.id, nextCourseID)`.
- `startCourse` first ends any active Guided state. Navigating to another Course then leaves and disposes any active Playground route-local runtime.
- Public exit calls `endCurrentCourse()`, which returns an active Playground route to its Course Series page.

The facade does not preload every Course in a Series and does not own an array of Course snapshots.

## Course Editor Preview

The ID-based public facade is the learner entry and cannot represent unsaved Course Editor state. Preview therefore reuses the Playground implementation below the facade rather than adding another public start shape.

The reusable `CoursePlayground` component/controller accepts an already-created Preview snapshot internally:

- learner flow loads the snapshot in the Playground route from its Course ID;
- single-Course Preview obtains it from the Course Editor's current unsaved model;
- Series Preview selects the first unsaved snapshot and replaces it with the next one after completion.

This still runs the real Playground lifecycle. It only bypasses ID loading and learner-route navigation, which are entry concerns rather than runtime behavior.

## Proposed file organization

```text
components/tutorials/
├── tutorial.ts                 thin public facade and injection
├── TutorialRoot.vue            facade wiring and Root composition
├── guided/                     Guided Root, runtime, Copilot elements, and persisted state
├── playground/
│   ├── CoursePlayground.vue    route/Preview-owned editor composition
│   └── runner.ts               one Playground Course runner
└── ...                         existing Guided presentation components

apps/xbuilder/pages/tutorials/
├── course-start.vue            call Tutorial.startCourse with route IDs
└── course-playground.vue       load and own the Playground session
```

This is not a general strategy framework. There are two concrete runtime implementations because their ownership and persistence are materially different.

## Course playground composition

`CoursePlayground` receives one `TutorialProject` and owns everything whose lifetime is bound to displaying that project:

1. use `tutorialProject.project` as the ownerless, session-local model;
2. construct `EditorState` without calling `editing.loadProject`;
3. apply `tutorialProject.config.inEditorPath` through the route-backed editor state from #3416;
4. start effect-free editing;
5. mount `EditorContextProvider`, `CodeEditorProvider`, and the existing `ProjectEditor`;
6. create the Playground runtime after the matching editor context and Code Editor are available;
7. dispose the runtime, `EditorState`, and session project when the component unmounts or its snapshot is replaced.

Readiness is tied to object identity (`editorContext.project === tutorialProject.project`), not merely to a non-null global editor context, so a stale editor cannot serve capabilities during route transitions.

## Playground runtime

One route-local runtime owns:

- the XGo executor;
- the Playground Copilot session;
- Runtime and Copilot event subscriptions;
- Tutorial-owned presentation for this Course;
- Course-controlled API filtering, Ruler, and Spotlight state;
- the accepted completion result.

It creates a Playground Copilot Topic with the Course title and `copilotContext`, proactive reactions disabled, and code Copy/Apply helpers disabled. Project, code, and runtime context still come from the normal editor context providers.

It passes `createTutorialFramework(host)` to `XGoExecutor` and runs exactly:

```ts
{
  [mainCourseFilePath]: tutorialProject.mainCourse.code,
}
```

SPX files and video files are not executor input. Supporting additional Course-program source files is out of scope for the initial release.

## Framework host mapping

| Framework host area  | Concrete owner and behavior                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Prelude and message  | Route-local Tutorial presentation; resolves after learner dismissal                                     |
| Named video          | Resolves `Video` by name from the same `TutorialProject`; resolves after playback finishes or is closed |
| Completion           | Runtime records the first completion request; repeated requests are ignored                             |
| Project code queries | Reads the active session `SpxProject`                                                                   |
| Code Editor          | Delegates API filtering and formatting to the matching Code Editor from #3416                           |
| Ruler                | Delegates visible state to the mounted Project Editor support from #3416                                |
| Copilot generation   | Delegates text/JSON generation to generic Copilot APIs from #3421                                       |
| Spotlight            | Delegates target resolution and presentation to Radar/Spotlight support from #3416                      |

After completion has been accepted, later presentation capabilities are no-ops.

## Event forwarding

The route-local runtime forwards:

| Source                    | Tutorial event                                          |
| ------------------------- | ------------------------------------------------------- |
| Runtime starts            | `editor.runtime.start` with `null`                      |
| Runtime exits             | `editor.runtime.exit` with `{ code }`                   |
| Newly appended log output | `editor.runtime.log` with `{ log }`                     |
| Copilot round finishes    | `copilot.roundFinish` with its user and result messages |

Runtime exposes cumulative output. The Playground runtime keeps the last forwarded output ID and sends every new `log` entry exactly once and in order. Error output is not part of the judging channel.

Subscriptions are installed before executor startup and removed before route-local state is disposed. Events arriving during stop are ignored.

## Completion and failure

The first `course_complete` or `course_completeWith` stores the completion result and resolves when accepted. It does not open completion UI inside the capability call.

| Executor result | Completion requested | Result                                                             |
| --------------- | -------------------- | ------------------------------------------------------------------ |
| `completed`     | yes                  | Publish completion, then show completion UI                        |
| `completed`     | no                   | Report that the Course program fell through without completing     |
| `stopped`       | irrelevant           | Expected route leave, replacement, or public end; no completion UI |
| `error`         | irrelevant           | Publish failure and show a Course failure                          |

Choosing Next disposes the current page-owned session, then invokes the thin facade's `startCourse` with the next Course ID.

## End and cleanup

Public `endCurrentCourse` is idempotent:

- if Guided state is active, delegate to `GuidedTutorial.endCurrentCourse` and clear its session storage;
- if the current route is a Playground Course, navigate to its Course Series page so route leave disposes the local session;
- otherwise, do nothing.

`CoursePlayground`, which creates and starts the runner, disposes the previous runner before replacing it and disposes the current runner when the component unmounts. Completion and failure only notify the page; they keep the Playground session, including its project and editor state, mounted behind the completion UI. The page disposes the project and editor state only on route leave, replacement, explicit exit, or transition to the next Course. Runner disposal is idempotent.

Starting any Course ends Guided state first, preventing a restored Guided session from remaining active when a Playground Course is entered.

## Dependencies

#3419 owns the thin facade, Guided/Playground dispatch, Course playground composition, route-local runtime, presentation, and lifecycle tests. It consumes rather than duplicates:

- #3435 / PR #3438: `TutorialProject`, `Course`, `Video`, and Playground Course frontend data;
- #3418: generic XGo Executor;
- #3417: Tutorial framework host binding and event contracts;
- #3416: route-backed Simple Mode, Code Editor operations, Ruler, Spotlight, and Save as my project;
- #3421: Playground Topic controls, generation, and round-finish events;
- #3422: builder-backend implementation of the discriminated Course and Course Series API contract.

The frontend Course API surface in this branch follows `module_CourseApis.ts`: Course data is discriminated by `kind`, kind-specific fields live in `content`, and Course Series carries its homogeneous `kind`.

## Initial validation plan

Facade tests:

- `startCourse` loads canonical Course and Series by ID;
- Guided data delegates only to `GuidedTutorial`;
- Playground data navigates to its root route;
- starting another Course ends the previous branch first;
- `endCurrentCourse` is idempotent, ends Guided state, and exits an active Playground route to its Course Series;
- starting the next Series Course uses the same public `startCourse` operation;
- Guided state restores from session storage while Playground state does not.

Playground tests:

- editor and runtime receive the same `TutorialProject.project`;
- no cloud project load or autosave occurs;
- the configured in-editor path is applied;
- only `main_course.gox` is passed to XGo Executor;
- logs are forwarded once and in order;
- completion retains the editor session and its runner until the session is replaced or unmounted;
- route leave and snapshot replacement dispose runtime and `EditorState` once;
- Preview snapshots use the same Playground runtime without invoking the ID-based facade.

## Findings from the first code prototype

The current prototype validates the central boundary without requiring the public facade to expose a loaded Course or `TutorialProject`:

- existing callers become simpler and pass only route IDs;
- Guided-only UI can depend on an internal `GuidedTutorial`, leaving the public facade free of `currentCourse` and `currentSeries`;
- the Playground page can load exactly one `TutorialProject`, while `CoursePlayground` applies its in-editor path and owns it without widening the global facade;
- Course Series Next reuses `startCourse` and needs no Series-specific facade method;
- a Playground page can construct the existing `EditorState` directly from the embedded `SpxProject` without cloud loading or autosave.

The second prototype adds a deliberately narrow end-to-end runtime example:

- `CoursePlayground` waits until the editor providers are mounted, then creates one route-local `PlaygroundCourseRunner`;
- the runner starts a non-proactive Copilot Topic, runs only `main_course.gox`, and owns its executor, Copilot, Runtime, and presentation subscriptions until its owner disposes it;
- the current Runtime start, exit, and log signals plus Copilot round completion are serialized through one executor-event queue;
- `showMessage` is represented by route-local blocking presentation, while `complete` and `completeWith` publish a terminal outcome for the page to handle;
- the page, rather than the runtime or facade, displays completion UI and chooses to continue editing, start Next, or exit based on the active Series;
- replacing a page-owned Playground session waits one Vue render turn before disposing its project, allowing the child runtime and `EditorState` to unmount first.

This confirms that XGo/Copilot integration does not require broadening the facade. It also sharpens the internal responsibility split:

```text
Tutorial facade       load by ID, dispatch kind, end Guided state or exit Playground route
Playground page       load TutorialProject, failure/completion UI, Series Next/Exit policy, session disposal
CoursePlayground      EditorState, editor providers, route-local presentation, runner lifetime
Playground runner     XGo, Copilot session, framework host, event bridge, terminal events
```

The prototype still exposes implementation questions that do not change the public boundary:

1. Concurrent `startCourse` calls need serialization or a generation/abort token so an older API response cannot replace a newer Course.
2. The temporary framework host implements only `showMessage`, `complete`, and `completeWith`. It should be replaced by `createTutorialFramework` and the full capabilities from #3417 rather than expanded independently here.
3. Copilot round completion is currently observed from reactive session state because #3421's explicit round-finish event is not present on this branch. The ownership stays route-local when that event replaces the prototype watch.
4. The current Copilot Topic can disable proactive event reactions, but this branch does not yet expose #3421's code-helper controls.
5. Direct refresh intentionally reloads Course data. Guided restoration, by contrast, remains isolated in `GuidedTutorial` session storage rather than serializing unified facade state.
