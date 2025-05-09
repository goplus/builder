import { packageSpx } from '@/utils/spx'
import { DefinitionKind, type DefinitionDocumentationItem, makeBasicMarkdownString, categories } from '../../common'
import { defineConst } from './common'

export const sprite: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Type,
  definition: {
    package: packageSpx,
    name: 'Sprite'
  },
  insertSnippet: 'Sprite',
  overview: 'Sprite',
  detail: makeBasicMarkdownString({
    en: 'Type for sprite',
    zh: '精灵类型'
  })
}

export const clone0: DefinitionDocumentationItem = {
  categories: [categories.game.sprite],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.clone',
    overloadId: '0'
  },
  insertSnippet: 'clone',
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
  insertSnippet: 'clone ${1:1}',
  insertSnippetParameterHints: ['data'],
  overview: 'clone data',
  detail: makeBasicMarkdownString({
    en: 'Make a clone of current sprite with given data',
    zh: '复制当前精灵并传递数据'
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
  insertSnippet: 'onCloned data => {\n\t$0\n}',
  overview: 'onCloned data => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite cloned, optionally receiving data',
    zh: '当前精灵被复制时执行，并可选地接收数据'
  })
}

export const onCloned1: DefinitionDocumentationItem = {
  ...onCloned0,
  hiddenFromList: true, // duplicate with `onCloned0`
  definition: {
    package: packageSpx,
    name: 'Sprite.onCloned',
    overloadId: '1'
  }
}

export const onTouchStart0: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '0'
  },
  insertSnippet: 'onTouchStart sprite => {\n\t$0\n}',
  overview: 'onTouchStart sprite => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by any other sprites, optionally receiving the sprite',
    zh: '当前精灵与其他任意精灵开始接触时执行，并可选地接收精灵信息'
  })
}

export const onTouchStart1: DefinitionDocumentationItem = {
  ...onTouchStart0,
  hiddenFromList: true, // duplicate with `onTouchStart0`
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '1'
  }
}

export const onTouchStart2: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '2'
  },
  insertSnippet: 'onTouchStart ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, sprite => {\n\t$0\n}',
  insertSnippetParameterHints: ['sprite'],
  overview: 'onTouchStart name, sprite => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by sprite of given name, optionally receiving the sprite',
    zh: '当前精灵与指定名字的精灵开始接触时执行，并可选地接收精灵信息'
  })
}

export const onTouchStart3: DefinitionDocumentationItem = {
  ...onTouchStart2,
  hiddenFromList: true, // duplicate with `onTouchStart2
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '3'
  }
}

export const onTouchStart4: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '4'
  },
  insertSnippet: 'onTouchStart ${1:["${BUILDER_OTHER_SPRITE_NAME:S1}"]}, sprite => {\n\t$0\n}',
  insertSnippetParameterHints: ['sprites'],
  overview: 'onTouchStart names, sprite => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite starting to be touched by any sprite of given names, optionally receiving the sprite',
    zh: '当前精灵与任一指定名字的精灵开始接触时执行，并可选地接收精灵信息'
  })
}

export const onTouchStart5: DefinitionDocumentationItem = {
  ...onTouchStart4,
  hiddenFromList: true, // duplicate with `onTouchStart4
  definition: {
    package: packageSpx,
    name: 'Sprite.onTouchStart',
    overloadId: '5'
  }
}

export const onMoving0: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onMoving',
    overloadId: '0'
  },
  insertSnippet: 'onMoving info => {\n\t$0\n}',
  overview: 'onMoving info => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite moving (position change), optionally receiving the moving info',
    zh: '当前精灵移动（位置改变）时执行，并可选地接收移动信息'
  })
}

export const onMoving1: DefinitionDocumentationItem = {
  ...onMoving0,
  hiddenFromList: true, // duplicate with `onMoving0`
  definition: {
    package: packageSpx,
    name: 'Sprite.onMoving',
    overloadId: '1'
  }
}

export const onTurning0: DefinitionDocumentationItem = {
  categories: [categories.event.motion],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Sprite.onTurning',
    overloadId: '0'
  },
  insertSnippet: 'onTurning info => {\n\t$0\n}',
  overview: 'onTurning info => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite turning (heading change), optionally receiving the turning info',
    zh: '当前精灵转向（朝向改变）时执行，并可选地接收转向信息'
  })
}

export const onTurning1: DefinitionDocumentationItem = {
  ...onTurning0,
  hiddenFromList: true, // duplicate with `onTurning0`
  definition: {
    package: packageSpx,
    name: 'Sprite.onTurning',
    overloadId: '1'
  }
}

