import { describe, expect, it } from 'vitest'
import { Sprite, State } from './sprite'
import { Animation } from './animation'
import { Costume } from './costume'
import { File } from './common/file'

function makeCostume(name: string) {
  return new Costume(name, new File(`${name}.png`, async () => new ArrayBuffer(0)))
}

describe('Sprite', () => {
  it('should export & load animations correctly', async () => {
    const sprite = new Sprite('MySprite')
    sprite.addCostume(makeCostume('costume1'))
    sprite.addCostume(makeCostume('costume2'))
    const animation1 = new Animation('animation1')
    animation1.setCostumes([makeCostume('costume3'), makeCostume('costume4')])
    const animation2 = new Animation('animation2')
    animation2.setCostumes([makeCostume('costume5'), makeCostume('costume6')])
    sprite.addAnimation(animation1)
    sprite.addAnimation(animation2)
    const exported = sprite.export({ sounds: [] })
    const [loadedSprite] = await Sprite.loadAll(exported, { sounds: [] })
    expect(loadedSprite.costumes.map((c) => c.name)).toEqual(['costume1', 'costume2'])
    expect(loadedSprite.animations.map((c) => c.name)).toEqual(['animation1', 'animation2'])
    expect(loadedSprite.animations[0].costumes.map((c) => c.name)).toEqual(['costume3', 'costume4'])
    expect(loadedSprite.animations[1].costumes.map((c) => c.name)).toEqual(['costume5', 'costume6'])
  })
  it('should handle id-name conversion for animationBindings correctly', async () => {
    const sprite = new Sprite('MySprite')
    const animation = new Animation('animation')
    animation.setCostumes([makeCostume('costume1')])
    sprite.addAnimation(animation)
    sprite.setAnimationBoundStates(animation.id, [State.turn, State.die])
    expect(sprite.getAnimationBoundStates(animation.id)).toEqual([State.die, State.turn])

    const exported = sprite.export({ sounds: [] })
    const imported = await Sprite.loadAll(exported, { sounds: [] })

    expect(imported[0].getAnimationBoundStates(animation.id)).toEqual([State.die, State.turn])
  })
  it('should move costumes correctly', async () => {
    const sprite = new Sprite('MySprite')
    const costume1 = makeCostume('costume1')
    const costume2 = makeCostume('costume2')
    const costume3 = makeCostume('costume3')
    sprite.addCostume(costume1)
    sprite.addCostume(costume2)
    sprite.addCostume(costume3)
    expect(sprite.defaultCostume?.name).toEqual('costume1')
    sprite.moveCostume(0, 1)
    expect(sprite.costumes.map((c) => c.name)).toEqual(['costume2', 'costume1', 'costume3'])
    expect(sprite.defaultCostume?.name).toEqual('costume1')
    expect(costume1.parent).toEqual(sprite)

    sprite.moveCostume(1, 2)
    expect(sprite.costumes.map((c) => c.name)).toEqual(['costume2', 'costume3', 'costume1'])
    expect(sprite.defaultCostume?.name).toEqual('costume1')

    sprite.moveCostume(2, 0)
    expect(sprite.costumes.map((c) => c.name)).toEqual(['costume1', 'costume2', 'costume3'])
    expect(sprite.defaultCostume?.name).toEqual('costume1')

    sprite.moveCostume(2, 1)
    expect(sprite.costumes.map((c) => c.name)).toEqual(['costume1', 'costume3', 'costume2'])
    expect(sprite.defaultCostume?.name).toEqual('costume1')

    sprite.moveCostume(1, 1)
    expect(sprite.costumes.map((c) => c.name)).toEqual(['costume1', 'costume3', 'costume2'])
    expect(sprite.defaultCostume?.name).toEqual('costume1')

    // invalid index causes error:
    expect(() => sprite.moveCostume(2, 3)).toThrow()
    expect(() => sprite.moveCostume(-1, 1)).toThrow()
  })
})
