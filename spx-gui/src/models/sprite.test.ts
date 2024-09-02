import { describe, expect, it } from 'vitest'
import { Sprite, State } from './sprite'
import { Animation } from './animation'
import { Costume } from './costume'
import { File } from './common/file'

describe('Sprite', () => {
  it('should handle id-name conversion for animationBindings correctly', async () => {
    const sprite = new Sprite('Sprite')
    const animation = new Animation('animation', {
      builder_id: 'animation#'
    })
    animation.costumes.push(
      new Costume('costume', new File('costume', async () => new ArrayBuffer(0)))
    )
    sprite.addAnimation(animation)
    sprite.setAnimationBoundStates(animation.id, [State.turn, State.die])
    expect(sprite.getAnimationBoundStates(animation.id)).toEqual([State.die, State.turn])

    const exported = sprite.export({ sounds: [] })
    const imported = await Sprite.loadAll(exported, [])

    expect(imported[0].getAnimationBoundStates(animation.id)).toEqual([State.die, State.turn])
  })
})
