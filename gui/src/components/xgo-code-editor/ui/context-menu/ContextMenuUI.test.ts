import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ContextMenuController, MenuData } from '.'
import ContextMenuUI from './ContextMenuUI.vue'

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: () => ({ ui: { editor: {} } }) }))
vi.mock('../common', () => ({ toAbsolutePosition: () => ({ left: 0, top: 0, height: 10 }) }))

describe('ContextMenuUI', () => {
  it('clears an existing context menu on unmount', () => {
    const menuData = ref<MenuData | null>({ groups: [], position: { left: 0, top: 0 } })
    const controller = {
      triggerData: null,
      get menuData() {
        return menuData.value
      },
      hideMenu: () => {
        menuData.value = null
      }
    } as unknown as ContextMenuController
    const wrapper = shallowMount(ContextMenuUI, { props: { controller } })
    wrapper.unmount()
    expect(controller.menuData).toBeNull()
    const remounted = shallowMount(ContextMenuUI, { props: { controller } })
    expect(remounted.getComponent({ name: 'ContextMenu' }).props('data')).toBeNull()
    remounted.unmount()
  })
})
