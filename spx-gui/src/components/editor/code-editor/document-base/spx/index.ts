import { back, backward, forward, front, packageSpx } from '@/utils/spx'
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
  insertSnippet: 'onTouchStart ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, sprite => {\n\t$0\n}',
  insertSnippetParameterHints: ['name'],
  overview: 'onTouchStart name, sprite => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to sprite touching another sprite with given name',
    zh: '精灵与指定名字的其他精灵接触时执行'
  })
}

export const onTouchStart1: DefinitionDocumentationItem = {
  ...onTouchStart0,
  hiddenFromList: true, // duplicate with `onTouchStart0
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
  insertSnippet: 'onTouchStart ${1:["${BUILDER_OTHER_SPRITE_NAME:S1}"]}, sprite => {\n\t$0\n}',
  insertSnippetParameterHints: ['names'],
  overview: 'onTouchStart names, sprite => {}',
  detail: makeBasicMarkdownString({
    en: 'Listen to sprite touching another sprite with one of given names',
    zh: '精灵与任一指定名字的其他精灵接触时执行，支持指定多个名字'
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
    en: 'Let the sprite die. Animation for state "die" will be played',
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

export const setLayer0: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setLayer',
    overloadId: '0'
  },
  insertSnippet: 'setLayer ${1:Front}',
  insertSnippetParameterHints: ['layer'],
  overview: 'setLayer layer',
  detail: makeBasicMarkdownString({
    en: 'Send the sprite to front/back',
    zh: '将精灵移到最前/后'
  })
}
export const setLayer1: DefinitionDocumentationItem = {
  categories: [categories.look.visibility],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setLayer',
    overloadId: '1'
  },
  insertSnippet: 'setLayer ${1:Forward}, ${2:1}',
  insertSnippetParameterHints: ['direction', 'layers'],
  overview: 'setLayer direction, layers',
  detail: makeBasicMarkdownString({
    en: 'Send the sprite forward or backward, with given layers',
    zh: '将精灵向前或向后移动，并指定层数'
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

export const animate0: DefinitionDocumentationItem = {
  categories: [categories.look.animation],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.animate',
    overloadId: '0'
  },
  insertSnippet: 'animate ${1:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'animate name',
  detail: makeBasicMarkdownString({
    en: 'Play animation with given name',
    zh: '播放动画（指定名字）'
  })
}

export const animate1: DefinitionDocumentationItem = {
  categories: [categories.look.animation],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.animate',
    overloadId: '1'
  },
  insertSnippet: 'animate ${1:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}, ${2:true}',
  insertSnippetParameterHints: ['name', 'loop'],
  overview: 'animate name, loop',
  detail: makeBasicMarkdownString({
    en: 'Loop the animation with given name',
    zh: '循环播放动画（指定名字）'
  })
}

export const animateAndWait: DefinitionDocumentationItem = {
  categories: [categories.look.animation],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.animateAndWait'
  },
  insertSnippet: 'animateAndWait ${1:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'animateAndWait name',
  detail: makeBasicMarkdownString({
    en: 'Play animation with given name, with waiting for animation to complete',
    zh: '播放动画（指定名字），等待动画播放结束'
  })
}

export const stopAnimation: DefinitionDocumentationItem = {
  categories: [categories.look.animation],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stopAnimation'
  },
  insertSnippet: 'stopAnimation ${1:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'stopAnimation name',
  detail: makeBasicMarkdownString({
    en: 'Stop animation with given name',
    zh: '停止动画（指定名字）'
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
  hiddenFromList: true, // similar to `distanceTo0`, but `distanceTo0` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.distanceTo',
    overloadId: '1'
  },
  insertSnippet: 'distanceTo(${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"})',
  insertSnippetParameterHints: ['name'],
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
  overview: 'distanceTo(object)',
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
    en: 'Step toward current heading with given distance. Animation for state "step" will be played',
    zh: '向前行走（指定距离），自动播放“行走”状态的动画'
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
  insertSnippet: 'step ${1:100}, ${2:1}',
  insertSnippetParameterHints: ['distance', 'speed'],
  overview: 'step distance, speed',
  detail: makeBasicMarkdownString({
    en: 'Step toward current heading with given distance and speed. Animation for state "step" will be played',
    zh: '向前行走（指定距离和速度），自动播放“行走”状态的动画'
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
  insertSnippet: 'step ${1:100}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['distance', 'speed', 'animation'],
  overview: 'step distance, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Step toward current heading with given distance, speed and animation',
    zh: '向前行走，并指定距离、速度和动画'
  })
}

