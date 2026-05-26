import { mount } from '@vue/test-utils'
import { createCommentVNode, defineComponent, Fragment, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveTriggerElement } from './trigger'

describe('resolveTriggerElement', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('throws for component roots that start with a comment anchor', () => {
    const Trigger = defineComponent({
      render() {
        return h(Fragment, [createCommentVNode('leading template comment'), h('button', { 'data-test-id': 'trigger' })])
      }
    })
    const wrapper = mount(Trigger, { attachTo: document.body })

    expect(() => resolveTriggerElement(wrapper.vm)).toThrow(
      'Popup trigger component must render exactly one element root'
    )
  })

  it('throws for text-only component roots', () => {
    const Trigger = defineComponent({
      render() {
        return 'Text trigger'
      }
    })
    const wrapper = mount(Trigger, { attachTo: document.body })

    expect(() => resolveTriggerElement(wrapper.vm)).toThrow(
      'Popup trigger component must render exactly one element root'
    )
  })

  it('resolves SVG component roots directly as trigger elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    expect(resolveTriggerElement({ $el: svg })).toBe(svg)
  })

  it('throws for non-element component roots', () => {
    const documentFragment = document.createDocumentFragment()
    const trigger = document.createElement('button')

    documentFragment.append(trigger)

    expect(() => resolveTriggerElement({ $el: documentFragment })).toThrow(
      'Popup trigger component must render exactly one element root'
    )
  })
})
