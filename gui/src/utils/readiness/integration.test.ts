import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, type PropType } from 'vue'
import { describe, expect, it } from 'vitest'

import {
  createReadinessScope,
  ReadinessProvider,
  useProvideReadiness,
  useRegisterLoading,
  type ReadinessScope
} from './index'

describe('Route readiness', () => {
  it('lets global consumers wait for the page subtree without including global UI', async () => {
    const page = createReadinessScope()
    let observed!: ReadinessScope
    let playground!: ReadinessScope
    const pageLoading = ref(true)
    const playgroundLoading = ref(false)
    const GlobalConsumer = defineComponent({
      props: { readiness: { type: Object as PropType<ReadinessScope>, required: true } },
      setup(props) {
        observed = props.readiness
        useRegisterLoading(ref(true))
        return () => h('aside', 'global UI')
      }
    })
    const PlaygroundContent = defineComponent({
      setup() {
        useRegisterLoading(playgroundLoading)
        return () => h('span', 'Playground')
      }
    })
    const Playground = defineComponent({
      setup() {
        playground = useProvideReadiness()
        return () => h(PlaygroundContent)
      }
    })
    const Page = defineComponent({
      setup() {
        useRegisterLoading(pageLoading)
        return () => h(Playground)
      }
    })
    const App = defineComponent({
      render: () =>
        h('main', [h(GlobalConsumer, { readiness: page }), h(ReadinessProvider, { scope: page }, () => h(Page))])
    })
    const wrapper = mount(App)
    try {
      expect(observed).toBe(page)
      await playground.untilReady()
      expect(playground.ready.value).toBe(true)
      expect(page.ready.value).toBe(false)
      pageLoading.value = false
      await observed.untilReady()
      expect(page.ready.value).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('waits for the cover at the page boundary while Host capabilities become ready independently', async () => {
    const page = createReadinessScope()
    let host!: ReadinessScope
    const hostLoading = ref(true)
    const covered = ref(true)
    const HostContent = defineComponent({
      setup() {
        useRegisterLoading(hostLoading)
        return () => h('span', hostLoading.value ? 'loading' : 'ready')
      }
    })
    const Playground = defineComponent({
      setup() {
        host = useProvideReadiness()
        useRegisterLoading(covered)
        return () => h('main', [h(HostContent), covered.value ? h('div', 'cover') : null])
      }
    })
    const wrapper = mount(ReadinessProvider, { props: { scope: page }, slots: { default: Playground } })
    try {
      hostLoading.value = false
      await host.untilReady()
      expect(host.ready.value).toBe(true)
      expect(page.ready.value).toBe(false)
      expect(wrapper.text()).toBe('readycover')
      covered.value = false
      await page.untilReady()
      expect(page.ready.value).toBe(true)
      expect(wrapper.text()).toBe('ready')
    } finally {
      wrapper.unmount()
    }
  })
})
