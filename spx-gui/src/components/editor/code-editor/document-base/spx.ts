import {
  DefinitionKind,
  type DefinitionDocumentationItem,
  makeBasicMarkdownString,
  categoryEventGame,
  categoryMotionPosition
} from '../common'

const packageSpx = 'github.com/goplus/spx'

export const onStart: DefinitionDocumentationItem = {
  categories: [categoryEventGame],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'onStart'
  },
  insertText: 'onStart => {\n\t${1}\n}',
  overview: 'func onStart(callback func())',
  detail: makeBasicMarkdownString({ en: 'Listen to game start', zh: '游戏开始时执行' })
}

export const setXYpos: DefinitionDocumentationItem = {
  categories: [categoryMotionPosition],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setXYpos'
  },
  insertText: 'setXYpos ${1:X}, ${2:Y}',
  overview: 'func setXYpos(x, y float64)',
  detail: makeBasicMarkdownString({ en: 'Move to given position', zh: '移动到指定位置' })
}
