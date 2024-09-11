/**
 * @file Tokens from spx
 */

import { type Token } from './types'

export const clone: Token = {
  id: {
    name: 'clone',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'clone sprite',
      sample: 'clone',
      insertText: 'clone'
    }
  ]
}

export const onCloned: Token = {
  id: {
    name: 'onCloned',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'Sprite',
      declaration: 'func(onCloned func())',
      sample: 'onCloned => {}',
      insertText: 'onCloned => {\n\t${1}\n}'
    }
  ]
}

export const onTouched: Token = {
  id: {
    name: 'onTouched',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'Sprite',
      declaration: 'func(onCloned func())',
      sample: 'onTouched target => {}',
      insertText: 'onTouched target => {\n\t${1}\n}'
    },
    {
      id: '3',
      effect: 'Sprite',
      declaration: 'func(name string, onTouched func())',
      sample: 'name onTouched',
      insertText: 'onTouched ${1:name}, => {\n\t${2}\n}'
    },
    {
      id: '5',
      effect: 'Sprite',
      declaration: 'func(names []string, onTouched func())',
      sample: 'name onTouched',
      insertText: 'onTouched ${1:names}, => {\n\t${2}\n}'
    }
  ]
}

export const onMoving: Token = {
  id: {
    name: 'onMoving',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'Sprite',
      declaration: 'func(onMoving func())',
      sample: 'onMoving',
      insertText: 'onMoving => {\n\t${1}\n}'
    }
  ]
}

export const onTurning: Token = {
  id: {
    name: 'onTurning',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'Sprite',
      declaration: 'func(onTurning func())',
      sample: 'onTurning',
      insertText: 'onTurning => {\n\t${1}\n}'
    }
  ]
}

export const die: Token = {
  id: {
    name: 'die',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'die',
      sample: '',
      insertText: 'die'
    }
  ]
}

export const hide: Token = {
  id: {
    name: 'hide',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'hide'
    }
  ]
}

export const show: Token = {
  id: {
    name: 'show',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'show'
    }
  ]
}

export const visible: Token = {
  id: {
    name: 'visible',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() bool',
      sample: '',
      insertText: 'visible'
    }
  ]
}

export const costumeName: Token = {
  id: {
    name: 'costumeName',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() string',
      sample: '',
      insertText: 'costumeName'
    }
  ]
}

export const costumeIndex: Token = {
  id: {
    name: 'costumeIndex',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() int',
      sample: '',
      insertText: 'costumeIndex'
    }
  ]
}

export const setCostume: Token = {
  id: {
    name: 'setCostume',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(costume interface{})',
      sample: 'costume',
      insertText: 'setCostume ${1:costume}'
    }
  ]
}

export const nextCostume: Token = {
  id: {
    name: 'nextCostume',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'nextCostume'
    }
  ]
}

export const prevCostume: Token = {
  id: {
    name: 'prevCostume',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'prevCostume'
    }
  ]
}

export const animate: Token = {
  id: {
    name: 'animate',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(name string)',
      sample: 'name',
      insertText: 'animate ${1:name}'
    }
  ]
}

export const say: Token = {
  id: {
    name: 'say',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(msg interface{}, secs ...float64)',
      sample: 'msg secs',
      insertText: 'say ${1:msg}, ${2:secs}'
    }
  ]
}

export const think: Token = {
  id: {
    name: 'think',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(msg interface{}, secs ...float64)',
      sample: 'msg secs',
      insertText: 'think ${1:msg}, ${2:secs}'
    }
  ]
}

export const distanceTo: Token = {
  id: {
    name: 'distanceTo',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(obj interface{}) float64',
      sample: 'obj',
      insertText: 'distanceTo ${1:obj}'
    }
  ]
}

export const move: Token = {
  id: {
    name: 'move',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'Sprite',
      declaration: 'func(step int)',
      sample: 'step',
      insertText: 'move ${1:step}'
    }
  ]
}

export const step: Token = {
  id: {
    name: 'step',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(step int)',
      sample: 'step',
      insertText: 'step ${1:step}'
    }
  ]
}

export const goto: Token = {
  id: {
    name: 'goto',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(obj interface{})',
      sample: 'obj',
      insertText: 'Goto ${1:obj}'
    }
  ]
}

