/**
 * @file Definitions from spx
 */

import type { LocaleMessage } from '@/utils/i18n'
import { type Tool, ToolType, ToolContext, ToolCallEffect } from './common'

export const clone: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'clone',
  desc: {
    en: 'Make a clone of current sprite, with optional data (for `OnCloned` callback)',
    zh: '复制当前精灵，可传递数据给 `OnCloned` 回调'
  },
  usage: {
    sample: 'clone',
    insertText: 'clone'
  }
}

export const onCloned: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.sprite,
  keyword: 'onCloned',
  desc: { en: 'Listen to current sprite cloned', zh: '当前精灵被复制时执行' },
  usage: {
    sample: 'onCloned => {}',
    insertText: 'onCloned => {\n\t${1}\n}'
  }
}

// For now `onTouched` is not exposed to the user
// As it behaves strangely in the current implementation, see details in https://github.com/goplus/spx/issues/298
export const onTouched: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.sprite,
  keyword: 'onTouched',
  desc: {
    en: 'Listen to current sprite touched by other sprites',
    zh: '当前精灵与其他精灵接触时执行'
  },
  usages: [
    {
      desc: { en: 'By any other sprites', zh: '任意精灵' },
      sample: 'onTouched target => {}',
      insertText: 'onTouched target => {\n\t${1}\n}'
    },
    {
      desc: { en: 'By the given sprite', zh: '指定精灵' },
      sample: 'onTouched S1, => {}',
      insertText: 'onTouched ${1:sprite}, => {\n\t${2}\n}'
    },
    {
      desc: { en: 'By some given sprites', zh: '指定的某些精灵' },
      sample: 'onTouched [S1, S2], => {}',
      insertText: 'onTouched [${1:}], => {\n\t${2}\n}'
    }
  ]
}

export const onMoving: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.sprite,
  keyword: 'onMoving',
  desc: {
    en: 'Listen to current sprite moving (position change)',
    zh: '当前精灵移动（位置改变）时执行'
  },
  usage: {
    sample: 'onMoving => {}',
    insertText: 'onMoving => {\n\t${1}\n}'
  }
}

export const onTurning: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.sprite,
  keyword: 'onTurning',
  desc: {
    en: 'Listen to current sprite turning (heading change)',
    zh: '当前精灵转向（朝向改变）时执行'
  },
  usage: {
    sample: 'onTurning => {}',
    insertText: 'onTurning => {\n\t${1}\n}'
  }
}

export const die: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'die',
  desc: { en: 'Let current sprite die', zh: '让当前精灵死亡' },
  usage: {
    sample: 'die',
    insertText: 'die'
  }
}

export const hide: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'hide',
  desc: { en: 'Make current sprite invisible', zh: '使当前精灵不可见' },
  usage: {
    sample: 'hide',
    insertText: 'hide'
  }
}

export const show: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'show',
  desc: { en: 'Make current sprite visible', zh: '使当前精灵可见' },
  usage: {
    sample: 'show',
    insertText: 'show'
  }
}

export const visible: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'visible',
  desc: { en: 'If current sprite visible', zh: '当前精灵是否可见' },
  usage: {
    sample: 'visible',
    insertText: 'visible'
  }
}

export const costumeName: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'costumeName',
  desc: { en: 'The name of the current costume', zh: '当前造型的名称' },
  usage: {
    sample: 'costumeName',
    insertText: 'costumeName'
  }
}

export const costumeIndex: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'costumeIndex',
  desc: { en: 'The index of the current costume', zh: '当前造型的索引' },
  usage: {
    sample: 'costumeIndex',
    insertText: 'costumeIndex'
  }
}

export const setCostume: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'setCostume',
  desc: {
    en: 'Set the current costume by specifying name or index',
    zh: '通过指定名称或索引设置当前造型'
  },
  usage: {
    sample: 'setCostume 0',
    insertText: 'setCostume ${1:nameOrIndex}'
  }
}

export const nextCostume: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'nextCostume',
  desc: { en: 'Switch to the next costume', zh: '切换到下一个造型' },
  usage: {
    sample: 'nextCostume',
    insertText: 'nextCostume'
  }
}

