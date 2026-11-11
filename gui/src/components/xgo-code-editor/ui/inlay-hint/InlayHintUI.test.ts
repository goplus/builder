import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { InlayHintController } from '.'
import { InlayHintKind } from '../../inlay-hint'
import { useDecorations } from '../common'
import InlayHintUI from './InlayHintUI.vue'

vi.mock('../common', () => ({ useDecorations: vi.fn() }))

describe('parameter label decorations', () => {
  it.each([false, true])('renders retained=%s without changing the source range or label', (retained) => {
    const item = {
      kind: InlayHintKind.Parameter,
      label: 'distance',
      position: { line: 1, column: 6 },
      tooltip: null,
      retained
    }
    const wrapper = shallowMount(InlayHintUI, {
      props: { controller: { items: [item] } as unknown as InlayHintController }
    })
    const getDecorations = vi.mocked(useDecorations).mock.lastCall![0]
    const decorations = getDecorations()
    expect(decorations[0].range).toEqual({ startLineNumber: 1, startColumn: 6, endLineNumber: 1, endColumn: 7 })
    expect(decorations[0].options.before?.content).toBe('distance:')
    if (retained) expect(decorations[0].options.showIfCollapsed).toBe(true)
    else expect(decorations[0].options).not.toHaveProperty('showIfCollapsed')
    wrapper.unmount()
  })
})
