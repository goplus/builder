import { Disposable } from '@/utils/disposable'
import type { I18n, LocaleMessage } from '@/utils/i18n'
import { generateMessage, type Message } from '@/apis/copilot'
import { Project } from '@/models/project'
import type { Stage } from '@/models/stage'
import type { Sprite } from '@/models/sprite'
import type { Sound } from '@/models/sound'
import type { Widget } from '@/models/widget'
import type { Animation } from '@/models/animation'
import type { Backdrop } from '@/models/backdrop'
import type { Chat, ChatContext, ChatMessage, ICopilot } from './ui/code-editor-ui'
import {
  makeBasicMarkdownString,
  type BasicMarkdownString,
  textDocumentId2CodeFileName,
  isTextDocumentStageCode,
  type Position,
  type ITextDocument,
  type Selection,
  textDocumentIdEq
} from './common'

const maxChatMessageCount = 10
const maxCodeLength = 2000

export class Copilot extends Disposable implements ICopilot {
  constructor(
    private i18n: I18n,
    private project: Project
  ) {
    super()
  }

  private getCodeInfoText(ctx: CodeSampleContext, codeFileName: LocaleMessage, code: string, focusLine = 1) {
    return this.i18n.t({
      en: `\
This is the code info of ${codeFileName.en}:
<code-info>
${JSON.stringify(getCodeInfo(ctx, code, focusLine))}
</code-info>`,
      zh: `\
这是${codeFileName.zh}的代码信息：
<code-info>
${JSON.stringify(getCodeInfo(ctx, code, focusLine))}
</code-info>`
    })
  }

  private getCurrentCodeInfoText(
    ctx: CodeSampleContext,
    textDocument: ITextDocument,
    cursorPosition: Position | null,
    selection: Selection | null
  ) {
    const currentCodeFileName = textDocumentId2CodeFileName(textDocument.id)
    let currentFocusLine = 1
    if (selection != null) {
      const { start, position } = selection
      currentFocusLine = Math.floor((start.line + position.line) / 2)
    } else if (cursorPosition != null) {
      currentFocusLine = cursorPosition.line
    }
    return this.getCodeInfoText(ctx, currentCodeFileName, textDocument.getValue(), currentFocusLine)
  }

  private makeContextMessage({ textDocument, openedTextDocuments, cursorPosition, selection }: ChatContext): Message {
    const currentCodeFileName = textDocumentId2CodeFileName(textDocument.id)
    const ctx: CodeSampleContext = { quota: maxCodeLength }
    const otherOpenedTextDocuments = openedTextDocuments.filter((td) => !textDocumentIdEq(td.id, textDocument.id))
    const codeInfoTexts = [
      this.getCurrentCodeInfoText(ctx, textDocument, cursorPosition, selection),
      ...otherOpenedTextDocuments.map((td) =>
        this.getCodeInfoText(ctx, textDocumentId2CodeFileName(td.id), td.getValue())
      )
    ]
    if (!openedTextDocuments.some((td) => isTextDocumentStageCode(td.id))) {
      codeInfoTexts.push(this.getCodeInfoText(ctx, { en: 'Stage', zh: '舞台' }, this.project.stage.code))
    }
    const codeInfoText = codeInfoTexts.join('\n')
    const projectInfo = JSON.stringify(getProjectInfo(this.project))
    return {
      role: 'user',
      content: {
        type: 'text',
        text: this.i18n.t({
          en: `\
Here is some context information:
I opened a project:
<project-info>
${projectInfo}
</project-info>
${codeInfoText}
Now I am working on ${currentCodeFileName.en}`,
          zh: `\
这里是一些上下文信息：
我打开了一个项目：
<project-info>
${projectInfo}
</project-info>
${codeInfoText}
我现在正在编辑${currentCodeFileName.zh}`
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
    const messages = [this.makeContextMessage(ctx)]
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
  return {
    name: project.name,
    desc: project.description,
    instructions: project.instructions,
    stage: getStageInfo(project.stage),
    sprites: project.sprites.map((s) => getSpriteInfo(s)),
    sounds: project.sounds.map(getSoundInfo)
  }
}

function getStageInfo(stage: Stage) {
  return {
    mapSize: stage.getMapSize(),
    widgets: stage.widgets.map(getWidgetInfo),
    backdrops: stage.backdrops.map(getBackdropInfo),
    defaultBackdrop: stage.defaultBackdrop?.name
  }
}

function getSpriteInfo(sprite: Sprite) {
  return {
    name: sprite.name,
    visible: sprite.visible,
    animations: sprite.animations.map(getAnimationInfo)
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

type CodeSampleContext = {
  quota: number
}

type CodeInfo = {
  lineNum: number
  sampledLines: Record<number, string>
}

function getCodeInfo(ctx: CodeSampleContext, code: string, focusLine: number): CodeInfo {
  const lines = code.split('\n')
  const [startLine, endLine] = sampleCode(ctx, lines, focusLine)
  const sampledLines = lines.slice(startLine - 1, endLine).reduce<Record<number, string>>((ls, line, i) => {
    ls[startLine + i] = line
    return ls
  }, {})
  return {
    lineNum: lines.length,
    // TODO: consider sampling code based on AST
    sampledLines: sampledLines
  }
}

export function sampleCode(ctx: CodeSampleContext, lines: string[], focusLine: number) {
  let startLine = focusLine
  let endLine = focusLine
  ctx.quota -= lines[focusLine - 1].length
  for (; ctx.quota > 0; ) {
    let expanded = false
    if (startLine > 1) {
      expanded = true
      startLine--
      ctx.quota -= lines[startLine - 1].length
    }
    if (ctx.quota <= 0) break
    if (endLine < lines.length) {
      expanded = true
      endLine++
      ctx.quota -= lines[endLine - 1].length
    }
    if (!expanded) break
  }
  return [startLine, endLine] as const
}
