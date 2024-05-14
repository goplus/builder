/**
 * @file Snippets from spx
 */

import type { LocaleMessage } from '@/utils/i18n'
import { type Snippet, SnippetType, SnippetTarget } from './common'

export const clone: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'clone',
  desc: {
    en: 'Make a clone of current sprite, with optional data (for `OnCloned` callback).',
    zh: '复制当前精灵，可传递数据给 `OnCloned` 回调'
  },
  insertText: 'clone'
}

export const onCloned: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'onCloned',
  desc: { en: 'Listen to current sprite cloned.', zh: '当前精灵被复制时执行' },
  insertText: 'onCloned => {\n\t${1}\n}'
}

export const onTouched1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'onTouched',
  desc: {
    en: 'Listen to current sprite touched by any other sprites.',
    zh: '当前精灵与其他精灵接触时执行'
  },
  insertText: 'onTouched target => {\n\t${1}\n}'
}

export const onTouched2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'onTouched S',
  desc: {
    en: 'Listen to current sprite touched by given sprite.',
    zh: '当前精灵与指定的某个精灵接触时执行'
  },
  insertText: 'onTouched ${1:sprite}, => {\n\t${2}\n}'
}

export const onTouched3: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'onTouched [...]',
  desc: {
    en: 'Listen to current sprite touched by given sprites.',
    zh: '当前精灵被指定的某些精灵接触时执行'
  },
  insertText: 'onTouched ${1:[]}, => {\n\t${2}\n}'
}

export const onMoving: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'onMoving',
  desc: {
    en: 'Listen to current sprite moving (position change).',
    zh: '当前精灵移动（位置改变）时执行'
  },
  insertText: 'onMoving => {\n\t${1}\n}'
}

export const onTurning: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'onTurning',
  desc: {
    en: 'Listen to current sprite turning (heading change).',
    zh: '当前精灵转向（朝向改变）时执行'
  },
  insertText: 'onTurning => {\n\t${1}\n}'
}

export const die: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'die',
  desc: { en: 'Let current sprite die.', zh: '让当前精灵死亡' },
  insertText: 'die'
}

export const hide: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'hide',
  desc: { en: 'Make current sprite invisible.', zh: '使当前精灵不可见' },
  insertText: 'hide'
}

export const show: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'show',
  desc: { en: 'Make current sprite visible.', zh: '使当前精灵可见' },
  insertText: 'show'
}

export const visible: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'visible',
  desc: { en: 'If current sprite visible.', zh: '当前精灵是否可见' },
  insertText: 'visible'
}

export const costumeName: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'costumeName',
  desc: { en: 'The name of the current costume.', zh: '当前造型的名称' },
  insertText: 'costumeName'
}

export const costumeIndex: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'costumeIndex',
  desc: { en: 'The index of the current costume.', zh: '当前造型的索引' },
  insertText: 'costumeIndex'
}

export const setCostume: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'setCostume',
  desc: {
    en: 'Set the current costume by specifying name or index.',
    zh: '通过指定名称或索引设置当前造型'
  },
  insertText: 'setCostume ${1:nameOrIndex}'
}

export const nextCostume: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'nextCostume',
  desc: { en: 'Switch to the next costume.', zh: '切换到下一个造型' },
  insertText: 'nextCostume'
}

export const prevCostume: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'prevCostume',
  desc: { en: 'Switch to the previous costume.', zh: '切换到上一个造型' },
  insertText: 'prevCostume'
}

export const say1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'say',
  desc: { en: 'Make current sprite say some word.', zh: '使当前精灵说出一些话' },
  insertText: 'say ${1:""}'
}

export const say2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'say W,D',
  desc: {
    en: 'Make the sprite say some word for specified duration (by second).',
    zh: '使精灵说出一些话，持续指定的时间（以秒为单位）'
  },
  insertText: 'say ${1:""}, ${2:seconds}'
}

export const think1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'think',
  desc: { en: 'Make the sprite think of some word.', zh: '使精灵思考一些内容' },
  insertText: 'think ${1:""}'
}

export const think2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'think W,D',
  desc: {
    en: 'Make the sprite think some word for specified duration (by second).',
    zh: '使精灵思考一些内容，持续指定的时间（以秒为单位）'
  },
  insertText: 'think ${1:""}, ${2:seconds}'
}

