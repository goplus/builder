<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { XGoExecutor } from '@/utils/xgoexec'
import { createTutorialFramework } from '@/utils/tutorial-framework'
import { UIButton, UICard, UITextInput } from '@/components/ui'
import { createMockTutorialHost } from './tutorial-mock-host'
import exampleCourseSource from '../../../../../../docs/develop/tutorial-v2/example-tutorial-course/main_course.gox?raw'

const PLAIN_XGO_SOURCE = `
import "time"

for {
	echo "XGo executor is running"
	time.Sleep(time.Second)
}
`

const tutorialFramework = createTutorialFramework(createMockTutorialHost((message) => addOutput(message)))

const plainStatus = ref('idle')
const tutorialStatus = ref('idle')
const output = ref<string[]>([])
const runtimeLog = ref('reached-target')
const courseSource = ref(exampleCourseSource)
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
    await tutorialExecutor.run({ 'main_course.gox': courseSource.value })
    if (tutorialStatus.value === 'starting') tutorialStatus.value = 'running'
  } catch (error) {
    tutorialStatus.value = String(error)
  }
}

async function stopAll() {
  await Promise.all([plainExecutor?.stop(), tutorialExecutor?.stop()])
}

function loadExampleCourse() {
  courseSource.value = exampleCourseSource
}

function statusClass(status: string) {
  if (status === 'exited: completed') return 'text-success-main'
  if (status.includes('error')) return 'text-danger-main'
  return ''
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
      Validate the isolated executor and the current Tutorial class framework. "Run Tutorial" runs the course source
      below (prefilled with the docs example) against a mock TutorialFrameworkHost. For scripted multi-course runs see
      <RouterLink class="underline" to="/debug/tutorial-courses">tutorial course cases</RouterLink>.
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
        <div>
          XGo: <span :class="statusClass(plainStatus)">{{ plainStatus }}</span>
        </div>
        <div>
          Tutorial: <span :class="statusClass(tutorialStatus)">{{ tutorialStatus }}</span>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm">Course source (main_course.gox)</span>
          <UIButton type="neutral" @click="loadExampleCourse">Load example course</UIButton>
        </div>
        <UITextInput v-model:value="courseSource" type="textarea" :rows="14" class="font-mono" />
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
