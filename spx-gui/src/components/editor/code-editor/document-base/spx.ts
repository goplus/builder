import type { LocaleMessage } from '@/utils/i18n'
import {
  DefinitionKind,
  type DefinitionDocumentationItem,
  makeBasicMarkdownString,
  categories,
  type DefinitionDocumentationCategory
} from '../common'

const packageSpx = 'github.com/goplus/spx'

export const clone: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.clone'
  },
  insertText: 'clone',
  overview: 'clone',
  detail: makeBasicMarkdownString({
    en: 'Make a clone of current sprite, with optional data (for `onCloned` callback)',
    zh: '复制当前精灵，可传递数据给 `onCloned` 回调'
  })
}

export const onCloned: DefinitionDocumentationItem = {
  categories: [categories.event.sprite],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onCloned'
  },
  insertText: 'onCloned => {\n\t${1}\n}',
  overview: 'onCloned => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite cloned',
    zh: '当前精灵被复制时执行'
  })
}

export const onTouchStart0: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '0'
  },
  insertText: 'onTouchStart => {\n\t${1}\n}',
  overview: 'onTouchStart => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by any other sprites',
    zh: '当前精灵与其他任意精灵开始接触时执行'
  })
}

export const onTouchStart1: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '1'
  },
  insertText: 'onTouchStart sprite => {\n\t${1}\n}',
  overview: 'onTouchStart sprite => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by any other sprites (and get the sprite)',
    zh: '当前精灵与其他精灵开始接触时执行（并获得精灵信息）'
  })
}

export const onTouchStart2: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '2'
  },
  insertText: 'onTouchStart ${1:name}, => {\n\t${2}\n}',
  overview: 'onTouchStart name, => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by sprite of given name',
    zh: '当前精灵与指定名字的精灵开始接触时执行'
  })
}

export const onTouchStart3: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '3'
  },
  insertText: 'onTouchStart ${1:name}, sprite => {\n\t${2}\n}',
  overview: 'onTouchStart name, sprite => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by sprite of given name (and get the sprite)',
    zh: '当前精灵与指定名字的精灵开始接触时执行（并获得精灵信息）'
  })
}

export const onMoving: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onMoving'
  },
  insertText: 'onMoving => {\n\t${1}\n}',
  overview: 'onMoving => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite moving (position change)',
    zh: '当前精灵移动（位置改变）时执行'
  })
}

export const onTurning: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTurning'
  },
  insertText: 'onTurning => {\n\t${1}\n}',
  overview: 'onTurning => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite turning (heading change)',
    zh: '当前精灵转向（朝向改变）时执行'
  })
}

export const die: DefinitionDocumentationItem = {
  categories: [categories.game.sprite],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.die'
  },
  insertText: 'die',
  overview: 'die',
  detail: makeBasicMarkdownString({
    en: 'Let current sprite die. Animation bound to state "die" will be played.',
    zh: '让当前精灵死亡，绑定到“死亡”状态的动画会被播放'
  })
}

export const hide: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.hide'
  },
  insertText: 'hide',
  overview: 'hide',
  detail: makeBasicMarkdownString({
    en: 'Make current sprite invisible',
    zh: '使当前精灵不可见'
  })
}

export const show: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.show'
  },
  insertText: 'show',
  overview: 'show',
  detail: makeBasicMarkdownString({
    en: 'Make current sprite visible',
    zh: '使当前精灵可见'
  })
}

export const visible: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.visible'
  },
  insertText: 'visible',
  overview: 'visible',
  detail: makeBasicMarkdownString({
    en: 'If current sprite visible',
    zh: '当前精灵是否可见'
  })
}

export const costumeName: DefinitionDocumentationItem = {
  categories: [categories.look.costume],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.costumeName'
  },
  insertText: 'costumeName',
  overview: 'costumeName',
  detail: makeBasicMarkdownString({
    en: 'The name of the current costume',
    zh: '当前造型的名称'
  })
}

export const setCostume: DefinitionDocumentationItem = {
  categories: [categories.look.costume],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setCostume'
  },
  insertText: 'setCostume ${1:name}',
  overview: 'setCostume name',
  detail: makeBasicMarkdownString({
    en: 'Set the current costume by specifying name, e.g., `setCostume "happy"`',
    zh: '通过指定名称设置当前造型，如：`setCostume "happy"`'
  })
}

export const animate: DefinitionDocumentationItem = {
  categories: [categories.look.animation],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.animate'
  },
  insertText: 'animate ${1:name}',
  overview: 'animate name',
  detail: makeBasicMarkdownString({
    en: 'Play animation with given name, e.g., `animate "jump"`',
    zh: '通过指定名称播放动画，如：`animate "jump"`'
  })
}