export const distanceTo: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'distanceTo',
  desc: {
    en: 'Get the distance from current sprite to given target.',
    zh: '获取当前精灵到指定目标的距离'
  },
  insertText: 'distanceTo ${1:target}'
}

export const move: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'move',
  desc: { en: 'Move given steps, toward current heading.', zh: '向当前朝向移动指定的步数' },
  insertText: 'move ${1:steps}'
}

export const goto: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'goto',
  desc: { en: 'Move to given target.', zh: '移动到指定目标' },
  insertText: 'goto ${1:target}'
}

export const glide1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'glide X,Y',
  desc: {
    en: 'Move to given position (X, Y), with glide animation.',
    zh: '滑行到指定位置（X，Y）'
  },
  insertText: 'glide ${1:X}, ${2:Y}, ${3:seconds}'
}

export const glide2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'glide T',
  desc: { en: 'Move to given target, with glide animation.', zh: '滑行到指定目标' },
  insertText: 'glide ${1:target}, ${2:seconds}'
}

export const setXYpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'setXYpos',
  desc: { en: 'Move to given position.', zh: '移动到指定位置' },
  insertText: 'setXYpos ${1:X}, ${2:Y}'
}

export const changeXYpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'changeXYpos',
  desc: { en: 'Move with given position (X, Y) change.', zh: '以指定的位置偏移移动（X，Y）' },
  insertText: 'changeXYpos ${1:dX}, ${2:dY}'
}

export const xpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'xpos',
  desc: { en: 'Get current X position.', zh: '获取当前水平位置' },
  insertText: 'xpos'
}

export const setXpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'setXpos',
  desc: { en: 'Move to given X position.', zh: '移动到指定的水平位置' },
  insertText: 'setXpos ${1:X}'
}

export const changeXpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'changeXpos',
  desc: { en: 'Move with given X position change.', zh: '指定水平方向偏移移动' },
  insertText: 'changeXpos ${1:dX}'
}

export const ypos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'ypos',
  desc: { en: 'Get current Y position.', zh: '获取当前垂直位置' },
  insertText: 'ypos'
}

export const setYpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'setYpos',
  desc: { en: 'Move to given Y position.', zh: '移动到指定的垂直位置' },
  insertText: 'setYpos ${1:Y}'
}

export const changeYpos: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'changeYpos',
  desc: { en: 'Move with given Y position change.', zh: '指定垂直方向偏移移动' },
  insertText: 'changeYpos ${1:dY}'
}

export const heading: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'heading',
  desc: { en: 'Get current heading direction.', zh: '获取当前朝向' },
  insertText: 'heading'
}

export const turnTo1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'turnTo D',
  desc: { en: 'Turn heading to given direction.', zh: '将朝向转到指定方向' },
  insertText: 'turnTo ${1:direction}'
}

export const turnTo2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'turnTo T',
  desc: { en: 'Turn heading to given target.', zh: '将朝向转到指定目标' },
  insertText: 'turnTo ${1:target}'
}

export const setHeading: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'setHeading',
  desc: { en: 'Set heading to given value.', zh: '设置朝向为给定值' },
  insertText: 'setHeading ${1:direction}'
}

export const changeHeading: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'changeHeading',
  desc: { en: 'Change heading with given direction change.', zh: '以给定的偏移值改变朝向' },
  insertText: 'changeHeading ${1:dDirection}'
}

export const size: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'size',
  desc: { en: 'Get the size of current sprite.', zh: '获取当前精灵的大小' },
  insertText: 'size'
}

export const setSize: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'setSize',
  desc: { en: 'Set the size of current sprite.', zh: '设置当前精灵的大小' },
  insertText: 'setSize ${1:size}'
}

export const changeSize: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'changeSize',
  desc: { en: 'Change the size of current sprite.', zh: '改变当前精灵的大小' },
  insertText: 'changeSize ${1:dSize}'
}

export const touching: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'touching',
  desc: {
    en: 'Check if current sprite touching specified touching target.',
    zh: '检查当前精灵是否与指定目标接触'
  },
  insertText: 'touching ${1:target}'
}

export const bounceOffEdge: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.sprite,
  label: 'bounceOffEdge',
  desc: {
    en: 'Check & bounce off current sprite if touching the edge.',
    zh: '如果当前精灵接触到边缘，则反弹'
  },
  insertText: 'bounceOffEdge'
}

