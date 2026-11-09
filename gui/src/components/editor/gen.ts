import { shallowReactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { untilNotNull } from '@/utils/utils'
import { capture } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import type { Files } from '@/models/common/file'
import { ensureValidBackdropName, ensureValidSpriteName } from '@/models/spx/common/asset-name'
import type { AssetGenModel } from '@/models/spx/common/asset'
import type { SpxProject } from '@/models/spx/project'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'

export type GenPos = { x: number; y: number }
export type GenPosProvider<T extends AssetType> = (gen: AssetGenModel<T>) => Promise<GenPos | null>

export class GenState extends Disposable {
  constructor(
    private i18n: I18n,
    private project: SpxProject
  ) {
    super()
    this.addDisposer(() => {
      this.sprites.forEach((gen) => gen.dispose())
      this.backdrops.forEach((gen) => gen.dispose())
      this.genPosProviderMap.clear()
    })
  }
  sprites = shallowReactive<SpriteGen[]>([])
  private prepareAddSprite(gen: SpriteGen) {
    const newName = ensureValidSpriteName(gen.settings.name, this)
    gen.setSettings({ name: newName })
    gen.setParent(this)
    gen.addDisposer(() => gen.setParent(null))
    // Remove (& dispose) the gen when generation finished
    untilNotNull(() => gen.result, gen.getSignal()).then(() => this.removeSprite(gen.id), capture)
  }
  addSprite(gen: SpriteGen) {
    this.prepareAddSprite(gen)
    this.sprites.push(gen)
  }
  removeSprite(id: string) {
    const index = this.sprites.findIndex((gen) => gen.id === id)
    if (index < 0) throw new Error('SpriteGen not found in editor state')
    const [gen] = this.sprites.splice(index, 1)
    gen.dispose()
  }

  backdrops = shallowReactive<BackdropGen[]>([])
  private prepareAddBackdrop(gen: BackdropGen) {
    const newName = ensureValidBackdropName(gen.settings.name, this)
    gen.setSettings({ name: newName })
    gen.setParent(this)
    gen.addDisposer(() => gen.setParent(null))
    // Remove (& dispose) the gen when generation finished
    untilNotNull(() => gen.result, gen.getSignal()).then(() => this.removeBackdrop(gen.id), capture)
  }
  addBackdrop(gen: BackdropGen) {
    this.prepareAddBackdrop(gen)
    this.backdrops.push(gen)
  }
  removeBackdrop(id: string) {
    const index = this.backdrops.findIndex((gen) => gen.id === id)
    if (index < 0) throw new Error('BackdropGen not found in editor state')
    const [gen] = this.backdrops.splice(index, 1)
    gen.dispose()
  }

  private genPosProviderMap = shallowReactive(new Map<AssetType, GenPosProvider<AssetType>[]>())
  private registerGenPosProvider<T extends AssetType>(type: T, provider: GenPosProvider<T>) {
    const providers = this.genPosProviderMap.get(type) ?? []
    this.genPosProviderMap.set(type, [...providers, provider])
    return () => {
      this.genPosProviderMap.set(
        type,
        (this.genPosProviderMap.get(type) ?? []).filter((p) => p !== provider)
      )
    }
  }
  registerSpritePosProvider(provider: GenPosProvider<AssetType.Sprite>) {
    return this.registerGenPosProvider(AssetType.Sprite, provider)
  }
  registerBackdropPosProvider(provider: GenPosProvider<AssetType.Backdrop>) {
    return this.registerGenPosProvider(AssetType.Backdrop, provider)
  }
  /**
   * Retrieves the position for the given generation.
   * Acts as a consumer of positions, returning the result from a registered provider
   * for the generation's asset type, or null if no providers are available.
   */
  private async getGenPos<T extends AssetType>(assetType: T, gen: AssetGenModel<T>) {
    const providers = this.genPosProviderMap.get(assetType) ?? []
    const provider = providers.at(-1)
    return provider != null ? provider(gen) : null
  }
  getSpritePos(gen: SpriteGen) {
    return this.getGenPos(AssetType.Sprite, gen)
  }
  getBackdropPos(gen: BackdropGen) {
    return this.getGenPos(AssetType.Backdrop, gen)
  }

  async load(files: Files): Promise<void> {
    this.sprites.splice(0).forEach((gen) => gen.dispose())
    this.backdrops.splice(0).forEach((gen) => gen.dispose())
    const [loadedSprites, loadedBackdrops] = await Promise.all([
      SpriteGen.loadAll(this.i18n, this.project, files),
      BackdropGen.loadAll(this.i18n, this.project, files)
    ])
    loadedSprites.forEach((gen) => this.addSprite(gen))
    loadedBackdrops.forEach((gen) => this.addBackdrop(gen))
  }

  export(): Files {
    const files: Files = {}
    ;[...this.sprites, ...this.backdrops].forEach((gen) => {
      const genFiles = gen.export()
      Object.assign(files, genFiles)
    })
    return files
  }
}