export const stepTo0: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '0'
  },
  insertSnippet: 'stepTo ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}',
  insertSnippetParameterHints: ['sprite'],
  overview: 'stepTo sprite',
  detail: makeBasicMarkdownString({
    en: 'Step to given sprite. Animation for state "step" will be played',
    zh: '行走到指定精灵，自动播放“行走”状态的动画'
  })
}

export const stepTo1: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `stepTo0`, but `stepTo0` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '1'
  },
  insertSnippet: 'stepTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'stepTo name',
  detail: makeBasicMarkdownString({
    en: 'Step to the sprite with given name. Animation for state "step" will be played',
    zh: '行走到精灵（指定名字），自动播放“行走”状态的动画'
  })
}

export const stepTo2: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '2'
  },
  insertSnippet: 'stepTo ${1:100}, ${2:100}',
  insertSnippetParameterHints: ['x', 'y'],
  overview: 'stepTo x, y',
  detail: makeBasicMarkdownString({
    en: 'Step to given position. Animation for state "step" will be played',
    zh: '行走到指定位置，自动播放“行走”状态的动画'
  })
}

export const stepTo3: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '3'
  },
  insertSnippet: 'stepTo ${1:Mouse}',
  insertSnippetParameterHints: ['object'],
  overview: 'stepTo object',
  detail: makeBasicMarkdownString({
    en: 'Step to the given object. Animation for state "step" will be played',
    zh: '行走到指定对象，自动播放“行走”状态的动画'
  })
}

export const stepTo4: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '4'
  },
  insertSnippet: 'stepTo ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}, ${2:1}',
  insertSnippetParameterHints: ['sprite', 'speed'],
  overview: 'stepTo sprite, speed',
  detail: makeBasicMarkdownString({
    en: 'Step to given sprite and specify speed. Animation for state "step" will be played',
    zh: '行走到指定精灵，并指定行走速度，自动播放“行走”状态的动画'
  })
}

export const stepTo5: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `stepTo4`, but `stepTo4` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '5'
  },
  insertSnippet: 'stepTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, ${2:1}',
  insertSnippetParameterHints: ['name', 'speed'],
  overview: 'stepTo name, speed',
  detail: makeBasicMarkdownString({
    en: 'Step to the sprite with given name and specify speed. Animation for state "step" will be played',
    zh: '行走到精灵（指定名字），并指定行走速度，自动播放“行走”状态的动画'
  })
}

export const stepTo6: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '6'
  },
  insertSnippet: 'stepTo ${1:100}, ${2:100}, ${3:1}',
  insertSnippetParameterHints: ['x', 'y', 'speed'],
  overview: 'stepTo x, y, speed',
  detail: makeBasicMarkdownString({
    en: 'Step to given position and specify speed. Animation for state "step" will be played',
    zh: '行走到指定位置，并指定行走速度，自动播放“行走”状态的动画'
  })
}

export const stepTo7: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '7'
  },
  insertSnippet: 'stepTo ${1:Mouse}, ${2:1}',
  insertSnippetParameterHints: ['object', 'speed'],
  overview: 'stepTo object, speed',
  detail: makeBasicMarkdownString({
    en: 'Step to given object and specify the step speed. Animation for state "step" will be played',
    zh: '行走到指定对象，并指定行走速度，自动播放“行走”状态的动画'
  })
}

export const stepTo8: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '8'
  },
  insertSnippet: 'stepTo ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['sprite', 'speed', 'animation'],
  overview: 'stepTo sprite, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Step to given sprite and specify speed and animation',
    zh: '行走到指定精灵，并指定行走速度和动画'
  })
}

export const stepTo9: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `stepTo8`, but `stepTo8` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: '9'
  },
  insertSnippet: 'stepTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['name', 'speed', 'animation'],
  overview: 'stepTo name, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Step to the sprite with given name and specify speed and animation',
    zh: '行走到精灵（指定名字），并指定行走速度和动画'
  })
}

export const stepToA: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: 'a'
  },
  insertSnippet: 'stepTo ${1:100}, ${2:100}, ${3:1}, ${4:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['x', 'y', 'speed', 'animation'],
  overview: 'stepTo x, y, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Step to given position and specify speed and animation',
    zh: '行走到指定位置，并指定行走速度和动画'
  })
}

export const stepToB: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.stepTo',
    overloadId: 'b'
  },
  insertSnippet: 'stepTo ${1:Mouse}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['object', 'speed', 'animation'],
  overview: 'stepTo object, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Step to given object and specify speed and animation',
    zh: '行走到指定对象，并指定行走速度和动画'
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
  insertSnippet: 'glide ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}, ${2:1}',
  insertSnippetParameterHints: ['sprite', 'seconds'],
  overview: 'glide sprite, seconds',
  detail: makeBasicMarkdownString({
    en: 'Glide to given sprite within given duration',
    zh: '在指定时间内滑行到指定精灵'
  })
}