export const say0: DefinitionDocumentationItem = {
  categories: [categories.look.behavior],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.say',
    overloadId: '0'
  },
  insertText: 'say ${1:""}',
  overview: 'say word',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite say some word, e.g., `say "Hello!"`',
    zh: '使精灵说出一些话，如：`say "Hello!"`'
  })
}

export const say1: DefinitionDocumentationItem = {
  categories: [categories.look.behavior],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.say',
    overloadId: '1'
  },
  insertText: 'say ${1:""}, ${2:seconds}',
  overview: 'say word, seconds',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite say some word with duration, e.g., `say "Hello!", 2`',
    zh: '使精灵说出一些话并指定持续时间，如：`say "Hello!", 2`'
  })
}

export const think0: DefinitionDocumentationItem = {
  categories: [categories.look.behavior],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.think',
    overloadId: '0'
  },
  insertText: 'think ${1:""}',
  overview: 'think word',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite think of some word, e.g., `think "Wow!"`',
    zh: '使精灵思考一些内容，如：`think "Wow!"`'
  })
}

export const think1: DefinitionDocumentationItem = {
  categories: [categories.look.behavior],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.think',
    overloadId: '1'
  },
  insertText: 'think ${1:""}, ${2:seconds}',
  overview: 'think word, seconds',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite think of some word with duration, e.g., `think "Wow!", 2`',
    zh: '使精灵思考一些内容并指定持续时间，如：`think "Wow!", 2`'
  })
}

export const distanceTo: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.distanceTo'
  },
  insertText: 'distanceTo(${1:target})',
  overview: 'distanceTo(target)',
  detail: makeBasicMarkdownString({
    en: 'Get the distance from current sprite to given target',
    zh: '获取当前精灵到指定目标的距离'
  })
}

export const move: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.move'
  },
  insertText: 'move ${1:distance}',
  overview: 'move distance',
  detail: makeBasicMarkdownString({
    en: 'Move given distance, toward current heading',
    zh: '向当前朝向移动指定的距离'
  })
}

export const step: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.step'
  },
  insertText: 'step ${1:distance}',
  overview: 'step distance',
  detail: makeBasicMarkdownString({
    en: 'Step given distance, toward current heading. Animation bound to state "step" will be played',
    zh: '向当前朝向行走指定的距离，绑定到“行走”状态的动画会被播放'
  })
}

export const goto: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.goto'
  },
  insertText: 'goto ${1:target}',
  overview: 'goto target',
  detail: makeBasicMarkdownString({
    en: 'Move to given target',
    zh: '移动到指定目标'
  })
}

export const glide0: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.glide',
    overloadId: '0'
  },
  insertText: 'glide ${1:x}, ${2:y}, ${3:seconds}',
  overview: 'glide x, y, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given position (X, Y), with glide animation',
    zh: '滑行到指定位置（X，Y）'
  })
}

export const glide1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.glide',
    overloadId: '1'
  },
  insertText: 'glide(target Sprite, ${1:seconds})',
  overview: 'glide target, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given target, with glide animation',
    zh: '滑行到指定目标'
  })
}

export const setXYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setXYpos'
  },
  insertText: 'setXYpos ${1:x}, ${2:y}',
  overview: 'setXYpos x, y',
  detail: makeBasicMarkdownString({
    en: 'Move to given position, e.g., `setXYpos 100, 100`',
    zh: '移动到指定位置，如：`setXYpos 100, 100`'
  })
}

export const changeXYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeXYpos'
  },
  insertText: 'changeXYpos ${1:dX}, ${2:dY}',
  overview: 'changeXYpos dX, dY',
  detail: makeBasicMarkdownString({
    en: 'Move with given position (X, Y) change, e.g., `changeXYpos 10, 10`',
    zh: '以指定的位置偏移移动（X，Y），如：`changeXYpos 10, 10`'
  })
}

export const xpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.xpos'
  },
  insertText: 'xpos',
  overview: 'xpos',
  detail: makeBasicMarkdownString({
    en: 'Get current X position',
    zh: '获取当前水平位置'
  })
}

export const setXpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setXpos'
  },
  insertText: 'setXpos ${1:x}',
  overview: 'setXpos x',
  detail: makeBasicMarkdownString({
    en: 'Move to given X position, e.g., `setXpos 100`',
    zh: '移动到指定的水平位置，如：`setXpos 100`'
  })
}

export const changeXpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeXpos'
  },
  insertText: 'changeXpos ${1:dX}',
  overview: 'changeXpos dX',
  detail: makeBasicMarkdownString({
    en: 'Move with given X position change, e.g., `changeXpos 10`',
    zh: '以给定的水平位置偏移移动，如：`changeXpos 10`'
  })
}

export const ypos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.ypos'
  },
  insertText: 'ypos',
  overview: 'ypos',
  detail: makeBasicMarkdownString({
    en: 'Get current Y position',
    zh: '获取当前垂直位置'
  })
}

