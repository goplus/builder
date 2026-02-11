import { SpxProject } from '../project'
import { Sound } from '../sound'
import { Backdrop } from '../backdrop'
import { Monitor } from '../widget/monitor'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import { Animation } from '../animation'
import { mockFile } from '../../common/test'

export function makeSpxProject() {
  const project = new SpxProject()
  const sound = new Sound('sound', mockFile())
  project.addSound(sound)

  const backdrop = new Backdrop('backdrop', mockFile())
  project.stage.addBackdrop(backdrop)
  const widget = new Monitor('monitor', {
    x: 10,
    y: 20,
    label: 'Score',
    variableName: 'score'
  })
  project.stage.addWidget(widget)

  const sprite = new Sprite('MySprite')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  const animationCostumes = Array.from({ length: 3 }, (_, i) => new Costume(`a${i}`, mockFile()))
  const animation = Animation.create('default', animationCostumes)
  sprite.addAnimation(animation)
  project.addSprite(sprite)
  project.bindScreenshotTaker(async () => mockFile())
  return project
}