export const glide: Token = {
  id: {
    name: 'glide',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(x float64, y float64, secs float64)',
      sample: 'x y secs',
      insertText: 'glide ${1:x}, ${2:y}, ${3:secs}'
    },
    {
      id: '1',
      effect: 'Sprite',
      declaration: 'func(obj interface{}, secs float64)',
      sample: 'obj secs',
      insertText: 'glide ${1:obj}, ${2:secs}'
    }
  ]
}

export const setXYpos: Token = {
  id: {
    name: 'setXYpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(x float64, y float64)',
      sample: 'x y',
      insertText: 'setXYpos ${1:x}, ${2:y}'
    }
  ]
}

export const changeXYpos: Token = {
  id: {
    name: 'changeXYpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(dx float64, dy float64)',
      sample: 'dx dy',
      insertText: 'changeXYpos ${1:dx}, ${2:dy}'
    }
  ]
}

export const xpos: Token = {
  id: {
    name: 'xpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() float64',
      sample: '',
      insertText: 'xpos'
    }
  ]
}

export const setXpos: Token = {
  id: {
    name: 'setXpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(x float64)',
      sample: 'x',
      insertText: 'setXpos ${1:x}'
    }
  ]
}

export const changeXpos: Token = {
  id: {
    name: 'changeXpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(dx float64)',
      sample: 'dx',
      insertText: 'changeXpos ${1:dx}'
    }
  ]
}

export const ypos: Token = {
  id: {
    name: 'ypos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() float64',
      sample: '',
      insertText: 'ypos'
    }
  ]
}

export const setYpos: Token = {
  id: {
    name: 'setYpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(y float64)',
      sample: 'y',
      insertText: 'setYpos ${1:y}'
    }
  ]
}

export const changeYpos: Token = {
  id: {
    name: 'changeYpos',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(dy float64)',
      sample: 'dy',
      insertText: 'changeYpos ${1:dy}'
    }
  ]
}

export const setRotationStyle: Token = {
  id: {
    name: 'setRotationStyle',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(style github.com/goplus/spx.RotationStyle)',
      sample: 'style',
      insertText: 'setRotationStyle ${1:style}'
    }
  ]
}

export const heading: Token = {
  id: {
    name: 'heading',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() float64',
      sample: '',
      insertText: 'heading'
    }
  ]
}

export const turnTo: Token = {
  id: {
    name: 'turnTo',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(obj interface{})',
      sample: 'obj',
      insertText: 'turnTo ${1:obj}'
    }
  ]
}

export const setHeading: Token = {
  id: {
    name: 'setHeading',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(dir float64)',
      sample: 'dir',
      insertText: 'setHeading ${1:dir}'
    }
  ]
}

export const changeHeading: Token = {
  id: {
    name: 'changeHeading',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(dir float64)',
      sample: 'dir',
      insertText: 'changeHeading ${1:dir}'
    }
  ]
}

export const size: Token = {
  id: {
    name: 'size',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func() float64',
      sample: '',
      insertText: 'size'
    }
  ]
}

export const setSize: Token = {
  id: {
    name: 'setSize',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(size float64)',
      sample: 'size',
      insertText: 'setSize ${1:size}'
    }
  ]
}

export const changeSize: Token = {
  id: {
    name: 'changeSize',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(delta float64)',
      sample: 'delta',
      insertText: 'changeSize ${1:delta}'
    }
  ]
}

export const touching: Token = {
  id: {
    name: 'touching',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func(obj interface{}) bool',
      sample: 'obj',
      insertText: 'touching ${1:obj}'
    }
  ]
}

export const bounceOffEdge: Token = {
  id: {
    name: 'bounceOffEdge',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'bounceOffEdge'
    }
  ]
}

export const mouseHitItem: Token = {
  id: {
    name: 'mouseHitItem',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() (target *github.com/goplus/spx.Sprite, ok bool)',
      sample: '',
      insertText: 'mouseHitItem'
    }
  ]
}

export const backdropName: Token = {
  id: {
    name: 'backdropName',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() string',
      sample: '',
      insertText: 'backdropName'
    }
  ]
}

export const backdropIndex: Token = {
  id: {
    name: 'backdropIndex',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() int',
      sample: '',
      insertText: 'backdropIndex'
    }
  ]
}

export const startBackdrop: Token = {
  id: {
    name: 'startBackdrop',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(backdrop interface{}, wait ...bool)',
      sample: 'backdrop wait',
      insertText: 'startBackdrop ${1:backdrop}, ${2:wait}'
    }
  ]
}

