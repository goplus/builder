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
    en: 'Make a clone of the sprite',
    zh: '复制精灵'
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
    en: 'Make a clone of the sprite and pass extra data',
    zh: '复制精灵并传递额外数据'
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
    en: 'Listen to sprite cloned',
    zh: '精灵被复制时执行'
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
    en: 'Listen to sprite touching another sprite',
    zh: '精灵与其他精灵接触时执行'
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
    en: 'Listen to sprite touching another sprite with given name',
    zh: '精灵与指定名字的其他精灵接触时执行'
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
    en: 'Listen to sprite touching another sprite with one of given names',
    zh: '精灵与任一指定名字的其他精灵接触时执行，支持指定多个名字'
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
    en: 'Listen to the sprite moving',
    zh: '精灵移动时执行'
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
    en: 'Listen to the sprite turning',
    zh: '精灵转向时执行'
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
    en: 'Let the sprite die. Animation for state "die" will be played.',
    zh: '让精灵死亡，自动播放“死亡”状态的动画'
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
    en: 'Make the sprite invisible',
    zh: '隐藏精灵'
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
    en: 'Make the sprite visible',
    zh: '显示精灵'
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
    en: 'If sprite visible',
    zh: '精灵是否可见'
  })
}

export const gotoBack: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.gotoBack'
  },
  insertSnippet: 'gotoBack',
  overview: 'gotoBack',
  detail: makeBasicMarkdownString({
    en: 'Send the sprite to back',
    zh: '将精灵移到最后'
  })
}

export const gotoFront: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.gotoFront'
  },
  insertSnippet: 'gotoFront',
  overview: 'gotoFront',
  detail: makeBasicMarkdownString({
    en: 'Send the sprite to front',
    zh: '将精灵移到最前'
  })
}

