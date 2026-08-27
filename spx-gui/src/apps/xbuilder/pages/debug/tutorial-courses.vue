<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { XGoExecutor, type XGoExitReason } from '@/utils/xgoexec'
import { createTutorialFramework } from '@/utils/tutorial-framework'
import { UIButton, UICard, UITextInput } from '@/components/ui'
import { createMockTutorialHost } from './tutorial-mock-host'
import { courseCases, exampleCourseSource } from './tutorial-course-cases'

const CASE_TIMEOUT_MS = 15000

const PLAIN_XGO_SOURCE = `
import "time"

for {
	echo "XGo executor is running"
	time.Sleep(time.Second)
}
`

type CaseStatus = 'idle' | 'running' | 'passed' | 'failed'
type CaseResult = { status: CaseStatus; detail: string | null }

const results = ref<CaseResult[]>(courseCases.map(() => ({ status: 'idle', detail: null })))
const casesOutput = ref<string[]>([])
const running = ref(false)
let currentExecutor: XGoExecutor | null = null

function addCasesOutput(message: string) {
  casesOutput.value.push(message)
}

// The course program registers its event handlers shortly after run()
// resolves, so a dispatch racing that registration is retried instead of
// failing the case.
async function dispatchWithRetry(executor: XGoExecutor, name: string, payload: unknown) {
  const deadline = Date.now() + 2000
  for (;;) {
    try {
      await executor.dispatchEvent(name, payload)
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}

async function runCase(index: number) {
  const courseCase = courseCases[index]
  results.value[index] = { status: 'running', detail: null }
  addCasesOutput(`=== ${courseCase.name} ===`)

  let resolveExited: (reason: XGoExitReason) => void
  const exited = new Promise<XGoExitReason>((resolve) => {
    resolveExited = resolve
  })
  let timeoutId: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`no exit within ${CASE_TIMEOUT_MS}ms`)), CASE_TIMEOUT_MS)
  })

  const log = (message: string) => addCasesOutput(`[${courseCase.name}] ${message}`)
  const executor = new XGoExecutor({
    framework: createTutorialFramework(createMockTutorialHost(log)),
    onError: (phase, message) => log(`${phase} error: ${message}`),
    onOutput: (message) => log(`output: ${message}`),
    onExit: (reason) => resolveExited(reason)
  })
  currentExecutor = executor

  try {
    await executor.run({ 'main_course.gox': courseCase.source })
    for (const event of courseCase.events) {
      await dispatchWithRetry(executor, event.name, event.payload)
      log(`event dispatched: ${event.name}`)
    }
    const reason = await Promise.race([exited, timeout])
    if (reason === 'completed') {
      results.value[index] = { status: 'passed', detail: null }
    } else {
      results.value[index] = { status: 'failed', detail: `exited: ${reason}` }
    }
  } catch (error) {
    results.value[index] = { status: 'failed', detail: String(error) }
  } finally {
    clearTimeout(timeoutId!)
    currentExecutor = null
    await executor.stop()
  }
}

async function runAll() {
  if (running.value) return
  running.value = true
  casesOutput.value = []
  results.value = courseCases.map(() => ({ status: 'idle', detail: null }))
  try {
    for (let i = 0; i < courseCases.length; i++) {
      await runCase(i)
    }
  } finally {
    running.value = false
  }
}

async function runOne(index: number) {
  if (running.value) return
  running.value = true
  try {
    await runCase(index)
  } finally {
    running.value = false
  }
}

function caseStatusClass(status: CaseStatus) {
  if (status === 'passed') return 'text-success-main'
  if (status === 'failed') return 'text-danger-main'
  return 'text-grey-700'
}

function caseStatusText(index: number) {
  const result = results.value[index]
  if (result.status === 'passed') return '✓ passed'
  if (result.status === 'failed') return `✗ ${result.detail ?? 'failed'}`
  return result.status
}

// Free-form runner, absorbed from the former /debug/xgoexec page: run any
// course source against the mock host, or a plain XGo program against the
// bare executor.
const courseSource = ref(exampleCourseSource)
const plainStatus = ref('idle')
const courseStatus = ref('idle')
const runtimeLog = ref('reached-target')
const freeOutput = ref<string[]>([])
let plainExecutor: XGoExecutor | null = null
let courseExecutor: XGoExecutor | null = null

function addFreeOutput(message: string) {
  freeOutput.value.push(message)
}

async function runPlain() {
  plainStatus.value = 'starting'
  plainExecutor = new XGoExecutor({
    framework: null,
    onError: (phase, message) => {
      plainStatus.value = `${phase}: ${message}`
      addFreeOutput(`XGo ${phase}: ${message}`)
    },
    onOutput: (message) => addFreeOutput(`XGo: ${message}`),
    onExit: (reason) => {
      plainStatus.value = `exited: ${reason}`
      addFreeOutput(`XGo exited: ${reason}`)
    }
  })
  try {
    await plainExecutor.run({ 'main.xgo': PLAIN_XGO_SOURCE })
    if (plainStatus.value === 'starting') plainStatus.value = 'running'
  } catch (error) {
    plainStatus.value = String(error)
  }
}

