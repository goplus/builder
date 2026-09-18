<script setup lang="ts">
/**
 * Course editor page (`apps/xbuilder/pages/course-editor/index.vue`)
 *
 * Purpose: the page behind the `course-editor` and `course-editor-preview` routes. It turns the unresolved route
 * params into an editing session: it waits for the signed-in state, checks the `canManageCourses` capability,
 * fetches the course and its series, validates them (Playground kind, membership in the series), loads the author's
 * working copy as a `TutorialProject`, and renders `CourseEditor` with all of that. The page owns the session's
 * lifecycle: it disposes the embedded `SpxProject` when the course changes, the load is superseded, or the page
 * unmounts. Both route records render this same page so entering preview does not restart the session.
 *
 * Props (from the route via `props: true` in `apps/xbuilder/router.ts`; unresolved, hence the `Input` suffix):
 * - `courseSeriesIdInput` — the `:courseSeriesIdInput` route param; the series the course is edited within.
 * - `courseIdInput` — the `:courseIdInput` route param; the course to edit.
 *
 * Emits: none.
 *
 * Used by: `apps/xbuilder/router.ts` (route records `courseEditorRouteName` = `course-editor` and
 * `courseEditorPreviewRouteName` = `course-editor-preview`, both lazily importing this file).
 *
 * Uses: `CourseEditor` (`components/course-editor/CourseEditor.vue`), `UIDetailedLoading`, `UIError`; composables
 * `useQuery` (`utils/query.ts`), `usePageTitle` and `untilNotNull` (`utils/utils.ts`), `useSignedInStateQuery`
 * (`stores/user`); APIs `getCourse` (`apis/course.ts`) and `getCourseSeries` (`apis/course-series.ts`); model
 * `TutorialProject.load` (`models/tutorial/project.ts`); exceptions `Cancelled`, `DefaultException`.
 */
import { nextTick, onUnmounted, shallowRef, watch } from 'vue'
import { Cancelled, DefaultException } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { untilNotNull, usePageTitle } from '@/utils/utils'
import { getCourse, type PlaygroundCourse } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import { useSignedInStateQuery } from '@/stores/user'
import { TutorialProject } from '@/models/tutorial/project'
import { UIDetailedLoading, UIError } from '@/components/ui'
import CourseEditor from '@/components/course-editor/CourseEditor.vue'

const props = defineProps<{
  /** Unresolved series id from the route; resolved by `getCourseSeries` inside the entry query. */
  courseSeriesIdInput: string
  /** Unresolved course id from the route; resolved by `getCourse` inside the entry query. */
  courseIdInput: string
}>()

// Signed-in state query (shared store); the entry query waits on its `data` before checking permissions.
const signedInStateQuery = useSignedInStateQuery()

/**
 * Everything `CourseEditor` needs for one course: the canonical course and series records from the backend and
 * the author's working copy of the course content. One session corresponds to one mounted `CourseEditor`.
 */
type EditingSession = {
  course: PlaygroundCourse
  series: CourseSeries
  project: TutorialProject
}

/**
 * The current editing session, or `null` while none is on screen (loading, failed, switching courses, unmounting).
 * `shallowRef` because `TutorialProject` is already reactive on its own.
 * Written by the `entryQueryRet.data` watcher (publish), `disposeSession` (clear) and `handleSaved` (refresh
 * `course`); read by the template (`v-if` / props of `CourseEditor`), `usePageTitle` and `disposeSession`.
 */
const session = shallowRef<EditingSession | null>(null)

/**
 * Document title getter: "<course title> - Course editor - XBuilder" once a session exists, a generic
 * "Course editor" before that. Re-evaluated reactively by `usePageTitle`'s immediate watcher.
 * @returns A `LocaleMessage` or a list of them, joined by `usePageTitle`.
 * Called by: utils/utils.ts#usePageTitle (watch, immediate)
 */
usePageTitle(() => {
  const current = session.value
  // No session yet: generic title.
  if (current == null) return { en: 'Course editor', zh: '课程编辑器' }
  // Course titles are not localized, so the same string is used for both languages.
  return [
    { en: current.course.title, zh: current.course.title },
    { en: 'Course editor', zh: '课程编辑器' }
  ]
})