export const die: DefinitionDocumentationItem = {
  categories: [categories.game.sprite],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.die'
  },
  insertSnippet: 'die',
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
  insertSnippet: 'hide',
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
  insertSnippet: 'show',
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
  insertSnippet: 'visible',
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
  insertSnippet: 'costumeName',
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
  insertSnippet: 'setCostume ${1:"${BUILDER_FIRST_COSTUME_NAME:c1}"}',
  insertSnippetParameterHints: ['costume'],
  overview: 'setCostume name',
  detail: makeBasicMarkdownString({
    en: 'Set the current costume by specifying name',
    zh: '通过指定名称设置当前造型'
  })
}

export const animate: DefinitionDocumentationItem = {
  categories: [categories.look.animation],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.animate'
  },
  insertSnippet: 'animate ${1:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['animation'],
  overview: 'animate name',
  detail: makeBasicMarkdownString({
    en: 'Play animation with given name',
    zh: '通过指定名称播放动画'
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
  insertSnippet: 'say ${1:""}',
  insertSnippetParameterHints: ['word'],
  overview: 'say word',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite say some word',
    zh: '使精灵说出一些话'
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
  insertSnippet: 'say ${1:""}, ${2:1}',
  insertSnippetParameterHints: ['word', 'seconds'],
  overview: 'say word, seconds',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite say some word with duration',
    zh: '使精灵说出一些话并指定持续时间'
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
  insertSnippet: 'think ${1:""}',
  insertSnippetParameterHints: ['word'],
  overview: 'think word',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite think of some word',
    zh: '使精灵思考一些内容'
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
  insertSnippet: 'think ${1:""}, ${2:1}',
  insertSnippetParameterHints: ['word', 'seconds'],
  overview: 'think word, seconds',
  detail: makeBasicMarkdownString({
    en: 'Make the sprite think of some word with duration',
    zh: '使精灵思考一些内容并指定持续时间'
  })
}

export const distanceTo0: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  hiddenFromList: true, // similar to `distanceTo1`, but `distanceTo1` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.distanceTo',
    overloadId: '0'
  },
  insertSnippet: 'distanceTo(${1:${BUILDER_OTHER_SPRITE_NAME:S1}})',
  insertSnippetParameterHints: ['sprite'],
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
  insertSnippet: 'distanceTo(${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"})',
  insertSnippetParameterHints: ['sprite'],
  overview: 'distanceTo(name)',
  detail: makeBasicMarkdownString({
    en: 'Get the distance from current sprite to the sprite with given name',
    zh: '获取当前精灵到指定名字的精灵的距离'
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
  insertSnippet: 'distanceTo(${1:Mouse})',
  insertSnippetParameterHints: ['object'],
  overview: 'distanceTo(obj)',
  detail: makeBasicMarkdownString({
    en: 'Get the distance from current sprite to given object',
    zh: '获取当前精灵到指定对象的距离'
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
  insertSnippet: 'move ${1:100}',
  insertSnippetParameterHints: ['distance'],
  overview: 'move distance',
  detail: makeBasicMarkdownString({
    en: 'Move given distance toward current heading',
    zh: '向当前朝向移动指定的距离'
  }),
  hiddenFromList: true // not recommended to use
}

export const move1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.move',
    overloadId: '1'
  },
  insertSnippet: 'move ${1:100}',
  insertSnippetParameterHints: ['distance'],
  overview: 'move distance',
  detail: makeBasicMarkdownString({
    en: 'Move given distance toward current heading',
    zh: '向当前朝向移动指定的距离'
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
  insertSnippet: 'step ${1:100}',
  insertSnippetParameterHints: ['distance'],
  overview: 'step distance',
  detail: makeBasicMarkdownString({
    en: 'Step given distance toward current heading. Animation bound to state "step" will be played',
    zh: '向当前朝向行走指定的距离，绑定到“行走”状态的动画会被播放'
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
  insertSnippet: 'step ${1:100}, ${2:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['distance', 'animation'],
  overview: 'step distance, animation',
  detail: makeBasicMarkdownString({
    en: 'Step given distance toward current heading and animation with given name will be played',
    zh: '向当前朝向行走指定的距离，并播放指定名称的动画'
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
  insertSnippet: 'step ${1:100}',
  insertSnippetParameterHints: ['distance'],
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
  insertSnippet: 'goto ${1:sprite}',
  overview: 'goto sprite',
  detail: makeBasicMarkdownString({
    en: 'Move to given sprite',
    zh: '移动到指定精灵'
  }),
  hiddenFromList: true // similar to `goto1`, but `goto1` is more recommended
  // TODO: unhide this (& similar items) when [work class embed](https://github.com/goplus/gop/pull/2301) is supported
}

export const goto1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.goto',
    overloadId: '1'
  },
  insertSnippet: 'goto ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}',
  insertSnippetParameterHints: ['sprite'],
  overview: 'goto name',
  detail: makeBasicMarkdownString({
    en: 'Move to the sprite with given name',
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
  insertSnippet: 'goto ${1:Mouse}',
  insertSnippetParameterHints: ['object'],
  overview: 'goto obj',
  detail: makeBasicMarkdownString({
    en: 'Move to given obj',
    zh: '移动到指定对象'
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
  insertSnippet: 'glide ${1:100}, ${2:100}, ${3:1}',
  insertSnippetParameterHints: ['x', 'y', 'seconds'],
  overview: 'glide x, y, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given position (X, Y) with glide animation and given duration',
    zh: '滑行到指定位置（X，Y）并指定时长'
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
  insertSnippet: 'glide {$1:${BUILDER_OTHER_SPRITE_NAME:S1}}, ${2:1}',
  insertSnippetParameterHints: ['sprite', 'seconds'],
  overview: 'glide sprite, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given sprite with glide animation and given duration',
    zh: '滑行到指定精灵并指定时长'
  }),
  hiddenFromList: true // similar to `glide2`, but `glide2` is more recommended
}

export const glide2: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.glide',
    overloadId: '2'
  },
  insertSnippet: 'glide ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, ${2:1}',
  insertSnippetParameterHints: ['sprite', 'seconds'],
  overview: 'glide name, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to the sprite with given name with glide animation and given duration',
    zh: '滑行到指定名称的精灵并指定时长'
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
  insertSnippet: 'glide ${1:Mouse}, ${2:1}',
  insertSnippetParameterHints: ['object', 'seconds'],
  overview: 'glide obj, seconds',
  detail: makeBasicMarkdownString({
    en: 'Move to given obj with glide animation and given duration',
    zh: '滑行到指定对象并指定时长'
  })
}

export const setXYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setXYpos'
  },
  insertSnippet: 'setXYpos ${1:0}, ${2:0}',
  insertSnippetParameterHints: ['x', 'y'],
  overview: 'setXYpos x, y',
  detail: makeBasicMarkdownString({
    en: "Set the sprite's position",
    zh: '设置精灵位置'
  })
}

export const changeXYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeXYpos'
  },
  insertSnippet: 'changeXYpos ${1:10}, ${2:10}',
  insertSnippetParameterHints: ['dX', 'dY'],
  overview: 'changeXYpos dX, dY',
  detail: makeBasicMarkdownString({
    en: "Change the sprite's position",
    zh: '改变精灵位置'
  })
}

export const xpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.xpos'
  },
  insertSnippet: 'xpos',
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
  insertSnippet: 'setXpos ${1:0}',
  insertSnippetParameterHints: ['x'],
  overview: 'setXpos x',
  detail: makeBasicMarkdownString({
    en: "Set the sprite's X position",
    zh: '设置精灵的水平位置'
  })
}

