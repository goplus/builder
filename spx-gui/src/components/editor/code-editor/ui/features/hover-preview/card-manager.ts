import { Disposable } from '@/utils/disposable'
import DocumentPreviewComponent from './DocumentPreview.vue'
import { type CSSProperties, h, render } from 'vue'

export class CardManager extends Disposable {
  cardContainer = new CardContainer()

  constructor() {
    super()
    this.addDisposer(() => this.cardContainer.dispose())
  }

  renderDocument(content: string, style?: CSSProperties, onMouseenter?: () => void) {
    const close = () => render(null, this.cardContainer.containerElement)
    const vNode = h(DocumentPreviewComponent, {
      content,
      style: {
        ...style,
        position: 'absolute'
      },
      onClose() {
        close()
      },
      onMouseenter
    })
    render(vNode, this.cardContainer.containerElement)

    return {
      close
    }
  }
}

class CardContainer extends Disposable {
  containerElement = document.createElement('div')
  constructor() {
    super()
    document.body.appendChild(this.containerElement)
    this.initStyle()
    this.addDisposer(() => this.containerElement.remove())
  }

  initStyle() {
    this.containerElement.style.cssText = `
      position: fixed;
      inset: 0;
      width: 0;
      height: 0;
      z-index: 9999;
    `
  }

  addCard() {}
}
