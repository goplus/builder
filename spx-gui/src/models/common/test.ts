import { Project } from '../project'
import { Sound } from '../sound'
import { fromText } from '../common/file'
import { Backdrop } from '../backdrop'
import { Monitor } from '../widget/monitor'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import { Animation } from '../animation'

export function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

export function makeProject() {
  const project = new Project()
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