export const setYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setYpos'
  },
  insertText: 'setYpos ${1:y}',
  overview: 'setYpos y',
  detail: makeBasicMarkdownString({
    en: 'Move to given Y position, e.g., `setYpos 100`',
    zh: '移动到指定的垂直位置，如：`setYpos 100`'
  })
}

export const changeYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeYpos'
  },
  insertText: 'changeYpos ${1:dY}',
  overview: 'changeYpos dY',
  detail: makeBasicMarkdownString({
    en: 'Move with given Y position change, e.g., `changeYpos 10`',
    zh: '以给定的垂直位置偏移移动，如：`changeYpos 10`'
  })
}

export const setRotationStyle: DefinitionDocumentationItem = {
  categories: [categories.motion.rotationStyle],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setRotationStyle'
  },
  insertText: 'setRotationStyle ${1:style}',
  overview: 'setRotationStyle style',
  detail: makeBasicMarkdownString({
    en: 'Set the rotation style of the sprite, e.g., `setRotationStyle LeftRight`',
    zh: '设置精灵的旋转方式，如：`setRotationStyle LeftRight`'
  })
}

export const heading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.heading'
  },
  insertText: 'heading',
  overview: 'heading',
  detail: makeBasicMarkdownString({
    en: 'Get current heading direction',
    zh: '获取当前朝向'
  })
}

export const turn: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turn'
  },
  insertText: 'turn ${1:dDirection}',
  overview: 'turn dDirection',
  detail: makeBasicMarkdownString({
    en: 'Turn with given direction change, e.g., `turn Left`',
    zh: '转动给定的角度，如：`turn Left`'
  })
}

export const turnTo0: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '0'
  },
  insertText: 'turnTo ${1:direction}',
  overview: 'turnTo direction',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given direction, e.g., `turnTo Left`',
    zh: '将朝向转到指定方向，如：`turnTo Left`'
  })
}

export const turnTo1: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '1'
  },
  insertText: 'turnTo ${1:target}',
  overview: 'turnTo target',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given target',
    zh: '将朝向转到指定目标'
  })
}

export const setHeading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setHeading'
  },
  insertText: 'setHeading ${1:direction}',
  overview: 'setHeading direction',
  detail: makeBasicMarkdownString({
    en: 'Set heading to given value, e.g., `setHeading Up`',
    zh: '设置朝向为给定值，如：`setHeading Up`'
  })
}

export const changeHeading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeHeading'
  },
  insertText: 'changeHeading ${1:dDirection}',
  overview: 'changeHeading dDirection',
  detail: makeBasicMarkdownString({
    en: 'Change heading with given direction change, e.g., `changeHeading 90`',
    zh: '以给定的角度改变朝向，如：`changeHeading 90`'
  })
}

export const size: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.size'
  },
  insertText: 'size',
  overview: 'size',
  detail: makeBasicMarkdownString({
    en: 'Get the size of current sprite',
    zh: '获取当前精灵的大小'
  })
}

export const setSize: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setSize'
  },
  insertText: 'setSize ${1:size}',
  overview: 'setSize size',
  detail: makeBasicMarkdownString({
    en: 'Set the size of current sprite, e.g., `setSize 2`',
    zh: '设置当前精灵的大小，如：`setSize 2`'
  })
}

export const changeSize: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeSize'
  },
  insertText: 'changeSize ${1:dSize}',
  overview: 'changeSize dSize',
  detail: makeBasicMarkdownString({
    en: 'Change the size of current sprite, e.g., `changeSize 1`',
    zh: '改变当前精灵的大小，如：`changeSize 1`'
  })
}

export const touching: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touching'
  },
  insertText: 'touching(${1:target})',
  overview: 'touching(target)',
  detail: makeBasicMarkdownString({
    en: 'Check if current sprite touching specified target',
    zh: '检查当前精灵是否与指定目标接触'
  })
}

export const bounceOffEdge: DefinitionDocumentationItem = {
  categories: [categories.motion.others],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.bounceOffEdge'
  },
  insertText: 'bounceOffEdge',
  overview: 'bounceOffEdge',
  detail: makeBasicMarkdownString({
    en: 'Check & bounce off current sprite if touching the edge',
    zh: '如果当前精灵接触到边缘，则反弹'
  })
}

export const mouseHitItem: DefinitionDocumentationItem = {
  categories: [categories.sensing.mouse],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.mouseHitItem'
  },
  insertText: 'mouseHitItem',
  overview: 'mouseHitItem',
  detail: makeBasicMarkdownString({
    en: 'Get the topmost sprite which is hit by mouse, e.g., `hitSprite, ok := mouseHitItem`',
    zh: '获取鼠标点击的最上层精灵，如：`hitSprite, ok := mouseHitItem`'
  })
}

export const backdropName: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.backdropName'
  },
  insertText: 'backdropName',
  overview: 'backdropName',
  detail: makeBasicMarkdownString({
    en: 'Get the name of the current backdrop',
    zh: '获取当前背景的名称'
  })
}

