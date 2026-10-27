import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UIImg from './UIImg.vue'

describe('UIImg', () => {
  it('renders CORS images with explicit sizing and a loading overlay', async () => {
    const wrapper = mount(UIImg, { props: { src: 'https://example.com/image.png', loading: true } })
    const image = wrapper.get('img')
    expect(image.attributes('src')).toBe('https://example.com/image.png')
    expect(image.attributes('crossorigin')).toBe('anonymous')
    expect(image.element.style.objectFit).toBe('contain')
    expect(wrapper.get('[role="status"]').element.parentElement?.classList.contains('visible')).toBe(true)

    await wrapper.setProps({ size: 'cover', loading: false })
    expect(image.element.style.objectFit).toBe('cover')
    expect(wrapper.get('[role="status"]').element.parentElement?.classList.contains('invisible')).toBe(true)
    wrapper.unmount()
  })

  it('updates image sources, including local previews, and clears absent images', async () => {
    const wrapper = mount(UIImg, { props: { src: 'https://example.com/missing.png' } })

    for (const src of ['https://example.com/new.png', 'blob:http://localhost/avatar', 'data:image/png;base64,AA==']) {
      await wrapper.setProps({ src })
      expect(wrapper.get('img').attributes('src')).toBe(src)
    }

    await wrapper.setProps({ src: null })
    expect(wrapper.findAll('img')).toHaveLength(0)
    wrapper.unmount()
  })
})