export const goBackLayers: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.goBackLayers'
  },
  insertSnippet: 'goBackLayers ${1:1}',
  insertSnippetParameterHints: ['num'],
  overview: 'goBackLayers num',
  detail: makeBasicMarkdownString({
    en: 'Send the sprite back by given layers. Positive number moves back, negative number moves front',
    zh: '指定层数调整精灵层级；正数表示向后移动，负数表示向前移动'
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
    zh: '当前造型的名字'
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
  insertSnippetParameterHints: ['name'],
  overview: 'setCostume name',
  detail: makeBasicMarkdownString({
    en: 'Set the current costume by specifying name',
    zh: '设置当前造型（指定名字）'
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
  insertSnippetParameterHints: ['name'],
  overview: 'animate name',
  detail: makeBasicMarkdownString({
    en: 'Play animation with given name',
    zh: '播放动画（指定名字）'
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
  insertSnippet: 'say ${1:"Hi"}',
  insertSnippetParameterHints: ['word'],
  overview: 'say word',
  detail: makeBasicMarkdownString({
    en: 'Say some word',
    zh: '说话'
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
  insertSnippet: 'say ${1:"Hi"}, ${2:1}',
  insertSnippetParameterHints: ['word', 'seconds'],
  overview: 'say word, seconds',
  detail: makeBasicMarkdownString({
    en: 'Say some word for given seconds',
    zh: '说话（指定时长）'
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
  insertSnippet: 'think ${1:"Emmm..."}',
  insertSnippetParameterHints: ['word'],
  overview: 'think word',
  detail: makeBasicMarkdownString({
    en: 'Think of some word',
    zh: '思考'
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
  insertSnippet: 'think ${1:"Emmm..."}, ${2:1}',
  insertSnippetParameterHints: ['word', 'seconds'],
  overview: 'think word, seconds',
  detail: makeBasicMarkdownString({
    en: 'Think of some word for given seconds',
    zh: '思考（指定时长）'
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
    en: 'Distance from the sprite to another sprite',
    zh: '精灵到另一个精灵的距离'
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
    en: 'Distance from the sprite to another sprite with given name',
    zh: '精灵到另一个指定名字的精灵的距离'
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
    en: 'Distance from the sprite to given object',
    zh: '精灵到指定对象的距离'
  })
}

export const gameAsk: DefinitionDocumentationItem = {
  categories: [categories.sensing.ask],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.ask'
  },
  insertSnippet: 'ask ${1:"What is your name?"}',
  insertSnippetParameterHints: ['question'],
  overview: 'ask question',
  detail: makeBasicMarkdownString({
    en: 'Ask player a question and wait for player to answer',
    zh: '向玩家提问并等待玩家回答'
  })
}

export const spriteAsk: DefinitionDocumentationItem = {
  categories: [categories.sensing.ask],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.ask'
  },
  insertSnippet: 'ask ${1:"What is your name?"}',
  insertSnippetParameterHints: ['question'],
  overview: 'ask question',
  detail: makeBasicMarkdownString({
    en: 'Ask player a question and wait for player to answer',
    zh: '向玩家提问并等待玩家回答'
  })
}

export const answer: DefinitionDocumentationItem = {
  categories: [categories.sensing.ask],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.answer'
  },
  insertSnippet: 'answer',
  overview: 'answer',
  detail: makeBasicMarkdownString({
    en: 'The answer from the player',
    zh: '玩家的回答'
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
    en: 'Step toward current heading. Animation for state "step" will be played',
    zh: '向前行走，自动播放“行走”状态的动画'
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
    en: 'Step toward current heading. Animation with given name will be played',
    zh: '向前行走，并播放指定名字的动画'
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
    en: 'Step toward current heading. Animation for state "step" will be played',
    zh: '向前行走，自动播放“行走”状态的动画'
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
  // TODO: unhide this (& similar items) when [work class embed](https://github.com/goplus/xgo/pull/2301) is supported
  // See details in https://github.com/goplus/builder/issues/1636
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
    zh: '移动到指定名字的精灵'
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
    en: 'Glide to given position within given duration',
    zh: '在指定时间内滑行到指定位置'
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
    en: 'Glide to given sprite within given duration',
    zh: '在指定时间内滑行到指定精灵'
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
    en: 'Glide to the sprite with given name within given duration',
    zh: '在指定时间内滑行到指定名字的精灵'
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
    en: 'Glide to given object within given duration',
    zh: '在指定时间内滑行到指定对象'
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
    en: "Set the sprite's X, Y position",
    zh: '设置精灵 X、Y 坐标位置'
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
    en: "Change the sprite's X, Y position",
    zh: '改变精灵的 X、Y 坐标位置'
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
    en: "The sprite's X position",
    zh: '精灵的 X 坐标位置'
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
    zh: '设置精灵的 X 坐标位置'
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
    zh: '改变精灵的 X 坐标位置'
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
    en: "The sprite's Y position",
    zh: '精灵的 Y 坐标位置'
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
    zh: '设置精灵的 Y 坐标位置'
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
    zh: '改变精灵的 Y 坐标位置'
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
    en: "The sprite's heading direction",
    zh: '精灵的朝向'
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
  insertSnippet: 'turn ${1:Right}',
  insertSnippetParameterHints: ['direction'],
  overview: 'turn direction',
  detail: makeBasicMarkdownString({
    en: 'Turn by given direction. For example, if initially heading at 30 degrees, turning right will result in heading 120 degrees',
    zh: '指定方向旋转。如本来朝向 30 度方向，向右转后变为 120 度'
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
    en: 'Turn to given sprite',
    zh: '转向指定精灵'
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
    en: 'Turn to sprite with given name',
    zh: '转向指定名字的精灵'
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
  insertSnippet: 'turnTo ${1:Left}',
  insertSnippetParameterHints: ['direction'],
  overview: 'turnTo direction',
  detail: makeBasicMarkdownString({
    en: 'Turn to given direction',
    zh: '转向指定方向'
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
  insertSnippet: 'turnTo ${1:Mouse}',
  insertSnippetParameterHints: ['object'],
  overview: 'turnTo obj',
  detail: makeBasicMarkdownString({
    en: 'Turn to given object',
    zh: '转向指定对象'
  })
}

export const setHeading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setHeading'
  },
  insertSnippet: 'setHeading ${1:Right}',
  insertSnippetParameterHints: ['direction'],
  overview: 'setHeading direction',
  detail: makeBasicMarkdownString({
    en: 'Set heading to given direction',
    zh: '设置朝向为给定方向'
  })
}

export const changeHeading: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeHeading'
  },
  insertSnippet: 'changeHeading ${1:90}',
  insertSnippetParameterHints: ['degree'],
  overview: 'changeHeading degree',
  detail: makeBasicMarkdownString({
    en: 'Change heading by given degree. For example, if initially heading at 30 degrees, changing by 90 degrees will result in heading 120 degrees',
    zh: '给定角度改变朝向。例如，最初朝向 30 度，改变 90 度后将朝向 120 度'
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
    en: 'Size of the sprite. Value is relative to initial size. For example, 2 means current size is twice the initial size',
    zh: '精灵大小。值为相对初始大小的比例。如 2 表示当前大小是初始大小的 2 倍'
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
    en: 'Set size of the sprite',
    zh: '设置精灵大小'
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
    en: 'Change size of the sprite. For example, if initially size is 1, changing by 1 will result in size 2',
    zh: '改变精灵的大小。例如，初始大小为 1，改变 1 后将变为 2'
  })
}

export const gameSetEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setEffect'
  },
  insertSnippet: 'setEffect ${1:ColorEffect}, ${2:100}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'setEffect kind, value',
  detail: makeBasicMarkdownString({
    en: 'Set graphic effect of the stage',
    zh: '设置舞台特效'
  })
}

export const gameChangeEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.changeEffect'
  },
  insertSnippet: 'changeEffect ${1:ColorEffect}, ${2:10}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'changeEffect kind, value',
  detail: makeBasicMarkdownString({
    en: 'Change graphic effect of the stage. For example, if initial effect value is 100, changing by 10 will result in 110',
    zh: '调整舞台特效。例如，初始特效值 100，改变 10 后将变为 110'
  })
}

export const gameClearGraphicEffects: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.clearGraphicEffects'
  },
  insertSnippet: 'clearGraphicEffects',
  overview: 'clearGraphicEffects',
  detail: makeBasicMarkdownString({
    en: 'Clear all graphic effects of the stage',
    zh: '清除所有舞台特效'
  })
}

export const spriteSetEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setEffect'
  },
  insertSnippet: 'setEffect ${1:ColorEffect}, ${2:100}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'setEffect kind, value',
  detail: makeBasicMarkdownString({
    en: 'Set graphic effect of the sprite',
    zh: '设置精灵特效'
  })
}

export const spriteChangeEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeEffect'
  },
  insertSnippet: 'changeEffect ${1:ColorEffect}, ${2:10}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'changeEffect kind, value',
  detail: makeBasicMarkdownString({
    en: 'Change graphic effect of the sprite. For example, if initial effect value is 100, changing by 10 will result in 110',
    zh: '调整精灵特效。例如，初始特效值 100，改变 10 后将变为 110'
  })
}