export const changeXpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeXpos'
  },
  insertSnippet: 'changeXpos ${1:10}',
  insertSnippetParameterHints: ['dX'],
  overview: 'changeXpos dX',
  detail: makeBasicMarkdownString({
    en: "Change the sprite's X position",
    zh: '改变精灵的水平位置'
  })
}

export const ypos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.ypos'
  },
  insertSnippet: 'ypos',
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
  insertSnippet: 'setYpos ${1:0}',
  insertSnippetParameterHints: ['y'],
  overview: 'setYpos y',
  detail: makeBasicMarkdownString({
    en: "Set the sprite's Y position",
    zh: '设置精灵的垂直位置'
  })
}

export const changeYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeYpos'
  },
  insertSnippet: 'changeYpos ${1:10}',
  insertSnippetParameterHints: ['dY'],
  overview: 'changeYpos dY',
  detail: makeBasicMarkdownString({
    en: "Change the sprite's Y position",
    zh: '改变精灵的垂直位置'
  })
}

export const setRotationStyle: DefinitionDocumentationItem = {
  categories: [categories.motion.rotationStyle],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setRotationStyle'
  },
  insertSnippet: 'setRotationStyle ${1:LeftRight}',
  insertSnippetParameterHints: ['style'],
  overview: 'setRotationStyle style',
  detail: makeBasicMarkdownString({
    en: 'Set the rotation style of the sprite',
    zh: '设置精灵的旋转方式'
  })
}

export const heading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.heading'
  },
  insertSnippet: 'heading',
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
  insertSnippet: 'turn ${1:10}',
  insertSnippetParameterHints: ['degree'],
  overview: 'turn degree',
  detail: makeBasicMarkdownString({
    en: 'Turn with given degree relative to current heading',
    zh: '相对当前朝向转动给定的角度'
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
  insertSnippet: 'turn ${1:Right}',
  insertSnippetParameterHints: ['direction'],
  overview: 'turn direction',
  detail: makeBasicMarkdownString({
    en: 'Turn with given direction relative to current heading',
    zh: '指定相对方向转动'
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
  insertSnippet: 'turnTo ${1:sprite}',
  overview: 'turnTo sprite',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given sprite',
    zh: '将朝向转到指定精灵'
  }),
  hiddenFromList: true // similar to `turnTo1`, but `turnTo1` is more recommended
}

export const turnTo1: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '1'
  },
  insertSnippet: 'turnTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}',
  insertSnippetParameterHints: ['sprite'],
  overview: 'turnTo sprite',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given sprite by name',
    zh: '将朝向转到指定名字的精灵'
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
  insertSnippet: 'turnTo ${1:90}',
  insertSnippetParameterHints: ['direction'],
  overview: 'turnTo direction',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given direction',
    zh: '将朝向转到指定角度'
  })
}