export const glide2: DefinitionDocumentationItem = {
  categories: [categories.motion.position],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `glide1`, but `glide1` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.glide',
    overloadId: '2'
  },
  insertSnippet: 'glide ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, ${2:1}',
  insertSnippetParameterHints: ['name', 'seconds'],
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
  overview: 'glide object, seconds',
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

export const turn1: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turn',
    overloadId: '1'
  },
  insertSnippet: 'turn ${1:Right}, ${2:1}',
  insertSnippetParameterHints: ['direction', 'speed'],
  overview: 'turn direction, speed',
  detail: makeBasicMarkdownString({
    en: 'Turn by given direction and specify the turn speed',
    zh: '指定方向旋转，并指定旋转速度'
  })
}

export const turn2: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turn',
    overloadId: '2'
  },
  insertSnippet: 'turn ${1:Right}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['direction', 'speed', 'animation'],
  overview: 'turn direction, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Turn by given direction, specify the turn speed and animation',
    zh: '指定方向旋转，并指定旋转速度和动画'
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
  insertSnippet: 'turnTo ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}',
  insertSnippetParameterHints: ['sprite'],
  overview: 'turnTo sprite',
  detail: makeBasicMarkdownString({
    en: 'Turn to given sprite',
    zh: '转向指定精灵'
  })
}

export const turnTo1: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `turnTo0`, but `turnTo0` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '1'
  },
  insertSnippet: 'turnTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'turnTo name',
  detail: makeBasicMarkdownString({
    en: 'Turn to the sprite with given name',
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
  insertSnippet: 'turnTo ${1:Right}',
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
  overview: 'turnTo object',
  detail: makeBasicMarkdownString({
    en: 'Turn to given object',
    zh: '转向指定对象'
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
  insertSnippet: 'turnTo ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}, ${2:1}',
  insertSnippetParameterHints: ['sprite', 'speed'],
  overview: 'turnTo sprite, speed',
  detail: makeBasicMarkdownString({
    en: 'Turn to given sprite, and specify the turn speed',
    zh: '转向指定精灵，并指定旋转速度'
  })
}

export const turnTo5: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `turnTo4`, but `turnTo4` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '5'
  },
  insertSnippet: 'turnTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, ${2:1}',
  insertSnippetParameterHints: ['name', 'speed'],
  overview: 'turnTo name, speed',
  detail: makeBasicMarkdownString({
    en: 'Turn to the sprite with given name, and specify the turn speed',
    zh: '转向精灵（指定名字），并指定旋转速度'
  })
}

export const turnTo6: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '6'
  },
  insertSnippet: 'turnTo ${1:Right}, ${2:1}',
  insertSnippetParameterHints: ['direction', 'speed'],
  overview: 'turnTo direction, speed',
  detail: makeBasicMarkdownString({
    en: 'Turn to given direction, and specify the turn speed',
    zh: '转向指定方向，并指定旋转速度'
  })
}

export const turnTo7: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '7'
  },
  insertSnippet: 'turnTo ${1:Mouse}, ${2:1}',
  insertSnippetParameterHints: ['object', 'speed'],
  overview: 'turnTo object, speed',
  detail: makeBasicMarkdownString({
    en: 'Turn to given object, and specify the turn speed',
    zh: '转向指定对象，并指定旋转速度'
  })
}

export const turnTo8: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '8'
  },
  insertSnippet: 'turnTo ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['sprite', 'speed', 'animation'],
  overview: 'turnTo sprite, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Turn to given sprite, and specify the turn speed and animation',
    zh: '转向指定精灵，并指定旋转速度和动画'
  })
}

export const turnTo9: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `turnTo8`, but `turnTo8` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: '9'
  },
  insertSnippet: 'turnTo ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['name', 'speed', 'animation'],
  overview: 'turnTo name, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Turn to the sprite with given name, and specify the turn speed and animation',
    zh: '转向精灵（指定名字），并指定旋转速度和动画'
  })
}

export const turnToA: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: 'a'
  },
  insertSnippet: 'turnTo ${1:Right}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['direction', 'speed', 'animation'],
  overview: 'turnTo direction, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Turn to given direction, and specify the turn speed and animation',
    zh: '转向指定方向，并指定旋转速度和动画'
  })
}

