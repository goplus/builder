import { packageSpx } from '@/utils/spx'
import { DefinitionKind, type DefinitionDocumentationItem, makeBasicMarkdownString, categories } from '../../common'
import { defineConst } from './common'

export const clone0: DefinitionDocumentationItem = {
  categories: [categories.game.sprite],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.clone',
    overloadId: '0'
  },
  insertText: 'clone',
  overview: 'clone',
  detail: makeBasicMarkdownString({
    en: 'Make a clone of current sprite',
    zh: '复制当前精灵'
  })
}

export const clone1: DefinitionDocumentationItem = {
  categories: [categories.game.sprite],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.clone',
    overloadId: '1'
  },
  insertText: 'clone ${1:data}',
  overview: 'clone data',
  detail: makeBasicMarkdownString({
    en: 'Make a clone of current sprite with given data, e.g., `clone 123` (you can get the data `123` by `onCloned`)',
    zh: '复制当前精灵并传递数据，如：`clone 123`（你可以通过 `onCloned` 获得数据 `123`）'
  })
}

export const onCloned0: DefinitionDocumentationItem = {
  categories: [categories.event.sprite],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onCloned',
    overloadId: '0'
  },
  insertText: 'onCloned data => {\n\t${1}\n}',
  overview: 'onCloned data => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite cloned and get the data, e.g., `onCloned data => { ... }`',
    zh: '当前精灵被复制时执行并获得数据，如：`onCloned data => { ... }`'
  })
}

export const onCloned1: DefinitionDocumentationItem = {
  categories: [categories.event.sprite],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onCloned',
    overloadId: '1'
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
  insertText: 'onTouchStart ${1:spriteName}, => {\n\t${2}\n}',
  overview: 'onTouchStart spriteName, => { ... }',
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
  insertText: 'onTouchStart ${1:spriteName}, sprite => {\n\t${2}\n}',
  overview: 'onTouchStart spriteName, sprite => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by sprite of given name (and get the sprite)',
    zh: '当前精灵与指定名字的精灵开始接触时执行（并获得精灵信息）'
  })
}

export const onMoving0: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onMoving',
    overloadId: '0'
  },
  insertText: 'onMoving info => {\n\t${1}\n}',
  overview: 'onMoving info => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite moving (position change), and get the moving info, e.g., `onMoving info => { ... }`',
    zh: '当前精灵移动（位置改变）时执行，并获得移动信息，如：`onMoving info => { ... }`'
  })
}

export const onMoving1: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onMoving',
    overloadId: '1'
  },
  insertText: 'onMoving => {\n\t${1}\n}',
  overview: 'onMoving => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite moving (position change)',
    zh: '当前精灵移动（位置改变）时执行'
  })
}

export const onTurning0: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTurning',
    overloadId: '0'
  },
  insertText: 'onTurning info => {\n\t${1}\n}',
  overview: 'onTurning info => { ... }',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite turning (heading change), and get the turning info, e.g., `onTurning info => { ... }`',
    zh: '当前精灵转向（朝向改变）时执行，并获得转向信息，如：`onTurning info => { ... }`'
  })
}

export const onTurning1: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTurning',
    overloadId: '1'
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
    name: 'Sprite.setCostume',
    overloadId: '0'
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

export const distanceTo0: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.distanceTo',
    overloadId: '0'
  },
  insertText: 'distanceTo(${1:sprite})',
  overview: 'distanceTo(sprite)',
  detail: makeBasicMarkdownString({
    en: 'Get the distance from current sprite to given sprite',
    zh: '获取当前精灵到指定精灵的距离'
  })
}

export const distanceTo1: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.distanceTo',
    overloadId: '1'
  },
  insertText: 'distanceTo(${1:spriteName})',
  overview: 'distanceTo(spriteName)',
  detail: makeBasicMarkdownString({
    en: 'Get the distance from current sprite to the sprite with given name, e.g., `distanceTo("Enemy")`',
    zh: '获取当前精灵到指定名字的精灵的距离，如：`distanceTo("Enemy")`'
  })
}

export const distanceTo2: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.distanceTo',
    overloadId: '2'
  },
  insertText: 'distanceTo(${1:obj})',
  overview: 'distanceTo(obj)',
  detail: makeBasicMarkdownString({
    en: 'Get the distance from current sprite to given object, e.g., `distanceTo(Mouse)`',
    zh: '获取当前精灵到指定对象的距离，如：`distanceTo(Mouse)`'
  })
}

export const move0: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.move',
    overloadId: '0'
  },
  insertText: 'move ${1:distance}',
  overview: 'move distance',
  detail: makeBasicMarkdownString({
    en: 'Move given distance toward current heading, e.g., `move 10`',
    zh: '向当前朝向移动指定的距离，如：`move 10`'
  })
}

export const move1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.move',
    overloadId: '1'
  },
  insertText: 'move ${1:distance}',
  overview: 'move distance',
  detail: makeBasicMarkdownString({
    en: 'Move given distance toward current heading, e.g., `move 10`',
    zh: '向当前朝向移动指定的距离，如：`move 10`'
  }),
  hiddenFromList: true // duplicate with `move0`
}

