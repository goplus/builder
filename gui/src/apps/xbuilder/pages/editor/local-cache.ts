import type { LocalHelpers } from '@/models/common/local'
import type { ProjectSerialized } from '@/models/project'
import type { ILocalCache } from '@/components/editor/editing'

const legacyKey = 'XBUILDER_CACHED_PROJECT'

export class LocalCache implements ILocalCache {
  private project: { owner: string; name: string } | null = null

  constructor(
    private helpers: Pick<LocalHelpers, 'load' | 'save' | 'clear'>,
    private account: () => string | null
  ) {}

  setProject(owner: string, name: string) {
    this.project = { owner, name }
  }

  private get key() {
    if (this.project == null) throw new Error('Project cache is not initialized')
    return `builder-project-draft:${JSON.stringify([this.account(), this.project.owner, this.project.name])}`
  }

  async load(signal?: AbortSignal) {
    const key = this.key
    const account = this.account()
    const cached = await this.helpers.load(key, signal)
    if (cached != null) return cached
    const legacy = await this.helpers.load(legacyKey, signal)
    if (
      legacy == null ||
      legacy.metadata.owner !== account ||
      legacy.metadata.owner !== this.project!.owner ||
      legacy.metadata.name !== this.project!.name
    )
      return null
    await this.helpers.save(key, legacy, signal)
    await this.helpers.clear(legacyKey)
    return legacy
  }

  save(serialized: ProjectSerialized, signal?: AbortSignal) {
    return this.helpers.save(this.key, serialized, signal)
  }

  clear() {
    return this.helpers.clear(this.key)
  }
}