export const prevCostume: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'prevCostume',
  desc: { en: 'Switch to the previous costume', zh: '切换到上一个造型' },
  usage: {
    sample: 'prevCostume',
    insertText: 'prevCostume'
  }
}

export const say: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'say',
  desc: { en: 'Make the sprite say some word', zh: '使精灵说出一些话' },
  usages: [
    {
      desc: { en: 'Without duration', zh: '不指定持续时间' },
      sample: 'say "Hello!"',
      insertText: 'say ${1:""}'
    },
    {
      desc: { en: 'With duration', zh: '指定持续时间' },
      sample: 'say "Hello!", 2',
      insertText: 'say ${1:""}, ${2:seconds}'
    }
  ]
}

export const think: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'think',
  desc: { en: 'Make the sprite think of some word', zh: '使精灵思考一些内容' },
  usages: [
    {
      desc: { en: 'Without duration', zh: '不指定持续时间' },
      sample: 'think "Wow!"',
      insertText: 'think ${1:""}'
    },
    {
      desc: { en: 'With duration', zh: '指定持续时间' },
      sample: 'think "Wow!", 2',
      insertText: 'think ${1:""}, ${2:seconds}'
    }
  ]
}

export const distanceTo: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'distanceTo',
  desc: {
    en: 'Get the distance from current sprite to given target',
    zh: '获取当前精灵到指定目标的距离'
  },
  usage: {
    sample: 'distanceTo Sprite1',
    insertText: 'distanceTo(${1:target})'
  }
}

export const move: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'move',
  desc: { en: 'Move given steps, toward current heading', zh: '向当前朝向移动指定的步数' },
  usage: {
    sample: 'move 10',
    insertText: 'move ${1:steps}'
  }
}

export const goto: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'goto',
  desc: { en: 'Move to given target', zh: '移动到指定目标' },
  usage: {
    sample: 'goto Sprite1',
    insertText: 'goto ${1:target}'
  }
}

export const glide: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'glide',
  desc: {
    en: 'Move to given position or target, with glide animation',
    zh: '滑行到指定位置或目标'
  },
  usages: [
    {
      desc: { en: 'To position (X, Y)', zh: '指定位置（X，Y）' },
      sample: 'glide 50, -50, 2',
      insertText: 'glide ${1:X}, ${2:Y}, ${3:seconds}'
    },
    {
      desc: { en: 'To target', zh: '指定目标' },
      sample: 'glide Sprite1, 2',
      insertText: 'glide ${1:target}, ${2:seconds}'
    }
  ]
}

export const setXYpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'setXYpos',
  desc: { en: 'Move to given position', zh: '移动到指定位置' },
  usage: {
    sample: 'setXYpos 0, 0',
    insertText: 'setXYpos ${1:X}, ${2:Y}'
  }
}

export const changeXYpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'changeXYpos',
  desc: { en: 'Move with given position (X, Y) change', zh: '以指定的位置偏移移动（X，Y）' },
  usage: {
    sample: 'changeXYpos 10, 10',
    insertText: 'changeXYpos ${1:dX}, ${2:dY}'
  }
}

export const xpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'xpos',
  desc: { en: 'Get current X position', zh: '获取当前水平位置' },
  usage: {
    sample: 'xpos',
    insertText: 'xpos'
  }
}

export const setXpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'setXpos',
  desc: { en: 'Move to given X position', zh: '移动到指定的水平位置' },
  usage: {
    sample: 'setXpos 100',
    insertText: 'setXpos ${1:X}'
  }
}

export const changeXpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'changeXpos',
  desc: { en: 'Move with given X position change', zh: '指定水平方向偏移移动' },
  usage: {
    sample: 'changeXpos 10',
    insertText: 'changeXpos ${1:dX}'
  }
}

export const ypos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'ypos',
  desc: { en: 'Get current Y position', zh: '获取当前垂直位置' },
  usage: {
    sample: 'ypos',
    insertText: 'ypos'
  }
}

export const setYpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'setYpos',
  desc: { en: 'Move to given Y position', zh: '移动到指定的垂直位置' },
  usage: {
    sample: 'setYpos 100',
    insertText: 'setYpos ${1:Y}'
  }
}

export const changeYpos: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'changeYpos',
  desc: { en: 'Move with given Y position change', zh: '指定垂直方向偏移移动' },
  usage: {
    sample: 'changeYpos 10',
    insertText: 'changeYpos ${1:dY}'
  }
}

