import { toText, type Files } from '@/models/common/file'
import { parseSkillDocument } from './parser'
import type { LoadedSkillDocument, SkillBundle, SkillManifestItem, SkillRegistry } from './types'

type SkillBundleRecord = {
  manifest: SkillManifestItem
  instructions: string
  files: Files
  resourcePaths: string[]
}

async function buildSkillBundleRecord(bundle: SkillBundle): Promise<SkillBundleRecord> {
  const skillFile = bundle.files['SKILL.md']
  if (skillFile == null) throw new Error('Skill bundle does not contain SKILL.md')
  const parsed = parseSkillDocument(await toText(skillFile))
  const resourcePaths = Object.entries(bundle.files)
    .filter(([path, file]) => file != null && path !== 'SKILL.md')
    .map(([path]) => path)
    .sort()

  return {
    manifest: {
      name: parsed.name,
      description: parsed.description
    },
    instructions: parsed.content,
    files: bundle.files,
    resourcePaths
  }
}

export class InMemorySkillRegistry implements SkillRegistry {
  private bundles = new Set<SkillBundle>()
  private cachedRecords = new Map<SkillBundle, Promise<SkillBundleRecord>>()

  register(bundle: SkillBundle) {
    this.bundles.add(bundle)
    return () => {
      if (!this.bundles.delete(bundle)) return
      this.cachedRecords.delete(bundle)
    }
  }

  private getCachedRecord(bundle: SkillBundle): Promise<SkillBundleRecord> {
    let cachedRecord = this.cachedRecords.get(bundle)
    if (cachedRecord != null) return cachedRecord
    cachedRecord = buildSkillBundleRecord(bundle).catch((error: unknown) => {
      this.cachedRecords.delete(bundle)
      throw error
    })
    this.cachedRecords.set(bundle, cachedRecord)
    return cachedRecord
  }

  private async loadRecords(): Promise<Map<string, SkillBundleRecord>> {
    const nextRecords = new Map<string, SkillBundleRecord>()
    const records = await Promise.all(Array.from(this.bundles, (bundle) => this.getCachedRecord(bundle)))
    for (const record of records.sort((left, right) => left.manifest.name.localeCompare(right.manifest.name))) {
      if (nextRecords.has(record.manifest.name)) {
        throw new Error(`Duplicate skill name: ${record.manifest.name}`)
      }
      nextRecords.set(record.manifest.name, record)
    }
    return nextRecords
  }

  async list(): Promise<SkillManifestItem[]> {
    const records = await this.loadRecords()
    return Array.from(records.values(), (record) => record.manifest)
  }

  async load(name: string): Promise<LoadedSkillDocument> {
    const record = (await this.loadRecords()).get(name)
    if (record == null) throw new Error(`Skill not found: ${name}`)
    return {
      name: record.manifest.name,
      description: record.manifest.description,
      instructions: record.instructions,
      resourcePaths: record.resourcePaths
    }
  }

  async loadResource(name: string, resourcePath: string): Promise<string> {
    const record = (await this.loadRecords()).get(name)
    if (record == null) throw new Error(`Skill not found: ${name}`)
    const file = record.files[resourcePath]
    if (file == null) {
      throw new Error(`Skill resource not found: ${name}/${resourcePath}`)
    }
    return toText(file)
  }
}