export const turnTo3: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '3'
  },
  insertSnippet: 'turnTo ${1:Left}',
  insertSnippetParameterHints: ['direction'],
  overview: 'turnTo direction',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given direction',
    zh: '将朝向转到指定方向'
  }),
  hiddenFromList: true // similar to `turnTo2`, but `turnTo2` is more recommended
}

export const turnTo4: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '4'
  },
  insertSnippet: 'turnTo ${1:Mouse}',
  insertSnippetParameterHints: ['object'],
  overview: 'turnTo obj',
  detail: makeBasicMarkdownString({
    en: 'Turn heading to given object',
    zh: '将朝向转到指定对象'
  })
}

export const setHeading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setHeading'
  },
  insertSnippet: 'setHeading ${1:90}',
  insertSnippetParameterHints: ['direction'],
  overview: 'setHeading direction',
  detail: makeBasicMarkdownString({
    en: 'Set heading to given value',
    zh: '设置朝向为给定值'
  })
}

export const changeHeading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeHeading'
  },
  insertSnippet: 'changeHeading ${1:10}',
  insertSnippetParameterHints: ['dDirection'],
  overview: 'changeHeading dDirection',
  detail: makeBasicMarkdownString({
    en: 'Change heading with given direction change',
    zh: '以给定的角度改变朝向'
  })
}

export const size: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.size'
  },
  insertSnippet: 'size',
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
  insertSnippet: 'setSize ${1:2}',
  insertSnippetParameterHints: ['size'],
  overview: 'setSize size',
  detail: makeBasicMarkdownString({
    en: 'Set the size of current sprite',
    zh: '设置当前精灵的大小'
  })
}

export const changeSize: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeSize'
  },
  insertSnippet: 'changeSize ${1:1}',
  insertSnippetParameterHints: ['dSize'],
  overview: 'changeSize dSize',
  detail: makeBasicMarkdownString({
    en: 'Change the size of current sprite',
    zh: '改变当前精灵的大小'
  })
}

// TODO: Sprite.setEffect|changeEffect, Game.setEffect|changeEffect

export const touching0: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touching',
    overloadId: '0'
  },
  insertSnippet: 'touching(${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"})',
  insertSnippetParameterHints: ['sprite'],
  overview: 'touching(name)',
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
  insertSnippet: 'touching(${1:sprite})',
  overview: 'touching(sprite)',
  detail: makeBasicMarkdownString({
    en: 'Check if current sprite touching given sprite',
    zh: '检查当前精灵是否与指定精灵接触'
  }),
  hiddenFromList: true // similar to `touching0`, but `touching0` is more recommended
}

export const touching2: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touching',
    overloadId: '2'
  },
  insertSnippet: 'touching(${1:Edge})',
  insertSnippetParameterHints: ['object'],
  overview: 'touching(obj)',
  detail: makeBasicMarkdownString({
    en: 'Check if current sprite touching given object',
    zh: '检查当前精灵是否与指定对象接触'
  })
}

export const bounceOffEdge: DefinitionDocumentationItem = {
  categories: [categories.motion.others],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.bounceOffEdge'
  },
  insertSnippet: 'bounceOffEdge',
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
  insertSnippet: 'mouseHitItem',
  overview: 'mouseHitItem',
  detail: makeBasicMarkdownString({
    en: 'Get the topmost sprite which is hit by mouse',
    zh: '获取鼠标点击的最上层精灵'
  })
}

export const backdropName: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.backdropName'
  },
  insertSnippet: 'backdropName',
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
  insertSnippet: 'backdropIndex',
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
  insertSnippet: 'startBackdrop ${1:"${BUILDER_FIRST_BACKDROP_NAME:bg1}"}',
  insertSnippetParameterHints: ['backdrop'],
  overview: 'startBackdrop name',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name',
    zh: '通过指定名称切换背景'
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
  insertSnippet: 'startBackdrop ${1:"${BUILDER_FIRST_BACKDROP_NAME:bg1}"}, ${2:true}',
  insertSnippetParameterHints: ['backdrop', 'wait'],
  overview: 'startBackdrop name, true',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name, with waiting for related (`onBackdrop`) works to complete',
    zh: '通过指定名称切换背景，并等待关联的（`onBackdrop`）行为结束'
  })
}

