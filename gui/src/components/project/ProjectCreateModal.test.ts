import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSerialized } from '@/models/project'
import ProjectCreateModal from './ProjectCreateModal.vue'

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  success: vi.fn(),
  addProject: vi.fn(),
  signedIn: { username: 'alice' }
}))

vi.mock('@/models/common/cloud', () => ({ cloudHelpers: { save: mocks.save } }))
vi.mock('@/stores/user', () => ({ useSignedIn: () => mocks.signedIn }))
vi.mock('./config', () => ({ useProjectConfig: () => ({ defaultFontPreferences: [] }) }))
vi.mock('./default-project', () => ({ createDefaultProject: vi.fn() }))
vi.mock('@/apis/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/project')>()),
  isProjectNameTaken: vi.fn().mockResolvedValue(false),
  addProject: mocks.addProject
}))
vi.mock('@/components/ui', async () => ({
  UIForm: (await import('@/components/ui/form/UIForm.vue')).default,
  UIFormItem: (await import('@/components/ui/form/UIFormItem.vue')).default,
  UITextInput: (await import('@/components/ui/input/UITextInput.vue')).default,
  UIFormModal: { template: '<div><slot /></div>' },
  UIButton: { template: '<button><slot /></button>' },
  useForm: (await import('@/components/ui/form/ctrl')).useForm,
  useMessage: () => ({ success: mocks.success })
}))
vi.mock('@/utils/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/i18n')>()),
  useI18n: () => ({ t: (message: { en: string }) => message.en })
}))

function mountModal(props: { sourceProject?: ProjectSerialized; remixSource?: string }) {
  return mount(ProjectCreateModal, {
    props: { ...props, visible: true },
    global: {
      mocks: { $t: (message: { en: string }) => message.en },
      directives: { radar: () => {} }
    }
  })
}

describe('ProjectCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signedIn.username = 'alice'
  })

  it('describes where a saved copy opens and resolves to the identifier returned by the server', async () => {
    mocks.save.mockResolvedValue({ metadata: { owner: 'Bob', name: 'my-copy' } })
    const wrapper = mountModal({ sourceProject: { metadata: {}, files: {} } })
    const input = wrapper.get('input')
    const tip = wrapper.get('p')
    expect(tip.text()).toBe('Your copy will open in the editor after you save it.')
    expect(input.attributes('aria-describedby')).toBe(tip.attributes('id'))

    mocks.signedIn.username = 'Bob'
    await input.setValue('My-Copy')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ owner: 'Bob', name: 'My-Copy' }) })
    )
    expect(wrapper.emitted('resolved')).toEqual([[{ owner: 'Bob', name: 'my-copy' }]])
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('keeps the existing success feedback for a remix', async () => {
    mocks.addProject.mockResolvedValue({ owner: 'alice', name: 'remix' })
    const wrapper = mountModal({ remixSource: 'bob/game' })
    expect(wrapper.find('p').exists()).toBe(false)
    await wrapper.get('input').setValue('remix')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('resolved')).toEqual([[{ owner: 'alice', name: 'remix' }]])
    expect(mocks.success).toHaveBeenCalledWith('Project remix created')
  })
})