export const spriteClearGraphicEffects: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.clearGraphicEffects'
  },
  insertSnippet: 'clearGraphicEffects',
  overview: 'clearGraphicEffects',
  detail: makeBasicMarkdownString({
    en: 'Clear all graphic effects of the sprite',
    zh: '清除所有精灵特效'
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
  insertSnippet: 'touching(${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"})',
  insertSnippetParameterHints: ['sprite'],
  overview: 'touching(name)',
  detail: makeBasicMarkdownString({
    en: 'If sprite touching another sprite with given name',
    zh: '精灵是否与指定名字的其他精灵接触'
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
    en: 'if sprite touching given sprite',
    zh: '精灵是否与指定的其他精灵接触'
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
    en: 'If sprite touching given object',
    zh: '精灵是否与指定对象接触'
  })
}

export const touchingColor: DefinitionDocumentationItem = {
  categories: [categories.sensing.distance],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.touchingColor'
  },
  insertSnippet: 'touchingColor(${1:HSB(50,100,100)})',
  insertSnippetParameterHints: ['color'],
  overview: 'touchingColor(color)',
  detail: makeBasicMarkdownString({
    en: 'If sprite touching given color',
    zh: '精灵是否与指定颜色接触'
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
    en: 'Bounce off if the sprite touching the edge',
    zh: '如果精灵接触到边缘，则反弹'
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
    en: 'The sprite which is hit by mouse',
    zh: '被鼠标点击的精灵'
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
    en: 'Name of the current backdrop',
    zh: '当前背景的名字'
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
    en: 'Index of the current backdrop',
    zh: '当前背景的序号'
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
  insertSnippetParameterHints: ['name'],
  overview: 'startBackdrop name',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name',
    zh: '（指定名字）切换背景'
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
    en: 'Set the current backdrop by specifying name, with waiting for related (`onBackdrop`) behaviors to complete',
    zh: '（指定名字）切换背景，并等待关联的（`onBackdrop`）行为结束'
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
    en: 'Switch to the next backdrop, with waiting for related (`onBackdrop`) behaviors to complete',
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
    en: 'Switch to the previous backdrop, with waiting for related (`onBackdrop`) behaviors to complete',
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
    en: 'X position of the mouse',
    zh: '鼠标的 X 坐标位置'
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
    en: 'Y position of the mouse',
    zh: '鼠标的 Y 坐标位置'
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
    en: 'If the mouse is currently pressed',
    zh: '鼠标当前是否被按下'
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
    en: 'Wait for given seconds',
    zh: '等待指定时长，单位秒'
  })
}