export const nextBackdrop: Token = {
  id: {
    name: 'nextBackdrop',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(wait ...bool)',
      sample: 'wait',
      insertText: 'nextBackdrop ${1:wait}'
    }
  ]
}

export const prevBackdrop: Token = {
  id: {
    name: 'prevBackdrop',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(wait ...bool)',
      sample: 'wait',
      insertText: 'prevBackdrop ${1:wait}'
    }
  ]
}

export const keyPressed: Token = {
  id: {
    name: 'keyPressed',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(key github.com/hajimehoshi/ebiten/v2.Key) bool',
      sample: 'key',
      insertText: 'keyPressed ${1:key}'
    }
  ]
}

export const mouseX: Token = {
  id: {
    name: 'mouseX',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() float64',
      sample: '',
      insertText: 'mouseX'
    }
  ]
}

export const mouseY: Token = {
  id: {
    name: 'mouseY',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() float64',
      sample: '',
      insertText: 'mouseY'
    }
  ]
}

export const mousePressed: Token = {
  id: {
    name: 'mousePressed',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() bool',
      sample: '',
      insertText: 'mousePressed'
    }
  ]
}

export const wait: Token = {
  id: {
    name: 'wait',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(secs float64)',
      sample: 'secs',
      insertText: 'wait ${1:secs}'
    }
  ]
}

export const play: Token = {
  id: {
    name: 'play',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(media github.com/goplus/spx.Sound, wait bool, loop bool) (err error)',
      sample: 'media wait loop',
      insertText: 'play ${1:media}, ${2:wait}, ${3:loop}'
    }
  ]
}

export const stopAllSounds: Token = {
  id: {
    name: 'stopAllSounds',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func()',
      sample: '',
      insertText: 'stopAllSounds'
    }
  ]
}

export const volume: Token = {
  id: {
    name: 'volume',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func() float64',
      sample: '',
      insertText: 'volume'
    }
  ]
}

export const setVolume: Token = {
  id: {
    name: 'setVolume',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(volume float64)',
      sample: 'volume',
      insertText: 'setVolume ${1:volume}'
    }
  ]
}

export const changeVolume: Token = {
  id: {
    name: 'changeVolume',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(delta float64)',
      sample: 'delta',
      insertText: 'changeVolume ${1:delta}'
    }
  ]
}

export const broadcast: Token = {
  id: {
    name: 'broadcast',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(msg string)',
      sample: 'msg',
      insertText: 'broadcast ${1:msg}'
    },
    {
      id: '1',
      effect: 'All',
      declaration: 'func(msg string, wait bool)',
      sample: 'msg wait',
      insertText: 'broadcast ${1:msg}, ${2:wait}'
    },
    {
      id: '2',
      effect: 'All',
      declaration: 'func(msg string, data interface{}, wait bool)',
      sample: 'msg data wait',
      insertText: 'broadcast ${1:msg}, ${2:data}, ${3:wait}'
    }
  ]
}

export const onStart: Token = {
  id: {
    name: 'onStart',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(onStart func())',
      sample: 'onStart',
      insertText: 'onStart => {\n\t${1}\n}'
    }
  ]
}

export const onClick: Token = {
  id: {
    name: 'onClick',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(onClick func())',
      sample: 'onClick',
      insertText: 'onClick => {\n\t${1}\n}'
    }
  ]
}

export const onAnyKey: Token = {
  id: {
    name: 'onAnyKey',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(onKey func(key github.com/hajimehoshi/ebiten/v2.Key)',
      sample: 'onKey',
      insertText: 'onAnyKey => {\n\t${1}\n}'
    }
  ]
}

export const onKey: Token = {
  id: {
    name: 'onKey',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(key github.com/hajimehoshi/ebiten/v2.Key, onKey func())',
      sample: 'onKey onKey',
      insertText: 'onKey ${1:key}, => {\n\t${2}\n}'
    },
    {
      id: '2',
      effect: 'All',
      declaration: 'func(key github.com/hajimehoshi/ebiten/v2.Key, onKey func()',
      sample: 'onKey onKey',
      insertText: 'onKey ${1:keys}, => {\n\t${2}\n}'
    }
  ]
}

export const onMsg: Token = {
  id: {
    name: 'onMsg',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(onMsg func(msg string, data interface{}))',
      sample: 'onMsg',
      insertText: 'onMsg => {\n\t${1}\n}'
    },
    {
      id: '1',
      effect: 'All',
      declaration: 'func(msg string, onMsg func())',
      sample: 'msg onMsg',
      insertText: 'onMsg ${1:msg}, => {\n\t${2}\n}'
    }
  ]
}

