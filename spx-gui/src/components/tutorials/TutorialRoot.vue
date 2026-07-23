<script lang="ts" setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useIsRouteLoaded } from '@/utils/route-loading'
import { useSpotlight } from '@/utils/spotlight'
import { useRadar } from '@/utils/radar'

import { provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/context'
import { RoundState } from '@/components/copilot/copilot'
import { stripThinking } from '@/components/copilot/content-visibility'
import * as staySilent from '@/components/copilot/markdown-elements/StaySilent'
import { stringifyDefinitionId, useCodeEditorRef } from '@/components/xgo-code-editor'
import { editorWorkspaceLayout } from '@/components/editor/workspace-layout'
import { editorRuntimeOutputBridge } from '@/components/editor/runtime-output-bridge'
import {
  extractCourseConfig,
  courseCompleteSentinel,
  createCourseApiMatcher,
  type CourseConfig,
  type CourseSpotlightTarget
} from './course-config'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'
import TutorialPreludeModal from './TutorialPreludeModal.vue'
import ApiVideoModal from './ApiVideoModal.vue'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'
import * as tutorialCourseExitLink from './TutorialCourseExitLink'
import * as tutorialStateIndicator from './TutorialStateIndicator.vue'
import * as apiReferenceFilter from './api-reference-filter'
import { tutorialCourseAbandonPrediction, tutorialCourseAbandonDismissal } from './tutorial-course-abandon'
import { TutorialIntervention } from './tutorial-intervention'
import { progressElements } from './user-progress'
import { installTutorialGuidance } from './tutorial-guidance'
import { tutorialCourseReminder } from './tutorial-course-reminder'
import { getApiVideo, markApiLearned, resolveApiVideo, resolveCourseVideos, type ApiVideoInfo } from './api-videos'

const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()
const codeEditorRef = useCodeEditorRef()
const spotlight = useSpotlight()
const radar = useRadar()

const tutorial = new Tutorial(copilot, router, isRouteLoaded)

/**
 * The course's opening sequence, applied locally once the editor is up so it plays immediately and
 * predictably instead of riding on the copilot's first reply. Steps play strictly in order: a
 * prelude text modal, a knowledge-point video, or a spotlight highlighting a UI element. Built from
 * the course config's ordered `opening`; a course still on the legacy `videos` field yields just
 * its video steps (its prelude, if any, stays a pre-editor modal in `course-start.vue`).
 */
type ResolvedOpeningStep =
  | { kind: 'prelude'; text: string }
  | { kind: 'video'; id: string; info: ApiVideoInfo }
  | { kind: 'spotlight'; target: CourseSpotlightTarget; tip: string }

function buildOpeningQueue(config: CourseConfig): ResolvedOpeningStep[] {
  if (config.opening.length === 0) {
    return resolveCourseVideos(config.videos).map((v) => ({ kind: 'video', id: v.id, info: v.info }))
  }
  const steps: ResolvedOpeningStep[] = []
  for (const step of config.opening) {
    if (step.kind === 'prelude') {
      steps.push({ kind: 'prelude', text: step.text })
    } else if (step.kind === 'video') {
      // A video for an already-learned API resolves to null and drops out of the sequence.
      const video = resolveApiVideo(step.api)
      if (video != null) steps.push({ kind: 'video', id: video.id, info: video.info })
    } else {
      steps.push({ kind: 'spotlight', target: step.target, tip: step.tip })
    }
  }
  return steps
}

const openingStepsRef = ref<ResolvedOpeningStep[]>([])
const openingIndexRef = ref(0)
const currentOpeningStep = computed(() =>
  isRouteLoaded.value ? openingStepsRef.value[openingIndexRef.value] ?? null : null
)

function advanceOpening() {
  openingIndexRef.value++
}

function handleVideoClose(step: ResolvedOpeningStep) {
  if (step.kind === 'video') markApiLearned(step.id)
  advanceOpening()
}

/** Resolve a spotlight target to a rendered element: an API item by definition ID, or a UI
 * landmark by Radar name. Returns null until the element exists (the caller retries). */
function resolveSpotlightTarget(target: CourseSpotlightTarget): HTMLElement | null {
  if (target.kind === 'ui') {
    return radar.getNodeByName(target.name)?.getElement() ?? null
  }
  const matches = createCourseApiMatcher([target.name])
  for (const el of document.querySelectorAll<HTMLElement>('[data-def-id]')) {
    // Only the visible editor's panel counts; the inactive sprite/stage editor is display:none.
    if (el.getClientRects().length === 0) continue
    const id = el.getAttribute('data-def-id')
    if (id != null && matches(id)) return el
  }
  return null
}

// A modal opening step (prelude / video) is a visible copilot artifact so it pauses e.g. auto
// perception. A spotlight is not: it never blocks, and the user acting on the highlighted element
// (clicking Run, dragging an API) is exactly the interaction the copilot should still perceive.
watchEffect((onCleanup) => {
  const step = currentOpeningStep.value
  if (step == null || step.kind === 'spotlight') return
  onCleanup(copilot.addVisibleArtifact())
})

// Drive a spotlight opening step imperatively (it renders as an overlay, not a component): resolve
// the target, reveal it, and advance to the next step when the user dismisses it (clicks anywhere).
watch(currentOpeningStep, (step, _prev, onCleanup) => {
  if (step == null || step.kind !== 'spotlight') return
  const { target, tip } = step
  let cancelled = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let offConcealed: (() => void) | null = null
  let attempts = 0

  function tryReveal() {
    if (cancelled) return
    const el = resolveSpotlightTarget(target)
    if (el != null) {
      offConcealed = spotlight.once('concealed', () => {
        if (!cancelled) advanceOpening()
      })
      spotlight.reveal(el, tip, { mask: true, persist: true })
      return
    }
    // The target may mount a little later (a panel still opening); retry, then give up so a
    // mistyped or unavailable target cannot stall the whole sequence.
    if (++attempts > 12) {
      advanceOpening()
      return
    }
    retryTimer = setTimeout(tryReveal, 400)
  }

  tryReveal()
  onCleanup(() => {
    cancelled = true
    if (retryTimer != null) clearTimeout(retryTimer)
    offConcealed?.()
    spotlight.conceal()
  })
})

watch(
  () => tutorial.currentCourse,
  (currentCourse, _, onCleanup) => {
    if (currentCourse == null) return

    // The course author declares the workspace setup statically (see `extractCourseConfig`); it is
    // applied once here, not driven by the copilot at runtime.
    const courseConfig = extractCourseConfig(currentCourse.prompt)
    editorWorkspaceLayout.setMode('focused')
    editorWorkspaceLayout.setHiddenAreas(courseConfig.hiddenAreas)
    openingStepsRef.value = buildOpeningQueue(courseConfig)
    openingIndexRef.value = 0
    // The ruler is a course-only tool: measuring a distance is how the user answers "how far?"
    // for themselves, instead of guessing or asking the copilot for the number.
    editorWorkspaceLayout.setEnabledTools(['ruler'])
    copilot.setUIMode('docked')
    const intervention = new TutorialIntervention(copilot)
    // Surface it on the tutorial so the navbar course menu can show the current guidance level.
    tutorial.setCurrentIntervention(intervention)

    const disposers = [
      intervention.start(),
      // Registers the guidance elements (guide modal, spotlight, video) and toggles the editor
      // code guides according to the intervention level — a hard boundary on what the copilot
      // may do at each level.
      installTutorialGuidance(copilot, intervention),
      copilot.registerContextProvider(intervention),
      copilot.registerContextProvider(tutorialCourseReminder),
      // The per-round progress verdicts drive the intervention level; available at every level,
      // since the copilot must report one on every event.
      ...progressElements.map((el) => copilot.registerCustomElement(el)),
      copilot.registerCustomElement({
        tagName: tutorialCourseSuccess.tagName,
        description: tutorialCourseSuccess.detailedDescription,
        attributes: tutorialCourseSuccess.attributes,
        isRaw: tutorialCourseSuccess.isRaw,
        component: tutorialCourseSuccess.default
      }),
      copilot.registerCustomElement({
        tagName: tutorialCourseExitLink.tagName,
        description: tutorialCourseExitLink.description,
        attributes: tutorialCourseExitLink.attributes,
        isRaw: tutorialCourseExitLink.isRaw,
        component: tutorialCourseExitLink.default
      }),
      copilot.registerCustomElement(tutorialCourseAbandonPrediction),
      copilot.registerCustomElement(tutorialCourseAbandonDismissal),
      // The API-references panel is narrowed by the copilot (a course-opening setup, always
      // available — not gated by the intervention level, which only gates guidance tools).
      copilot.registerCustomElement({
        tagName: apiReferenceFilter.tagName,
        description: apiReferenceFilter.detailedDescription,
        attributes: apiReferenceFilter.attributes,
        isRaw: apiReferenceFilter.isRaw,
        component: apiReferenceFilter.default,
        invisible: true
      }),
      copilot.registerCustomElement({
        tagName: staySilent.tagName,
        description: staySilent.detailedDescription,
        attributes: staySilent.attributes,
        isRaw: staySilent.isRaw,
        component: staySilent.default
      }),
      copilot.registerStateIndicatorComponent(tutorialStateIndicator.name, tutorialStateIndicator.default)
    ]

    if (courseConfig.judge === 'code') {
      // Code-judged courses complete from the runtime output; the frontend decides, so the
      // success dialog shows instantly instead of waiting for an LLM round. The signal is either
      // the course-declared log pattern (counting distinct matching lines within one run, e.g.
      // one per collected carrot) or, by default, the completion sentinel the project prints.
      const completeLog = courseConfig.complete?.log ?? courseCompleteSentinel
      const completeCount = courseConfig.complete?.count ?? 1
      let matchedLines = new Set<string>()
      disposers.push(
        editorRuntimeOutputBridge.onRunStart(() => {
          matchedLines = new Set()
        }),
        editorRuntimeOutputBridge.onLine((line) => {
          if (!line.includes(completeLog)) return
          matchedLines.add(line)
          if (matchedLines.size >= completeCount) tutorial.markCourseComplete()
        })
      )
    }

    onCleanup(() => {
      for (const dispose of disposers) {
        dispose()
      }
      // Reset the API references panel, the workspace layout and the copilot presentation
      // when leaving the course, so none of them outlives it.
      tutorial.setCurrentIntervention(null)
      openingStepsRef.value = []
      openingIndexRef.value = 0
      spotlight.conceal()
      codeEditorRef.value?.setAPIReferenceFilter(null)
      editorWorkspaceLayout.reset()
      copilot.setUIMode('floating')
    })
  },
  {
    immediate: true
  }
)

// During a course, API reference items show their explainer video in the hover card, and the
// panel narrows to the author-declared API set right away (no copilot round involved). Watched
// together with the editor ref since the editor may mount after the course starts.
watch(
  [() => tutorial.currentCourse, codeEditorRef],
  ([currentCourse, codeEditor]) => {
    if (codeEditor == null) return
    codeEditor.setAPIReferenceVideoProvider(
      currentCourse != null ? (item) => getApiVideo(stringifyDefinitionId(item.definition)) : null
    )
    if (currentCourse != null) {
      const { apis } = extractCourseConfig(currentCourse.prompt)
      if (apis.length > 0) {
        const matches = createCourseApiMatcher(apis)
        codeEditor.setAPIReferenceFilter((item) => matches(stringifyDefinitionId(item.definition)))
      }
    }
  },
  { immediate: true }
)

// The success dialog shows immediately on completion; the copilot's evaluation — its reply to the
// "Course completed" event that markCourseComplete sends — fills the comment when it arrives.
// The round carrying that event is often superseded before it runs: the completing log line is
// followed within moments by more ambient events (game output, the game exiting), each of which
// aborts the in-flight event round and answers with the full history instead. So the evaluation
// is accepted from the first event round that completes with prose at-or-after the completion
// event, whatever event that round was triggered by.
watch(
  () => {
    const session = copilot.currentSession
    if (session == null || tutorial.completion == null) return null
    const rounds = session.rounds
    let eventIdx = -1
    for (let i = rounds.length - 1; i >= 0; i--) {
      const m = rounds[i].userMessage
      if (m.type === 'event' && m.name.en === 'Course completed') {
        eventIdx = i
        break
      }
    }
    if (eventIdx < 0) return null
    for (const round of rounds.slice(eventIdx)) {
      if (round.userMessage.type !== 'event' || round.state !== RoundState.Completed) continue
      const reply = round.resultMessages
        .filter((m) => m.role === 'copilot')
        .map((m) => (m.role === 'copilot' ? m.content ?? '' : ''))
        .join('')
      // The comment is meant to be plain prose. Strip thinking and any stray copilot elements (a
      // progress verdict, a stay-silent, ...) so only the evaluation sentence reaches the dialog.
      const comment = stripThinking(reply)
        .replace(/<\/?[a-zA-Z][\w-]*(?:\s[^>]*?)?\/?>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (comment !== '') return comment
    }
    return null
  },
  (comment) => {
    if (comment != null && comment !== '') tutorial.setCompletionComment(comment)
  }
)

provideTutorial(tutorial)
</script>

<template>
  <slot />
  <TutorialPreludeModal
    v-if="currentOpeningStep?.kind === 'prelude'"
    visible
    :text="currentOpeningStep.text"
    @continue="advanceOpening()"
  />
  <ApiVideoModal
    v-else-if="currentOpeningStep?.kind === 'video'"
    :video="currentOpeningStep.info"
    visible
    @close="handleVideoClose(currentOpeningStep)"
  />
  <TutorialCourseSuccessModal
    v-if="tutorial.completion != null"
    :completion="tutorial.completion"
    :comment="tutorial.completionComment"
    :tutorial="tutorial"
    @close="tutorial.dismissCompletion()"
  />
</template>