export const step0: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.step',
    overloadId: '0'
  },
  insertText: 'step ${1:distance}',
  overview: 'step distance',
  detail: makeBasicMarkdownString({
    en: 'Step given distance toward current heading. Animation bound to state "step" will be played, e.g., `step 10`',
    zh: '向当前朝向行走指定的距离，绑定到“行走”状态的动画会被播放，如：`step 10`'
  })
}

export const step1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.step',
    overloadId: '1'
  },
  insertText: 'step ${1:distance}, ${2:animationName}',
  overview: 'step distance, animationName',
  detail: makeBasicMarkdownString({
    en: 'Step given distance toward current heading and animation with given name will be played, e.g., `step 10, "run"`',
    zh: '向当前朝向行走指定的距离，并播放指定名称的动画，如：`step 10, "run"`'
  })
}

export const step2: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.step',
    overloadId: '2'
  },
  insertText: 'step ${1:distance}',
  overview: 'step distance',
  detail: makeBasicMarkdownString({
    en: 'Step given distance toward current heading. Animation bound to state "step" will be played',
    zh: '向当前朝向行走指定的距离，绑定到“行走”状态的动画会被播放'
  }),
  hiddenFromList: true // duplicate with `step0`
}

export const goto0: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.goto',
    overloadId: '0'
  },
  insertText: 'goto ${1:sprite}',
  overview: 'goto sprite',
  detail: makeBasicMarkdownString({
    en: 'Move to given sprite, e.g., `goto Enemy`',
    zh: '移动到指定精灵，如：`goto Enemy`'
  })
}

export const goto1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.goto',
    overloadId: '1'
  },
  insertText: 'goto ${1:spriteName}',
  overview: 'goto spriteName',
  detail: makeBasicMarkdownString({
    en: 'Move to the sprite with given name, e.g., `goto "Enemy"`',
    zh: '移动到指定名字的精灵，如：`goto "Enemy"`'
  })
}

export const goto2: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.goto',
    overloadId: '2'
  },
  insertText: 'goto ${1:obj}',
  overview: 'goto obj',
  detail: makeBasicMarkdownString({
    en: 'Move to given obj, e.g., `goto Mouse`',
    zh: '移动到指定对象，如：`goto Mouse`'
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
    en: 'Move to given position (X, Y) with glide animation and given duration, e.g., `glide 100, 100, 2`',
    zh: '滑行到指定位置（X，Y）并指定时长，如：`glide 100, 100, 2`'
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
  insertText: 'glide {$1:sprite}, ${2:seconds}',
  overview: 'glide sprite, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given sprite with glide animation and given duration, e.g., `glide Enemy, 2`',
    zh: '滑行到指定精灵并指定时长，如：`glide Enemy, 2`'
  })
}

export const glide2: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.glide',
    overloadId: '2'
  },
  insertText: 'glide ${1:spriteName}, ${2:seconds}',
  overview: 'glide spriteName, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to the sprite with given name with glide animation and given duration, e.g., `glide "Enemy", 2`',
    zh: '滑行到指定名称的精灵并指定时长，如：`glide "Enemy", 2`'
  })
}

export const glide3: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.glide',
    overloadId: '3'
  },
  insertText: 'glide ${1:obj}, ${2:seconds}',
  overview: 'glide obj, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given obj with glide animation and given duration, e.g., `glide Mouse, 2`',
    zh: '滑行到指定对象并指定时长，如：`glide Mouse, 2`'
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
    en: 'Set the sprite\'s position, e.g., `setXYpos 100, 100`',
    zh: '设置精灵位置，如：`setXYpos 100, 100`'
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
    en: 'Change the sprite\'s position, e.g., `changeXYpos 10, 20` changing X position by 10 and Y position by 20',
    zh: '改变精灵位置，如：`changeXYpos 10, 10` 使水平位置增加 10，垂直位置增加 10'
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
    en: 'Set the sprite\'s X position, e.g., `setXpos 100`',
    zh: '设置精灵的水平位置，如：`setXpos 100`'
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
    en: 'Change the sprite\'s X position, e.g., `changeXpos 10` changing X position by 10',
    zh: '改变精灵的水平位置，如：`changeXpos 10` 使水平位置增加 10'
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
    en: 'Set the sprite\'s Y position, e.g., `setYpos 100`',
    zh: '设置精灵的垂直位置，如：`setYpos 100`'
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
    en: 'Change the sprite\'s Y position, e.g., `changeYpos 10` changing Y position by 10',
    zh: '改变精灵的垂直位置，如：`changeYpos 10` 使垂直位置增加 10'
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

export const turn0: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turn',
    overloadId: '0'
  },
  insertText: 'turn ${1:degree}',
  overview: 'turn degree',
  detail: makeBasicMarkdownString({
    en: 'Turn with given degree relative to current heading, e.g., `turn 90`',
    zh: '相对当前朝向转动给定的角度，如：`turn 90`'
  })
}

