import { nanoid } from 'nanoid'
import { cloneDeep } from 'lodash'
import { shallowReactive, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import type { Files } from '@/models/common/file'
import type { SpxProject } from '../project'
import type { State } from '../sprite'
import type { SpriteResourceOwner } from './common'
import { AnimationGen, type RawAnimationGenConfig } from './animation-gen'
import { CostumeGen, type RawCostumeGenConfig } from './costume-gen'
import { loadReferenceImageSelection } from './reference-image'

type Gen = CostumeGen | AnimationGen
type Generation =
  | { type: 'costume'; config: RawCostumeGenConfig }
  | { type: 'animation'; config: RawAnimationGenConfig }
type Version = { path: string; generation: Generation }
export type StoredSpriteResourceGen = {
  id: string
  spriteId: string
  suggested: boolean
  boundStates: State[]
  current: Generation
  versions: Version[]
  index: number
}

function snapshot(gen: Gen, path: string): [Generation, Files] {
  if (gen instanceof CostumeGen) {
    const [config, files] = gen.export(path)
    return [{ type: 'costume', config: cloneDeep(config) }, files]
  }
  const [config, files] = gen.export(path)
  return [{ type: 'animation', config: cloneDeep(config) }, files]
}

function restore(
  i18n: I18n,
  owner: Gen['parent'],
  project: SpxProject,
  generation: Generation,
  files: Files,
  path: string
) {
  return generation.type === 'costume'
    ? CostumeGen.load(i18n, owner, project, generation.config, files, path)
    : AnimationGen.load(i18n, owner, project, generation.config, files, path)
}

/** Generation and selectable results for one pending resource of an adopted sprite. */
export class SpriteResourceGen extends Disposable {
  versions = shallowReactive<Array<Version & { files: Files }>>([])
  readonly spriteId: string
  /** A selection of -1 restores the initial input without a generated result. */
  index = -1

  constructor(
    private i18n: I18n,
    private project: SpxProject,
    public gen: Gen,
    readonly suggested = false,
    readonly boundStates: State[] = [],
    readonly id = nanoid()
  ) {
    super()
    this.spriteId = gen.sprite.id
    const self = shallowReactive(this)
    self.observe(gen)
    this.addDisposer(() => self.gen.dispose())
    return self
  }

  get busy() {
    const gen = this.gen
    return (
      (gen instanceof CostumeGen ? gen.generateState : gen.generateVideoState).status === 'running' ||
      gen.enrichState.status === 'running' ||
      gen.finishState.status === 'running'
    )
  }

  get hasMedia() {
    return this.gen instanceof CostumeGen ? this.gen.image != null : this.gen.video != null
  }

  get versionReferenceCostume() {
    const version = this.versions[this.index]
    if (version == null) return null
    const { reference, referenceCostumeId } = version.generation.config
    const selection = loadReferenceImageSelection(reference, referenceCostumeId, version.files)
    return selection?.type === 'costume' ? this.gen.sprite.costumes.find((c) => c.id === selection.costumeId) : null
  }

  private get path() {
    return `gen/sprite-resources/${this.id}`
  }

  private observe(gen: Gen) {
    gen.addDisposer(
      watch(
        () => {
          if (gen instanceof CostumeGen) return gen.generateState.status === 'finished' ? gen.image : null
          return gen.generateVideoState.status === 'finished' ? gen.video : null
        },
        (media) => {
          if (media == null) return
          const path = this.path + '/' + nanoid()
          const [generation, files] = snapshot(gen, path)
          this.versions.push({ generation, files, path })
          this.index = this.versions.length - 1
        },
        { flush: 'sync' }
      )
    )
    if (gen instanceof AnimationGen) {
      gen.addDisposer(
        watch(
          () => gen.framesConfig,
          (config) => {
            const version = this.versions[this.index]
            if (gen.video == null || version?.generation.type !== 'animation') return
            version.generation.config.framesConfig = config ?? undefined
            if (gen.result != null) gen.resetFinishState()
          },
          { flush: 'sync' }
        )
      )
    }
  }

  previousVersion() {
    if (this.index < 0) return
    if (!this.hasMedia) {
      // Restore the selected result after a failed retry before stepping further back.
      this.select(this.index)
      return
    }
    this.select(this.index - 1)
  }

  nextVersion() {
    this.select(this.index + 1)
  }

  select(index: number) {
    const version = this.versions[index === -1 ? 0 : index]
    if (this.busy || version == null) return
    let gen: Gen
    if (index === -1) {
      // The initial choice restores the first submitted prompt and reference without a result.
      const { config } = version.generation
      const referenceImageSelection = loadReferenceImageSelection(
        config.reference,
        config.referenceCostumeId,
        version.files
      )
      gen =
        version.generation.type === 'costume'
          ? new CostumeGen(this.i18n, this.gen.parent, this.project, {
              settings: version.generation.config.settings,
              referenceImageSelection
            })
          : new AnimationGen(this.i18n, this.gen.parent, this.project, {
              settings: version.generation.config.settings,
              referenceImageSelection
            })
    } else {
      gen = restore(this.i18n, this.gen.parent, this.project, version.generation, version.files, version.path)
    }
    const name = this.gen.name
    this.gen.dispose()
    this.gen = gen
    gen.setSettings({ name })
    this.index = index
    this.observe(gen)
  }

  discard() {
    if (this.busy || this.versions.length === 0) return
    this.select(-1)
    this.versions.splice(0)
  }

  export(): [StoredSpriteResourceGen, Files] {
    const [current, files] = snapshot(this.gen, this.path)
    const versions = this.versions.map(({ path, generation, files: media }) => {
      Object.assign(files, media)
      return { path, generation }
    })
    return [
      {
        id: this.id,
        spriteId: this.spriteId,
        suggested: this.suggested,
        boundStates: this.boundStates,
        current,
        versions,
        index: this.index
      },
      files
    ]
  }

  static load(
    i18n: I18n,
    owner: SpriteResourceOwner,
    project: SpxProject,
    stored: StoredSpriteResourceGen,
    files: Files
  ) {
    const gen = restore(i18n, owner, project, stored.current, files, `gen/sprite-resources/${stored.id}`)
    const draft = new SpriteResourceGen(i18n, project, gen, stored.suggested, stored.boundStates, stored.id)
    for (const version of stored.versions) {
      const media = Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(version.path + '/')))
      draft.versions.push({ ...version, files: media })
    }
    draft.index = Math.min(Math.max(stored.index, -1), draft.versions.length - 1)
    return draft
  }
}