export const backdropIndex: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.backdropIndex'
  },
  insertText: 'backdropIndex',
  overview: 'backdropIndex',
  detail: makeBasicMarkdownString({
    en: 'Get the index of the current backdrop',
    zh: '获取当前背景的索引'
  })
}

export const startBackdrop0: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.startBackdrop',
    overloadId: '0'
  },
  insertText: 'startBackdrop ${1:backdrop}',
  overview: 'startBackdrop backdrop',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name or index, e.g., `startBackdrop "backdrop1"`',
    zh: '通过指定名称或索引切换背景，如：`startBackdrop "backdrop1"`'
  })
}

export const startBackdrop1: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.startBackdrop',
    overloadId: '1'
  },
  insertText: 'startBackdrop ${1:backdrop}, ${2:wait}',
  overview: 'startBackdrop backdrop, wait',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name or index, with waiting, e.g., `startBackdrop "backdrop1", true`',
    zh: '通过指定名称或索引切换背景，并等待切换完成，如：`startBackdrop "backdrop1", true`'
  })
}

export const nextBackdrop: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.nextBackdrop'
  },
  insertText: 'nextBackdrop',
  overview: 'nextBackdrop',
  detail: makeBasicMarkdownString({
    en: 'Switch to the next backdrop',
    zh: '切换到下一个背景'
  })
}

export const prevBackdrop: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.prevBackdrop'
  },
  insertText: 'prevBackdrop',
  overview: 'prevBackdrop', // TODO: optional argument `wait`
  detail: makeBasicMarkdownString({
    en: 'Switch to the previous backdrop',
    zh: '切换到上一个背景'
  })
}

export const keyPressed: DefinitionDocumentationItem = {
  categories: [categories.sensing.keyboard],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.keyPressed'
  },
  insertText: 'keyPressed ${1:key}',
  overview: 'keyPressed(key)',
  detail: makeBasicMarkdownString({
    en: 'Check if given key is currently pressed, e.g., `keyPressed(KeyA)`',
    zh: '检查给定的按键当前是否被按下，如：`keyPressed(KeyA)`'
  })
}

export const mouseX: DefinitionDocumentationItem = {
  categories: [categories.sensing.mouse],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.mouseX'
  },
  insertText: 'mouseX',
  overview: 'mouseX',
  detail: makeBasicMarkdownString({
    en: 'Get X position of the mouse',
    zh: '获取鼠标的水平位置'
  })
}

export const mouseY: DefinitionDocumentationItem = {
  categories: [categories.sensing.mouse],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.mouseY'
  },
  insertText: 'mouseY',
  overview: 'mouseY',
  detail: makeBasicMarkdownString({
    en: 'Get Y position of the mouse',
    zh: '获取鼠标的垂直位置'
  })
}

export const mousePressed: DefinitionDocumentationItem = {
  categories: [categories.sensing.mouse],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.mousePressed'
  },
  insertText: 'mousePressed',
  overview: 'mousePressed',
  detail: makeBasicMarkdownString({
    en: 'Check if the mouse is currently pressed',
    zh: '检查鼠标当前是否被按下'
  })
}

export const wait: DefinitionDocumentationItem = {
  categories: [categories.control.time],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.wait'
  },
  insertText: 'wait ${1:seconds}',
  overview: 'wait seconds',
  detail: makeBasicMarkdownString({
    en: 'Block current execution (coroutine) for given seconds, e.g., `wait 0.5`',
    zh: '阻塞当前的执行，并指定阻塞的秒数，如：`wait 0.5`'
  })
}

export const play0: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '0'
  },
  insertText: 'play ${1:sound}',
  overview: 'play sound',
  detail: makeBasicMarkdownString({
    en: 'Play given sound, e.g., `play explosion`',
    zh: '播放指定声音，如：`play explosion`'
  })
}

export const play1: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '1'
  },
  insertText: 'play ${1:sound}, ${2:wait}',
  overview: 'play sound, wait',
  detail: makeBasicMarkdownString({
    en: 'Play given sound with waiting, e.g., `play explosion, true`',
    zh: '播放指定声音并等待播放完成，如：`play explosion, true`'
  })
}

export const play2: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '2'
  },
  insertText: 'play ${1:sound}, ${2:options}',
  overview: 'play sound, options',
  detail: makeBasicMarkdownString({
    en: 'Play given sound with options, e.g., `play explosion, { Loop: true }`',
    zh: '播放指定声音并指定选项，如：`play explosion, { Loop: true }`'
  })
}

export const play3: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '3'
  },
  insertText: 'play ${1:"sound"}',
  overview: 'play soundName',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name, e.g., `play "explosion"`',
    zh: '播放声音（指定名字），如：`play "explosion"`'
  })
}