export const turnToB: DefinitionDocumentationItem = {
  categories: [categories.motion.heading],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.turnTo',
    overloadId: 'b'
  },
  insertSnippet: 'turnTo ${1:Mouse}, ${2:1}, ${3:"${BUILDER_FIRST_ANIMATION_NAME:a1}"}',
  insertSnippetParameterHints: ['object', 'speed', 'animation'],
  overview: 'turnTo object, speed, animation',
  detail: makeBasicMarkdownString({
    en: 'Turn to given object, and specify the turn speed and animation',
    zh: '转向指定对象，并指定旋转速度和动画'
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

export const gameSetGraphicEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setGraphicEffect'
  },
  insertSnippet: 'setGraphicEffect ${1:ColorEffect}, ${2:100}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'setGraphicEffect kind, value',
  detail: makeBasicMarkdownString({
    en: 'Set graphic effect of the stage',
    zh: '设置舞台特效'
  })
}

export const gameChangeGraphicEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.changeGraphicEffect'
  },
  insertSnippet: 'changeGraphicEffect ${1:ColorEffect}, ${2:10}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'changeGraphicEffect kind, value',
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

export const spriteSetGraphicEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setGraphicEffect'
  },
  insertSnippet: 'setGraphicEffect ${1:ColorEffect}, ${2:100}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'setGraphicEffect kind, value',
  detail: makeBasicMarkdownString({
    en: 'Set graphic effect of the sprite',
    zh: '设置精灵特效'
  })
}

export const spriteChangeGraphicEffect: DefinitionDocumentationItem = {
  categories: [categories.look.effect],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.changeGraphicEffect'
  },
  insertSnippet: 'changeGraphicEffect ${1:ColorEffect}, ${2:10}',
  insertSnippetParameterHints: ['kind', 'value'],
  overview: 'changeGraphicEffect kind, value',
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
  hiddenFromList: true, // similar to `touching1`, but `touching1` is more recommended
  definition: {
    package: packageSpx,
    name: 'Sprite.touching',
    overloadId: '0'
  },
  insertSnippet: 'touching(${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"})',
  insertSnippetParameterHints: ['name'],
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
  insertSnippet: 'touching(${1:${BUILDER_OTHER_SPRITE_NAME:S1}})',
  insertSnippetParameterHints: ['sprite'],
  overview: 'touching(sprite)',
  detail: makeBasicMarkdownString({
    en: 'if sprite touching given sprite',
    zh: '精灵是否与指定的其他精灵接触'
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
  insertSnippet: 'touching(${1:Edge})',
  insertSnippetParameterHints: ['object'],
  overview: 'touching(object)',
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

export const setBackdrop0: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setBackdrop',
    overloadId: '0'
  },
  insertSnippet: 'setBackdrop ${1:"${BUILDER_FIRST_BACKDROP_NAME:bg1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'setBackdrop name',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name',
    zh: '（指定名字）切换背景'
  })
}

export const setBackdrop1: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setBackdrop',
    overloadId: '1'
  },
  insertSnippet: 'setBackdrop ${1:0}',
  insertSnippetParameterHints: ['index'],
  overview: 'setBackdrop index',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying index',
    zh: '（指定序号）切换背景'
  })
}

export const setBackdrop2: DefinitionDocumentationItem = {
  ...setBackdrop1,
  hiddenFromList: true, // duplicate with `setBackdrop1`
  definition: {
    package: packageSpx,
    name: 'Game.setBackdrop',
    overloadId: '2'
  }
}

export const setBackdrop3: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setBackdrop',
    overloadId: '3'
  },
  insertSnippet: 'setBackdrop ${1:Next}',
  insertSnippetParameterHints: ['action'],
  overview: 'setBackdrop action',
  detail: makeBasicMarkdownString({
    en: 'Switch to the Next/Prev backdrop',
    zh: '切换到下一个/上一个背景'
  })
}

export const setBackdropAndWait0: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setBackdropAndWait',
    overloadId: '0'
  },
  insertSnippet: 'setBackdropAndWait ${1:"${BUILDER_FIRST_BACKDROP_NAME:bg1}"}',
  insertSnippetParameterHints: ['name'],
  overview: 'setBackdropAndWait name',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying name, with waiting for related (`onBackdrop`) behaviors to complete',
    zh: '（指定名字）切换背景，并等待关联的（`onBackdrop`）行为结束'
  })
}

export const setBackdropAndWait1: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setBackdropAndWait',
    overloadId: '1'
  },
  insertSnippet: 'setBackdropAndWait ${1:0}',
  insertSnippetParameterHints: ['index'],
  overview: 'setBackdropAndWait index',
  detail: makeBasicMarkdownString({
    en: 'Set the current backdrop by specifying index, with waiting for related (`onBackdrop`) behaviors to complete',
    zh: '（指定序号）切换背景，并等待关联的（`onBackdrop`）行为结束'
  })
}
export const setBackdropAndWait2: DefinitionDocumentationItem = {
  ...setBackdropAndWait1,
  hiddenFromList: true, // duplicate with `setBackdropAndWait1`
  definition: {
    package: packageSpx,
    name: 'Game.setBackdropAndWait',
    overloadId: '2'
  }
}

