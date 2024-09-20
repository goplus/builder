/**
 * @file Tokens from spx
 */

import { type Token } from './types'

export const clone: Token = {
  id: {
    name: 'clone',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'clone sprite',
      sample: 'clone',
      insertText: 'clone'
    }
  ]
}

export const onCloned: Token = {
  id: {
    name: 'onCloned',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'listen',
      target: 'Sprite',
      declaration: 'func(onCloned func())',
      sample: '=> {}',
      insertText: 'onCloned => {\n\t${1}\n}'
    }
  ]
}

export const onTouched: Token = {
  id: {
    name: 'onTouched',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'listen',
      target: 'Sprite',
      declaration: 'func(onCloned func())',
      sample: 'target => {}',
      insertText: 'onTouched target => {\n\t${1}\n}'
    },
    {
      id: '3',
      effect: 'listen',
      target: 'Sprite',
      declaration: 'func(name string, onTouched func())',
      sample: 'S1, => {}',
      insertText: 'onTouched ${1:name}, => {\n\t${2}\n}'
    },
    {
      id: '5',
      effect: 'listen',
      target: 'Sprite',
      declaration: 'func(names []string, onTouched func())',
      sample: '[S1, S2], => {}',
      insertText: 'onTouched ${1:names}, => {\n\t${2}\n}'
    }
  ]
}

export const onMoving: Token = {
  id: {
    name: 'onMoving',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'listen',
      target: 'Sprite',
      declaration: 'func(onMoving func())',
      sample: '=> {}',
      insertText: 'onMoving => {\n\t${1}\n}'
    }
  ]
}

export const onTurning: Token = {
  id: {
    name: 'onTurning',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'listen',
      target: 'Sprite',
      declaration: 'func(onTurning func())',
      sample: '=> {}',
      insertText: 'onTurning => {\n\t${1}\n}'
    }
  ]
}

export const die: Token = {
  id: {
    name: 'die',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'die',
      sample: '',
      insertText: 'die'
    }
  ]
}

export const hide: Token = {
  id: {
    name: 'hide',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'hide'
    }
  ]
}

export const show: Token = {
  id: {
    name: 'show',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'show'
    }
  ]
}

export const visible: Token = {
  id: {
    name: 'visible',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() bool',
      sample: '',
      insertText: 'visible'
    }
  ]
}

export const costumeName: Token = {
  id: {
    name: 'costumeName',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() string',
      sample: '',
      insertText: 'costumeName'
    }
  ]
}

export const costumeIndex: Token = {
  id: {
    name: 'costumeIndex',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() int',
      sample: '',
      insertText: 'costumeIndex'
    }
  ]
}

export const setCostume: Token = {
  id: {
    name: 'setCostume',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(costume interface{})',
      sample: '"happy"',
      insertText: 'setCostume ${1:costume}'
    }
  ]
}

export const nextCostume: Token = {
  id: {
    name: 'nextCostume',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'nextCostume'
    }
  ]
}

export const prevCostume: Token = {
  id: {
    name: 'prevCostume',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'prevCostume'
    }
  ]
}

export const animate: Token = {
  id: {
    name: 'animate',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(name string)',
      sample: '"jump"',
      insertText: 'animate ${1:name}'
    }
  ]
}

export const say: Token = {
  id: {
    name: 'say',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    // keep this order
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(msg interface{})',
      sample: '"Hello!"',
      insertText: 'say ${1:msg}'
    },
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(msg interface{}, secs ...float64)',
      sample: '"Hello!", 2',
      insertText: 'say ${1:msg}, ${2:secs}'
    }
  ]
}

export const think: Token = {
  id: {
    name: 'think',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    // keep this order
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(msg interface{})',
      sample: '"Wow!"',
      insertText: 'think ${1:msg}'
    },
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(msg interface{}, secs ...float64)',
      sample: '"Wow!", 2',
      insertText: 'think ${1:msg}, ${2:secs}'
    }
  ]
}

export const distanceTo: Token = {
  id: {
    name: 'distanceTo',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func(obj interface{}) float64',
      sample: 'Sprite1',
      insertText: 'distanceTo ${1:obj}'
    }
  ]
}

