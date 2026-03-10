import { computed, type ComputedRef } from 'vue'
import type { Stage } from '@/models/spx/stage'
import type { Sprite } from '@/models/spx/sprite'
import type { Action, History } from '@/components/editor/history'
import type { LocaleMessage } from '@/utils/i18n'
import { getTextDocumentId, CodeChangeKind, type ICodeOwner } from '../xgo-code-editor'

export class CodeOwnerStage implements ICodeOwner {
  readonly id = 'stage'
  readonly name: LocaleMessage = { en: 'Stage', zh: '舞台' }
  readonly displayName: LocaleMessage = { en: 'Stage', zh: '舞台' }

  private action: Action
  constructor(
    private getStage: () => Stage,
    private history: History
  ) {
    this.action = {
      name: { en: 'Update stage code', zh: '修改舞台代码' },
      mergeable: true
    }
  }
  getTextDocumentId() {
    return getTextDocumentId(this.getStage().codeFilePath)
  }
  get thumbnailFile() {
    return this.getStage().defaultBackdrop?.img ?? null
  }
  getCode() {
    return this.getStage().code
  }
  setCode(newCode: string, kind: CodeChangeKind) {
    if (kind === CodeChangeKind.Program) return this.getStage().setCode(newCode)
    return this.history.doAction(this.action, () => {
      this.getStage().setCode(newCode)
    })
  }
}

export class CodeOwnerSprite implements ICodeOwner {
  private actionComputed: ComputedRef<Action>
  constructor(
    private getSprite: () => Sprite | null,
    private history: History
  ) {
    this.actionComputed = computed(() => {
      const name = this.getSprite()?.name ?? 'Sprite'
      return {
        name: { en: `Update ${name} code`, zh: `修改 ${name} 代码` },
        mergeable: true
      }
    })
  }
  get id() {
    const sprite = this.getSprite()
    if (sprite == null) throw new Error('Sprite not found')
    return sprite.id
  }
  get name() {
    return this.getSprite()?.name ?? 'Sprite'
  }
  get displayName(): LocaleMessage {
    const name = this.getSprite()?.name ?? 'Sprite'
    return { en: name, zh: name }
  }
  getTextDocumentId() {
    const sprite = this.getSprite()
    if (sprite == null) throw new Error('Sprite not found')
    return getTextDocumentId(sprite.codeFilePath)
  }
  get thumbnailFile() {
    return this.getSprite()?.defaultCostume?.img ?? null
  }
  getCode() {
    return this.getSprite()?.code ?? ''
  }
  setCode(newCode: string, kind: CodeChangeKind) {
    const sprite = this.getSprite()
    if (sprite == null) throw new Error('Sprite not found')
    if (kind === CodeChangeKind.Program) return sprite.setCode(newCode)
    return this.history.doAction(this.actionComputed.value, () => {
      sprite.setCode(newCode)
    })
  }
}