export const waitUntil: DefinitionDocumentationItem = {
  categories: [categories.control.time],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.waitUntil'
  },
  insertSnippet: 'waitUntil ${1:true}',
  insertSnippetParameterHints: ['condition'],
  overview: 'waitUntil condition',
  detail: makeBasicMarkdownString({
    en: 'Wait until given condition is met',
    zh: '等待直到满足给定条件'
  })
}

export const forever: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'forever'
  },
  insertSnippet: 'forever => {\n\t$0\n}',
  overview: 'forever => {}',
  detail: makeBasicMarkdownString({
    en: 'Repeat forever',
    zh: '重复执行'
  })
}

export const repeat: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'repeat'
  },
  insertSnippet: 'repeat ${1:10}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['times'],
  overview: 'repeat times, => {}',
  detail: makeBasicMarkdownString({
    en: 'Repeat for given times',
    zh: '重复执行一定次数'
  })
}

export const repeatUntil: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'repeatUntil'
  },
  insertSnippet: 'repeatUntil ${1:false}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['condition'],
  overview: 'repeatUntil condition, => {}',
  detail: makeBasicMarkdownString({
    en: 'Repeat until given condition is met',
    zh: '重复执行直到满足给定条件'
  })
}

export const timer: DefinitionDocumentationItem = {
  categories: [categories.control.time],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.timer'
  },
  insertSnippet: 'timer',
  overview: 'timer',
  detail: makeBasicMarkdownString({
    en: 'Current timer value',
    zh: '当前计时器值'
  })
}

export const resetTimer: DefinitionDocumentationItem = {
  categories: [categories.control.time],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.resetTimer'
  },
  insertSnippet: 'resetTimer',
  overview: 'resetTimer',
  detail: makeBasicMarkdownString({
    en: 'Reset the timer to zero',
    zh: '将计时器重置为零'
  })
}

export const gamePlay0: DefinitionDocumentationItem = {
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

export const gamePlay1: DefinitionDocumentationItem = {
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

export const gamePlay2: DefinitionDocumentationItem = {
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
    en: 'Control sound playback',
    zh: '控制声音播放行为'
  }),
  hiddenFromList: true // similar to `play5`, but `play5` is more recommended
}

export const gamePlay3: DefinitionDocumentationItem = {
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

export const gamePlay4: DefinitionDocumentationItem = {
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

export const gamePlay5: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '5'
  },
  insertSnippet: 'play ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}, ${2:{ Action: PlayStop }}',
  insertSnippetParameterHints: ['sound', 'options'],
  overview: 'play name, options',
  detail: makeBasicMarkdownString({
    en: 'Control sound playback',
    zh: '控制声音播放行为'
  })
}

export const spritePlay0: DefinitionDocumentationItem = {
  ...gamePlay0,
  definition: {
    package: packageSpx,
    name: 'Sprite.play',
    overloadId: '0'
  }
}

export const spritePlay1: DefinitionDocumentationItem = {
  ...gamePlay1,
  definition: {
    package: packageSpx,
    name: 'Sprite.play',
    overloadId: '1'
  }
}

export const spritePlay2: DefinitionDocumentationItem = {
  ...gamePlay2,
  definition: {
    package: packageSpx,
    name: 'Sprite.play',
    overloadId: '2'
  }
}

export const spritePlay3: DefinitionDocumentationItem = {
  ...gamePlay3,
  definition: {
    package: packageSpx,
    name: 'Sprite.play',
    overloadId: '3'
  }
}

export const spritePlay4: DefinitionDocumentationItem = {
  ...gamePlay4,
  definition: {
    package: packageSpx,
    name: 'Sprite.play',
    overloadId: '4'
  }
}