export const heading: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'heading',
  desc: { en: 'Get current heading direction', zh: '获取当前朝向' },
  usage: {
    sample: 'heading',
    insertText: 'heading'
  }
}

export const turnTo: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'turnTo',
  desc: { en: 'Turn heading to given direction or target', zh: '将朝向转到指定方向或目标' },
  usages: [
    {
      desc: { en: 'To direction', zh: '指定方向' },
      sample: 'turnTo 90',
      insertText: 'turnTo ${1:direction}'
    },
    {
      desc: { en: 'To target', zh: '指定目标' },
      sample: 'turnTo target',
      insertText: 'turnTo ${1:target}'
    }
  ]
}

export const setHeading: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'setHeading',
  desc: { en: 'Set heading to given value', zh: '设置朝向为给定值' },
  usage: {
    sample: 'setHeading Up',
    insertText: 'setHeading ${1:direction}'
  }
}

export const changeHeading: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'changeHeading',
  desc: { en: 'Change heading with given direction change', zh: '以给定的偏移值改变朝向' },
  usage: {
    sample: 'changeHeading 90',
    insertText: 'changeHeading ${1:dDirection}'
  }
}

export const size: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'size',
  desc: { en: 'Get the size of current sprite', zh: '获取当前精灵的大小' },
  usage: {
    sample: 'size',
    insertText: 'size'
  }
}

export const setSize: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'setSize',
  desc: { en: 'Set the size of current sprite', zh: '设置当前精灵的大小' },
  usage: {
    sample: 'setSize 2',
    insertText: 'setSize ${1:size}'
  }
}

export const changeSize: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'changeSize',
  desc: { en: 'Change the size of current sprite', zh: '改变当前精灵的大小' },
  usage: {
    sample: 'changeSize 1',
    insertText: 'changeSize ${1:dSize}'
  }
}

export const touching: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.sprite,
  keyword: 'touching',
  desc: {
    en: 'Check if current sprite touching specified touching target',
    zh: '检查当前精灵是否与指定目标接触'
  },
  usage: {
    sample: 'touching Edge',
    insertText: 'touching(${1:target})'
  }
}

export const bounceOffEdge: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.sprite,
  keyword: 'bounceOffEdge',
  desc: {
    en: 'Check & bounce off current sprite if touching the edge',
    zh: '如果当前精灵接触到边缘，则反弹'
  },
  usage: {
    sample: 'bounceOffEdge',
    insertText: 'bounceOffEdge'
  }
}

export const mouseHitItem: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'mouseHitItem',
  desc: { en: 'Get the topmost sprite which is hit by mouse', zh: '获取鼠标点击的最上层精灵' },
  usage: {
    sample: 'hitSprite, ok := mouseHitItem',
    insertText: '${1:sprite}, ${2:ok} := mouseHitItem'
  }
}

export const backdropName: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'backdropName',
  desc: { en: 'Get the name of the current backdrop', zh: '获取当前背景的名称' },
  usage: {
    sample: 'backdropName',
    insertText: 'backdropName'
  }
}

export const backdropIndex: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'backdropIndex',
  desc: { en: 'Get the index of the current backdrop', zh: '获取当前背景的索引' },
  usage: {
    sample: 'backdropIndex',
    insertText: 'backdropIndex'
  }
}

export const startBackdrop: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'startBackdrop',
  desc: {
    en: 'Set the current backdrop by specifying name or index',
    zh: '通过指定名称或索引切换背景'
  },
  usages: [
    {
      desc: { en: 'Without waiting', zh: '不等待背景切换完成' },
      sample: 'startBackdrop "backdrop1"',
      insertText: 'startBackdrop ${1:nameOrIndex}'
    },
    {
      desc: { en: 'With waiting', zh: '等待背景切换完成' },
      sample: 'startBackdrop "backdrop1", true',
      insertText: 'startBackdrop ${1:nameOrIndex}, true'
    }
  ]
}