export const onBackdrop: Token = {
  id: {
    name: 'onBackdrop',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(onBackdrop func(name string))',
      sample: 'onBackdrop',
      insertText: 'onBackdrop => {\n\t${1}\n}'
    },
    {
      id: '1',
      effect: 'All',
      declaration: 'func(name string, onBackdrop func())',
      sample: 'name onBackdrop',
      insertText: 'onBackdrop ${1:name}, => {\n\t${2}\n}'
    }
  ]
}

export const rand: Token = {
  id: {
    name: 'rand',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func(from, to float64)',
      sample: 'from to',
      insertText: 'rand(${1:from}, ${2:to})'
    }
  ]
}

export const exit: Token = {
  id: {
    name: 'exit',
    module: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'All',
      declaration: 'func()',
      sample: 'exit',
      insertText: 'exit'
    }
  ]
}

export function defineConst(name: string, module: string): Token {
  const token: Token = {
    id: {
      name,
      module
    },
    usages: [
      {
        id: '0',
        effect: 'All',
        declaration: 'const',
        sample: '',
        insertText: name
      }
    ]
  }
  return token
}

export const prev = defineConst('prev', 'github.com/goplus/spx')
export const next = defineConst('next', 'github.com/goplus/spx')

export const up = defineConst('up', 'github.com/goplus/spx')
export const down = defineConst('down', 'github.com/goplus/spx')
export const left = defineConst('left', 'github.com/goplus/spx')
export const right = defineConst('right', 'github.com/goplus/spx')

export const none = defineConst('none', 'github.com/goplus/spx')
export const leftRight = defineConst('leftRight', 'github.com/goplus/spx')
export const normal = defineConst('normal', 'github.com/goplus/spx')

export const mouse = defineConst('mouse', 'github.com/goplus/spx')
export const edge = defineConst('edge', 'github.com/goplus/spx')
export const edgeLeft = defineConst('edgeLeft', 'github.com/goplus/spx')
export const edgeTop = defineConst('edgeTop', 'github.com/goplus/spx')
export const edgeRight = defineConst('edgeRight', 'github.com/goplus/spx')
export const edgeBottom = defineConst('edgeBottom', 'github.com/goplus/spx')