export const spritePlay5: DefinitionDocumentationItem = {
  ...gamePlay5,
  definition: {
    package: packageSpx,
    name: 'Sprite.play',
    overloadId: '5'
  }
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

export const gameVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.volume'
  },
  insertSnippet: 'volume',
  overview: 'volume',
  detail: makeBasicMarkdownString({
    en: 'The volume for stage sounds',
    zh: '舞台声音音量'
  })
}

export const spriteVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.volume'
  },
  insertSnippet: 'volume',
  overview: 'volume',
  detail: makeBasicMarkdownString({
    en: 'The volume for sprite sounds',
    zh: '精灵声音音量'
  })
}

export const gameSetVolume: DefinitionDocumentationItem = {
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
    en: 'Set the volume for stage sounds',
    zh: '设置舞台声音音量'
  })
}

export const spriteSetVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setVolume'
  },
  insertSnippet: 'setVolume ${1:100}',
  insertSnippetParameterHints: ['volume'],
  overview: 'setVolume volume',
  detail: makeBasicMarkdownString({
    en: 'Set the volume for sprite sounds',
    zh: '设置精灵的声音音量'
  })
}

export const gameChangeVolume: DefinitionDocumentationItem = {
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
    en: 'Change the volume for stage sounds with given volume change. For example, if initial volume is 100, changing by 10 will result in volume 110',
    zh: '调整舞台声音音量。例如，初始音量为 100，调整 10 后音量为 110'
  })
}

export const spriteChangeVolume: DefinitionDocumentationItem = {
  categories: [categories.sound.volume],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeVolume'
  },
  insertSnippet: 'changeVolume ${1:10}',
  insertSnippetParameterHints: ['dVolume'],
  overview: 'changeVolume dVolume',
  detail: makeBasicMarkdownString({
    en: 'Change the volume for sprite sounds with given volume change. For example, if initial volume is 100, changing by 10 will result in volume 110',
    zh: '调整精灵声音音量。例如，初始音量为 100，调整 10 后音量为 110'
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
    en: 'Broadcast a message with waiting for related (`onMsg`) behaviors to complete',
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
    en: 'Broadcast a message along with extra data, with waiting for related (`onMsg`) behaviors to complete',
    zh: '广播一条消息，携带额外的数据，并等待关联的（`onMsg`）行为结束'
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
    en: 'Listen to sprite clicked',
    zh: '精灵被鼠标点击时执行'
  })
}

export const gameOnSwipe0: DefinitionDocumentationItem = {
  categories: [categories.event.sensing],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onSwipe',
    overloadId: '0'
  },
  insertSnippet: 'onSwipe ${1:Left}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['direction'],
  overview: 'onSwipe direction, => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to swipe in given direction',
    zh: '用户进行滑动操作时执行'
  })
}

export const spriteOnSwipe0: DefinitionDocumentationItem = {
  ...gameOnSwipe0,
  definition: {
    package: packageSpx,
    name: 'Sprite.onSwipe',
    overloadId: '0'
  }
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
    zh: '任意键盘按键被按下时执行'
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
    zh: '指定键盘按键被按下时执行'
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
    en: 'Listen to given keys pressed',
    zh: '指定多个键盘按键，任意一个被按下时执行'
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
    en: 'Listen to any message broadcasted',
    zh: '收到任意广播消息时执行'
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
    zh: '收到指定的广播消息时执行'
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

export const gameOnBackdrop0: DefinitionDocumentationItem = {
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

export const gameOnBackdrop1: DefinitionDocumentationItem = {
  categories: [categories.event.stage],
  kind: DefinitionKind.Listen,
  definition: {
    package: packageSpx,
    name: 'Game.onBackdrop',
    overloadId: '1'
  },
  insertSnippet: 'onBackdrop ${1:"${BUILDER_FIRST_BACKDROP_NAME:bg1}"}, => {\n\t$0\n}',
  insertSnippetParameterHints: ['name'],
  overview: 'onBackdrop name, => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to switching to specific backdrop',
    zh: '切换到指定背景时执行'
  })
}

export const spriteOnBackdrop0: DefinitionDocumentationItem = {
  ...gameOnBackdrop0,
  definition: {
    package: packageSpx,
    name: 'Sprite.onBackdrop',
    overloadId: '0'
  }
}