export const nextBackdrop: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'nextBackdrop',
  desc: { en: 'Switch to the next backdrop', zh: '切换到下一个背景' },
  usages: [
    {
      desc: { en: 'Without waiting', zh: '不等待背景切换完成' },
      sample: 'nextBackdrop',
      insertText: 'nextBackdrop'
    },
    {
      desc: { en: 'With waiting', zh: '等待背景切换完成' },
      sample: 'nextBackdrop true',
      insertText: 'nextBackdrop true'
    }
  ]
}

export const prevBackdrop: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'prevBackdrop',
  desc: { en: 'Switch to the previous backdrop', zh: '切换到上一个背景' },
  usages: [
    {
      desc: { en: 'Without waiting', zh: '不等待背景切换完成' },
      sample: 'prevBackdrop',
      insertText: 'prevBackdrop'
    },
    {
      desc: { en: 'With waiting', zh: '等待背景切换完成' },
      sample: 'prevBackdrop true',
      insertText: 'prevBackdrop true'
    }
  ]
}

export const keyPressed: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'keyPressed',
  desc: { en: 'Check if given key is currently pressed', zh: '检查给定的按键当前是否被按下' },
  usage: {
    sample: 'keyPressed KeyA',
    insertText: 'keyPressed(${1:key})'
  }
}

export const mouseX: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'mouseX',
  desc: { en: 'Get X position of the mouse', zh: '获取鼠标的水平位置' },
  usage: {
    sample: 'mouseX',
    insertText: 'mouseX'
  }
}

export const mouseY: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'mouseY',
  desc: { en: 'Get Y position of the mouse', zh: '获取鼠标的垂直位置' },
  usage: {
    sample: 'mouseY',
    insertText: 'mouseY'
  }
}

export const mousePressed: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'mousePressed',
  desc: { en: 'Check if the mouse is currently pressed', zh: '检查鼠标当前是否被按下' },
  usage: {
    sample: 'mousePressed',
    insertText: 'mousePressed'
  }
}

export const wait: Tool = {
  type: ToolType.method,
  callEffect: undefined,
  target: ToolContext.all,
  keyword: 'wait',
  desc: {
    en: 'Block current execution (coroutine) for given seconds',
    zh: '阻塞当前的执行，并指定阻塞的秒数'
  },
  usage: {
    sample: 'wait 0.5',
    insertText: 'wait ${1:seconds}'
  }
}

export const play: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'play',
  desc: { en: 'Play sound with given name', zh: '播放声音（指定名字）' },
  usages: [
    {
      desc: { en: 'Without waiting', zh: '不等待播放完成' },
      sample: 'play "sound"',
      insertText: 'play ${1:""}'
    },
    {
      desc: { en: 'With waiting', zh: '等待播放完成' },
      sample: 'play "sound", true',
      insertText: 'play ${1:""}, true'
    }
    // TODO: error `undefined: Loop` with `insertText: 'play ${1:sound}, { Loop: true }'`
  ]
}

export const stopAllSounds: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'stopAllSounds',
  desc: { en: 'Stop all playing sounds', zh: '停止所有正在播放的声音' },
  usage: {
    sample: 'stopAllSounds',
    insertText: 'stopAllSounds'
  }
}

export const volume: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'volume',
  desc: { en: 'Get the volume for sounds', zh: '获取声音的音量' },
  usage: {
    sample: 'volume',
    insertText: 'volume'
  }
}

export const setVolume: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'setVolume',
  desc: { en: 'Set the volume for sounds', zh: '设置声音的音量' },
  usage: {
    sample: 'setVolume 100',
    insertText: 'setVolume ${1:volume}'
  }
}

export const changeVolume: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'changeVolume',
  desc: {
    en: 'Change the volume for sounds with given volume change',
    zh: '根据给定的音量变化改变声音的音量'
  },
  usage: {
    sample: 'changeVolume 100',
    insertText: 'changeVolume ${1:dVolume}'
  }
}

export const broadcast: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.write,
  target: ToolContext.all,
  keyword: 'broadcast',
  desc: {
    en: 'Broadcast a message',
    zh: '广播一条消息'
  },
  usages: [
    {
      desc: { en: 'Without waiting', zh: '不等待' },
      sample: 'broadcast "message"',
      insertText: 'broadcast ${1:"message"}'
    },
    {
      desc: { en: 'With waiting', zh: '等待' },
      sample: 'broadcast "message", true',
      insertText: 'broadcast ${1:"message"}, true'
    },
    {
      desc: { en: 'With data', zh: '带有数据' },
      sample: 'broadcast "message", data, false',
      insertText: 'broadcast ${1:"message"}, ${2:data}, false'
    },
    {
      desc: { en: 'With data and waiting', zh: '带有数据并等待' },
      sample: 'broadcast "message", data, true',
      insertText: 'broadcast ${1:"message"}, ${2:data}, true'
    }
  ]
}