/**
 * The entry query: loads and validates everything for the route's course and produces an `EditingSession` value
 * (published to `session` by the watcher below, not directly). `useQuery` runs the function in a `watchEffect`, so
 * it re-runs when the synchronously-read route props change, and again on `refetch` from the error UI; a re-run
 * aborts the previous run's `ctx.signal`.
 * @param ctx - `QueryContext`: `signal` (aborted when superseded or unmounted), `source`, `reporter`.
 * @returns The loaded `EditingSession` (course, series, project).
 * @throws `DefaultException` when the user may not manage courses, the course is not a Playground Course, or the
 * course is not part of the series; `Cancelled('superseded')` when a newer run aborted this one after the project
 * was loaded; and whatever `getCourse` / `getCourseSeries` / `TutorialProject.load` / `untilNotNull` reject with.
 * Called by: utils/query.ts#useQuery (its internal `fetch`: from the `watchEffect` on setup and dependency change,
 * and from `refetch`, which this template's `UIError :retry` invokes)
 */
const entryQueryRet = useQuery(
  async (ctx) => {
    // Route params must be read synchronously so that their change re-runs the query;
    // `untilNotNull` below deliberately does not collect dependencies.
    const courseIdInput = props.courseIdInput
    const courseSeriesIdInput = props.courseSeriesIdInput
    // Avoid collecting the data accessed below as dependencies, which would re-run the query endlessly.
    // (Reactive reads after the first `await` are outside the `watchEffect`'s synchronous tracking.)
    await nextTick()

    // Wait until the signed-in state is known (rejects with the abort reason if this run is superseded), then
    // gate on the capability the backend grants course managers.
    const signedInState = await untilNotNull(signedInStateQuery.data, ctx.signal)
    if (!signedInState.isSignedIn || signedInState.user?.capabilities.canManageCourses !== true) {
      throw new DefaultException({ en: 'You are not allowed to edit courses', zh: '你没有编辑课程的权限' })
    }

    // Fetch course and series concurrently; both honour the abort signal.
    const [course, series] = await Promise.all([
      getCourse(courseIdInput, ctx.signal),
      getCourseSeries(courseSeriesIdInput, ctx.signal)
    ])
    // Only Playground Courses have the `TutorialProject` content model this editor edits (the `kind` check also
    // narrows `course` to `PlaygroundCourse` for the return value).
    if (course.kind !== 'playground') {
      throw new DefaultException({
        en: 'Only Playground Courses are edited here; Guided Courses are edited from course management',
        zh: '这里只编辑目标式课程；引导式课程请在课程管理中编辑'
      })
    }
    // The route pairs a series with a course; refuse a mismatching pair rather than editing out of context.
    if (!series.courseIDs.includes(course.id)) {
      throw new DefaultException({
        en: `Course "${course.title}" is not in series "${series.title}"`,
        zh: `课程"${course.title}"不属于系列"${series.title}"`
      })
    }

    // Build the author's working copy from the course content (this loads the embedded `SpxProject` too).
    // `TutorialProject.load` takes no signal, so the abort is checked afterwards instead.
    const project = await TutorialProject.load(course)
    if (ctx.signal.aborted) {
      // A newer query (e.g. another course on the same route) has superseded this one.
      // Release the freshly loaded project ourselves: `useQuery` discards the result and nobody else will.
      project.project.dispose()
      throw new Cancelled('superseded')
    }
    // Hand the loaded parts to the `data` watcher, which turns them into the on-screen session.
    return { course, series, project }
  },
  {
    en: 'Failed to load course',
    zh: '加载课程失败'
  }
)

/**
 * End the current session: take `CourseEditor` off screen first, then dispose the embedded project. The
 * `nextTick` in between lets `CourseEditor` (and the project editor host inside it, which disposes its
 * `EditorState` on unmount) unmount before the `SpxProject` they reference is disposed.
 * @returns Resolves after the project (if any) is disposed.
 * Called by: apps/xbuilder/pages/course-editor/index.vue#watch(entryQueryRet.data),
 * apps/xbuilder/pages/course-editor/index.vue#watch([entryQueryRet.isLoading, entryQueryRet.error]),
 * apps/xbuilder/pages/course-editor/index.vue#onUnmounted
 */