export const spriteOnBackdrop1: DefinitionDocumentationItem = {
  ...gameOnBackdrop1,
  definition: {
    package: packageSpx,
    name: 'Sprite.onBackdrop',
    overloadId: '1'
  }
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
    zh: '通过给定的类型和名字获取控件'
  })
}

export const HSB: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Function,
  definition: {
    package: packageSpx,
    name: 'hSB'
  },
  insertSnippet: 'HSB(${1:50}, ${2:100}, ${3:100})',
  insertSnippetParameterHints: ['hue', 'saturation', 'brightness'],
  overview: 'HSB(hue, saturation, brightness)',
  detail: makeBasicMarkdownString({
    en: 'Define HSB color',
    zh: '定义 HSB 颜色'
  })
}

export const HSBA: DefinitionDocumentationItem = {
  categories: [],
  kind: DefinitionKind.Function,
  definition: {
    package: packageSpx,
    name: 'hSBA'
  },
  insertSnippet: 'HSBA(${1:50}, ${2:100}, ${3:100}, ${4:100})',
  insertSnippetParameterHints: ['hue', 'saturation', 'brightness', 'alpha'],
  overview: 'HSBA(hue, saturation, brightness, alpha)',
  detail: makeBasicMarkdownString({
    en: 'Define HSBA color',
    zh: '定义 HSBA 颜色'
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
    en: 'If widget visible',
    zh: '控件是否可见'
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
    en: 'Make the widget invisible',
    zh: '隐藏控件'
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
    en: 'Make the widget visible',
    zh: '显示控件'
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
    en: "Set the widget's X, Y position",
    zh: '设置控件 X、Y 坐标位置'
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
    zh: '改变控件的 X、Y 坐标位置'
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
    en: "The widget's X position",
    zh: '控件的 X 坐标位置'
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
    zh: '设置控件的 X 坐标位置'
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
    zh: '改变控件的 X 坐标位置'
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
    en: "The widget's Y position",
    zh: '控件的 Y 坐标位置'
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
    zh: '设置控件的 Y 坐标位置'
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
    zh: '改变控件的 Y 坐标位置'
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
    en: 'Size of the widget. Value is relative to initial size. For example, 2 means current size is twice the initial size',
    zh: '控件大小。值为相对初始大小的比例。如 2 表示当前大小是初始大小的 2 倍'
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
    en: 'Set size of the widget',
    zh: '设置控件的大小'
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
    en: 'Change size of the widget',
    zh: '改变控件的大小'
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
    en: 'Monitor widget',
    zh: '监视器控件'
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
    en: 'The X position before moving',
    zh: '移动前的 X 坐标位置'
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
    en: 'The Y position before moving',
    zh: '移动前的 Y 坐标位置'
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
    en: 'The X position after moving',
    zh: '移动后的 X 坐标位置'
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
    en: 'The Y position after moving',
    zh: '移动后的 Y 坐标位置'
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
    en: 'Change of the X position',
    zh: 'X 坐标位置的变化'
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
    en: 'Change of the Y position',
    zh: 'Y 坐标位置的变化'
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
    en: 'The heading direction before turning',
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
    en: 'The heading direction after turning',
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
    en: 'The degree changed by turning',
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
export const edge = defineConst('Edge', [categories.sensing.distance], { en: 'Edge of the stage', zh: '舞台边缘' })
export const edgeLeft = defineConst('EdgeLeft', [categories.sensing.distance], {
  en: 'Left edge of the stage',
  zh: '舞台左边缘'
})
export const edgeTop = defineConst('EdgeTop', [categories.sensing.distance], {
  en: 'Top edge of the stage',
  zh: '舞台上边缘'
})
export const edgeRight = defineConst('EdgeRight', [categories.sensing.distance], {
  en: 'Right edge of the stage',
  zh: '舞台右边缘'
})
export const edgeBottom = defineConst('EdgeBottom', [categories.sensing.distance], {
  en: 'Bottom edge of the stage',
  zh: '舞台下边缘'
})

export const playRewind = defineConst('PlayRewind', [], { en: 'Rewind', zh: '倒带' })
export const playContinue = defineConst('PlayContinue', [], { en: 'Continue', zh: '继续' })
export const playPause = defineConst('PlayPause', [], { en: 'Pause', zh: '暂停' })
export const playResume = defineConst('PlayResume', [], { en: 'Resume', zh: '恢复' })
export const playStop = defineConst('PlayStop', [], { en: 'Stop', zh: '停止' })
