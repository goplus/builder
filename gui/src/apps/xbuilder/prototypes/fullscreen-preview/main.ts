import '@/polyfills'
import '@/app.css'
import { createApp, h } from 'vue'
import { UIConfigProvider, UIMessageProvider } from '@/components/ui'
import { configureXBuilderApp, setupXBuilder } from '../../setup'
import FullscreenPreviewDemo from './FullscreenPreviewDemo.vue'

setupXBuilder()
const app = createApp({
  render: () => h(UIConfigProvider, null, () => h(UIMessageProvider, null, () => h(FullscreenPreviewDemo)))
})
configureXBuilderApp(app)
app.mount('#app')