export const setBackdropAndWait3: DefinitionDocumentationItem = {
  categories: [categories.look.backdrop],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.setBackdropAndWait',
    overloadId: '3'
  },
  insertSnippet: 'setBackdropAndWait ${1:Next}',
  insertSnippetParameterHints: ['action'],
  overview: 'setBackdropAndWait action',
  detail: makeBasicMarkdownString({
    en: 'Switch to the Next/Prev backdrop, with waiting for related (`onBackdrop`) behaviors to complete',
    zh: '切换到下一个/上一个背景，并等待关联的（`onBackdrop`）行为结束'
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
    name: 'waitUntil'
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
  insertSnippet: 'play ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}, ${2:true}',
  insertSnippetParameterHints: ['sound', 'loop'],
  overview: 'play sound, loop',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name in a loop',
    zh: '循环播放声音（指定名字）'
  })
}

export const gamePlay1: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.play',
    overloadId: '1'
  },
  insertSnippet: 'play ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}',
  insertSnippetParameterHints: ['sound'],
  overview: 'play sound',
  detail: makeBasicMarkdownString({
    en: 'Play sound with given name',
    zh: '播放声音（指定名字）'
  })
}

export const gamePlayAndWait: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.playAndWait'
  },
  insertSnippet: 'playAndWait ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}',
  insertSnippetParameterHints: ['sound'],
  overview: 'playAndWait sound',
  detail: makeBasicMarkdownString({
    en: 'Play sound with waiting',
    zh: '播放声音（指定名字）并等待播放完成'
  })
}

export const gamePausePlaying: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.pausePlaying'
  },
  insertSnippet: 'pausePlaying ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}',
  insertSnippetParameterHints: ['sound'],
  overview: 'pausePlaying sound',
  detail: makeBasicMarkdownString({
    en: 'Pause sound with given name',
    zh: '暂停声音（指定名字）'
  })
}

export const gameResumePlaying: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.resumePlaying'
  },
  insertSnippet: 'resumePlaying ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}',
  insertSnippetParameterHints: ['sound'],
  overview: 'resume sound',
  detail: makeBasicMarkdownString({
    en: 'Resume sound with given name',
    zh: '恢复声音（指定名字）'
  })
}

export const gameStopPlaying: DefinitionDocumentationItem = {
  categories: [categories.sound.playControl],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.stopPlaying'
  },
  insertSnippet: 'stopPlaying ${1:"${BUILDER_FIRST_SOUND_NAME:s1}"}',
  insertSnippetParameterHints: ['sound'],
  overview: 'stop sound',
  detail: makeBasicMarkdownString({
    en: 'Stop sound with given name',
    zh: '停止声音（指定名字）'
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

export const spritePlayAndWait: DefinitionDocumentationItem = {
  ...gamePlayAndWait,
  definition: {
    package: packageSpx,
    name: 'Sprite.playAndWait'
  }
}

export const spritePausePlaying: DefinitionDocumentationItem = {
  ...gamePausePlaying,
  definition: {
    package: packageSpx,
    name: 'Sprite.pausePlaying'
  }
}

export const spriteResumePlaying: DefinitionDocumentationItem = {
  ...gameResumePlaying,
  definition: {
    package: packageSpx,
    name: 'Sprite.resumePlaying'
  }
}

export const spriteGameStopPlaying: DefinitionDocumentationItem = {
  ...gameStopPlaying,
  definition: {
    package: packageSpx,
    name: 'Sprite.stopPlaying'
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
  insertSnippet: 'broadcast ${1:"ping"}, ${2:1}',
  insertSnippetParameterHints: ['msg', 'data'],
  overview: 'broadcast msg, data',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message along with extra data',
    zh: '广播一条消息，携带额外的数据'
  })
}

export const broadcastAndWait0: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.broadcastAndWait',
    overloadId: '0'
  },
  insertSnippet: 'broadcastAndWait ${1:"ping"}',
  insertSnippetParameterHints: ['msg'],
  overview: 'broadcastAndWait msg',
  detail: makeBasicMarkdownString({
    en: 'Broadcast a message, with waiting for related (`onMsg`) behaviors to complete',
    zh: '广播一条消息, 并等待关联的（`onMsg`）行为结束'
  })
}

