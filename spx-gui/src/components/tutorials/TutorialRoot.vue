<script lang="ts" setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/context'
import { RoundState } from '@/components/copilot/copilot'
import { stripThinking } from '@/components/copilot/content-visibility'
import * as staySilent from '@/components/copilot/markdown-elements/StaySilent'
import { stringifyDefinitionId, useCodeEditorRef } from '@/components/xgo-code-editor'
import { editorWorkspaceLayout } from '@/components/editor/workspace-layout'
import { editorRuntimeOutputBridge } from '@/components/editor/runtime-output-bridge'
import { extractCourseConfig, courseCompleteSentinel, createCourseApiMatcher } from './course-config'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'
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
import { getApiVideo, markApiLearned, resolveCourseVideos, type ApiVideoInfo } from './api-videos'

const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()
const codeEditorRef = useCodeEditorRef()

const tutorial = new Tutorial(copilot, router, isRouteLoaded)

/**
 * The course's knowledge-point videos (declared in the course config), queued to play one by one
 * right at the course start — applied locally so they open immediately and predictably instead of
 * riding on the copilot's first reply.
 */
const startVideosRef = ref<Array<{ id: string; info: ApiVideoInfo }>>([])
const currentStartVideo = computed(() => (isRouteLoaded.value ? startVideosRef.value[0] ?? null : null))

function advanceStartVideos() {
  const current = startVideosRef.value[0]
  if (current == null) return
  markApiLearned(current.id)
  startVideosRef.value = startVideosRef.value.slice(1)
}

// While a course-opening video is up it is a visible copilot artifact (pauses e.g. auto perception)
watchEffect((onCleanup) => {
  if (currentStartVideo.value == null) return
  onCleanup(copilot.addVisibleArtifact())
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
    startVideosRef.value = resolveCourseVideos(courseConfig.videos)
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
      startVideosRef.value = []
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
watch(
  () => {
    const session = copilot.currentSession
    if (session == null || tutorial.completion == null) return null
    const round = [...session.rounds]
      .reverse()
      .find((r) => r.userMessage.type === 'event' && r.userMessage.name.en === 'Course completed')
    if (round == null || round.state !== RoundState.Completed) return null
    const reply = round.resultMessages
      .filter((m) => m.role === 'copilot')
      .map((m) => (m.role === 'copilot' ? m.content ?? '' : ''))
      .join('')
    // The comment is meant to be plain prose. Strip thinking and any stray copilot elements (a
    // progress verdict, a stay-silent, ...) so only the evaluation sentence reaches the dialog.
    return stripThinking(reply)
      .replace(/<\/?[a-zA-Z][\w-]*(?:\s[^>]*?)?\/?>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  },
  (comment) => {
    if (comment != null && comment !== '') tutorial.setCompletionComment(comment)
  }
)

provideTutorial(tutorial)
</script>

<template>
  <slot />
  <ApiVideoModal
    v-if="currentStartVideo != null"
    :video="currentStartVideo.info"
    visible
    @close="advanceStartVideos()"
  />
  <TutorialCourseSuccessModal
    v-if="tutorial.completion != null"
    :completion="tutorial.completion"
    :comment="tutorial.completionComment"
    :tutorial="tutorial"
    @close="tutorial.dismissCompletion()"
  />
</template>
