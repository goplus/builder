import { defineCustomElement } from 'vue'

import SpxRunner from './SpxRunner.ce.vue'

const tagName = 'xbuilder-spx-runner-prototype'

if (!customElements.get(tagName)) {
  customElements.define(tagName, defineCustomElement(SpxRunner))
}

export { SpxRunner }
