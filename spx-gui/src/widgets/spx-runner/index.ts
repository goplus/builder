import '@/polyfills'
import { defineCustomElement } from 'vue'
import { setup, configureApp } from '@/setup'
import spxRunner from './SpxRunner.ce.vue'

setup()

customElements.define(
  'spx-runner',
  defineCustomElement(spxRunner, {
    configureApp(app) {
      configureApp(app, false /* disable router in widget */)
    }
  })
)
