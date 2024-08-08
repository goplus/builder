/**
 * @file class Disposble
 * @desc Collect disposers & do dispose together
 */

export type Disposer = () => void

export class Disposable {
  _disposers: Disposer[] = []

  addDisposer = (disposer: Disposer) => {
    this._disposers.push(disposer)
  }

  dispose = () => {
    while (this._disposers.length > 0) {
      this._disposers.pop()?.()
    }
  }
}