export const broadcastAndWait1: DefinitionDocumentationItem = {
  categories: [categories.event.message],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Game.broadcastAndWait',
    overloadId: '1'
  },
  insertSnippet: 'broadcastAndWait ${1:"ping"}, ${2:1}',
  insertSnippetParameterHints: ['msg', 'data'],
  overview: 'broadcastAndWait msg, data',
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

export const spritePhysicsMode: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.physicsMode'
  },
  insertSnippet: 'physicsMode',
  overview: 'physicsMode',
  detail: makeBasicMarkdownString({
    en: 'The physics mode for the sprite',
    zh: '精灵的物理模式'
  })
}

export const spriteSetPhysicsMode: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setPhysicsMode'
  },
  insertSnippet: 'setPhysicsMode ${1:NoPhysics}',
  insertSnippetParameterHints: ['mode'],
  overview: 'setPhysicsMode mode',
  detail: makeBasicMarkdownString({
    en: 'Set the physics mode for the sprite',
    zh: '设置精灵的物理模式'
  })
}

export const spriteVelocity: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.velocity'
  },
  insertSnippet: 'velocity',
  overview: 'velocity',
  detail: makeBasicMarkdownString({
    en: 'The velocity for the sprite. It is a 2D vector represented as (vx, vy), where vx is the distance to move in x axis per second, and vy is the distance to move in y axis per second',
    zh: '精灵的速度。它是一个二维向量，表示为 (vx, vy)，其中 vx 是每秒在 x 轴上移动的距离，vy 是每秒在 y 轴上移动的距离'
  })
}

export const spriteSetVelocity: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setVelocity'
  },
  insertSnippet: 'setVelocity ${1:0}, ${2:0}',
  insertSnippetParameterHints: ['vx', 'vy'],
  overview: 'setVelocity vx, vy',
  detail: makeBasicMarkdownString({
    en: 'Set the velocity for the sprite',
    zh: '设置精灵的速度'
  })
}

export const spriteGravity: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.gravity'
  },
  insertSnippet: 'gravity',
  overview: 'gravity',
  detail: makeBasicMarkdownString({
    en: 'The gravity for the sprite. The value is relative to the global gravity. For example, 2 means double the global gravity, 0 means no gravity',
    zh: '精灵受到的重力。该值相对于全局重力。例如，2 表示是全局重力的两倍，0 表示没有重力'
  })
}

export const spriteSetGravity: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.setGravity'
  },
  insertSnippet: 'setGravity ${1:0}',
  insertSnippetParameterHints: ['g'],
  overview: 'setGravity g',
  detail: makeBasicMarkdownString({
    en: 'Set the gravity for the sprite',
    zh: '设置精灵的重力'
  })
}

export const spriteAddImpulse: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Sprite.addImpulse'
  },
  insertSnippet: 'addImpulse ${1:0}, ${2:0}',
  insertSnippetParameterHints: ['ix', 'iy'],
  overview: 'addImpulse ix, iy',
  detail: makeBasicMarkdownString({
    en: 'Add impulse to the sprite. The impulse is an instant velocity change, i.e., the velocity will be changed by (ix, iy) instantly',
    zh: '给精灵一个冲量。冲量是瞬时的速度变化，即速度会立即改变 (ix, iy)'
  })
}

export const spriteIsOnFloor: DefinitionDocumentationItem = {
  categories: [categories.motion.physics],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Sprite.isOnFloor'
  },
  insertSnippet: 'isOnFloor',
  overview: 'isOnFloor',
  detail: makeBasicMarkdownString({
    en: 'If the sprite is currently on the floor',
    zh: '精灵当前是否在地面上'
  })
}

export const gameFindPath0: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Game.findPath',
    overloadId: '0'
  },
  insertSnippet: 'findPath(${1:0}, ${2:0}, ${3:100}, ${4:100})',
  insertSnippetParameterHints: ['fromX', 'fromY', 'toX', 'toY'],
  overview: 'findPath(fromX, fromY, toX, toY)',
  detail: makeBasicMarkdownString({
    en: 'Find path from (fromX, fromY) to (toX, toY)',
    zh: '寻找从 (fromX, fromY) 到 (toX, toY) 的路径'
  })
}

export const spriteFindPath0: DefinitionDocumentationItem = {
  ...gameFindPath0,
  definition: {
    package: packageSpx,
    name: 'Sprite.findPath',
    overloadId: '0'
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

export const camera: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'Game.Camera'
  },
  insertSnippet: 'Camera',
  overview: 'Camera',
  detail: makeBasicMarkdownString({
    en: 'Camera, which controls the visible area of the stage',
    zh: '摄像机，控制舞台的显示区域'
  })
}

