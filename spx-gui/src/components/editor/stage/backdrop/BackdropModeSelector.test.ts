import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createI18n, type Lang } from '@/utils/i18n'
import { MapMode } from '@/models/spx/stage'
import { provideLocalEditorCtx, type EditorCtx } from '../../EditorContextProvider.vue'
import BackdropModeSelector from './BackdropModeSelector.vue'

function createEditorCtx(): EditorCtx {
  const setMapMode = vi.fn()
  const doAction = vi.fn((_action: unknown, run: () => void) => run())

  return {
    project: {
      stage: {
        mapMode: MapMode.fillRatio,
        setMapMode
      }
    },
    state: {
      history: {
        doAction
      }
    }
  } as unknown as EditorCtx
}

function mountBackdropModeSelector(lang: Lang = 'en') {
  const editorCtx = createEditorCtx()
  const Host = defineComponent({
    setup() {
      provideLocalEditorCtx(editorCtx)
      return () => h(BackdropModeSelector)
    }
  })

  const wrapper = mount(Host, {
    global: {
      plugins: [createI18n({ lang })],
      stubs: {
        UITooltip: {
          template: '<slot name="trigger" />'
        }
      }
    }
  })

  return { wrapper, editorCtx }
}

describe('BackdropModeSelector', () => {
  it('provides accessible labels for icon-only mode buttons', () => {
    const { wrapper } = mountBackdropModeSelector()

    const buttons = wrapper.findAll('[aria-label]')
    const labels = buttons.map((item) => item.attributes('aria-label'))

    expect(labels).toEqual(['Tile', 'Scale', 'Original'])
    expect(buttons.map((item) => item.attributes('role'))).toEqual(['button', 'button', 'button'])
  })

  it('provides localized accessible labels for Chinese users', () => {
    const { wrapper } = mountBackdropModeSelector('zh')

    const labels = wrapper.findAll('[aria-label]').map((item) => item.attributes('aria-label'))

    expect(labels).toEqual(['平铺', '缩放', '原图'])
  })

  it('updates the stage map mode through history when selecting a mode', async () => {
    const { wrapper, editorCtx } = mountBackdropModeSelector()

    await wrapper.get('[aria-label="Tile"]').trigger('click')

    expect(editorCtx.state.history.doAction).toHaveBeenCalledOnce()
    expect(editorCtx.project.stage.setMapMode).toHaveBeenCalledWith(MapMode.repeat)
  })
})
