import { Emitter, type IDisposable } from 'monaco-editor'

export type DocDetail = string

export class DocumentViewer implements IDisposable {
  private _onShowDocDetail = new Emitter<DocDetail>()
  public onShowDocDetail = this._onShowDocDetail.event

  constructor() {}

  public invokeDocumentDetail(docDetail: DocDetail) {
    this._onShowDocDetail.fire(docDetail)
  }

  dispose() {
    this._onShowDocDetail.dispose()
  }
}
