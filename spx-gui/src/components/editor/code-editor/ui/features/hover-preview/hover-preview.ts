import { editor as IEditor, type IRange, type IDisposable, Emitter } from 'monaco-editor'
import { reactive } from 'vue'
import type { AudioPlayer, DocPreview } from '@/components/editor/code-editor/EditorUI'

export interface HoverPreviewState {
  focused: boolean
  range: IRange
  docs: {
    visible: boolean
    layer: Array<DocPreview>
    position: {
      top: number
      left: number
    }
  }
  audio: {
    visible: boolean
    layer: AudioPlayer | null
    position: {
      top: number
      left: number
    }
  }
}

export class HoverPreview implements IDisposable {
  public editor: IEditor.IStandaloneCodeEditor
  // classic ts type matches error between Browser timer and Node.js timer, god knows why 2024 still has this problem.
  // overview: https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
  // here can use force transformed type.
  // or use `ReturnType<typeof setTimeout>`
  public editorDocumentTimer: ReturnType<typeof setTimeout> | null = null
  public editorAudioTimer: ReturnType<typeof setTimeout> | null = null
  private _onMousemove = new Emitter<IEditor.IMouseTarget>()
  private _onShowDocument = new Emitter<IRange>()
  private _onShowAudioPlayer = new Emitter<IRange>()
  private eventDisposables: Array<() => void> = []
  public onMousemove = this._onMousemove.event
  public onShowDocument = this._onShowDocument.event
  public onAudioPlayer = this._onShowAudioPlayer.event
  public hoverPreviewState: HoverPreviewState = reactive({
    focused: false,
    range: {
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0
    },
    docs: {
      visible: false,
      layer: [],
      position: {
        top: 0,
        left: 0
      }
    },
    audio: {
      visible: false,
      layer: null,
      position: {
        top: 0,
        left: 0
      }
    }
  })

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor

    this.eventDisposables.push(
      this.editor.onMouseMove((e) => {
        this._onMousemove.fire(e.target)
      }).dispose
    )
  }

  public showAudioPlayer(audioPlayer: AudioPlayer, range: IRange) {
    this.hoverPreviewState.audio.layer = audioPlayer
    this._onShowAudioPlayer.fire(range)
  }

  public hideAudioPlayer(immediately: boolean = false) {
    if (immediately) {
      this.hoverPreviewState.audio.visible = false
    } else {
      this.tryToPreventHideAudioPlayer()
      this.editorAudioTimer = setTimeout(() => {
        this.hoverPreviewState.audio.visible = false
      }, 300)
    }
  }

  public tryToPreventHideAudioPlayer() {
    if (this.editorAudioTimer) {
      clearTimeout(this.editorAudioTimer)
      this.editorAudioTimer = null
    }
  }

  public showDocuments(_docPreviews: DocPreview[], range: IRange) {
    if (!_docPreviews.length) return
    if (this.hoverPreviewState.focused) return
    const docPreviews = _docPreviews.filter(
      (docPreview) => Boolean(docPreview.content) || Boolean(docPreview.header)
    )
    this.hoverPreviewState.docs.layer = docPreviews
      .sort((a, b) => b.level - a.level)
      .map((docPreview) => ({
        level: docPreview.level,
        header: docPreview.header,
        content: docPreview.content,
        moreActions: docPreview.moreActions,
        recommendAction: docPreview.recommendAction
      }))
    this._onShowDocument.fire(range)
  }

  public hideDocument(immediately: boolean = false) {
    if (immediately) {
      this.hoverPreviewState.docs.visible = false
    } else {
      this.tryToPreventHideDocument()
      this.editorDocumentTimer = setTimeout(() => {
        this.hoverPreviewState.docs.visible = false
      }, 300)
    }
  }

  public tryToPreventHideDocument() {
    if (this.editorDocumentTimer) {
      clearTimeout(this.editorDocumentTimer)
      this.editorDocumentTimer = null
    }
  }

  dispose() {
    this._onMousemove.dispose()
    this._onShowDocument.dispose()
    this._onShowAudioPlayer.dispose()
    this.eventDisposables.forEach((dispose) => dispose())
  }
}
