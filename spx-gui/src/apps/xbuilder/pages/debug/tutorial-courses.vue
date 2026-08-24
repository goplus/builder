<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { XGoExecutor, type XGoExitReason } from '@/utils/xgoexec'
import { createTutorialFramework } from '@/utils/tutorial-framework'
import { UIButton, UICard } from '@/components/ui'
import { createMockTutorialHost } from './tutorial-mock-host'
import { courseCases } from './tutorial-course-cases'

const CASE_TIMEOUT_MS = 15000

type CaseStatus = 'idle' | 'running' | 'passed' | 'failed'
type CaseResult = { status: CaseStatus; detail: string | null }

const results = ref<CaseResult[]>(courseCases.map(() => ({ status: 'idle', detail: null })))
const output = ref<string[]>([])
const running = ref(false)
let currentExecutor: XGoExecutor | null = null

function addOutput(message: string) {
  output.value.push(message)
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
  addOutput(`=== ${courseCase.name} ===`)

  let resolveExited: (reason: XGoExitReason) => void
  const exited = new Promise<XGoExitReason>((resolve) => {
    resolveExited = resolve
  })
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`no exit within ${CASE_TIMEOUT_MS}ms`)), CASE_TIMEOUT_MS)
  })

  const log = (message: string) => addOutput(`[${courseCase.name}] ${message}`)
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
    currentExecutor = null
    await executor.stop()
  }
}

async function runAll() {
  if (running.value) return
  running.value = true
  output.value = []
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

function statusClass(status: CaseStatus) {
  if (status === 'passed') return 'text-success-main'
  if (status === 'failed') return 'text-danger-main'
  return 'text-grey-700'
}

function statusText(index: number) {
  const result = results.value[index]
  if (result.status === 'passed') return '✓ passed'
  if (result.status === 'failed') return `✗ ${result.detail ?? 'failed'}`
  return result.status
}

onBeforeUnmount(() => {
  void currentExecutor?.stop()
})
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <h1 class="mb-2 text-2xl font-semibold">Tutorial course cases</h1>
    <p class="mb-6 text-sm text-grey-700">
      Scripted Course programs run one by one against the real executor wasm and a mock TutorialFrameworkHost; a case
      passes when it exits as "completed". For free-form experiments see
      <RouterLink class="underline" to="/debug/xgoexec">the executor debug page</RouterLink>.
    </p>

    <UICard class="space-y-5 p-6">
      <UIButton type="primary" :disabled="running" @click="runAll">Run all cases</UIButton>

      <ul class="space-y-3">
        <li v-for="(courseCase, index) in courseCases" :key="courseCase.name" class="flex items-start gap-3 text-sm">
          <UIButton type="secondary" size="small" :disabled="running" @click="runOne(index)">Run</UIButton>
          <div class="min-w-0 flex-1">
            <div>
              <span class="font-medium">{{ courseCase.name }}</span>
              <span class="ml-2" :class="statusClass(results[index].status)">{{ statusText(index) }}</span>
            </div>
            <p class="text-grey-700">{{ courseCase.description }}</p>
          </div>
        </li>
      </ul>

      <pre v-if="output.length > 0" class="whitespace-pre-wrap rounded bg-grey-100 p-4 text-sm">{{
        output.join('\n')
      }}</pre>
    </UICard>
  </main>
</template>