export const play4: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '4'
  },
  insertText: 'play ${1:"sound"}, ${2:wait}',
  overview: 'play soundName, wait',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name and waiting, e.g., `play "explosion", true`',
    zh: '播放声音（指定名字）并等待播放完成，如：`play "explosion", true`'
  })
}

export const play5: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '5'
  },
  insertText: 'play ${1:"sound"}, ${2:options}',
  overview: 'play soundName, options',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name and options, e.g., `play "explosion", { Loop: true }`',
    zh: '播放声音（指定名字）并指定选项，如：`play "explosion", { Loop: true }`'
  })
}

export const stopAllSounds: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.stopAllSounds'
  },
  insertText: 'stopAllSounds',
  overview: 'stopAllSounds',
  detail: makeBasicMarkdownString({
    en: 'Stop all playing sounds',
    zh: '停止所有正在播放的声音'
  })
}

export const volume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.volume'
  },
  insertText: 'volume',
  overview: 'volume',
  detail: makeBasicMarkdownString({
    en: 'Get the volume for sounds',
    zh: '获取声音的音量'
  })
}

export const setVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setVolume'
  },
  insertText: 'setVolume ${1:volume}',
  overview: 'setVolume volume',
  detail: makeBasicMarkdownString({
    en: 'Set the volume for sounds, e.g., `setVolume 100`',
    zh: '设置声音的音量，如：`setVolume 100`'
  })
}

export const changeVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.changeVolume'
  },
  insertText: 'changeVolume ${1:dVolume}',
  overview: 'changeVolume dVolume',
  detail: makeBasicMarkdownString({
    en: 'Change the volume for sounds with given volume change, e.g., `changeVolume 10`',
    zh: '根据给定的音量变化改变声音的音量，如：`changeVolume 10`'
  })
}

export const broadcast0: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.broadcast',
    overloadId: '0'
  },
  insertText: 'broadcast ${1:"message"}',
  overview: 'broadcast message',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message, e.g., `broadcast "message"`',
    zh: '广播一条消息，如：`broadcast "message"`'
  })
}

export const broadcast1: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.broadcast',
    overloadId: '1'
  },
  insertText: 'broadcast ${1:"message"}, ${2:wait}',
  overview: 'broadcast message, wait',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message with waiting, e.g., `broadcast "message", true`',
    zh: '广播一条消息并等待，如：`broadcast "message", true`'
  })
}

export const broadcast2: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.broadcast',
    overloadId: '2'
  },
  insertText: 'broadcast ${1:"message"}, ${2:data}, ${3:wait}',
  overview: 'broadcast message, data, wait',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message with data and waiting, e.g., `broadcast "message", data, true`',
    zh: '广播一条消息（带有数据）并等待，如：`broadcast "message", data, true`'
  })
}

export const gameOnStart: DefinitionDocumentationItem = {
  categories: [categories.event.game],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onStart'
  },
  insertText: 'onStart => {\n\t${1}\n}',
  overview: 'onStart => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to game start',
    zh: '游戏开始时执行'
  })
}

export const spriteOnStart: DefinitionDocumentationItem = {
  ...gameOnStart,
  definition: {
    package: packageSpx,
    name: 'Sprite.onStart'
  }
}

export const gameOnClick: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onClick'
  },
  insertText: 'onClick => {\n\t${1}\n}',
  overview: 'onClick => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to stage clicked',
    zh: '舞台被鼠标点击时执行'
  })
}

export const spriteOnClick: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onClick'
  },
  insertText: 'onClick => {\n\t${1}\n}',
  overview: 'onClick => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite clicked',
    zh: '当前精灵被点击时执行'
  })
}

export const onAnyKey: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onAnyKey'
  },
  insertText: 'onAnyKey key => {\n\t${1}\n}',
  overview: 'onAnyKey key => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to any key pressed',
    zh: '任意按键被按下时执行'
  })
}

export const gameOnKey0: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onKey',
    overloadId: '0'
  },
  insertText: 'onKey ${1:key}, => {\n\t${2}\n}',
  overview: 'onKey key, => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to given key pressed',
    zh: '指定按键被按下时执行'
  })
}

export const gameOnKey1: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onKey',
    overloadId: '1'
  },
  insertText: 'onKey [${1:}], key => {\n\t${2}\n}',
  overview: 'onKey keys, key => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to given keys pressed (and get the key)',
    zh: '指定多个按键，任一被按下时执行（并获得按键信息）'
  })
}

export const gameOnKey2: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onKey',
    overloadId: '2'
  },
  insertText: 'onKey [${1:}], => {\n\t${2}\n}',
  overview: 'onKey keys, => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to given keys pressed',
    zh: '指定多个按键，任一被按下时执行'
  })
}

export const spriteOnKey0: DefinitionDocumentationItem = {
  ...gameOnKey0,
  definition: {
    package: packageSpx,
    name: 'Sprite.onKey',
    overloadId: '0'
  }
}