export const cameraZoom: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Camera.zoom'
  },
  insertSnippet: 'Camera.zoom',
  overview: 'Camera.zoom',
  detail: makeBasicMarkdownString({
    en: 'Zoom factor of the camera. Value 1 means no zoom, greater than 1 means zoom in, and between 0 and 1 means zoom out',
    zh: '摄像机缩放比例。值为 1 表示不缩放，大于 1 表示放大，小于 1 且大于 0 表示缩小'
  })
}

export const cameraSetZoom: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Camera.setZoom'
  },
  insertSnippet: 'Camera.setZoom ${1:1}',
  insertSnippetParameterHints: ['value'],
  overview: 'Camera.setZoom zoom',
  detail: makeBasicMarkdownString({
    en: 'Set zoom factor of the camera',
    zh: '设置摄像机缩放比例'
  })
}

export const cameraXpos: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Camera.xpos'
  },
  insertSnippet: 'Camera.xpos',
  overview: 'Camera.xpos',
  detail: makeBasicMarkdownString({
    en: 'The X position of the camera center',
    zh: '摄像机中心的 X 坐标位置'
  })
}

export const cameraYpos: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Camera.ypos'
  },
  insertSnippet: 'Camera.ypos',
  overview: 'Camera.ypos',
  detail: makeBasicMarkdownString({
    en: 'The Y position of the camera center',
    zh: '摄像机中心的 Y 坐标位置'
  })
}

export const cameraSetXYpos: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Camera.setXYpos'
  },
  insertSnippet: 'Camera.setXYpos ${1:0}, ${2:0}',
  insertSnippetParameterHints: ['x', 'y'],
  overview: 'Camera.setXYpos x, y',
  detail: makeBasicMarkdownString({
    en: 'Set the X and Y position of the camera center',
    zh: '设置摄像机中心的 X 和 Y 坐标位置'
  })
}

export const cameraFollow0: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'Camera.follow',
    overloadId: '0'
  },
  insertSnippet: 'Camera.follow ${1:${BUILDER_OTHER_SPRITE_NAME:S1}}',
  insertSnippetParameterHints: ['sprite'],
  overview: 'Camera.follow sprite',
  detail: makeBasicMarkdownString({
    en: 'Make the camera follow the given sprite',
    zh: '让摄像机跟随指定的精灵'
  })
}

export const cameraFollow1: DefinitionDocumentationItem = {
  categories: [categories.game.camera],
  kind: DefinitionKind.Command,
  hiddenFromList: true, // similar to `cameraFollow0`, but `cameraFollow0` is more recommended
  definition: {
    package: packageSpx,
    name: 'Camera.follow',
    overloadId: '1'
  },
  insertSnippet: 'Camera.follow ${1:"${BUILDER_OTHER_SPRITE_NAME:S1}"}',
  insertSnippetParameterHints: ['spriteName'],
  overview: 'Camera.follow spriteName',
  detail: makeBasicMarkdownString({
    en: 'Make the camera follow the given sprite by name',
    zh: '让摄像机跟随指定名字的精灵'
  })
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

export const Front = defineConst(front.name, [categories.look.visibility], front.text)
export const Back = defineConst(back.name, [categories.look.visibility], back.text)
export const Forward = defineConst(forward.name, [categories.look.visibility], forward.text)
export const Backward = defineConst(backward.name, [categories.look.visibility], backward.text)

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

export const noPhysics = defineConst('NoPhysics', [categories.motion.physics], {
  en: 'No physics effect',
  zh: '无物理效果'
})
export const kinematicPhysics = defineConst('KinematicPhysics', [categories.motion.physics], {
  en: 'Kinematic physics effect',
  zh: '运动学物理效果'
})
export const dynamicPhysics = defineConst('DynamicPhysics', [categories.motion.physics], {
  en: 'Dynamic physics effect',
  zh: '动力学物理效果'
})
export const staticPhysics = defineConst('StaticPhysics', [categories.motion.physics], {
  en: 'Static physics effect',
  zh: '静态物理效果'
})

export const value: DefinitionDocumentationItem = {
  categories: [categories.other.value],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'Value'
  },
  insertSnippet: 'Value',
  overview: 'Value',
  detail: makeBasicMarkdownString({
    en: 'Value type for dynamic data',
    zh: '用于动态数据的值类型'
  })
}

export const valueEqual: DefinitionDocumentationItem = {
  categories: [categories.other.value],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Value.equal'
  },
  insertSnippet: 'myValue.equal ${1:otherValue}',
  insertSnippetParameterHints: ['otherValue'],
  overview: 'equal otherValue',
  detail: makeBasicMarkdownString({
    en: 'Check if two values are equal',
    zh: '检查两个值是否相等'
  })
}