async function disposeSession() {
  // Capture and clear synchronously so a concurrent caller sees no session and cannot dispose it twice.
  const current = session.value
  session.value = null
  // Let the `v-if="session != null"` subtree unmount before its project goes away.
  await nextTick()
  // Dispose the embedded learner project (the `TutorialProject` itself has nothing else to release).
  current?.project.project.dispose()
}

/**
 * Publish a finished load as the on-screen session, ending the previous one first (a course switch on the same
 * route yields a new `data` value while the old session is still shown).
 * @param next - The new `EditingSession` from `entryQueryRet.data` (`useQuery` never resets it to `null`).
 * @returns Resolves after the previous session is disposed and the new one is set.
 * Called by: Vue (watch on `entryQueryRet.data`)
 */
watch(entryQueryRet.data, async (next) => {
  // Old session off screen and disposed before the new one appears, so at most one `CourseEditor` is mounted.
  await disposeSession()
  session.value = next
})

// `useQuery` keeps the previous data while re-fetching or after a failure. When the route switches to
// another course, the previous session must not stay on screen: end it as soon as a new load starts or fails.
/**
 * Mirror the query's loading/error phases onto the session: any start of a load or any failure ends the current
 * session, so the template falls through to the loading/error UI instead of showing a stale course.
 * @param isLoading - Whether a load is in flight (`entryQueryRet.isLoading`).
 * @param error - The last failure, or `null` (`entryQueryRet.error`).
 * @returns Nothing; `disposeSession`'s promise is deliberately not awaited.
 * Called by: Vue (watch on `[entryQueryRet.isLoading, entryQueryRet.error]`)
 */
watch([entryQueryRet.isLoading, entryQueryRet.error], ([isLoading, error]) => {
  // Either condition means the session on screen no longer corresponds to what the route asks for.
  if (isLoading || error != null) void disposeSession()
})

/**
 * Leaving the page ends the session and disposes the project (`useQuery` aborts its own in-flight load).
 * @returns Nothing; side effects via `disposeSession`.
 * Called by: Vue lifecycle (onUnmounted)
 */
onUnmounted(() => void disposeSession())

/**
 * Refresh the session's course record after a successful save, so the title and other metadata rendered from
 * `session.course` match what the backend now holds. The project and series are kept, and `course.id` is
 * unchanged, so the keyed `CourseEditor` is updated in place rather than remounted.
 * @param course - The course as returned by `updateCourse` (emitted by `CourseEditor`'s `saved` event).
 * @returns Nothing; side effect is replacing `session.value`.
 * Called by: apps/xbuilder/pages/course-editor/index.vue#template (`<CourseEditor @saved="handleSaved">`,
 * emitted from components/course-editor/CourseEditor.vue#save)
 */
function handleSaved(course: PlaygroundCourse) {
  // A save that completes after the session ended (page left, course switched) has nothing to update.
  const current = session.value
  if (current == null) return
  // New object so `shallowRef` consumers (title, props) notice; same `project` and `series` instances.
  session.value = { ...current, course }
}
</script>

<template>
  <!--
    The editor for the loaded session. Keyed by course id so switching to another course remounts `CourseEditor`
    (fresh editor state, guards and dirty tracking) while a metadata refresh via `handleSaved` updates it in place.
  -->
  <CourseEditor
    v-if="session != null"
    :key="session.course.id"
    :course="session.course"
    :series="session.series"
    :project="session.project"
    @saved="handleSaved"
  />
  <!-- No session on screen: centered loading / error feedback for the entry query. -->
  <section v-else class="h-full w-full flex items-center justify-center">
    <!-- A load is in flight (first load, course switch, or retry): show the query's progress. -->
    <UIDetailedLoading v-if="entryQueryRet.isLoading.value" :percentage="entryQueryRet.progress.value.percentage">
      <span>{{ $t({ zh: '加载课程中...', en: 'Loading course...' }) }}</span>
    </UIDetailedLoading>
    <!-- The load failed (permission, validation or network): localized message with a retry that re-fetches. -->
    <UIError v-else-if="entryQueryRet.error.value != null" :retry="entryQueryRet.refetch">
      {{ $t(entryQueryRet.error.value.userMessage) }}
    </UIError>
    <!-- Otherwise (a finished load being handed over to a new session) the section is briefly empty. -->
  </section>
</template>