export const nextBackdrop0: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.nextBackdrop',
    overloadId: '0'
  },
  insertSnippet: 'nextBackdrop',
  overview: 'nextBackdrop',
  detail: makeBasicMarkdownString({
    en: 'Switch to the next backdrop',
    zh: '切换到下一个背景'
  })
}

export const nextBackdrop1: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.nextBackdrop',
    overloadId: '1'
  },
  insertSnippet: 'nextBackdrop ${2:true}',
  insertSnippetParameterHints: ['wait'],
  overview: 'nextBackdrop true',
  detail: makeBasicMarkdownString({
    en: 'Switch to the next backdrop, with waiting for related (`onBackdrop`) works to complete',
    zh: '切换到下一个背景，并等待关联的（`onBackdrop`）行为结束'
  })
}

export const prevBackdrop0: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.prevBackdrop',
    overloadId: '0'
  },
  insertSnippet: 'prevBackdrop',
  overview: 'prevBackdrop',
  detail: makeBasicMarkdownString({
    en: 'Switch to the previous backdrop',
    zh: '切换到上一个背景'
  })
}

export const prevBackdrop1: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.prevBackdrop',
    overloadId: '1'
  },
  insertSnippet: 'prevBackdrop ${1:true}',
  insertSnippetParameterHints: ['wait'],
  overview: 'prevBackdrop true',
  detail: makeBasicMarkdownString({
    en: 'Switch to the previous backdrop, with waiting for related (`onBackdrop`) works to complete',
    zh: '切换到上一个背景，并等待关联的（`onBackdrop`）行为结束'
  })
}

export const keyPressed: DefinitionDocumentationItem = {
  categories: [categories.sensing.keyboard],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.keyPressed'
  },
  insertSnippet: 'keyPressed(${1:KeyA})',
  insertSnippetParameterHints: ['key'],
  overview: 'keyPressed(key)',
  detail: makeBasicMarkdownString({
    en: 'Check if given key is currently pressed',
    zh: '检查给定的按键当前是否被按下'
  })
}

export const mouseX: DefinitionDocumentationItem = {
  categories: [categories.sensing.mouse],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.mouseX'
  },
  insertSnippet: 'mouseX',
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
  insertSnippet: 'mouseY',
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
  insertSnippet: 'mousePressed',
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
  insertSnippet: 'wait ${1:1}',
  insertSnippetParameterHints: ['seconds'],
  overview: 'wait seconds',
  detail: makeBasicMarkdownString({
    en: 'Block current execution (coroutine) for given seconds',
    zh: '阻塞当前的执行，并指定阻塞的秒数'
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
  insertSnippet: 'play ${1:${BUILDER_FIRST_SOUND_NAME:s1}}',
  insertSnippetParameterHints: ['sound'],
  overview: 'play sound',
  detail: makeBasicMarkdownString({
    en: 'Play given sound',
    zh: '播放指定声音'
  }),
  hiddenFromList: true // similar to `play3`, but `play3` is more recommended
}

export const play1: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '1'
  },
  insertSnippet: 'play ${1:${BUILDER_FIRST_SOUND_NAME:s1}}, ${2:true}',
  insertSnippetParameterHints: ['sound', 'wait'],
  overview: 'play sound, wait',
  detail: makeBasicMarkdownString({
    en: 'Play given sound with waiting',
    zh: '播放指定声音并等待播放完成'
  }),
  hiddenFromList: true // similar to `play4`, but `play4` is more recommended
}

export const play2: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '2'
  },
  insertSnippet: 'play ${1:${BUILDER_FIRST_SOUND_NAME:s1}}, ${2:{}}',
  insertSnippetParameterHints: ['sound', 'options'],
  overview: 'play sound, options',
  detail: makeBasicMarkdownString({
    en: 'Play given sound with options',
    zh: '播放指定声音并指定选项'
  }),
  hiddenFromList: true // similar to `play5`, but `play5` is more recommended
}

export const play3: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '3'
  },
  insertSnippet: 'play ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}',
  insertSnippetParameterHints: ['sound'],
  overview: 'play name',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name',
    zh: '播放声音（指定名字）'
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
  insertSnippet: 'play ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}, ${2:true}',
  insertSnippetParameterHints: ['sound', 'wait'],
  overview: 'play name, wait',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name and wait',
    zh: '播放声音（指定名字）并等待播放完成'
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
  insertSnippet: 'play ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}, ${2:{}}',
  insertSnippetParameterHints: ['sound', 'options'],
  overview: 'play name, options',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name and options',
    zh: '播放声音（指定名字）并指定选项'
  })
}

export const stopAllSounds: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.stopAllSounds'
  },
  insertSnippet: 'stopAllSounds',
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
  insertSnippet: 'volume',
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
  insertSnippet: 'setVolume ${1:100}',
  insertSnippetParameterHints: ['volume'],
  overview: 'setVolume volume',
  detail: makeBasicMarkdownString({
    en: 'Set the volume for sounds',
    zh: '设置声音的音量'
  })
}

