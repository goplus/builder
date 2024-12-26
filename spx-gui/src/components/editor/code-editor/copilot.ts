import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { generateMessage, type Message } from '@/apis/copilot'
import type { Project } from '@/models/project'
import type { Stage } from '@/models/stage'
import type { Sprite } from '@/models/sprite'
import type { Sound } from '@/models/sound'
import type { Widget } from '@/models/widget'
import type { Animation } from '@/models/animation'
import type { Backdrop } from '@/models/backdrop'
import type { Chat, ChatContext, ChatMessage, ICopilot } from './ui/code-editor-ui'
import { makeBasicMarkdownString, type BasicMarkdownString } from './common'

const maxChatMessageCount = 20
const maxCodeLength = 2000

export class Copilot extends Disposable implements ICopilot {
  constructor(
    private i18n: I18n,
    private project: Project
  ) {
    super()
  }

  private makeContextMessage(): Message {
    let currentTarget: string
    if (this.project.selectedSprite != null) {
      currentTarget = this.i18n.t({
        en: `Sprite ${this.project.selectedSprite.name}`,
        zh: `精灵 ${this.project.selectedSprite.name}`
      })
    } else if (this.project.selected?.type === 'stage') {
      currentTarget = this.i18n.t({ en: 'Stage', zh: '舞台' })
    } else {
      throw new Error(`Invalid project selected state: ${this.project.selected?.type}`)
    }
    const projectInfo = JSON.stringify(getProjectInfo(this.project))
    return {
      role: 'user',
      content: {
        type: 'text',
        text: this.i18n.t({
          en: `Here is some context information:
I opened a project:
<project-info>
${projectInfo}
</project-info>
Now I am working on ${currentTarget}`,
          zh: `这里是一些上下文信息：
我打开了一个项目：
<project-info>
${projectInfo}
</project-info>
我现在正在编辑${currentTarget}`
        })
      }
    }
  }

  private chatMessage2Message({ role, content }: ChatMessage): Message {
    const contentText = typeof content.value === 'string' ? content.value : this.i18n.t(content.value)
    return {
      role,
      content: {
        type: 'text',
        text: contentText
      }
    }
  }

  private makeSkippingMessage(toSkip: number): Message {
    return {
      role: 'user',
      content: {
        type: 'text',
        text: this.i18n.t({
          en: `(${toSkip} messages skipped)`,
          zh: `（跳过了 ${toSkip} 条消息）`
        })
      }
    }
  }

  async getChatCompletion(ctx: ChatContext, chat: Chat): Promise<BasicMarkdownString> {
    const messages = [this.makeContextMessage()]
    const toSkip = chat.messages.length - maxChatMessageCount
    // skip chat messages in range `[1, toSkip]`
    chat.messages.forEach((message, i) => {
      if (i === 0) {
        messages.push(this.chatMessage2Message(message))
        if (toSkip > 0) messages.push(this.makeSkippingMessage(toSkip))
        return
      }
      if (i > toSkip) messages.push(this.chatMessage2Message(message))
    })
    const message = await generateMessage(messages, ctx.signal)
    return makeBasicMarkdownString(message.content.text)
  }
}

function getProjectInfo(project: Project) {
  const codeLength = [project.stage.code.length, ...project.sprites.map((s) => s.code.length)].reduce(
    (a, b) => a + b,
    0
  )
  const codeSampleRatio = Math.min(maxCodeLength / codeLength, 1)
  return {
    name: project.name,
    desc: project.description,
    instructions: project.instructions,
    stage: getStageInfo(project.stage, codeSampleRatio),
    sprites: project.sprites.map((s) => getSpriteInfo(s, codeSampleRatio)),
    sounds: project.sounds.map(getSoundInfo)
  }
}

function getStageInfo(stage: Stage, codeSampleRatio: number) {
  return {
    mapSize: stage.getMapSize(),
    widgets: stage.widgets.map(getWidgetInfo),
    backdrops: stage.backdrops.map(getBackdropInfo),
    defaultBackdrop: stage.defaultBackdrop?.name,
    code: getCodeInfo(stage.code, codeSampleRatio)
  }
}

function getSpriteInfo(sprite: Sprite, codeSampleRatio: number) {
  return {
    name: sprite.name,
    visible: sprite.visible,
    animations: sprite.animations.map(getAnimationInfo),
    code: getCodeInfo(sprite.code, codeSampleRatio)
  }
}

function getSoundInfo(sound: Sound) {
  return sound.name
}

function getBackdropInfo(backdrop: Backdrop) {
  return backdrop.name
}

function getWidgetInfo(widget: Widget) {
  return {
    type: widget.type,
    name: widget.name
  }
}

function getAnimationInfo(animation: Animation) {
  return animation.name
}

function getCodeInfo(code: string, codeSampleRatio: number) {
  return {
    len: code.length,
    // TODO: consider sampling code based on AST
    sampled: code.slice(0, Math.floor(code.length * codeSampleRatio))
  }
}
