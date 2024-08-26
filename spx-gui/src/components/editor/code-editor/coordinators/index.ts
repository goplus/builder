import {
  type CompletionItem,
  type EditorUI,
  Icon,
  type LayerContent,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import { Compiler, TokenEnum } from '../compiler'
import { ChatBot } from '../chat-bot'
import { DocAbility } from '../document'
import { Project } from '@/models/project'
import { type Position } from 'monaco-editor'
import type { I18n } from '@/utils/i18n'
import { keywords, typeKeywords } from '@/utils/spx'
import { getAllTools, ToolType } from '@/components/editor/code-editor/tools'

type JumpPosition = {
  line: number
  column: number
  fileUri: string
}

export class Coordinator {
  project: Project
  ui: EditorUI
  docAbility: DocAbility

  constructor(
    ui: EditorUI,
    runtime: Runtime,
    compiler: Compiler,
    chatBot: ChatBot,
    docAbility: DocAbility,
    project: Project
  ) {
    this.project = project
    this.ui = ui
    this.docAbility = docAbility

    ui.registerCompletionProvider({
      // do not use `provideDynamicCompletionItems: this.implementsPreDefinedCompletionProvider` this will change `this` pointer to `{provideDynamicCompletionItems: ()=> void}`
      // and throw undefined error
      provideDynamicCompletionItems: this.implementsPreDefinedCompletionProvider.bind(this)
    })

    ui.registerHoverProvider({
      provideHover: this.implementsPreDefinedHoverProvider.bind(this)
    })
  }

  implementsPreDefinedCompletionProvider(
    _model: TextModel,
    _ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    addItems(getCompletionItems(this.ui.i18n, this.project))
  }

  async implementsPreDefinedHoverProvider(
    _model: TextModel,
    ctx: {
      position: Position
      hoverUnitWord: string
      signal: AbortSignal
    }
  ): Promise<LayerContent> {
    const content =
      this.docAbility.getNormalDoc({
        module: '',
        name: ctx.hoverUnitWord,
        type: TokenEnum.ANY,
        usages: []
      })?.content || ''
    return {
      content: content,
      recommendAction: {
        label: this.ui.i18n.t({ zh: '还有疑惑？场外求助', en: 'still in confusion? Ask for help' }),
        activeLabel: this.ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
        onActiveLabelClick() {
          console.log('=>(index.ts:75) Ask for help')
        }
      },
      moreActions: [
        {
          icon: Icon.Document,
          label: this.ui.i18n.t({ zh: '查看文档', en: 'Document' }),
          onClick() {
            console.log('=>(index.ts:82) Document')
          }
        }
      ]
    }
  }

  public jump(position: JumpPosition): void {}
}

function getCompletionItems(i18n: I18n, project: Project): CompletionItem[] {
  const items: CompletionItem[] = [
    ...keywords.map((keyword) => ({
      label: keyword,
      insertText: keyword,
      icon: Icon.Keywords,
      desc: '',
      preview: {
        content: ''
      }
    })),
    ...typeKeywords.map((typeKeyword) => ({
      label: typeKeyword,
      insertText: typeKeyword,
      icon: Icon.Keywords,
      desc: '',
      preview: {
        content: ''
      }
    }))
  ]
  for (const tool of getAllTools(project)) {
    const basics = {
      label: tool.keyword,
      icon: getCompletionItemKind(tool.type),
      preview: {
        content: ''
      }
    }
    if (tool.usage != null) {
      items.push({
        ...basics,
        insertText: tool.usage.insertText,
        desc: i18n.t(tool.desc)
      })
      continue
    }
    for (const usage of tool.usages!) {
      items.push({
        ...basics,
        insertText: usage.insertText,
        desc: [i18n.t(tool.desc), i18n.t(usage.desc)].join(' - ')
      })
    }
  }
  return items
}

function getCompletionItemKind(type: ToolType): Icon {
  switch (type) {
    case ToolType.method:
      return Icon.Function
    case ToolType.function:
      return Icon.Function
    case ToolType.constant:
      return Icon.Prototype
    case ToolType.keyword:
      return Icon.Keywords
    case ToolType.variable:
      return Icon.Prototype
  }
}