export const move: Token = {
  id: {
    name: 'move',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '1',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(step int)',
      sample: '10',
      insertText: 'move ${1:step}'
    }
  ]
}

export const step: Token = {
  id: {
    name: 'step',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(step int)',
      sample: '10',
      insertText: 'step ${1:step}'
    }
  ]
}

export const goto: Token = {
  id: {
    name: 'goto',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(obj interface{})',
      sample: 'Sprite1',
      insertText: 'Goto ${1:obj}'
    }
  ]
}

export const glide: Token = {
  id: {
    name: 'glide',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(x float64, y float64, secs float64)',
      sample: '50, -50, 2',
      insertText: 'glide ${1:x}, ${2:y}, ${3:secs}'
    },
    {
      id: '1',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(obj interface{}, secs float64)',
      sample: 'Sprite1, 2',
      insertText: 'glide ${1:obj}, ${2:secs}'
    }
  ]
}

export const setXYpos: Token = {
  id: {
    name: 'setXYpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(x float64, y float64)',
      sample: '0, 0',
      insertText: 'setXYpos ${1:x}, ${2:y}'
    }
  ]
}

export const changeXYpos: Token = {
  id: {
    name: 'changeXYpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(dx float64, dy float64)',
      sample: '10, 10',
      insertText: 'changeXYpos ${1:dx}, ${2:dy}'
    }
  ]
}

export const xpos: Token = {
  id: {
    name: 'xpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() float64',
      sample: '5',
      insertText: 'xpos'
    }
  ]
}

export const setXpos: Token = {
  id: {
    name: 'setXpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(x float64)',
      sample: '100',
      insertText: 'setXpos ${1:x}'
    }
  ]
}

export const changeXpos: Token = {
  id: {
    name: 'changeXpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(dx float64)',
      sample: '10',
      insertText: 'changeXpos ${1:dx}'
    }
  ]
}

export const ypos: Token = {
  id: {
    name: 'ypos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() float64',
      sample: '10',
      insertText: 'ypos'
    }
  ]
}

export const setYpos: Token = {
  id: {
    name: 'setYpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(y float64)',
      sample: '100',
      insertText: 'setYpos ${1:y}'
    }
  ]
}

export const changeYpos: Token = {
  id: {
    name: 'changeYpos',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(dy float64)',
      sample: '10',
      insertText: 'changeYpos ${1:dy}'
    }
  ]
}

export const setRotationStyle: Token = {
  id: {
    name: 'setRotationStyle',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(style github.com/goplus/spx.RotationStyle)',
      sample: 'None',
      insertText: 'setRotationStyle ${1:style}'
    }
  ]
}

export const heading: Token = {
  id: {
    name: 'heading',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() float64',
      sample: '',
      insertText: 'heading'
    }
  ]
}

export const turnTo: Token = {
  id: {
    name: 'turnTo',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(obj interface{})',
      sample: '90',
      insertText: 'turnTo ${1:obj}'
    },
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(obj interface{})',
      sample: 'target',
      insertText: 'turnTo ${1:target}'
    }
  ]
}

export const setHeading: Token = {
  id: {
    name: 'setHeading',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(dir float64)',
      sample: 'Up',
      insertText: 'setHeading ${1:direction}'
    }
  ]
}

export const changeHeading: Token = {
  id: {
    name: 'changeHeading',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(dir float64)',
      sample: '90',
      insertText: 'changeHeading ${1:dDirection}'
    }
  ]
}

export const size: Token = {
  id: {
    name: 'size',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func() float64',
      sample: '',
      insertText: 'size'
    }
  ]
}

export const setSize: Token = {
  id: {
    name: 'setSize',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(size float64)',
      sample: '2',
      insertText: 'setSize ${1:size}'
    }
  ]
}

export const changeSize: Token = {
  id: {
    name: 'changeSize',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(delta float64)',
      sample: '1',
      insertText: 'changeSize ${1:delta}'
    }
  ]
}

export const touching: Token = {
  id: {
    name: 'touching',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'Sprite',
      declaration: 'func(obj interface{}) bool',
      sample: 'Edge',
      insertText: 'touching ${1:obj}'
    }
  ]
}

