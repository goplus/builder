import '@/polyfills'
import { defineCustomElement } from 'vue'
import { setup, configureApp } from '@/setup'
import xgoCodeEditor from './XGoCodeEditor.ce.vue'

setup()

// Keep the `unstable-` prefix for now because this widget API is still being validated.
// At this stage it mainly exists to prove the embedding flow works and to verify the feature behavior.
// It is not production-ready yet. The remaining work mainly includes:
// 1. Designing the public API surface.
// 2. Generalizing the language server, which is still backed by the SPX language server today.
// 3. Migrating internal subcomponent styles (such as UITextInput) to Tailwind or another packaging-safe approach.
//    See https://github.com/vuejs/core/issues/13495.
// 4. Validating the widget in staging and production environments.
customElements.define(
  'unstable-xgo-code-editor',
  defineCustomElement(xgoCodeEditor, {
    configureApp(app) {
      configureApp(app)
    }
  })
)
