import { defineCustomElement } from 'vue'

import XGoCodeEditor from './XGoCodeEditor.ce.vue'

const tagName = 'xbuilder-xgo-code-editor-prototype'

if (!customElements.get(tagName)) {
  customElements.define(tagName, defineCustomElement(XGoCodeEditor))
}

export { XGoCodeEditor }
