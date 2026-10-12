import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { createI18n } from '@/utils/i18n'
import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject, Video } from '@/models/tutorial/project'
import { Cancelled } from '@/utils/exception'
import { History } from '@/components/editor/history'
import type { ResourceView } from './course-views'
import CourseResourceGrid from './CourseResourceGrid.vue'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    selectFiles: vi.fn(),
    confirm: vi.fn(),
    /** The modals opened, by component name, with the props they were given. */
    modals: [] as Array<{ name: string | undefined; props: any }>,
    /** What the handlers failed with, as the message handle would report it. */
    errors: [] as unknown[]
  }
}))

vi.mock('@/models/common/cloud', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/models/common/cloud')>()),
  selectFilesWithUploadLimit: mocks.selectFiles
}))

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useConfirmDialog: () => mocks.confirm,
  useModal: (component: { __name?: string }) => async (props: unknown) => {
    mocks.modals.push({ name: component.__name, props })
  }
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: (...args: unknown[]) => unknown) => ({
    fn: async (...args: unknown[]) => {
      try {
        await fn(...args)
      } catch (error) {
        mocks.errors.push(error)
      }
    },
    isLoading: { value: false }
  })
}))

enableAutoUnmount(afterEach)

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}'),
    'project/assets/index.json': fromConfig('index.json', {}),
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'step-to-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video'),
    'assets/images/map/index.json': fromConfig('index.json', { path: 'map.png', builder_id: 'map-id' }),
    'assets/images/map/map.png': fromText('map.png', 'png')
  }
}

/** The project and the history the Course Editor gives the page. */
async function makeCourse() {
  const project = new TutorialProject()
  await project.loadFiles(makeFiles())
  const history = new History({
    mutex: { runExclusive: (job) => project.runExclusive(job) },
    exportFiles: () => project.exportFiles(),
    loadFiles: (files) => project.loadFiles(files)
  })
  return { project, history }
}

const CardStub = defineComponent({
  name: 'CourseResourceCard',
  props: { resource: { type: Object, required: true } },
  emits: ['preview', 'rename', 'remove'],
  render: () => null
})

const ButtonStub = defineComponent({
  name: 'UIButton',
  emits: ['click'],
  setup(_, { emit, slots }) {
    return () => h('button', { onClick: () => emit('click') }, slots.default?.())
  }
})

async function mountGrid(view: ResourceView) {
  const { project, history } = await makeCourse()
  // Rendered by a parent, as in the editor: test utils would walk the props given to `mount` and loop on the project,
  // which its resources point back at.
  const Page = defineComponent(() => () => h(CourseResourceGrid, { project, view, history }))
  const wrapper = mount(Page, {
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: {} },
      stubs: { CourseResourceCard: CardStub, UIButton: ButtonStub, UIEmpty: true }
    }
  })
  /** The card of the resource named `name`. */
  const card = (name: string) => {
    const found = wrapper
      .findAllComponents(CardStub)
      .find((c) => (c.props('resource') as { name: string }).name === name)
    if (found == null) throw new Error(`no card for ${name}`)
    return found
  }
  const cardNames = () => wrapper.findAllComponents(CardStub).map((c) => (c.props('resource') as { name: string }).name)
  return { wrapper, project, history, card, cardNames }
}

/** Files the author picks in the file dialog. */
function nativeFiles(...names: string[]) {
  return names.map((name) => new File(['content'], name))
}

describe('CourseResourceGrid', () => {
  beforeEach(() => {
    mocks.selectFiles.mockReset()
    mocks.confirm.mockReset()
    mocks.modals.length = 0
    mocks.errors.length = 0
  })

  it('adds the picked files as videos named after them, in one step that undo takes back', async () => {
    const { wrapper, project, history, cardNames } = await mountGrid('videos')
    mocks.selectFiles.mockResolvedValue(nativeFiles('intro.webm', 'step-to.mp4'))

    await wrapper.find('button').trigger('click')
    await flushPromises()

    // A name the course already uses is made unique rather than replacing the video that has it.
    expect(project.videos.map((v) => v.name).sort()).toEqual(['intro', 'step-to', 'step-to2'])
    expect(cardNames()).toEqual(['intro', 'step-to', 'step-to2'])
    expect(mocks.selectFiles).toHaveBeenCalledWith({ accept: ['mp4', 'webm', 'mov'] })
    expect(history.getUndoAction()?.name.en).toBe('Add videos')

    await history.undo()
    expect(project.videos.map((v) => v.name)).toEqual(['step-to'])
  })

  it('adds pictures on the pictures page, where names only clash with other pictures', async () => {
    const { wrapper, project, history } = await mountGrid('images')
    mocks.selectFiles.mockResolvedValue(nativeFiles('step-to.png'))

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(project.images.map((i) => i.name).sort()).toEqual(['map', 'step-to'])
    expect(project.videos.map((v) => v.name)).toEqual(['step-to'])
    expect(history.getUndoAction()?.name.en).toBe('Add images')
  })

  it('keeps files picked after the page is gone out of the course', async () => {
    const { wrapper, project, history } = await mountGrid('videos')
    let pick!: (files: File[]) => void
    mocks.selectFiles.mockReturnValue(new Promise((resolve) => (pick = resolve)))

    await wrapper.find('button').trigger('click')
    wrapper.unmount()
    pick(nativeFiles('intro.webm'))
    await flushPromises()

    expect(project.videos.map((v) => v.name)).toEqual(['step-to'])
    expect(history.getUndoAction()).toBeNull()
  })

  it('renames a video, checking the name against the other videos only', async () => {
    const { project, history, card } = await mountGrid('videos')
    project.addVideo(new Video('intro', fromText('intro.mp4', 'video')))
    await flushPromises()

    card('step-to').vm.$emit('rename')
    await flushPromises()
    const { target } = mocks.modals.find((m) => m.name === 'RenameModal')!.props
    expect(target.validateName('intro')).not.toBeNull()
    // A picture of that name is no clash.
    expect(target.validateName('map')).toBeNull()
    await target.applyName('  hello  ')

    expect(project.videos.map((v) => v.name).sort()).toEqual(['hello', 'intro'])
    expect(history.getUndoAction()?.name.en).toBe('Rename video')
    await history.undo()
    expect(project.videos.map((v) => v.name).sort()).toEqual(['intro', 'step-to'])
  })

  it('removes a video once the author confirms, and keeps it when they do not', async () => {
    const { project, history, card } = await mountGrid('videos')

    // The confirm dialog rejects when the author cancels it.
    mocks.confirm.mockRejectedValueOnce(new Cancelled('cancelled'))
    card('step-to').vm.$emit('remove')
    await flushPromises()
    expect(project.videos.map((v) => v.name)).toEqual(['step-to'])
    expect(history.getUndoAction()).toBeNull()

    mocks.confirm.mockResolvedValueOnce(undefined)
    card('step-to').vm.$emit('remove')
    await flushPromises()
    expect(project.videos).toEqual([])
    expect(history.getUndoAction()?.name.en).toBe('Remove video step-to')

    await history.undo()
    expect(project.videos.map((v) => v.name)).toEqual(['step-to'])
  })

  it('previews the resource whose card was clicked', async () => {
    const { project, card } = await mountGrid('videos')

    card('step-to').vm.$emit('preview')
    await flushPromises()

    expect(mocks.modals).toEqual([{ name: 'CourseResourcePreviewModal', props: { resource: project.videos[0] } }])
  })
})
