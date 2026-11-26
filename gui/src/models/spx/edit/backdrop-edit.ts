import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { extname } from '@/utils/path'
import type { File, Files } from '@/models/common/file'
import type { Backdrop } from '../backdrop'
import type { CostumeEditComment } from '../gen/costume-gen'
import { Phase } from '../gen/common'
import { simulateSpriteEdit, spriteEditDemoEnabled } from '../gen/edit-demo'

type Snapshot = { image: File; instruction: string; comments: CostumeEditComment[] }
type RawSnapshot = Omit<Snapshot, 'image'> & { imagePath: string }
export type RawBackdropEdit = {
  backdropId: string
  originalPath: string
  current: RawSnapshot
  previous: RawSnapshot[]
  next: RawSnapshot[]
}

/** Backdrop drafts stay separate from the stage until the user keeps a version. */
export class BackdropEdit extends Disposable {
  image: File
  instruction = ''
  editComments: CostumeEditComment[] = []
  private original: File
  private previous: Snapshot[] = []
  private next: Snapshot[] = []
  private phase = new Phase<File>({ en: 'edit backdrop', zh: '修改背景' })

  constructor(
    readonly backdropId: string,
    image: File
  ) {
    super()
    this.image = this.original = image
    return reactive(this) as this
  }

  get generateState() {
    return this.phase.state
  }
  get canUndo() {
    return this.previous.length > 0
  }
  get canRedo() {
    return this.next.length > 0
  }
  get version() {
    return this.previous.length
  }
  get hasChanges() {
    return this.image !== this.original
  }
  get hasPendingChanges() {
    return (
      this.canUndo ||
      this.canRedo ||
      this.instruction !== '' ||
      this.editComments.length > 0 ||
      this.generateState.status === 'running'
    )
  }
  setEditComments(comments: CostumeEditComment[]) {
    this.editComments = comments
  }

  private snapshot(): Snapshot {
    return {
      image: this.image,
      instruction: this.instruction,
      comments: this.editComments.map((comment) => ({ ...comment }))
    }
  }
  private restore(snapshot: Snapshot) {
    this.image = snapshot.image
    this.instruction = snapshot.instruction
    this.editComments = snapshot.comments.map((comment) => ({ ...comment }))
    this.phase.reset()
  }

  async edit(instruction: string) {
    if (!spriteEditDemoEnabled) throw new Error('Backdrop editing is only available in the editing demo')
    if (instruction.trim() === '' && this.editComments.length === 0) throw new Error('Edit instruction expected')
    if (this.generateState.status === 'running') return
    this.instruction = instruction
    const previous = this.snapshot()
    await this.phase.run(async () => {
      const image = await simulateSpriteEdit(this.image, this.getSignal())
      this.previous.push(previous)
      this.next = []
      this.image = image
      this.editComments = []
      return image
    })
  }

  undo() {
    if (this.generateState.status === 'running' || !this.canUndo) return
    this.next.push(this.snapshot())
    this.restore(this.previous.pop()!)
  }
  redo() {
    if (this.generateState.status === 'running' || !this.canRedo) return
    this.previous.push(this.snapshot())
    this.restore(this.next.pop()!)
  }
  discard() {
    this.image = this.original
    this.accept()
  }
  accept() {
    this.original = this.image
    this.previous = []
    this.next = []
    this.instruction = ''
    this.editComments = []
    this.phase.reset()
  }
  applyToBackdrop(backdrop: Backdrop) {
    if (backdrop.id !== this.backdropId) throw new Error('Backdrop does not match this draft')
    backdrop.setImg(this.image)
  }

  export(basePath: string): [RawBackdropEdit, Files] {
    const files: Files = {}
    const paths = new Map<File, string>()
    const save = (image: File) => {
      let path = paths.get(image)
      if (path == null) {
        path = `${basePath}/${paths.size}${extname(image.name)}`
        paths.set(image, path)
        files[path] = image
      }
      return path
    }
    const serialize = ({ image, ...snapshot }: Snapshot): RawSnapshot => ({ ...snapshot, imagePath: save(image) })
    return [
      {
        backdropId: this.backdropId,
        originalPath: save(this.original),
        current: serialize(this.snapshot()),
        previous: this.previous.map(serialize),
        next: this.next.map(serialize)
      },
      files
    ]
  }
  static load(config: RawBackdropEdit, files: Files) {
    const image = (path: string) => {
      const file = files[path]
      if (file == null) throw new Error(`Backdrop edit image missing: ${path}`)
      return file
    }
    const restore = ({ imagePath, ...snapshot }: RawSnapshot): Snapshot => ({ ...snapshot, image: image(imagePath) })
    const edit = new BackdropEdit(config.backdropId, image(config.originalPath))
    edit.restore(restore(config.current))
    edit.previous = config.previous.map(restore)
    edit.next = config.next.map(restore)
    return edit
  }
}