export const mouseHitItem: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'mouseHitItem',
  desc: { en: 'Get the topmost sprite which is hit by mouse.', zh: '获取鼠标点击的最上层精灵' },
  insertText: '${1:sprite}, ${2:ok} := mouseHitItem'
}

export const sceneName: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'sceneName',
  desc: { en: 'Get the name of the current scene.', zh: '获取当前场景的名称' },
  insertText: 'sceneName'
}

export const sceneIndex: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'sceneIndex',
  desc: { en: 'Get the index of the current scene.', zh: '获取当前场景的索引' },
  insertText: 'sceneIndex'
}

export const startScene1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'startScene S',
  desc: {
    en: 'Set the current scene by specifying name or index.',
    zh: '通过指定名称或索引设置当前场景'
  },
  insertText: 'startScene ${1:nameOrIndex}'
}

export const startScene2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'startScene S,W',
  desc: {
    en: 'Set the current scene by specifying name or index, and wait for it to complete.',
    zh: '通过指定名称或索引设置当前场景，并等待其完成'
  },
  insertText: 'startScene ${1:nameOrIndex}, true'
}

export const nextScene1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'nextScene',
  desc: { en: 'Switch to the next scene.', zh: '切换到下一个场景' },
  insertText: 'nextScene'
}

export const nextScene2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'nextScene W',
  desc: {
    en: 'Switch to the next scene, and wait for it to complete.',
    zh: '切换到下一个场景，并等待其完成'
  },
  insertText: 'nextScene true'
}

export const prevScene1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'prevScene',
  desc: { en: 'Switch to the previous scene.', zh: '切换到上一个场景' },
  insertText: 'prevScene'
}

export const prevScene2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'prevScene W',
  desc: {
    en: 'Switch to the previous scene, and wait for it to complete.',
    zh: '切换到上一个场景，并等待其完成'
  },
  insertText: 'prevScene true'
}

export const keyPressed: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'keyPressed',
  desc: { en: 'Check if given key is currently pressed.', zh: '检查给定的按键当前是否被按下' },
  insertText: 'keyPressed ${1:key}'
}

export const mouseX: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'mouseX',
  desc: { en: 'Get X position of the mouse.', zh: '获取鼠标的水平位置' },
  insertText: 'mouseX'
}

export const mouseY: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'mouseY',
  desc: { en: 'Get Y position of the mouse.', zh: '获取鼠标的垂直位置' },
  insertText: 'mouseY'
}

export const mousePressed: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'mousePressed',
  desc: { en: 'Check if the mouse is currently pressed.', zh: '检查鼠标当前是否被按下' },
  insertText: 'mousePressed'
}

export const wait: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'wait',
  desc: {
    en: 'Block current execution (coroutine) for given seconds.',
    zh: '阻塞当前的执行，并指定阻塞的秒数'
  },
  insertText: 'wait ${1:seconds}'
}

export const play1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'play',
  desc: { en: 'Play sound with given name.', zh: '播放声音（指定名字）' },
  insertText: 'play ${1:""}'
}

export const play2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'play S,W',
  desc: { en: 'Play sound with given name and wait for it to complete.', zh: '播放声音（指定名字）并等待其完成' },
  insertText: 'play ${1:""}, true'
}

// TODO: error `undefined: Loop` with `insertText: 'play ${1:sound}, { Loop: true }'`
// export const play3: Def = {
//   type: DefType.method,
//   target: DefTarget.all,
//   label: 'play S,L',
//   desc: { en: 'Play sound with given name on loop.', zh: 'TODO' },
//   insertText: 'play ${1:""}, { Loop: true }'
// }

export const stopAllSounds: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'stopAllSounds',
  desc: { en: 'Stop all playing sounds.', zh: '停止所有正在播放的声音' },
  insertText: 'stopAllSounds'
}

export const volume: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'volume',
  desc: { en: 'Get the volume for sounds.', zh: '获取声音的音量' },
  insertText: 'volume'
}

export const setVolume: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'setVolume',
  desc: { en: 'Set the volume for sounds.', zh: '设置声音的音量' },
  insertText: 'setVolume ${1:volume}'
}

export const changeVolume: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'changeVolume',
  desc: {
    en: 'Change the volume for sounds with given volume change.',
    zh: '根据给定的音量变化改变声音的音量'
  },
  insertText: 'changeVolume ${1:dVolume}'
}

export const broadcast1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'broadcast',
  desc: { en: 'Broadcast a message.', zh: '广播一条消息' },
  insertText: 'broadcast ${1:message}'
}

