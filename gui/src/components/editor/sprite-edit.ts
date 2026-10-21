import { shallowReactive, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import type { Files } from '@/models/common/file'
import type { SpxProject } from '@/models/spx/project'
import type { Sprite } from '@/models/spx/sprite'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'

export class SpriteEditState extends Disposable {
  edits = shallowReactive<SpriteEdit[]>([])

  constructor(
    private i18n: I18n,
    private project: SpxProject
  ) {
    super()
    this.addDisposer(() => this.edits.forEach((edit) => edit.dispose()))
    this.addDisposer(
      watch(
        () => this.edits.filter((edit) => !this.project.sprites.some((sprite) => sprite.id === edit.sourceSpriteId)),
        (orphaned) => orphaned.forEach((edit) => this.remove(edit.id))
      )
    )
  }

  start(sprite: Sprite) {
    const existing = this.edits.find((edit) => edit.sourceSpriteId === sprite.id)
    if (existing?.hasPendingChanges) return existing
    if (existing != null) this.remove(existing.id)
    const edit = SpriteEdit.fromSprite(this.i18n, this.project, sprite)
    this.edits.push(edit)
    return edit
  }

  finish(edit: SpriteEdit) {
    if (this.edits.includes(edit) && !edit.hasPendingChanges) this.remove(edit.id)
  }

  remove(id: string) {
    const index = this.edits.findIndex((edit) => edit.id === id)
    if (index < 0) throw new Error('Sprite edit not found in editor state')
    const [edit] = this.edits.splice(index, 1)
    edit.cancel()
    edit.dispose()
  }

  async load(files: Files) {
    const edits = await SpriteEdit.loadAll(this.i18n, this.project, files)
    this.edits.splice(0).forEach((edit) => edit.dispose())
    for (const edit of edits) {
      if (edit.hasPendingChanges) this.edits.push(edit)
      else edit.dispose()
    }
  }

  export(): Files {
    const files: Files = {}
    for (const edit of this.edits) {
      if (edit.hasPendingChanges) Object.assign(files, edit.export())
    }
    return files
  }
}