async function runCourse() {
  courseStatus.value = 'starting'
  courseExecutor = new XGoExecutor({
    framework: createTutorialFramework(createMockTutorialHost(addFreeOutput)),
    onError: (phase, message) => {
      courseStatus.value = `${phase}: ${message}`
      addFreeOutput(`Course ${phase}: ${message}`)
    },
    onOutput: (message) => addFreeOutput(`Course: ${message}`),
    onExit: (reason) => {
      courseStatus.value = `exited: ${reason}`
      addFreeOutput(`Course exited: ${reason}`)
    }
  })
  try {
    await courseExecutor.run({ 'main_course.gox': courseSource.value })
    if (courseStatus.value === 'starting') courseStatus.value = 'running'
  } catch (error) {
    courseStatus.value = String(error)
  }
}

async function stopFreeForm() {
  await Promise.all([plainExecutor?.stop(), courseExecutor?.stop()])
}

async function dispatchRuntimeLog() {
  if (courseExecutor == null) return
  try {
    await courseExecutor.dispatchEvent('editor.runtime.log', { log: runtimeLog.value })
    addFreeOutput(`Runtime log: ${runtimeLog.value}`)
  } catch (error) {
    courseStatus.value = String(error)
  }
}

function loadExampleCourse() {
  courseSource.value = exampleCourseSource
}

function freeStatusClass(status: string) {
  if (status === 'exited: completed') return 'text-success-main'
  if (status.includes('error')) return 'text-danger-main'
  return ''
}

onBeforeUnmount(() => {
  void currentExecutor?.stop()
  void stopFreeForm()
})
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <h1 class="mb-2 text-2xl font-semibold">Tutorial framework debug</h1>
    <p class="mb-6 text-sm text-grey-700">
      Validate the XGo executor and the Tutorial class framework against a mock TutorialFrameworkHost, without the real
      Tutorial module.
    </p>

    <UICard class="space-y-5 p-6">
      <div>
        <h2 class="text-lg font-medium">Scripted cases</h2>
        <p class="text-sm text-grey-700">
          Each case runs a course source and dispatches its events; it passes when the run exits as "completed".
        </p>
      </div>

      <UIButton type="primary" :disabled="running" @click="runAll">Run all cases</UIButton>

      <ul class="space-y-3">
        <li v-for="(courseCase, index) in courseCases" :key="courseCase.name" class="flex items-start gap-3 text-sm">
          <UIButton type="secondary" size="small" :disabled="running" @click="runOne(index)">Run</UIButton>
          <div class="min-w-0 flex-1">
            <div>
              <span class="font-medium">{{ courseCase.name }}</span>
              <span class="ml-2" :class="caseStatusClass(results[index].status)">{{ caseStatusText(index) }}</span>
            </div>
            <p class="text-grey-700">{{ courseCase.description }}</p>
          </div>
        </li>
      </ul>

      <pre v-if="casesOutput.length > 0" class="whitespace-pre-wrap rounded bg-grey-100 p-4 text-sm">{{
        casesOutput.join('\n')
      }}</pre>
    </UICard>

    <UICard class="mt-6 space-y-5 p-6">
      <div>
        <h2 class="text-lg font-medium">Free-form run</h2>
        <p class="text-sm text-grey-700">
          Run the course source below against the mock host, or a plain XGo program against the bare executor.
        </p>
      </div>

      <div class="flex gap-3">
        <UIButton
          type="primary"
          :disabled="courseStatus === 'starting' || courseStatus === 'running'"
          @click="runCourse"
        >
          Run course
        </UIButton>
        <UIButton
          type="secondary"
          :disabled="plainStatus === 'starting' || plainStatus === 'running'"
          @click="runPlain"
        >
          Run plain XGo
        </UIButton>
        <UIButton type="neutral" @click="stopFreeForm">Stop all</UIButton>
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          Course: <span :class="freeStatusClass(courseStatus)">{{ courseStatus }}</span>
        </div>
        <div>
          XGo: <span :class="freeStatusClass(plainStatus)">{{ plainStatus }}</span>
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
        <UIButton type="secondary" :disabled="courseStatus !== 'running'" @click="dispatchRuntimeLog">
          Dispatch runtime log
        </UIButton>
      </div>

      <pre v-if="freeOutput.length > 0" class="whitespace-pre-wrap rounded bg-grey-100 p-4 text-sm">{{
        freeOutput.join('\n')
      }}</pre>
    </UICard>
  </main>
</template>