export const broadcast2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'broadcast M,W',
  desc: {
    en: 'Broadcast a message and wait for listeners to complete.',
    zh: '广播一条消息并等待所有监听行为完成'
  },
  insertText: 'broadcast ${1:message}, true'
}

export const broadcast3: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'broadcast M,D,W',
  desc: { en: 'Broadcast a message with given data.', zh: '广播一条带有给定数据的消息' },
  insertText: 'broadcast ${1:message}, ${2:data}, ${3:wait}'
}

export const onStart: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onStart',
  desc: { en: 'Listen to game start.', zh: '游戏开始时执行' },
  insertText: 'onStart => {\n\t${1}\n}'
}

export const onClick: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onClick',
  desc: {
    en: 'Listen to current target (sprite / stage) clicked.',
    zh: '当前目标（精灵/舞台）被点击时执行'
  },
  insertText: 'onClick => {\n\t${1}\n}'
}

export const onAnyKey: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onAnyKey',
  desc: { en: 'Listen to any key pressed.', zh: '任意按键被按下时执行' },
  insertText: 'onAnyKey key => {\n\t${1}\n}'
}

export const onKey: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onKey K',
  desc: { en: 'Listen to given key pressed.', zh: '给定的某个按键被按下时执行' },
  insertText: 'onKey ${1:key}, => {\n\t${2}\n}'
}

export const onKeys: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onKey [...]',
  desc: { en: 'Listen to given keys pressed.', zh: '给定的某些按键被按下时执行' },
  insertText: 'onKey ${1:[]}, key => {\n\t${2}\n}'
}

export const onMsg1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onMsg',
  desc: { en: 'Listen to any message broadcasted.', zh: '任意消息被广播时执行' },
  insertText: 'onMsg (message, data) => {\n\t${1}\n}'
}

export const onMsg2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onMsg M',
  desc: { en: 'Listen to give message broadcasted.', zh: '指定的消息被广播时执行' },
  insertText: 'onMsg ${1:message}, => {\n\t${2}\n}'
}

// TODO: rename "scene" to "backdrop"
export const onScene1: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onScene',
  desc: { en: 'Listen to scene switching.', zh: '场景切换时执行' },
  insertText: 'onScene scene => {\n\t${1}\n}'
}

export const onScene2: Snippet = {
  type: SnippetType.method,
  target: SnippetTarget.all,
  label: 'onScene S',
  desc: { en: 'Listen to switching for given scene.', zh: '切换到指定场景时执行' },
  insertText: 'onScene ${1:scene}, => {\n\t${2}\n}'
}

export const rand: Snippet = {
  type: SnippetType.function,
  target: SnippetTarget.all,
  label: 'rand',
  desc: { en: 'Generate a random number.', zh: '生成一个随机数' },
  insertText: 'rand(${1:from}, ${2:to})'
}

export const exit: Snippet = {
  type: SnippetType.function,
  target: SnippetTarget.all,
  label: 'exit',
  desc: { en: 'Exit the game.', zh: '退出游戏' },
  insertText: 'exit'
}

function defineConst(name: string, desc: LocaleMessage): Snippet {
  name = name[0].toUpperCase() + name.slice(1) // it's strange, but required
  return {
    type: SnippetType.constant,
    target: SnippetTarget.all,
    label: name,
    desc,
    insertText: name
  }
}

export const prev = defineConst('prev', { en: 'Previous item', zh: '上一项' })
export const next = defineConst('next', { en: 'Next item', zh: '下一项' })

export const up = defineConst('up', { en: 'Up direction', zh: '上' })
export const down = defineConst('down', { en: 'Down direction', zh: '下' })
export const left = defineConst('left', { en: 'Left direction', zh: '左' })
export const right = defineConst('right', { en: 'Right direction', zh: '右' })

export const mouse = defineConst('mouse', { en: 'Mouse', zh: '鼠标' })
export const edge = defineConst('edge', { en: 'Edge', zh: '边缘' })
export const edgeLeft = defineConst('edgeLeft', { en: 'Left edge', zh: '左边缘' })
export const edgeTop = defineConst('edgeTop', { en: 'Top edge', zh: '上边缘' })
export const edgeRight = defineConst('edgeRight', { en: 'Right edge', zh: '右边缘' })
export const edgeBottom = defineConst('edgeBottom', { en: 'Bottom edge', zh: '下边缘' })