export const bounceOffEdge: Token = {
  id: {
    name: 'bounceOffEdge',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'Sprite',
      declaration: 'func()',
      sample: '',
      insertText: 'bounceOffEdge'
    }
  ]
}

export const mouseHitItem: Token = {
  id: {
    name: 'mouseHitItem',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() (target *github.com/goplus/spx.Sprite, ok bool)',
      sample: '',
      insertText: 'mouseHitItem'
    }
  ]
}

export const backdropName: Token = {
  id: {
    name: 'backdropName',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() string',
      sample: '',
      insertText: 'backdropName'
    }
  ]
}

export const backdropIndex: Token = {
  id: {
    name: 'backdropIndex',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() int',
      sample: '',
      insertText: 'backdropIndex'
    }
  ]
}

export const startBackdrop: Token = {
  id: {
    name: 'startBackdrop',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    // keep this order
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'All',
      declaration: 'func(backdrop interface{})',
      sample: '"backdrop1"',
      insertText: 'startBackdrop ${1:backdrop}'
    },
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(backdrop interface{}, wait ...bool)',
      sample: '"backdrop1", true',
      insertText: 'startBackdrop ${1:backdrop}, ${2:wait}'
    }
  ]
}

export const nextBackdrop: Token = {
  id: {
    name: 'nextBackdrop',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    // keep this order
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'All',
      declaration: 'func()',
      sample: '',
      insertText: 'nextBackdrop'
    },
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(wait ...bool)',
      sample: 'true',
      insertText: 'nextBackdrop ${1:wait}'
    }
  ]
}

export const prevBackdrop: Token = {
  id: {
    name: 'prevBackdrop',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    // keep this order
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'All',
      declaration: 'func()',
      sample: '',
      insertText: 'prevBackdrop'
    },
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(wait ...bool)',
      sample: 'true',
      insertText: 'prevBackdrop ${1:wait}'
    }
  ]
}

export const keyPressed: Token = {
  id: {
    name: 'keyPressed',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(key github.com/hajimehoshi/ebiten/v2.Key) bool',
      sample: 'key',
      insertText: 'keyPressed ${1:key}'
    }
  ]
}

export const mouseX: Token = {
  id: {
    name: 'mouseX',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() float64',
      sample: '',
      insertText: 'mouseX'
    }
  ]
}

export const mouseY: Token = {
  id: {
    name: 'mouseY',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() float64',
      sample: '',
      insertText: 'mouseY'
    }
  ]
}

export const mousePressed: Token = {
  id: {
    name: 'mousePressed',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() bool',
      sample: '',
      insertText: 'mousePressed'
    }
  ]
}

export const wait: Token = {
  id: {
    name: 'wait',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(secs float64)',
      sample: '0.5',
      insertText: 'wait ${1:secs}'
    }
  ]
}

export const play: Token = {
  id: {
    name: 'play',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    // keep this order
    // in wasm only one usage, and usage id is "0", but here set 2 usages for better understanding
    {
      id: '1',
      effect: 'func',
      target: 'All',
      declaration: 'func(media github.com/goplus/spx.Sound) (err error)',
      sample: '"sound"',
      insertText: 'play ${1:media}'
    },
    {
      id: '2',
      effect: 'func',
      target: 'All',
      declaration: 'func(media github.com/goplus/spx.Sound, wait bool) (err error)',
      sample: '"sound", true',
      insertText: 'play ${1:media}, ${2:wait}'
    },
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(media github.com/goplus/spx.Sound, wait bool, loop bool) (err error)',
      sample: '"sound", true, true',
      insertText: 'play ${1:media}, ${2:wait}, ${3:loop}'
    }
  ]
}

export const stopAllSounds: Token = {
  id: {
    name: 'stopAllSounds',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func()',
      sample: '',
      insertText: 'stopAllSounds'
    }
  ]
}

export const volume: Token = {
  id: {
    name: 'volume',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'read',
      target: 'All',
      declaration: 'func() float64',
      sample: '',
      insertText: 'volume'
    }
  ]
}

export const setVolume: Token = {
  id: {
    name: 'setVolume',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(volume float64)',
      sample: '100',
      insertText: 'setVolume ${1:volume}'
    }
  ]
}

