import '@/polyfills'
import { defineCustomElement } from 'vue'
import { setupXBuilder, configureXBuilderApp } from '../../setup'
import spxRunner from './SpxRunner.ce.vue'

setupXBuilder()

customElements.define(
  'spx-runner',
  defineCustomElement(spxRunner, {
    configureApp(app) {
      configureXBuilderApp(app)
    }
  })
)
