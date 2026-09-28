<script lang="ts">
/**
 * Dev-only harness for verifying course code against the real project runtime, driven
 * programmatically instead of through the editor UI:
 *
 *   await courseRunner.load('curator', 'Coding-Course-1')
 *   const result = await courseRunner.run({ code: { Kiko: 'step 160' } })
 *   // result.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }, ...]
 *
 * The page mounts the same `ProjectRunner` (WASM engine) users run — verification here is
 * verification against the production runtime, byte for byte.
 */

export type CourseRunnerLog = {
  /** Milliseconds since the run started. */
  at: number
  consoleType: 'log' | 'warn'
  /** Structured game log fields, when the entry is one (see tools/ispx/log.go). */
  level: string | null
  msg: string
  raw: string
}

export type CourseRunnerResult = {
  /** Whether the game exited by itself before the timeout. */
  exited: boolean
  exitCode: number | null
  durationMs: number
  logs: CourseRunnerLog[]
}

export type CourseRunnerApi = {
  /** Load a (public) cloud project. Returns the code files that can be overridden. */
  load(owner: string, name: string): Promise<{ codeFiles: string[] }>
  /**
   * Load a project from an `.xbp` file served over HTTP (e.g. one placed under `public/`), so a
   * course project can be verified before it is ever uploaded.
   */
  loadXbp(url: string): Promise<{ codeFiles: string[] }>
  /**
   * Override code files (key: sprite name, or `main` for the stage; `.spx` suffix optional)
   * and run the project. Resolves when the game exits, or after `timeoutMs` (default 20s) —
   * games with event handlers never exit by themselves, so a timeout is not a failure.
   */
  run(options?: { code?: Record<string, string>; timeoutMs?: number }): Promise<CourseRunnerResult>
  stop(): Promise<void>
}

declare global {
  interface Window {
    courseRunner?: CourseRunnerApi
  }
}

function parseGameLog(args: unknown[]): { level: string; msg: string } | null {
  if (args.length !== 1 || typeof args[0] !== 'string') return null
  try {
    const parsed = JSON.parse(args[0])
    if (parsed != null && typeof parsed.level === 'string' && typeof parsed.msg === 'string') {
      return { level: parsed.level, msg: parsed.msg }
    }
  } catch {
    // Not a structured game log.
  }
  return null
}

const defaultRunTimeout = 20_000
</script>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, shallowRef } from 'vue'
import { timeout, untilNotNull } from '@/utils/utils'
import { cloudHelpers } from '@/models/common/cloud'
import { xbpHelpers } from '@/models/common/xbp'
import type { ProjectSerialized } from '@/models/project'
import { SpxProject } from '@/models/spx/project'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'

const projectRef = shallowRef<SpxProject | null>(null)
const runnerRef = ref<InstanceType<typeof ProjectRunner> | null>(null)
const statusRef = ref('No project loaded. Drive me via `window.courseRunner`.')

let logs: CourseRunnerLog[] = []
let runStartedAt = 0
let resolveExit: ((code: number) => void) | null = null

function handleConsole(consoleType: 'log' | 'warn', args: unknown[]) {
  const parsed = parseGameLog(args)
  logs.push({
    at: Math.round(performance.now() - runStartedAt),
    consoleType,
    level: parsed?.level ?? null,
    msg: parsed?.msg ?? args.map((a) => String(a)).join(' '),
    raw: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  })
}

function handleExit(code: number) {
  resolveExit?.(code)
  resolveExit = null
}

function getCodeFiles(project: SpxProject): string[] {
  return ['main', ...project.sprites.map((s) => s.name)]
}

function applyCode(project: SpxProject, code: Record<string, string>) {
  for (const [rawKey, content] of Object.entries(code)) {
    const key = rawKey.replace(/\.spx$/, '')
    if (key === 'main' || key === 'stage') {
      project.stage.setCode(content)
      continue
    }
    const sprite = project.sprites.find((s) => s.name === key)
    if (sprite == null) throw new Error(`Unknown code file "${rawKey}". Available: ${getCodeFiles(project).join(', ')}`)
    sprite.setCode(content)
  }
}

async function adopt(serialized: ProjectSerialized, label: string) {
  const project = new SpxProject()
  await project.load(serialized)
  projectRef.value = project
  statusRef.value = `Loaded ${label}`
  return { codeFiles: getCodeFiles(project) }
}

const api: CourseRunnerApi = {
  async load(owner, name) {
    statusRef.value = `Loading ${owner}/${name}...`
    return adopt(await cloudHelpers.load(owner, name, true), `${owner}/${name}`)
  },

  async loadXbp(url) {
    statusRef.value = `Loading ${url}...`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`)
    const file = new File([await resp.blob()], url.split('/').pop() ?? 'project.xbp')
    return adopt(await xbpHelpers.load(file), url)
  },

  async run(options) {
    const project = projectRef.value
    if (project == null) throw new Error('No project loaded. Call `courseRunner.load(owner, name)` first.')
    if (options?.code != null) applyCode(project, options.code)

    const exitPromise = new Promise<number>((resolve) => {
      resolveExit = resolve
    })

    statusRef.value = 'Running...'
    // Loading a project swaps in a fresh runner (keyed below); wait for it to mount rather than
    // assuming this call comes late enough, or the run silently does nothing on the old one.
    await nextTick()
    const runner = await untilNotNull(runnerRef)

    logs = []
    runStartedAt = performance.now()
    await runner.run()

    const timeoutMs = options?.timeoutMs ?? defaultRunTimeout
    const exitCode = await Promise.race([exitPromise, timeout(timeoutMs).then(() => null)])

    const result: CourseRunnerResult = {
      exited: exitCode != null,
      exitCode,
      durationMs: Math.round(performance.now() - runStartedAt),
      logs
    }
    statusRef.value = exitCode != null ? `Exited with code ${exitCode}` : `Still running after ${timeoutMs}ms`
    return result
  },

  async stop() {
    await runnerRef.value?.stop()
    statusRef.value = 'Stopped'
  }
}

window.courseRunner = api
onUnmounted(() => {
  delete window.courseRunner
})

// `?autorun=<same-origin script url>` runs a driver script once the harness is ready. A page
// session only survives a handful of engine instances before runs quietly stop doing anything,
// so a batch driver has to reload the page to get a fresh budget — which means the page, not the
// caller, has to be the one that starts it again.
const autorun = new URLSearchParams(location.search).get('autorun')
if (autorun != null && autorun.startsWith('/')) {
  fetch(autorun)
    .then((r) => r.text())
    .then((src) => new Function(src)())
    .catch((err) => {
      statusRef.value = `autorun failed: ${err.message}`
    })
}
</script>

<template>
  <div class="flex h-screen flex-col items-center gap-3 bg-grey-300 p-4">
    <h1 class="text-base font-bold">Course runner (dev harness)</h1>
    <p class="text-sm text-grey-800">{{ statusRef }}</p>
    <div class="aspect-4/3 w-[640px] flex-none overflow-hidden rounded-md bg-grey-200">
      <ProjectRunner
        v-if="projectRef != null"
        :key="projectRef.name ?? ''"
        ref="runnerRef"
        :project="projectRef"
        @console="handleConsole"
        @exit="handleExit"
      />
    </div>
  </div>
</template>