export const spriteOnKey1: DefinitionDocumentationItem = {
  ...gameOnKey1,
  definition: {
    package: packageSpx,
    name: 'Sprite.onKey',
    overloadId: '1'
  }
}

export const spriteOnKey2: DefinitionDocumentationItem = {
  ...gameOnKey2,
  definition: {
    package: packageSpx,
    name: 'Sprite.onKey',
    overloadId: '2'
  }
}

export const gameOnMsg0: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onMsg',
    overloadId: '0'
  },
  insertText: 'onMsg (message, data) => {\n\t${1}\n}',
  overview: 'onMsg (message, data) => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to any message broadcasted, get the broadcasted message and data',
    zh: '任意消息被广播时执行，并获取被广播的消息和数据'
  })
}

export const gameOnMsg1: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onMsg',
    overloadId: '1'
  },
  insertText: 'onMsg ${1:message}, => {\n\t${2}\n}',
  overview: 'onMsg message, => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to specific message broadcasted',
    zh: '指定消息被广播时执行'
  })
}

export const spriteOnMsg0: DefinitionDocumentationItem = {
  ...gameOnMsg0,
  definition: {
    package: packageSpx,
    name: 'Sprite.onMsg',
    overloadId: '0'
  }
}

export const spriteOnMsg1: DefinitionDocumentationItem = {
  ...gameOnMsg1,
  definition: {
    package: packageSpx,
    name: 'Sprite.onMsg',
    overloadId: '1'
  }
}

export const onBackdrop0: DefinitionDocumentationItem = {
  categories: [categories.event.stage],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onBackdrop',
    overloadId: '0'
  },
  insertText: 'onBackdrop backdrop => {\n\t${1}\n}',
  overview: 'onBackdrop backdrop => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to backdrop switching',
    zh: '背景切换时执行'
  })
}

export const onBackdrop1: DefinitionDocumentationItem = {
  categories: [categories.event.stage],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onBackdrop',
    overloadId: '1'
  },
  insertText: 'onBackdrop ${1:backdrop}, => {\n\t${2}\n}',
  overview: 'onBackdrop backdrop, => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to switching to specific backdrop',
    zh: '切换到指定背景时执行'
  })
}

export const rand: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.rand'
  },
  insertText: 'rand(${1:from}, ${2:to})',
  overview: 'rand(from, to)',
  detail: makeBasicMarkdownString({
    en: 'Generate a random number, e.g., `rand(1, 10)`',
    zh: '生成一个随机数，如：`rand(1, 10)`'
  })
}

export const exit: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.exit'
  },
  insertText: 'exit',
  overview: 'exit',
  detail: makeBasicMarkdownString({
    en: 'Exit the game',
    zh: '退出游戏'
  })
}

export const getWidget: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.getWidget'
  },
  insertText: 'getWidget(${1:Monitor}, ${2:name})',
  overview: 'getWidget(type, name)',
  detail: makeBasicMarkdownString({
    en: 'Get the widget by given name',
    zh: '通过指定名称获取控件'
  })
}

// TODO: definition for widget methods

function defineConst(
  name: string,
  categories: DefinitionDocumentationCategory[],
  desc: LocaleMessage
): DefinitionDocumentationItem {
  return {
    categories,
    kind: DefinitionKind.Constant,
    definition: {
      package: packageSpx,
      name
    },
    insertText: name,
    overview: name,
    detail: makeBasicMarkdownString(desc)
  }
}

export const prev = defineConst('Prev', [], { en: 'Previous item', zh: '上一项' })
export const next = defineConst('Next', [], { en: 'Next item', zh: '下一项' })

export const up = defineConst('Up', [categories.motion.heading], { en: 'Up direction', zh: '上' })
export const down = defineConst('Down', [categories.motion.heading], { en: 'Down direction', zh: '下' })
export const left = defineConst('Left', [categories.motion.heading], { en: 'Left direction', zh: '左' })
export const right = defineConst('Right', [categories.motion.heading], { en: 'Right direction', zh: '右' })

export const none = defineConst('None', [categories.motion.rotationStyle], { en: "Don't Rotate", zh: '不旋转' })
export const leftRight = defineConst('LeftRight', [categories.motion.rotationStyle], {
  en: 'Left-Right',
  zh: '左右翻转'
})
export const normal = defineConst('Normal', [categories.motion.rotationStyle], { en: 'Normal', zh: '正常旋转' })

export const mouse = defineConst('Mouse', [categories.sensing.mouse], { en: 'Mouse', zh: '鼠标' })
export const edge = defineConst('Edge', [categories.sensing.distance], { en: 'Any edge', zh: '任一边缘' })
export const edgeLeft = defineConst('EdgeLeft', [categories.sensing.distance], { en: 'Left edge', zh: '左边缘' })
export const edgeTop = defineConst('EdgeTop', [categories.sensing.distance], { en: 'Top edge', zh: '上边缘' })
export const edgeRight = defineConst('EdgeRight', [categories.sensing.distance], { en: 'Right edge', zh: '右边缘' })
export const edgeBottom = defineConst('EdgeBottom', [categories.sensing.distance], { en: 'Bottom edge', zh: '下边缘' })