export const keys = (
  [
    ['key0', { en: 'Key 0', zh: '按键 0' }],
    ['key1', { en: 'Key 1', zh: '按键 1' }],
    ['key2', { en: 'Key 2', zh: '按键 2' }],
    ['key3', { en: 'Key 3', zh: '按键 3' }],
    ['key4', { en: 'Key 4', zh: '按键 4' }],
    ['key5', { en: 'Key 5', zh: '按键 5' }],
    ['key6', { en: 'Key 6', zh: '按键 6' }],
    ['key7', { en: 'Key 7', zh: '按键 7' }],
    ['key8', { en: 'Key 8', zh: '按键 8' }],
    ['key9', { en: 'Key 9', zh: '按键 9' }],
    ['keyA', { en: 'Key A', zh: '按键 A' }],
    ['keyB', { en: 'Key B', zh: '按键 B' }],
    ['keyC', { en: 'Key C', zh: '按键 C' }],
    ['keyD', { en: 'Key D', zh: '按键 D' }],
    ['keyE', { en: 'Key E', zh: '按键 E' }],
    ['keyF', { en: 'Key F', zh: '按键 F' }],
    ['keyG', { en: 'Key G', zh: '按键 G' }],
    ['keyH', { en: 'Key H', zh: '按键 H' }],
    ['keyI', { en: 'Key I', zh: '按键 I' }],
    ['keyJ', { en: 'Key J', zh: '按键 J' }],
    ['keyK', { en: 'Key K', zh: '按键 K' }],
    ['keyL', { en: 'Key L', zh: '按键 L' }],
    ['keyM', { en: 'Key M', zh: '按键 M' }],
    ['keyN', { en: 'Key N', zh: '按键 N' }],
    ['keyO', { en: 'Key O', zh: '按键 O' }],
    ['keyP', { en: 'Key P', zh: '按键 P' }],
    ['keyQ', { en: 'Key Q', zh: '按键 Q' }],
    ['keyR', { en: 'Key R', zh: '按键 R' }],
    ['keyS', { en: 'Key S', zh: '按键 S' }],
    ['keyT', { en: 'Key T', zh: '按键 T' }],
    ['keyU', { en: 'Key U', zh: '按键 U' }],
    ['keyV', { en: 'Key V', zh: '按键 V' }],
    ['keyW', { en: 'Key W', zh: '按键 W' }],
    ['keyX', { en: 'Key X', zh: '按键 X' }],
    ['keyY', { en: 'Key Y', zh: '按键 Y' }],
    ['keyZ', { en: 'Key Z', zh: '按键 Z' }],
    ['keyApostrophe', { en: 'Key Apostrophe', zh: '按键 Apostrophe' }],
    ['keyBackslash', { en: 'Key Backslash', zh: '按键 Backslash' }],
    ['keyBackspace', { en: 'Key Backspace', zh: '按键 Backspace' }],
    ['keyCapsLock', { en: 'Key Caps Lock', zh: '按键 Caps Lock' }],
    ['keyComma', { en: 'Key Comma', zh: '按键 Comma' }],
    ['keyDelete', { en: 'Key Delete', zh: '按键 Delete' }],
    ['keyDown', { en: 'Key Down', zh: '按键 Down' }],
    ['keyEnd', { en: 'Key End', zh: '按键 End' }],
    ['keyEnter', { en: 'Key Enter', zh: '按键 Enter' }],
    ['keyEqual', { en: 'Key Equal', zh: '按键 Equal' }],
    ['keyEscape', { en: 'Key Escape', zh: '按键 Escape' }],
    ['keyF1', { en: 'Key F1', zh: '按键 F1' }],
    ['keyF2', { en: 'Key F2', zh: '按键 F2' }],
    ['keyF3', { en: 'Key F3', zh: '按键 F3' }],
    ['keyF4', { en: 'Key F4', zh: '按键 F4' }],
    ['keyF5', { en: 'Key F5', zh: '按键 F5' }],
    ['keyF6', { en: 'Key F6', zh: '按键 F6' }],
    ['keyF7', { en: 'Key F7', zh: '按键 F7' }],
    ['keyF8', { en: 'Key F8', zh: '按键 F8' }],
    ['keyF9', { en: 'Key F9', zh: '按键 F9' }],
    ['keyF10', { en: 'Key F10', zh: '按键 F10' }],
    ['keyF11', { en: 'Key F11', zh: '按键 F11' }],
    ['keyF12', { en: 'Key F12', zh: '按键 F12' }],
    ['keyGraveAccent', { en: 'Key Grave Accent', zh: '按键 Grave Accent' }],
    ['keyHome', { en: 'Key Home', zh: '按键 Home' }],
    ['keyInsert', { en: 'Key Insert', zh: '按键 Insert' }],
    ['keyKP0', { en: 'Keypad 0', zh: '按键 0' }],
    ['keyKP1', { en: 'Keypad 1', zh: '按键 1' }],
    ['keyKP2', { en: 'Keypad 2', zh: '按键 2' }],
    ['keyKP3', { en: 'Keypad 3', zh: '按键 3' }],
    ['keyKP4', { en: 'Keypad 4', zh: '按键 4' }],
    ['keyKP5', { en: 'Keypad 5', zh: '按键 5' }],
    ['keyKP6', { en: 'Keypad 6', zh: '按键 6' }],
    ['keyKP7', { en: 'Keypad 7', zh: '按键 7' }],
    ['keyKP8', { en: 'Keypad 8', zh: '按键 8' }],
    ['keyKP9', { en: 'Keypad 9', zh: '按键 9' }],
    ['keyKPDecimal', { en: 'Keypad Decimal', zh: '按键 Decimal' }],
    ['keyKPDivide', { en: 'Keypad Divide', zh: '按键 Divide' }],
    ['keyKPEnter', { en: 'Keypad Enter', zh: '按键 Enter' }],
    ['keyKPEqual', { en: 'Keypad Equal', zh: '按键 Equal' }],
    ['keyKPMultiply', { en: 'Keypad Multiply', zh: '按键 Multiply' }],
    ['keyKPSubtract', { en: 'Keypad Subtract', zh: '按键 Subtract' }],
    ['keyLeft', { en: 'Key Left', zh: '按键 Left' }],
    ['keyLeftBracket', { en: 'Key Left Bracket', zh: '按键 Left Bracket' }],
    ['keyMenu', { en: 'Key Menu', zh: '按键 Menu' }],
    ['keyMinus', { en: 'Key Minus', zh: '按键 Minus' }],
    ['keyNumLock', { en: 'Key Num Lock', zh: '按键 Num Lock' }],
    ['keyPageDown', { en: 'Key Page Down', zh: '按键 Page Down' }],
    ['keyPageUp', { en: 'Key Page Up', zh: '按键 Page Up' }],
    ['keyPause', { en: 'Key Pause', zh: '按键 Pause' }],
    ['keyPeriod', { en: 'Key Period', zh: '按键 Period' }],
    ['keyPrintScreen', { en: 'Key Print Screen', zh: '按键 Print Screen' }],
    ['keyRight', { en: 'Key Right', zh: '按键 Right' }],
    ['keyRightBracket', { en: 'Key Right Bracket', zh: '按键 Right Bracket' }],
    ['keyScrollLock', { en: 'Key Scroll Lock', zh: '按键 Scroll Lock' }],
    ['keySemicolon', { en: 'Key Semicolon', zh: '按键 Semicolon' }],
    ['keySlash', { en: 'Key Slash', zh: '按键 Slash' }],
    ['keySpace', { en: 'Key Space', zh: '按键 Space' }],
    ['keyTab', { en: 'Key Tab', zh: '按键 Tab' }],
    ['keyUp', { en: 'Key Up', zh: '按键 Up' }],
    ['keyAlt', { en: 'Key Alt', zh: '按键 Alt' }],
    ['keyControl', { en: 'Key Control', zh: '按键 Control' }],
    ['keyShift', { en: 'Key Shift', zh: '按键 Shift' }],
    ['keyMax', { en: 'Key Max', zh: '按键 Max' }],
    ['keyAny', { en: 'Any key', zh: '任意按键' }]
  ] as const
).map(([key, desc]) => defineConst(key, desc))

export const playRewind = defineConst('playRewind', { en: 'Rewind', zh: '倒带' })
export const playContinue = defineConst('playContinue', { en: 'Continue', zh: '继续' })
export const playPause = defineConst('playPause', { en: 'Pause', zh: '暂停' })
export const playResume = defineConst('playResume', { en: 'Resume', zh: '恢复' })
export const playStop = defineConst('playStop', { en: 'Stop', zh: '停止' })
