import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TestComponent from './TestComponent.vue'
import { useTag } from '../index'
import { describe, it, expect } from 'vitest'

describe('getElement', async () => {
  mount(TestComponent)
  await nextTick()
  const { getElement } = useTag()

  it('should return null with an empty path', () => {
    const el = getElement('')
    expect(el).toBeNull()
  })

  it('should return correct HTMLElement with a full path', () => {
    const el = getElement('info-box info-header info-title')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(el?.textContent).toContain('Title')
  })

  it('should return null with a full but wrong path', () => {
    const el = getElement('info-box info-header info-title wrong')
    expect(el).toBeNull()
  })

  it('should return correct HTMLElement with a partial path', () => {
    const el = getElement('info-header info-close')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(el?.textContent).toContain('Close')
  })

  it('should return corrent HTMLElement with a cross level path', () => {
    const el = getElement('info-content mark-b')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(el?.textContent).toContain('mark-b')
  })

  it('should return null with a partial but not exit path', () => {
    const el = getElement('info-title wrong')
    expect(el).toBeNull()
  })

  it("should return corrent HTMLElement whit only 'mark-a' path", () => {
    const el = getElement('mark-a')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(el?.textContent).toContain('mark-a')
  })

  it('should return null with only "wrong" but not exit path', () => {
    const el = getElement('wrong')
    expect(el).toBeNull()
  })
})