// TODO: There are too many key constants, should we exclude them in APIReference?
// export const keys = (
//   [
//     ['Key0', { en: 'Key 0', zh: '按键 0' }],
//     ['Key1', { en: 'Key 1', zh: '按键 1' }],
//     ['Key2', { en: 'Key 2', zh: '按键 2' }],
//     ['Key3', { en: 'Key 3', zh: '按键 3' }],
//     ['Key4', { en: 'Key 4', zh: '按键 4' }],
//     ['Key5', { en: 'Key 5', zh: '按键 5' }],
//     ['Key6', { en: 'Key 6', zh: '按键 6' }],
//     ['Key7', { en: 'Key 7', zh: '按键 7' }],
//     ['Key8', { en: 'Key 8', zh: '按键 8' }],
//     ['Key9', { en: 'Key 9', zh: '按键 9' }],
//     ['KeyA', { en: 'Key A', zh: '按键 A' }],
//     ['KeyB', { en: 'Key B', zh: '按键 B' }],
//     ['KeyC', { en: 'Key C', zh: '按键 C' }],
//     ['KeyD', { en: 'Key D', zh: '按键 D' }],
//     ['KeyE', { en: 'Key E', zh: '按键 E' }],
//     ['KeyF', { en: 'Key F', zh: '按键 F' }],
//     ['KeyG', { en: 'Key G', zh: '按键 G' }],
//     ['KeyH', { en: 'Key H', zh: '按键 H' }],
//     ['KeyI', { en: 'Key I', zh: '按键 I' }],
//     ['KeyJ', { en: 'Key J', zh: '按键 J' }],
//     ['KeyK', { en: 'Key K', zh: '按键 K' }],
//     ['KeyL', { en: 'Key L', zh: '按键 L' }],
//     ['KeyM', { en: 'Key M', zh: '按键 M' }],
//     ['KeyN', { en: 'Key N', zh: '按键 N' }],
//     ['KeyO', { en: 'Key O', zh: '按键 O' }],
//     ['KeyP', { en: 'Key P', zh: '按键 P' }],
//     ['KeyQ', { en: 'Key Q', zh: '按键 Q' }],
//     ['KeyR', { en: 'Key R', zh: '按键 R' }],
//     ['KeyS', { en: 'Key S', zh: '按键 S' }],
//     ['KeyT', { en: 'Key T', zh: '按键 T' }],
//     ['KeyU', { en: 'Key U', zh: '按键 U' }],
//     ['KeyV', { en: 'Key V', zh: '按键 V' }],
//     ['KeyW', { en: 'Key W', zh: '按键 W' }],
//     ['KeyX', { en: 'Key X', zh: '按键 X' }],
//     ['KeyY', { en: 'Key Y', zh: '按键 Y' }],
//     ['KeyZ', { en: 'Key Z', zh: '按键 Z' }],
//     ['KeyApostrophe', { en: 'Key Apostrophe', zh: '按键 Apostrophe' }],
//     ['KeyBackslash', { en: 'Key Backslash', zh: '按键 Backslash' }],
//     ['KeyBackspace', { en: 'Key Backspace', zh: '按键 Backspace' }],
//     ['KeyCapsLock', { en: 'Key Caps Lock', zh: '按键 Caps Lock' }],
//     ['KeyComma', { en: 'Key Comma', zh: '按键 Comma' }],
//     ['KeyDelete', { en: 'Key Delete', zh: '按键 Delete' }],
//     ['KeyDown', { en: 'Key Down', zh: '按键 Down' }],
//     ['KeyEnd', { en: 'Key End', zh: '按键 End' }],
//     ['KeyEnter', { en: 'Key Enter', zh: '按键 Enter' }],
//     ['KeyEqual', { en: 'Key Equal', zh: '按键 Equal' }],
//     ['KeyEscape', { en: 'Key Escape', zh: '按键 Escape' }],
//     ['KeyF1', { en: 'Key F1', zh: '按键 F1' }],
//     ['KeyF2', { en: 'Key F2', zh: '按键 F2' }],
//     ['KeyF3', { en: 'Key F3', zh: '按键 F3' }],
//     ['KeyF4', { en: 'Key F4', zh: '按键 F4' }],
//     ['KeyF5', { en: 'Key F5', zh: '按键 F5' }],
//     ['KeyF6', { en: 'Key F6', zh: '按键 F6' }],
//     ['KeyF7', { en: 'Key F7', zh: '按键 F7' }],
//     ['KeyF8', { en: 'Key F8', zh: '按键 F8' }],
//     ['KeyF9', { en: 'Key F9', zh: '按键 F9' }],
//     ['KeyF10', { en: 'Key F10', zh: '按键 F10' }],
//     ['KeyF11', { en: 'Key F11', zh: '按键 F11' }],
//     ['KeyF12', { en: 'Key F12', zh: '按键 F12' }],
//     ['KeyGraveAccent', { en: 'Key Grave Accent', zh: '按键 Grave Accent' }],
//     ['KeyHome', { en: 'Key Home', zh: '按键 Home' }],
//     ['KeyInsert', { en: 'Key Insert', zh: '按键 Insert' }],
//     ['KeyKP0', { en: 'Keypad 0', zh: '按键 0' }],
//     ['KeyKP1', { en: 'Keypad 1', zh: '按键 1' }],
//     ['KeyKP2', { en: 'Keypad 2', zh: '按键 2' }],
//     ['KeyKP3', { en: 'Keypad 3', zh: '按键 3' }],
//     ['KeyKP4', { en: 'Keypad 4', zh: '按键 4' }],
//     ['KeyKP5', { en: 'Keypad 5', zh: '按键 5' }],
//     ['KeyKP6', { en: 'Keypad 6', zh: '按键 6' }],
//     ['KeyKP7', { en: 'Keypad 7', zh: '按键 7' }],
//     ['KeyKP8', { en: 'Keypad 8', zh: '按键 8' }],
//     ['KeyKP9', { en: 'Keypad 9', zh: '按键 9' }],
//     ['KeyKPDecimal', { en: 'Keypad Decimal', zh: '按键 Decimal' }],
//     ['KeyKPDivide', { en: 'Keypad Divide', zh: '按键 Divide' }],
//     ['KeyKPEnter', { en: 'Keypad Enter', zh: '按键 Enter' }],
//     ['KeyKPEqual', { en: 'Keypad Equal', zh: '按键 Equal' }],
//     ['KeyKPMultiply', { en: 'Keypad Multiply', zh: '按键 Multiply' }],
//     ['KeyKPSubtract', { en: 'Keypad Subtract', zh: '按键 Subtract' }],
//     ['KeyLeft', { en: 'Key Left', zh: '按键 Left' }],
//     ['KeyLeftBracket', { en: 'Key Left Bracket', zh: '按键 Left Bracket' }],
//     ['KeyMenu', { en: 'Key Menu', zh: '按键 Menu' }],
//     ['KeyMinus', { en: 'Key Minus', zh: '按键 Minus' }],
//     ['KeyNumLock', { en: 'Key Num Lock', zh: '按键 Num Lock' }],
//     ['KeyPageDown', { en: 'Key Page Down', zh: '按键 Page Down' }],
//     ['KeyPageUp', { en: 'Key Page Up', zh: '按键 Page Up' }],
//     ['KeyPause', { en: 'Key Pause', zh: '按键 Pause' }],
//     ['KeyPeriod', { en: 'Key Period', zh: '按键 Period' }],
//     ['KeyPrintScreen', { en: 'Key Print Screen', zh: '按键 Print Screen' }],
//     ['KeyRight', { en: 'Key Right', zh: '按键 Right' }],
//     ['KeyRightBracket', { en: 'Key Right Bracket', zh: '按键 Right Bracket' }],
//     ['KeyScrollLock', { en: 'Key Scroll Lock', zh: '按键 Scroll Lock' }],
//     ['KeySemicolon', { en: 'Key Semicolon', zh: '按键 Semicolon' }],
//     ['KeySlash', { en: 'Key Slash', zh: '按键 Slash' }],
//     ['KeySpace', { en: 'Key Space', zh: '按键 Space' }],
//     ['KeyTab', { en: 'Key Tab', zh: '按键 Tab' }],
//     ['KeyUp', { en: 'Key Up', zh: '按键 Up' }],
//     ['KeyAlt', { en: 'Key Alt', zh: '按键 Alt' }],
//     ['KeyControl', { en: 'Key Control', zh: '按键 Control' }],
//     ['KeyShift', { en: 'Key Shift', zh: '按键 Shift' }],
//     ['KeyMax', { en: 'Key Max', zh: '按键 Max' }],
//     ['KeyAny', { en: 'Any key', zh: '任意按键' }]
//   ] as const
// ).map(([key, desc]) => defineConst(key, [/** TODO */], desc))

export const playRewind = defineConst('PlayRewind', [], { en: 'Rewind', zh: '倒带' })
export const playContinue = defineConst('PlayContinue', [], { en: 'Continue', zh: '继续' })
export const playPause = defineConst('PlayPause', [], { en: 'Pause', zh: '暂停' })
export const playResume = defineConst('PlayResume', [], { en: 'Resume', zh: '恢复' })
export const playStop = defineConst('PlayStop', [], { en: 'Stop', zh: '停止' })
