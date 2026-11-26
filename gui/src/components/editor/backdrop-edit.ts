import { shallowReactive, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { fromConfig, toConfig, type Files } from '@/models/common/file'
import type { Backdrop } from '@/models/spx/backdrop'
import type { SpxProject } from '@/models/spx/project'
import { BackdropEdit, type RawBackdropEdit } from '@/models/spx/edit/backdrop-edit'

const configPath = 'edit/backdrops/index.json'

export class BackdropEditState extends Disposable {
  edits = shallowReactive<BackdropEdit[]>([])

  constructor(private project: SpxProject) {
    super()
    this.addDisposer(() => this.edits.forEach((edit) => edit.dispose()))
    this.addDisposer(
      watch(
        () =>
          this.edits.filter(
            (edit) => !this.project.stage.backdrops.some((backdrop) => backdrop.id === edit.backdropId)
          ),
        (orphaned) => orphaned.forEach((edit) => this.remove(edit))
      )
    )
  }

  start(backdrop: Backdrop) {
    const existing = this.edits.find((edit) => edit.backdropId === backdrop.id)
    if (existing != null && (existing.hasPendingChanges || existing.image === backdrop.img)) return existing
    if (existing != null) this.remove(existing)
    const edit = new BackdropEdit(backdrop.id, backdrop.img)
    this.edits.push(edit)
    return edit
  }
  private remove(edit: BackdropEdit) {
    this.edits.splice(this.edits.indexOf(edit), 1)
    edit.dispose()
  }
  async load(files: Files) {
    const file = files[configPath]
    const configs = file == null ? [] : ((await toConfig(file)) as RawBackdropEdit[])
    this.edits.splice(0).forEach((edit) => edit.dispose())
    for (const config of configs) {
      if (this.project.stage.backdrops.some((backdrop) => backdrop.id === config.backdropId)) {
        this.edits.push(BackdropEdit.load(config, files))
      }
    }
  }
  export(): Files {
    const files: Files = {}
    const configs: RawBackdropEdit[] = []
    for (const edit of this.edits) {
      if (!edit.hasPendingChanges) continue
      const [config, images] = edit.export(`edit/backdrops/${edit.backdropId}`)
      configs.push(config)
      Object.assign(files, images)
    }
    if (configs.length > 0) files[configPath] = fromConfig('index.json', configs)
    return files
  }
}
