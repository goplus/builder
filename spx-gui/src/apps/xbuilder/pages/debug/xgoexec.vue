<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { XGoExecutor } from '@/utils/xgoexec'
import { createTutorialFramework, type TutorialFrameworkHost } from '@/utils/tutorial-framework'
import { UIButton, UICard, UITextInput } from '@/components/ui'
import exampleCourseSource from '../../../../../../docs/develop/tutorial-v2/example-tutorial-course/main_course.gox?raw'

const PLAIN_XGO_SOURCE = `
import "time"

for {
	echo "XGo executor is running"
	time.Sleep(time.Second)
}
`

// The learner code the mock host hands back to the Course program, standing in
// for what `editor_project_getCode` would read from the real project model.
const MOCK_LEARNER_CODE = `onClick => {
	stepTo Mushroom
}
`

// Mock TutorialFrameworkHost: logs every capability call and answers with
// canned values, so the docs example course can run end-to-end through the
// real wasm bridge before the real host (Tutorial module) exists.
function createMockHost(): TutorialFrameworkHost {
  return {
    async course_showPrelude(preludeMessage) {
      addOutput(`[host] showPrelude: ${preludeMessage}`)
    },
    async course_showMessage(message) {
      addOutput(`[host] showMessage: ${message}`)
    },
    async course_showVideo(videoName) {
      addOutput(`[host] showVideo: ${videoName}`)
    },
    async course_complete() {
      addOutput('[host] complete')
    },
    async course_completeWith(feedback) {
      addOutput(`[host] completeWith: ${feedback}`)
    },
    editor_codeEditor_filterAPIs(apis) {
      addOutput(`[host] filterAPIs: ${apis.join(', ')}`)
    },
    async editor_codeEditor_formatWorkspace() {
      addOutput('[host] formatWorkspace')
    },
    editor_project_getCode(sprite) {
      addOutput(`[host] getCode: ${sprite}`)
      return MOCK_LEARNER_CODE
    },
    editor_project_listSprites() {
      addOutput('[host] listSprites')
      return ['Lita', 'Mushroom']
    },
    editor_ruler_show() {
      addOutput('[host] ruler.show')
    },
    editor_ruler_hide() {
      addOutput('[host] ruler.hide')
    },
    async copilot_generateText(message) {
      addOutput(`[host] generateText: ${message}`)
      return 'You used stepTo to walk Lita right up to the mushroom.'
    },
    async copilot_generateJSON(message, schema) {
      addOutput(`[host] generateJSON: ${message} (schema: ${JSON.stringify(schema)})`)
      return {}
    },
    async spotlight_reveal(target, tip, options) {
      addOutput(`[host] spotlight.reveal: ${target} (tip: ${tip}, options: ${JSON.stringify(options)})`)
    }
  }
}

const tutorialFramework = createTutorialFramework(createMockHost())

const plainStatus = ref('idle')
const tutorialStatus = ref('idle')
const output = ref<string[]>([])
const runtimeLog = ref('reached-target')
let plainExecutor: XGoExecutor | null = null
let tutorialExecutor: XGoExecutor | null = null

function addOutput(message: string) {
  output.value.push(message)
}

async function runPlain() {
  plainStatus.value = 'starting'
  plainExecutor = new XGoExecutor({
    framework: null,
    onError: (phase, message) => {
      plainStatus.value = `${phase}: ${message}`
      addOutput(`XGo ${phase}: ${message}`)
    },
    onOutput: (message) => addOutput(`XGo: ${message}`),
    onExit: (reason) => {
      plainStatus.value = `exited: ${reason}`
      addOutput(`XGo exited: ${reason}`)
    }
  })
  try {
    await plainExecutor.run({ 'main.xgo': PLAIN_XGO_SOURCE })
    if (plainStatus.value === 'starting') plainStatus.value = 'running'
  } catch (error) {
    plainStatus.value = String(error)
  }
}

async function runTutorial() {
  tutorialStatus.value = 'starting'
  tutorialExecutor = new XGoExecutor({
    framework: tutorialFramework,
    onError: (phase, message) => {
      tutorialStatus.value = `${phase}: ${message}`
      addOutput(`Tutorial ${phase}: ${message}`)
    },
    onOutput: (message) => addOutput(`Tutorial: ${message}`),
    onExit: (reason) => {
      tutorialStatus.value = `exited: ${reason}`
      addOutput(`Tutorial exited: ${reason}`)
    }
  })
  try {
    await tutorialExecutor.run({ 'main_course.gox': exampleCourseSource })
    if (tutorialStatus.value === 'starting') tutorialStatus.value = 'running'
  } catch (error) {
    tutorialStatus.value = String(error)
  }
}

async function stopAll() {
  await Promise.all([plainExecutor?.stop(), tutorialExecutor?.stop()])
}

async function dispatchRuntimeLog() {
  if (tutorialExecutor == null) return
  try {
    await tutorialExecutor.dispatchEvent('editor.runtime.log', { log: runtimeLog.value })
    addOutput(`Runtime log: ${runtimeLog.value}`)
  } catch (error) {
    tutorialStatus.value = String(error)
  }
}

onBeforeUnmount(() => {
  void stopAll()
})
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <h1 class="mb-2 text-2xl font-semibold">XGo executor debug</h1>
    <p class="mb-6 text-sm text-grey-700">
      Validate the isolated executor and the current Tutorial class framework. "Run Tutorial" runs the docs example
      course against a mock TutorialFrameworkHost.
    </p>

    <UICard class="space-y-5 p-6">
      <div class="flex gap-3">
        <UIButton type="primary" :disabled="plainStatus === 'starting' || plainStatus === 'running'" @click="runPlain">
          Run XGo
        </UIButton>
        <UIButton
          type="secondary"
          :disabled="tutorialStatus === 'starting' || tutorialStatus === 'running'"
          @click="runTutorial"
        >
          Run Tutorial
        </UIButton>
        <UIButton type="neutral" @click="stopAll">Stop all</UIButton>
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>XGo: {{ plainStatus }}</div>
        <div>Tutorial: {{ tutorialStatus }}</div>
      </div>

      <div class="flex gap-3">
        <UITextInput v-model:value="runtimeLog" class="flex-1" />
        <UIButton type="secondary" :disabled="tutorialStatus !== 'running'" @click="dispatchRuntimeLog">
          Dispatch runtime log
        </UIButton>
      </div>

      <pre v-if="output.length > 0" class="whitespace-pre-wrap rounded bg-grey-100 p-4 text-sm">{{
        output.join('\n')
      }}</pre>
    </UICard>
  </main>
</template>