export const valueFloat: DefinitionDocumentationItem = {
  categories: [categories.other.value],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Value.float'
  },
  insertSnippet: 'myValue.float',
  overview: 'float',
  detail: makeBasicMarkdownString({
    en: 'Convert the value to a floating-point number',
    zh: '将值转换为浮点数'
  })
}

export const valueInt: DefinitionDocumentationItem = {
  categories: [categories.other.value],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Value.int'
  },
  insertSnippet: 'myValue.int',
  overview: 'int',
  detail: makeBasicMarkdownString({
    en: 'Convert the value to an integer',
    zh: '将值转换为整数'
  })
}

export const valueString: DefinitionDocumentationItem = {
  categories: [categories.other.value],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'Value.string'
  },
  insertSnippet: 'myValue.string',
  overview: 'string',
  detail: makeBasicMarkdownString({
    en: 'Convert the value to a string',
    zh: '将值转换为字符串'
  })
}

export const list: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Variable,
  definition: {
    package: packageSpx,
    name: 'List'
  },
  insertSnippet: 'List',
  overview: 'List',
  detail: makeBasicMarkdownString({
    en: 'List data structure for storing multiple values',
    zh: '用于存储多个值的列表数据结构'
  })
}

export const listAppend: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'List.append'
  },
  insertSnippet: 'myList.append ${1:"value"}',
  insertSnippetParameterHints: ['value'],
  overview: 'append value',
  detail: makeBasicMarkdownString({
    en: 'Add a value to the end of the list',
    zh: '将值添加到列表末尾'
  })
}

export const listAt: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'List.at'
  },
  insertSnippet: 'myList.at ${1:0}',
  insertSnippetParameterHints: ['index'],
  overview: 'at index',
  detail: makeBasicMarkdownString({
    en: 'Get the value at a specific index',
    zh: '获取指定索引处的值'
  })
}

export const listContains: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'List.contains'
  },
  insertSnippet: 'myList.contains ${1:"value"}',
  insertSnippetParameterHints: ['value'],
  overview: 'contains value',
  detail: makeBasicMarkdownString({
    en: 'Check if the list contains a specific value',
    zh: '检查列表是否包含特定值'
  })
}

export const listDelete: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'List.delete'
  },
  insertSnippet: 'myList.delete ${1:0}',
  insertSnippetParameterHints: ['index'],
  overview: 'delete index',
  detail: makeBasicMarkdownString({
    en: 'Remove the item at a specific index',
    zh: '删除指定索引处的项'
  })
}

export const listInit: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'List.init'
  },
  insertSnippet: 'myList.init ${1:"a"}, ${2:"b"}, ${3:"c"}',
  insertSnippetParameterHints: ['value1', 'value2', 'value3'],
  overview: 'init values...',
  detail: makeBasicMarkdownString({
    en: 'Initialize the list with given values',
    zh: '使用给定的值初始化列表'
  })
}

export const listInitFrom: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'List.initFrom'
  },
  insertSnippet: 'myList.initFrom ${1:otherList}',
  insertSnippetParameterHints: ['sourceList'],
  overview: 'initFrom sourceList',
  detail: makeBasicMarkdownString({
    en: 'Initialize the list by copying from another list',
    zh: '通过复制另一个列表来初始化列表'
  })
}

export const listInsert: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'List.insert'
  },
  insertSnippet: 'myList.insert ${1:0}, ${2:"value"}',
  insertSnippetParameterHints: ['index', 'value'],
  overview: 'insert index, value',
  detail: makeBasicMarkdownString({
    en: 'Insert a value at a specific index',
    zh: '在指定索引处插入值'
  })
}

export const listLen: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'List.len'
  },
  insertSnippet: 'myList.len',
  overview: 'len',
  detail: makeBasicMarkdownString({
    en: 'Get the length of the list',
    zh: '获取列表的长度'
  })
}

export const listSet: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Command,
  definition: {
    package: packageSpx,
    name: 'List.set'
  },
  insertSnippet: 'myList.set ${1:0}, ${2:"newValue"}',
  insertSnippetParameterHints: ['index', 'value'],
  overview: 'set index, value',
  detail: makeBasicMarkdownString({
    en: 'Set the value at a specific index',
    zh: '设置指定索引处的值'
  })
}

export const listString: DefinitionDocumentationItem = {
  categories: [categories.other.list],
  kind: DefinitionKind.Read,
  definition: {
    package: packageSpx,
    name: 'List.string'
  },
  insertSnippet: 'myList.string',
  overview: 'string',
  detail: makeBasicMarkdownString({
    en: 'Get the string representation of the list',
    zh: '获取列表的字符串表示'
  })
}