export const changeVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.changeVolume'
  },
  insertSnippet: 'changeVolume ${1:10}',
  insertSnippetParameterHints: ['dVolume'],
  overview: 'changeVolume dVolume',
  detail: makeBasicMarkdownString({
    en: 'Change the volume for sounds with given volume change',
    zh: '根据给定的音量变化改变声音的音量'
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
  insertSnippet: 'broadcast ${1:"ping"}',
  insertSnippetParameterHints: ['msg'],
  overview: 'broadcast msg',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message',
    zh: '广播一条消息'
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
  insertSnippet: 'broadcast ${1:"ping"}, ${2:true}',
  insertSnippetParameterHints: ['msg', 'wait'],
  overview: 'broadcast msg, true',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message with waiting for related (`onMsg`) works to complete',
    zh: '广播一条消息并等待关联的（`onMsg`）行为结束'
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
  insertSnippet: 'broadcast ${1:"ping"}, ${2:1}, ${3:true}',
  insertSnippetParameterHints: ['msg', 'data', 'wait'],
  overview: 'broadcast msg, data, true',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message with data and waiting for related (`onMsg`) works to complete',
    zh: '广播一条带数据的消息并等待关联的（`onMsg`）行为结束'
  })
}

export const gameOnStart: DefinitionDocumentationItem = {
  categories: [categories.event.game],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onStart'
  },
  insertSnippet: 'onStart => {\n\t$0\n}',
  overview: 'onStart => {}',
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
  insertSnippet: 'onClick => {\n\t$0\n}',
  overview: 'onClick => {}',
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
  insertSnippet: 'onClick => {\n\t$0\n}',
  overview: 'onClick => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to current sprite clicked',
    zh: '当前精灵被点击时执行'
  })
}

export const gameOnAnyKey: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onAnyKey'
  },
  insertSnippet: 'onAnyKey key => {\n\t$0\n}',
  overview: 'onAnyKey key => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to any key pressed',
    zh: '任意按键被按下时执行'
  })
}

export const spriteOnAnyKey: DefinitionDocumentationItem = {
  ...gameOnAnyKey,
  definition: {
    package: packageSpx,
    name: 'Sprite.onAnyKey'
  }
}

export const gameOnKey0: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onKey',
    overloadId: '0'
  },
  insertSnippet: 'onKey ${1:KeyA}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['key'],
  overview: 'onKey key, => {}',
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
  insertSnippet: 'onKey ${1:[KeyA]}, key => {\n\t$0\n}',
  insertSnippetParameterHints: ['keys'],
  overview: 'onKey keys, key => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to given keys pressed, optionally receiving the key pressed',
    zh: '指定多个按键，任一被按下时执行，并可选地接收被按下的按键'
  })
}

export const gameOnKey2: DefinitionDocumentationItem = {
  ...gameOnKey1,
  hiddenFromList: true, // duplicate with `gameOnKey1`
  definition: {
    package: packageSpx,
    name: 'Game.onKey',
    overloadId: '2'
  }
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
  insertSnippet: 'onMsg (msg, data) => {\n\t$0\n}',
  overview: 'onMsg (msg, data) => {}',
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
  insertSnippet: 'onMsg ${1:"ping"}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['msg'],
  overview: 'onMsg msg, => {}',
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
  insertSnippet: 'onBackdrop backdrop => {\n\t$0\n}',
  overview: 'onBackdrop backdrop => {}',
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
  insertSnippet: 'onBackdrop ${1:"${BUILDER_FIRST_BACKDROP_NAME:bg1}"}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['backdrop'],
  overview: 'onBackdrop backdrop, => {}',
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
  insertSnippet: 'rand(${1:1}, ${2:10})',
  insertSnippetParameterHints: ['from', 'to'],
  overview: 'rand(from, to)',
  detail: makeBasicMarkdownString({
    en: 'Generate a random integer',
    zh: '生成一个随机整数'
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
  insertSnippet: 'rand(${1:1.5}, ${2:9.9})',
  insertSnippetParameterHints: ['from', 'to'],
  overview: 'rand(from, to)',
  detail: makeBasicMarkdownString({
    en: 'Generate a random number',
    zh: '生成一个随机数'
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
  insertSnippet: 'exit ${1:0}',
  insertSnippetParameterHints: ['code'],
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
  insertSnippet: 'exit',
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
  insertSnippet: 'getWidget(${1:${BUILDER_FIRST_WIDGET_TYPE:Monitor}}, ${2:"${BUILDER_FIRST_WIDGET_NAME:w1}"})',
  insertSnippetParameterHints: ['type', 'name'],
  overview: 'getWidget(T, name)',
  detail: makeBasicMarkdownString({
    en: 'Get the widget by given type & name',
    zh: '通过给定的类型和名称获取控件'
  })
}

export const widgetVisible: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Widget.visible'
  },
  insertSnippet: 'visible',
  overview: 'visible',
  detail: makeBasicMarkdownString({
    en: 'If current widget visible',
    zh: '当前控件是否可见'
  })
}

export const widgetHide: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.hide'
  },
  insertSnippet: 'hide',
  overview: 'hide',
  detail: makeBasicMarkdownString({
    en: 'Make current widget invisible',
    zh: '使当前控件不可见'
  })
}

