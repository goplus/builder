import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Visibility } from '@/apis/common'
import type { SpxProject } from '@/models/spx/project'
import ProjectPublishModal from './ProjectPublishModal.vue'

const mocks = vi.hoisted(() => ({
  createProjectRelease: vi.fn(),
  save: vi.fn(),
  handledError: null as unknown
}))

vi.mock('dayjs', () => ({
  default: () => ({
    tz: () => ({
      format: () => '20260803000000'
    })
  })
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: (...args: unknown[]) => unknown) => ({
    fn: async (...args: unknown[]) => {
      try {
        await fn(...args)
      } catch (error) {
        mocks.handledError = error
      }
    },
    isLoading: { value: false }
  })
}))

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (message: { en: string }) => message.en
  })
}))

vi.mock('@/utils/img-rendering', () => ({
  useRenderableImageUrl: () => ['', false]
}))

vi.mock('@/utils/project', () => ({
  isProjectUsingAIInteraction: () => false
}))

vi.mock('@/apis/project-release', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/project-release')>()),
  createProjectRelease: mocks.createProjectRelease
}))

vi.mock('@/models/common/cloud', () => ({
  cloudHelpers: {
    save: mocks.save
  }
}))

vi.mock('@/components/ui', () => {
  const Stub = defineComponent({ template: '<div><slot /></div>' })
  const FormStub = defineComponent({
    emits: ['submit'],
    template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>'
  })
  const TextInputStub = defineComponent({
    props: {
      value: { type: String, default: '' },
      type: { type: String, default: 'text' }
    },
    emits: ['update:value'],
    template:
      '<textarea v-if="type === \'textarea\'" :value="value" @input="$emit(\'update:value\', $event.target.value)" /><input v-else :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
  })
  return {
    UIButton: Stub,
    UIForm: FormStub,
    UIFormItem: Stub,
    UIFormModal: Stub,
    UIImg: Stub,
    UITextInput: TextInputStub,
    useForm: (fields: Record<string, [unknown]>) => ({
      value: Object.fromEntries(Object.entries(fields).map(([key, [value]]) => [key, value]))
    })
  }
})

function makeProject() {
  const project = {
    owner: 'alice',
    name: 'project',
    displayName: 'Project',
    description: 'Old description',
    instructions: 'Old instructions',
    thumbnail: null,
    visibility: Visibility.Private,
    revision: 6,
    releaseCount: 2,
    ensureAIDescription: vi.fn(),
    export: vi.fn().mockResolvedValue({ metadata: {}, files: {} }),
    setDescription: vi.fn((description: string) => {
      project.description = description
    }),
    setInstructions: vi.fn((instructions: string) => {
      project.instructions = instructions
    }),
    setMetadata: vi.fn((metadata: Record<string, unknown>) => {
      Object.assign(project, metadata)
    }),
    setVisibility: vi.fn((visibility: Visibility) => {
      project.visibility = visibility
    })
  }
  return project as unknown as SpxProject
}

function mountModal(project: SpxProject) {
  return mount(ProjectPublishModal, {
    props: {
      project,
      visible: true
    },
    global: {
      directives: {
        radar: () => {}
      },
      mocks: {
        $t: (message: { en: string }) => message.en
      }
    }
  })
}

describe('ProjectPublishModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.handledError = null
    mocks.save.mockResolvedValue({
      metadata: {
        owner: 'alice',
        name: 'project',
        revision: 7,
        visibility: Visibility.Public
      },
      files: {}
    })
    mocks.createProjectRelease.mockResolvedValue({ name: 'v1.0.0' })
  })

  it('creates a release from the saved public project revision', async () => {
    const project = makeProject()
    const wrapper = mountModal(project)

    await wrapper.get('textarea').setValue('Release notes')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(project.setVisibility).toHaveBeenCalledWith(Visibility.Public)
    const saveCallOrder = mocks.save.mock.invocationCallOrder[0]
    const releaseCallOrder = mocks.createProjectRelease.mock.invocationCallOrder[0]
    if (saveCallOrder == null || releaseCallOrder == null) throw new Error('Expected save and release calls')
    expect(saveCallOrder).toBeLessThan(releaseCallOrder)
    expect(mocks.createProjectRelease).toHaveBeenCalledWith('alice', 'project', {
      name: expect.stringMatching(/^v0\.0\.0\+/),
      description: 'Release notes',
      projectRevision: 7
    })
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })

  it('keeps the project public and the modal open when release creation fails', async () => {
    const project = makeProject()
    const wrapper = mountModal(project)
    const error = new Error('release failed')
    mocks.createProjectRelease.mockRejectedValue(error)

    await wrapper.get('textarea').setValue('Release notes')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.handledError).toBe(error)
    expect(project.visibility).toBe(Visibility.Public)
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })
})