export const keys = (
  [
    ['key0', 'github.com/goplus/spx'],
    ['key1', 'github.com/goplus/spx'],
    ['key2', 'github.com/goplus/spx'],
    ['key3', 'github.com/goplus/spx'],
    ['key4', 'github.com/goplus/spx'],
    ['key5', 'github.com/goplus/spx'],
    ['key6', 'github.com/goplus/spx'],
    ['key7', 'github.com/goplus/spx'],
    ['key8', 'github.com/goplus/spx'],
    ['key9', 'github.com/goplus/spx'],
    ['keyA', 'github.com/goplus/spx'],
    ['keyB', 'github.com/goplus/spx'],
    ['keyC', 'github.com/goplus/spx'],
    ['keyD', 'github.com/goplus/spx'],
    ['keyE', 'github.com/goplus/spx'],
    ['keyF', 'github.com/goplus/spx'],
    ['keyG', 'github.com/goplus/spx'],
    ['keyH', 'github.com/goplus/spx'],
    ['keyI', 'github.com/goplus/spx'],
    ['keyJ', 'github.com/goplus/spx'],
    ['keyK', 'github.com/goplus/spx'],
    ['keyL', 'github.com/goplus/spx'],
    ['keyM', 'github.com/goplus/spx'],
    ['keyN', 'github.com/goplus/spx'],
    ['keyO', 'github.com/goplus/spx'],
    ['keyP', 'github.com/goplus/spx'],
    ['keyQ', 'github.com/goplus/spx'],
    ['keyR', 'github.com/goplus/spx'],
    ['keyS', 'github.com/goplus/spx'],
    ['keyT', 'github.com/goplus/spx'],
    ['keyU', 'github.com/goplus/spx'],
    ['keyV', 'github.com/goplus/spx'],
    ['keyW', 'github.com/goplus/spx'],
    ['keyX', 'github.com/goplus/spx'],
    ['keyY', 'github.com/goplus/spx'],
    ['keyZ', 'github.com/goplus/spx'],
    ['keyApostrophe', 'github.com/goplus/spx'],
    ['keyBackslash', 'github.com/goplus/spx'],
    ['keyBackspace', 'github.com/goplus/spx'],
    ['keyCapsLock', 'github.com/goplus/spx'],
    ['keyComma', 'github.com/goplus/spx'],
    ['keyDelete', 'github.com/goplus/spx'],
    ['keyDown', 'github.com/goplus/spx'],
    ['keyEnd', 'github.com/goplus/spx'],
    ['keyEnter', 'github.com/goplus/spx'],
    ['keyEqual', 'github.com/goplus/spx'],
    ['keyEscape', 'github.com/goplus/spx'],
    ['keyF1', 'github.com/goplus/spx'],
    ['keyF2', 'github.com/goplus/spx'],
    ['keyF3', 'github.com/goplus/spx'],
    ['keyF4', 'github.com/goplus/spx'],
    ['keyF5', 'github.com/goplus/spx'],
    ['keyF6', 'github.com/goplus/spx'],
    ['keyF7', 'github.com/goplus/spx'],
    ['keyF8', 'github.com/goplus/spx'],
    ['keyF9', 'github.com/goplus/spx'],
    ['keyF10', 'github.com/goplus/spx'],
    ['keyF11', 'github.com/goplus/spx'],
    ['keyF12', 'github.com/goplus/spx'],
    ['keyGraveAccent', 'github.com/goplus/spx'],
    ['keyHome', 'github.com/goplus/spx'],
    ['keyInsert', 'github.com/goplus/spx'],
    ['keyKP0', 'github.com/goplus/spx'],
    ['keyKP1', 'github.com/goplus/spx'],
    ['keyKP2', 'github.com/goplus/spx'],
    ['keyKP3', 'github.com/goplus/spx'],
    ['keyKP4', 'github.com/goplus/spx'],
    ['keyKP5', 'github.com/goplus/spx'],
    ['keyKP6', 'github.com/goplus/spx'],
    ['keyKP7', 'github.com/goplus/spx'],
    ['keyKP8', 'github.com/goplus/spx'],
    ['keyKP9', 'github.com/goplus/spx'],
    ['keyKPDecimal', 'github.com/goplus/spx'],
    ['keyKPDivide', 'github.com/goplus/spx'],
    ['keyKPEnter', 'github.com/goplus/spx'],
    ['keyKPEqual', 'github.com/goplus/spx'],
    ['keyKPMultiply', 'github.com/goplus/spx'],
    ['keyKPSubtract', 'github.com/goplus/spx'],
    ['keyLeft', 'github.com/goplus/spx'],
    ['keyLeftBracket', 'github.com/goplus/spx'],
    ['keyMenu', 'github.com/goplus/spx'],
    ['keyMinus', 'github.com/goplus/spx'],
    ['keyNumLock', 'github.com/goplus/spx'],
    ['keyPageDown', 'github.com/goplus/spx'],
    ['keyPageUp', 'github.com/goplus/spx'],
    ['keyPause', 'github.com/goplus/spx'],
    ['keyPeriod', 'github.com/goplus/spx'],
    ['keyPrintScreen', 'github.com/goplus/spx'],
    ['keyRight', 'github.com/goplus/spx'],
    ['keyRightBracket', 'github.com/goplus/spx'],
    ['keyScrollLock', 'github.com/goplus/spx'],
    ['keySemicolon', 'github.com/goplus/spx'],
    ['keySlash', 'github.com/goplus/spx'],
    ['keySpace', 'github.com/goplus/spx'],
    ['keyTab', 'github.com/goplus/spx'],
    ['keyUp', 'github.com/goplus/spx'],
    ['keyAlt', 'github.com/goplus/spx'],
    ['keyControl', 'github.com/goplus/spx'],
    ['keyShift', 'github.com/goplus/spx'],
    ['keyMax', 'github.com/goplus/spx'],
    ['keyAny', 'github.com/goplus/spx']
  ] as const
).map(([key, pkg]) => defineConst(key, pkg))

export const playRewind = defineConst('playRewind', 'github.com/goplus/spx')
export const playContinue = defineConst('playContinue', 'github.com/goplus/spx')
export const playPause = defineConst('playPause', 'github.com/goplus/spx')
export const playResume = defineConst('playResume', 'github.com/goplus/spx')
export const playStop = defineConst('playStop', 'github.com/goplus/spx')