export const widgetShow: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.show'
  },
  insertSnippet: 'show',
  overview: 'show',
  detail: makeBasicMarkdownString({
    en: 'Make current widget visible',
    zh: '使当前控件可见'
  })
}

export const widgetSetXYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.setXYpos'
  },
  insertSnippet: 'setXYpos ${1:0}, ${2:0}',
  insertSnippetParameterHints: ['x', 'y'],
  overview: 'setXYpos x, y',
  detail: makeBasicMarkdownString({
    en: "Set the widget's position",
    zh: '设置控件位置'
  })
}

export const widgetChangeXYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.changeXYpos'
  },
  insertSnippet: 'changeXYpos ${1:10}, ${2:10}',
  insertSnippetParameterHints: ['dX', 'dY'],
  overview: 'changeXYpos dX, dY',
  detail: makeBasicMarkdownString({
    en: "Change the widget's position",
    zh: '改变控件位置'
  })
}

export const widgetXpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Widget.xpos'
  },
  insertSnippet: 'xpos',
  overview: 'xpos',
  detail: makeBasicMarkdownString({
    en: 'Get current X position',
    zh: '获取当前水平位置'
  })
}

export const widgetSetXpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.setXpos'
  },
  insertSnippet: 'setXpos ${1:0}',
  insertSnippetParameterHints: ['x'],
  overview: 'setXpos x',
  detail: makeBasicMarkdownString({
    en: "Set the widget's X position",
    zh: '设置控件的水平位置'
  })
}

export const widgetChangeXpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.changeXpos'
  },
  insertSnippet: 'changeXpos ${1:10}',
  insertSnippetParameterHints: ['dX'],
  overview: 'changeXpos dX',
  detail: makeBasicMarkdownString({
    en: "Change the widget's X position",
    zh: '改变控件的水平位置'
  })
}

export const widgetYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Widget.ypos'
  },
  insertSnippet: 'ypos',
  overview: 'ypos',
  detail: makeBasicMarkdownString({
    en: 'Get current Y position',
    zh: '获取当前垂直位置'
  })
}

export const widgetSetYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.setYpos'
  },
  insertSnippet: 'setYpos ${1:0}',
  insertSnippetParameterHints: ['y'],
  overview: 'setYpos y',
  detail: makeBasicMarkdownString({
    en: "Set the widget's Y position",
    zh: '设置控件的垂直位置'
  })
}

export const widgetChangeYpos: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.changeYpos'
  },
  insertSnippet: 'changeYpos ${1:10}',
  insertSnippetParameterHints: ['dY'],
  overview: 'changeYpos dY',
  detail: makeBasicMarkdownString({
    en: "Change the widget's Y position",
    zh: '改变控件的垂直位置'
  })
}

export const widgetSize: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Widget.size'
  },
  insertSnippet: 'size',
  overview: 'size',
  detail: makeBasicMarkdownString({
    en: 'Get current size',
    zh: '获取当前大小'
  })
}

export const widgetSetSize: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.setSize'
  },
  insertSnippet: 'setSize ${1:2}',
  insertSnippetParameterHints: ['size'],
  overview: 'setSize size',
  detail: makeBasicMarkdownString({
    en: 'Set the size of current widget',
    zh: '设置当前控件的大小'
  })
}

export const widgetChangeSize: DefinitionDocumentationItem = {
  categories: [categories.motion.size],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Widget.changeSize'
  },
  insertSnippet: 'changeSize ${1:0.1}',
  insertSnippetParameterHints: ['dSize'],
  overview: 'changeSize dSize',
  detail: makeBasicMarkdownString({
    en: 'Change the size of current widget',
    zh: '改变当前控件的大小'
  })
}

export const monitor: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Type,
  definition: {
    package: packageSpx,
    name: 'Monitor'
  },
  insertSnippet: 'Monitor',
  overview: 'Monitor',
  detail: makeBasicMarkdownString({
    en: 'Type for monitor widget',
    zh: '监视器控件类型'
  })
}

export const monitorVisible: DefinitionDocumentationItem = {
  ...widgetVisible,
  definition: {
    package: packageSpx,
    name: 'Monitor.visible'
  }
}

export const monitorHide: DefinitionDocumentationItem = {
  ...widgetHide,
  definition: {
    package: packageSpx,
    name: 'Monitor.hide'
  }
}

export const monitorShow: DefinitionDocumentationItem = {
  ...widgetShow,
  definition: {
    package: packageSpx,
    name: 'Monitor.show'
  }
}