export const changeVolume: Token = {
  id: {
    name: 'changeVolume',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(delta float64)',
      sample: '100',
      insertText: 'changeVolume ${1:delta}'
    }
  ]
}

export const broadcast: Token = {
  id: {
    name: 'broadcast',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(msg string)',
      sample: '"message"',
      insertText: 'broadcast ${1:msg}'
    },
    {
      id: '1',
      effect: 'func',
      target: 'All',
      declaration: 'func(msg string, wait bool)',
      sample: '"message", true',
      insertText: 'broadcast ${1:msg}, ${2:wait}'
    },
    {
      id: '2',
      effect: 'func',
      target: 'All',
      declaration: 'func(msg string, data interface{}, wait bool)',
      sample: '"message", data, true',
      insertText: 'broadcast ${1:msg}, ${2:data}, ${3:wait}'
    }
  ]
}

export const onStart: Token = {
  id: {
    name: 'onStart',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'listen',
      target: 'All',
      declaration: 'func(onStart func())',
      sample: '=> {}',
      insertText: 'onStart => {\n\t${1}\n}'
    }
  ]
}

export const onClick: Token = {
  id: {
    name: 'onClick',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'listen',
      target: 'All',
      declaration: 'func(onClick func())',
      sample: '=> {}',
      insertText: 'onClick => {\n\t${1}\n}'
    }
  ]
}

export const onAnyKey: Token = {
  id: {
    name: 'onAnyKey',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'listen',
      target: 'All',
      declaration: 'func(onKey func(key github.com/hajimehoshi/ebiten/v2.Key)',
      sample: 'key => {}',
      insertText: 'onAnyKey => {\n\t${1}\n}'
    }
  ]
}

export const onKey: Token = {
  id: {
    name: 'onKey',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'listen',
      target: 'All',
      declaration: 'func(key github.com/hajimehoshi/ebiten/v2.Key, onKey func())',
      sample: 'Key1, => {}',
      insertText: 'onKey ${1:key}, => {\n\t${2}\n}'
    },
    {
      id: '2',
      effect: 'listen',
      target: 'All',
      declaration: 'func(key github.com/hajimehoshi/ebiten/v2.Key, onKey func())',
      sample: '[Key1, Key2], => {}',
      insertText: 'onKey ${1:keys}, => {\n\t${2}\n}'
    }
  ]
}

export const onMsg: Token = {
  id: {
    name: 'onMsg',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'listen',
      target: 'All',
      declaration: 'func(onMsg func(msg string, data interface{}))',
      sample: '(message, data) => {}',
      insertText: 'onMsg => {\n\t${1}\n}'
    },
    {
      id: '1',
      effect: 'listen',
      target: 'All',
      declaration: 'func(msg string, onMsg func())',
      sample: 'msg "message", => {}',
      insertText: 'onMsg ${1:msg}, => {\n\t${2}\n}'
    }
  ]
}

export const onBackdrop: Token = {
  id: {
    name: 'onBackdrop',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'listen',
      target: 'All',
      declaration: 'func(onBackdrop func(name string))',
      sample: 'backdrop => {}',
      insertText: 'onBackdrop => {\n\t${1}\n}'
    },
    {
      id: '1',
      effect: 'listen',
      target: 'All',
      declaration: 'func(name string, onBackdrop func())',
      sample: 'name "backdrop1", => {}',
      insertText: 'onBackdrop ${1:name}, => {\n\t${2}\n}'
    }
  ]
}

export const rand: Token = {
  id: {
    name: 'rand',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func(from, to float64)',
      sample: '(1, 10)',
      insertText: 'rand(${1:from}, ${2:to})'
    }
  ]
}

export const exit: Token = {
  id: {
    name: 'exit',
    pkgPath: 'github.com/goplus/spx'
  },
  usages: [
    {
      id: '0',
      effect: 'func',
      target: 'All',
      declaration: 'func()',
      sample: '',
      insertText: 'exit'
    }
  ]
}

export function defineConst(name: string, module: string): Token {
  const token: Token = {
    id: {
      name,
      pkgPath: module
    },
    usages: [
      {
        id: '0',
        effect: 'read',
        target: 'All',
        declaration: 'const ' + name,
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
