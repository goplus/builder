import { Disposable } from '@/utils/disposable'
import DocumentPreviewComponent from './DocumentPreview.vue'
import { type AppContext, type CSSProperties, h, render } from 'vue'

export class CardManager extends Disposable {
  cardContainer = new CardContainer()

  constructor(appContext: AppContext) {
    super()
    this.addDisposer(() => this.cardContainer.dispose())
    this.appContext = appContext
  }

  private appContext: AppContext
  setAppContext(appContext: AppContext) {
    this.appContext = appContext
  }

  getAppContext() {
    return this.appContext
  }

  renderDocument(content: string, style?: CSSProperties, onMouseenter?: () => void) {
    const cardContainer = document.createElement('div')
    const close = () => {
      render(null, cardContainer)
      cardContainer.remove()
    }
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

    vNode.appContext = this.appContext

    render(vNode, cardContainer)
    this.cardContainer.addCard(cardContainer)

    return {
      close() {}
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

  addCard(cardElement: HTMLElement) {
    this.containerElement.appendChild(cardElement)
  }
}
