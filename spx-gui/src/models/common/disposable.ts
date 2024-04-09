/**
 * @file class Disposble
 * @desc Collect disposers & do dispose together
 */

export type Disposer = () => void

export class Disposble {
  _disposers: Disposer[] = []

  addDisposer(disposer: Disposer) {
    this._disposers.push(disposer)
  }

  dispose() {
    const disposers = this._disposers.splice(0)
    for (const disposer of disposers) {
      disposer()
    }
  }
}
