import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { MapMode } from '@/models/spx/stage'
import { provideLocalEditorCtx, type EditorCtx } from '../../EditorContextProvider.vue'
import BackdropModeSelector from './BackdropModeSelector.vue'

function createEditorCtx(): EditorCtx {
  return {
    project: {
      stage: {
        mapMode: MapMode.fillRatio,
        setMapMode: vi.fn()
      }
    },
    state: {
      history: {
        doAction: vi.fn()
      }
    }
  } as unknown as EditorCtx
}

function mountBackdropModeSelector() {
  const editorCtx = createEditorCtx()
  const Host = defineComponent({
    setup() {
      provideLocalEditorCtx(editorCtx)
      return () => h(BackdropModeSelector)
    }
  })

  const wrapper = mount(Host, {
    global: {
      plugins: [createI18n({ lang: 'en' })],
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

    const labels = wrapper.findAll('[aria-label]').map((item) => item.attributes('aria-label'))

    expect(labels).toEqual(['Tile', 'Scale', 'Original'])
  })
})