export const turn1: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turn',
    overloadId: '1'
  },
  insertText: 'turn ${1:direction}',
  overview: 'turn direction',
  detail: makeBasicMarkdownString({
    en: 'Turn with given direction relative to current heading, e.g., `turn Left`',
    zh: '指定相对方向转动，如：`turn Left`'
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
  insertText: 'turnTo ${1:sprite}',
  overview: 'turnTo sprite',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given sprite',
    zh: '将朝向转到指定精灵'
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
  insertText: 'turnTo ${1:spriteName}',
  overview: 'turnTo spriteName',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given sprite by name, e.g., `turnTo "Enemy"`',
    zh: '将朝向转到指定名字的精灵，如：`turnTo "Enemy"`'
  })
}

export const turnTo2: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '2'
  },
  insertText: 'turnTo ${1:degree}',
  overview: 'turnTo degree',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given degree, e.g., `turnTo 90`',
    zh: '将朝向转到指定角度，如：`turnTo 90`'
  })
}

export const turnTo3: DefinitionDocumentationItem = {
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

export const turnTo4: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '4'
  },
  insertText: 'turnTo ${1:obj}',
  overview: 'turnTo obj',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given object, e.g., `turnTo Mouse`',
    zh: '将朝向转到指定对象，如：`turnTo Mouse`'
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

export const touching0: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touching',
    overloadId: '0'
  },
  insertText: 'touching(${1:spriteName})',
  overview: 'touching(spriteName)',
  detail: makeBasicMarkdownString({
    en: 'Check if current sprite touching sprite with given name',
    zh: '检查当前精灵是否与指定名字的精灵接触'
  })
}

export const touching1: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touching',
    overloadId: '1'
  },
  insertText: 'touching(${1:sprite})',
  overview: 'touching(sprite)',
  detail: makeBasicMarkdownString({
    en: 'Check if current sprite touching given sprite',
    zh: '检查当前精灵是否与指定精灵接触'
  })
}

export const touching2: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touching',
    overloadId: '2'
  },
  insertText: 'touching(${1:obj})',
  overview: 'touching(obj)',
  detail: makeBasicMarkdownString({
    en: 'Check if current sprite touching given object, e.g., `touching(Mouse)`',
    zh: '检查当前精灵是否与指定对象接触，如：`touching(Mouse)`'
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
  insertText: 'startBackdrop ${1:backdropName}',
  overview: 'startBackdrop backdropName',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name, e.g., `startBackdrop "backdrop1"`',
    zh: '通过指定名称切换背景，如：`startBackdrop "backdrop1"`'
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
  insertText: 'startBackdrop ${1:backdropName}, ${2:wait}',
  overview: 'startBackdrop backdropName, wait',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name, with waiting, e.g., `startBackdrop "backdrop1", true`',
    zh: '通过指定名称切换背景，并等待切换完成，如：`startBackdrop "backdrop1", true`'
  })
}

export const nextBackdrop: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.nextBackdrop',
    overloadId: '0'
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
    name: 'Game.prevBackdrop',
    overloadId: '0'
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
    en: 'Listen to given key pressed, e.g., `onKey KeyA => { ... }`',
    zh: '指定按键被按下时执行，如：`onKey KeyA => { ... }`'
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
    en: 'Listen to given keys pressed, e.g., `onKey [KeyA, KeyB] => { ... }`',
    zh: '指定多个按键，任一被按下时执行，如：`onKey [KeyA, KeyB] => { ... }`'
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

export const rand0: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'rand',
    overloadId: '0'
  },
  insertText: 'rand(${1:from}, ${2:to})',
  overview: 'rand(from, to)',
  detail: makeBasicMarkdownString({
    en: 'Generate a random integer, e.g., `rand(1, 10)`',
    zh: '生成一个随机整数，如：`rand(1, 10)`'
  })
}

export const rand1: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'rand',
    overloadId: '1'
  },
  insertText: 'rand(${1:from}, ${2:to})',
  overview: 'rand(from, to)',
  detail: makeBasicMarkdownString({
    en: 'Generate a random number, e.g., `rand(1.5, 9.9)`',
    zh: '生成一个随机数，如：`rand(1.5, 9.9)`'
  })
}

export const exit0: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'exit',
    overloadId: '0'
  },
  insertText: 'exit ${1:code}',
  overview: 'exit code',
  detail: makeBasicMarkdownString({
    en: 'Exit the game with given code',
    zh: '退出游戏并指定退出码'
  }),
  hiddenFromList: true // not recommended to use
}

export const exit1: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'exit',
    overloadId: '1'
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
// TODO: Sprite.goBackLayers|gotoBack|gotoFront

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

export const playRewind = defineConst('PlayRewind', [], { en: 'Rewind', zh: '倒带' })
export const playContinue = defineConst('PlayContinue', [], { en: 'Continue', zh: '继续' })
export const playPause = defineConst('PlayPause', [], { en: 'Pause', zh: '暂停' })
export const playResume = defineConst('PlayResume', [], { en: 'Resume', zh: '恢复' })
export const playStop = defineConst('PlayStop', [], { en: 'Stop', zh: '停止' })