export const monitorSetXYpos: DefinitionDocumentationItem = {
  ...widgetSetXYpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.setXYpos'
  }
}

export const monitorChangeXYpos: DefinitionDocumentationItem = {
  ...widgetChangeXYpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.changeXYpos'
  }
}

export const monitorXpos: DefinitionDocumentationItem = {
  ...widgetXpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.xpos'
  }
}

export const monitorSetXpos: DefinitionDocumentationItem = {
  ...widgetSetXpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.setXpos'
  }
}

export const monitorChangeXpos: DefinitionDocumentationItem = {
  ...widgetChangeXpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.changeXpos'
  }
}

export const monitorYpos: DefinitionDocumentationItem = {
  ...widgetYpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.ypos'
  }
}

export const monitorSetYpos: DefinitionDocumentationItem = {
  ...widgetSetYpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.setYpos'
  }
}

export const monitorChangeYpos: DefinitionDocumentationItem = {
  ...widgetChangeYpos,
  definition: {
    package: packageSpx,
    name: 'Monitor.changeYpos'
  }
}

export const monitorSize: DefinitionDocumentationItem = {
  ...widgetSize,
  definition: {
    package: packageSpx,
    name: 'Monitor.size'
  }
}

export const monitorSetSize: DefinitionDocumentationItem = {
  ...widgetSetSize,
  definition: {
    package: packageSpx,
    name: 'Monitor.setSize'
  }
}

export const monitorChangeSize: DefinitionDocumentationItem = {
  ...widgetChangeSize,
  definition: {
    package: packageSpx,
    name: 'Monitor.changeSize'
  }
}

// TODO: Sprite.goBackLayers|gotoBack|gotoFront

export const movingInfoOldX: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'MovingInfo.OldX'
  },
  insertSnippet: 'oldX',
  overview: 'oldX',
  detail: makeBasicMarkdownString({
    en: 'The horizontal position before moving',
    zh: '移动前的水平位置'
  })
}

export const movingInfoOldY: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'MovingInfo.OldY'
  },
  insertSnippet: 'oldY',
  overview: 'oldY',
  detail: makeBasicMarkdownString({
    en: 'The vertical position before moving',
    zh: '移动前的垂直位置'
  })
}

export const movingInfoNewX: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'MovingInfo.NewX'
  },
  insertSnippet: 'newX',
  overview: 'newX',
  detail: makeBasicMarkdownString({
    en: 'The horizontal position after moving',
    zh: '移动后的水平位置'
  })
}

export const movingInfoNewY: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'MovingInfo.NewY'
  },
  insertSnippet: 'newY',
  overview: 'newY',
  detail: makeBasicMarkdownString({
    en: 'The vertical position after moving',
    zh: '移动后的垂直位置'
  })
}

export const movingInfoDx: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'MovingInfo.dx'
  },
  insertSnippet: 'dx',
  overview: 'dx',
  detail: makeBasicMarkdownString({
    en: 'The horizontal distance moved',
    zh: '水平移动距离'
  })
}

export const movingInfoDy: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'MovingInfo.dy'
  },
  insertSnippet: 'dy',
  overview: 'dy',
  detail: makeBasicMarkdownString({
    en: 'The vertical distance moved',
    zh: '垂直移动距离'
  })
}

export const turningInfoOldDir: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'TurningInfo.OldDir'
  },
  insertSnippet: 'OldDir',
  overview: 'OldDir',
  detail: makeBasicMarkdownString({
    en: 'The heading before turning',
    zh: '旋转前的朝向'
  })
}

export const turningInfoNewDir: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'TurningInfo.NewDir'
  },
  insertSnippet: 'NewDir',
  overview: 'NewDir',
  detail: makeBasicMarkdownString({
    en: 'The heading after turning',
    zh: '旋转后的朝向'
  })
}

export const turningInfoDir: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'TurningInfo.dir'
  },
  insertSnippet: 'dir',
  overview: 'dir',
  detail: makeBasicMarkdownString({
    en: 'The angle rotated',
    zh: '旋转的角度'
  })
}

export const prev = defineConst('Prev', [], { en: 'Previous item', zh: '上一项' })
export const next = defineConst('Next', [], { en: 'Next item', zh: '下一项' })

export const up = defineConst('Up', [categories.motion.heading], {
  en: 'Up direction, i.e., 0 degree',
  zh: '上，即角度 0'
})
export const down = defineConst('Down', [categories.motion.heading], {
  en: 'Down direction, i.e., 180 degree',
  zh: '下，即角度 180'
})
export const left = defineConst('Left', [categories.motion.heading], {
  en: 'Left direction, i.e., -90 degree',
  zh: '左，即角度 -90'
})
export const right = defineConst('Right', [categories.motion.heading], {
  en: 'Right direction, i.e., 90 degree',
  zh: '右，即角度 90'
})

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