export const onStart: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.all,
  keyword: 'onStart',
  desc: { en: 'Listen to game start', zh: '游戏开始时执行' },
  usage: {
    sample: 'onStart => {}',
    insertText: 'onStart => {\n\t${1}\n}'
  }
}

export const onClick: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.all,
  keyword: 'onClick',
  desc: {
    en: 'Listen to current target (sprite / stage) clicked',
    zh: '当前目标（精灵/舞台）被点击时执行'
  },
  usage: {
    sample: 'onClick => {}',
    insertText: 'onClick => {\n\t${1}\n}'
  }
}

export const onAnyKey: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.all,
  keyword: 'onAnyKey',
  desc: { en: 'Listen to any key pressed', zh: '任意按键被按下时执行' },
  usage: {
    sample: 'onAnyKey key => {}',
    insertText: 'onAnyKey key => {\n\t${1}\n}'
  }
}

export const onKey: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.all,
  keyword: 'onKey',
  desc: { en: 'Listen to given key(s) pressed', zh: '按键被按下时执行' },
  usages: [
    {
      desc: { en: 'Single key', zh: '单个按键' },
      sample: 'onKey Key1, => {}',
      insertText: 'onKey ${1:key}, => {\n\t${2}\n}'
    },
    {
      desc: { en: 'Multiple keys', zh: '多个按键' },
      sample: 'onKey [Key1, Key2], => {}',
      insertText: 'onKey [${1:}], key => {\n\t${2}\n}'
    }
  ]
}

export const onMsg: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.all,
  keyword: 'onMsg',
  desc: { en: 'Listen to message broadcasted', zh: '消息被广播时执行' },
  usages: [
    {
      desc: { en: 'Any message', zh: '任意消息' },
      sample: 'onMsg (message, data) => {}',
      insertText: 'onMsg (message, data) => {\n\t${1}\n}'
    },
    {
      desc: { en: 'Specific message', zh: '指定消息' },
      sample: 'onMsg "message", => {}',
      insertText: 'onMsg ${1:message}, => {\n\t${2}\n}'
    }
  ]
}

export const onBackdrop: Tool = {
  type: ToolType.method,
  callEffect: ToolCallEffect.listen,
  target: ToolContext.all,
  keyword: 'onBackdrop',
  desc: { en: 'Listen to backdrop switching', zh: '背景切换时执行' },
  usages: [
    {
      desc: { en: 'Any backdrop', zh: '任意背景' },
      sample: 'onBackdrop backdrop => {}',
      insertText: 'onBackdrop backdrop => {\n\t${1}\n}'
    },
    {
      desc: { en: 'Specific backdrop', zh: '指定背景' },
      sample: 'onBackdrop "backdrop1", => {}',
      insertText: 'onBackdrop ${1:backdrop}, => {\n\t${2}\n}'
    }
  ]
}

export const rand: Tool = {
  type: ToolType.function,
  callEffect: ToolCallEffect.read,
  target: ToolContext.all,
  keyword: 'rand',
  desc: { en: 'Generate a random number', zh: '生成一个随机数' },
  usage: {
    sample: 'rand(1, 10)',
    insertText: 'rand(${1:from}, ${2:to})'
  }
}

export const exit: Tool = {
  type: ToolType.function,
  callEffect: undefined,
  target: ToolContext.all,
  keyword: 'exit',
  desc: { en: 'Exit the game', zh: '退出游戏' },
  usage: {
    sample: 'exit',
    insertText: 'exit'
  }
}

function defineConst(name: string, desc: LocaleMessage): Tool {
  name = name[0].toUpperCase() + name.slice(1) // it's strange, but required
  return {
    type: ToolType.constant,
    target: ToolContext.all,
    keyword: name,
    desc,
    usage: {
      sample: name,
      insertText: name
    }
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
