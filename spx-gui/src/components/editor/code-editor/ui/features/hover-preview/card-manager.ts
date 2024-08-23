import { Disposable } from '@/utils/disposable'
import DocumentPreviewComponent from './DocumentPreview.vue'
import { type AppContext, type CSSProperties, h, render } from 'vue'
import type { DocPreview } from '@/components/editor/code-editor/EditorUI'

export class CardManager extends Disposable {
  cardContainer = new CardContainer()
  private readonly appContext: AppContext
  private zIndex = 1

  constructor(appContext: AppContext) {
    super()
    this.addDisposer(() => this.cardContainer.dispose())
    this.appContext = appContext
  }

  renderDocument(
    docPreview: DocPreview,
    style?: CSSProperties,
    events?: Partial<{
      onMouseenter: () => void
    }>
  ) {
    const cardContainer = document.createElement('div')
    cardContainer.style.position = 'relative'
    cardContainer.style.zIndex = String(this.zIndex++)
    const close = () => {
      render(null, cardContainer)
      cardContainer.remove()
    }
    const vNode = h(DocumentPreviewComponent, {
      content: docPreview.content,
      moreActions: docPreview.moreActions,
      recommendAction: docPreview.recommendAction,
      style: { ...style, position: 'absolute' },
      onClose: () => close(),
      ...events
    })

    vNode.appContext = this.appContext

    render(vNode, cardContainer)
    this.cardContainer.addCard(cardContainer)

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

  // may there has better ways to avoid `body > div.container > div.useless > article.document-preview`
  // it should like this `body > div.container > article.document-preview`
  addCard(cardElement: HTMLElement) {
    this.containerElement.appendChild(cardElement)
  }
}
