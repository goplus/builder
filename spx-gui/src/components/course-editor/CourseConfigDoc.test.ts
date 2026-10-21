import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { createI18n } from '@/utils/i18n'
import { Cancelled, DefaultException } from '@/utils/exception'
import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import { History } from '@/components/editor/history'
import { UITextInput } from '@/components/ui'
import CourseConfigDoc from './CourseConfigDoc.vue'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    saveFiles: vi.fn(),
    generate: vi.fn(),
    /** What the handlers failed with, as the message handle would report it; cancellations are not reported. */
    errors: [] as unknown[]
  }
}))

vi.mock('@/models/common/cloud', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/models/common/cloud')>()),
  saveFiles: mocks.saveFiles
}))

vi.mock('@/apis/course', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course')>()),
  generatePlaygroundCourseCopilotContext: mocks.generate
}))

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useMessage: () => ({ withLoading: (promise: Promise<unknown>) => promise })
}))

vi.mock('@/utils/exception', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/exception')>()
  const { ref } = await import('vue')
  return {
    ...original,
    useMessageHandle: (fn: (...args: unknown[]) => unknown) => {
      const isLoading = ref(false)
      return {
        fn: async (...args: unknown[]) => {
          isLoading.value = true
          try {
            await fn(...args)
          } catch (error) {
            if (!(error instanceof original.Cancelled)) mocks.errors.push(error)
          } finally {
            isLoading.value = false
          }
        },
        isLoading
      }
    }
  }
})

enableAutoUnmount(afterEach)

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '/sprites/Lita/code',
      copilotContext: 'Help the learner.'
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}'),
    'project/assets/index.json': fromConfig('index.json', {})
  }
}

const ButtonStub = defineComponent({
  name: 'UIButton',
  emits: ['click'],
  setup(_, { emit, slots }) {
    return () => h('button', { onClick: () => emit('click') }, slots.default?.())
  }
})

async function mountDoc() {
  const project = new TutorialProject()
  await project.load({
    metadata: {
      id: '2338',
      owner: 'curator',
      kind: 'playground',
      title: 'Move Lita',
      thumbnail: 'kodo://thumbnail',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z'
    },
    files: makeFiles()
  })
  const history = new History({
    mutex: { runExclusive: (job) => project.runExclusive(job) },
    exportFiles: () => project.exportFiles(),
    loadFiles: (files) => project.loadFiles(files)
  })
  const shown = ref(true)
  // Rendered by a parent, as in the editor, which also lets a test take it away.
  const Page = defineComponent(() => () => (shown.value ? h(CourseConfigDoc, { project, history }) : null))
  const wrapper = mount(Page, {
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: {} },
      stubs: { UIButton: ButtonStub }
    }
  })
  const inputs = () => wrapper.findAllComponents(UITextInput)
  async function type(index: number, value: string) {
    inputs()[index].vm.$emit('update:value', value)
    await flushPromises()
  }
  async function generate() {
    await wrapper.find('button').trigger('click')
    await flushPromises()
  }
  async function leave() {
    shown.value = false
    await flushPromises()
  }
  return { project, history, inputs, type, generate, leave }
}

/** A request the test answers when it chooses. */
function pending<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

describe('CourseConfigDoc', () => {
  beforeEach(() => {
    mocks.saveFiles.mockReset().mockResolvedValue({ fileCollection: { 'index.json': 'kodo://index' } })
    mocks.generate.mockReset()
    mocks.errors.length = 0
  })

  it('records typing in each setting as one step per setting', async () => {
    const { project, history, type } = await mountDoc()

    await type(0, '/sprites/Lita')
    await type(0, '/sprites/Lita/costumes')
    await type(1, 'Help the learner find stepTo.')

    expect(project.config).toMatchObject({
      inEditorPath: '/sprites/Lita/costumes',
      copilotContext: 'Help the learner find stepTo.'
    })
    await history.undo()
    expect(project.config?.copilotContext).toBe('Help the learner.')
    await history.undo()
    expect(project.config?.inEditorPath).toBe('/sprites/Lita/code')
    expect(history.getUndoAction()).toBeNull()
  })

  it('writes the generated context from the unsaved work, in one step that undo takes back', async () => {
    const { project, history, generate } = await mountDoc()
    project.mainCourse.setCode('onStart => { completeWith "Well done" }')
    mocks.generate.mockResolvedValue({ copilotContext: 'Generated.' })

    await generate()

    const [uploaded] = mocks.saveFiles.mock.calls[0]
    expect(Object.keys(uploaded)).toContain(mainCourseFilePath)
    expect(mocks.generate).toHaveBeenCalledWith(
      { title: 'Move Lita', thumbnail: 'kodo://thumbnail', content: { 'index.json': 'kodo://index' } },
      expect.any(AbortSignal)
    )
    expect(project.config?.copilotContext).toBe('Generated.')
    expect(history.getUndoAction()?.name.en).toBe('Generate Copilot context')
    await history.undo()
    expect(project.config?.copilotContext).toBe('Help the learner.')
  })

  it('locks the settings while generating', async () => {
    const { inputs, generate } = await mountDoc()
    const answer = pending<{ copilotContext: string }>()
    mocks.generate.mockReturnValue(answer.promise)

    await generate()
    expect(inputs().map((input) => input.props('disabled'))).toEqual([true, true])

    answer.resolve({ copilotContext: 'Generated.' })
    await flushPromises()
    expect(inputs().map((input) => input.props('disabled'))).toEqual([false, false])
  })

  it('does not overwrite a context that changed while generating', async () => {
    const { project, history, generate } = await mountDoc()
    const answer = pending<{ copilotContext: string }>()
    mocks.generate.mockReturnValue(answer.promise)

    await generate()
    // Changed by another path while the inputs are locked, an undo say.
    project.setConfig({ copilotContext: 'Changed meanwhile.' })
    answer.resolve({ copilotContext: 'Generated.' })
    await flushPromises()

    expect(project.config?.copilotContext).toBe('Changed meanwhile.')
    expect(mocks.errors).toEqual([expect.any(DefaultException)])
    expect(history.getUndoAction()).toBeNull()
  })

  it('drops the request when the document is left while generating', async () => {
    const { project, history, generate, leave } = await mountDoc()
    const answer = pending<{ copilotContext: string }>()
    mocks.generate.mockReturnValue(answer.promise)

    await generate()
    await leave()
    const signal = mocks.generate.mock.calls[0][1] as AbortSignal
    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(Cancelled)
    answer.resolve({ copilotContext: 'Generated.' })
    await flushPromises()

    expect(project.config?.copilotContext).toBe('Help the learner.')
    expect(history.getUndoAction()).toBeNull()
    // Leaving is not a failure to report.
    expect(mocks.errors).toEqual([])
  })
})
