import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { SoundCategory } from '@/apis/common'
import {
  adoptAsset,
  TaskStatus,
  TaskType,
  type SpeechSoundSettings,
  type SpeechSettings,
  type TaskResultGenerateSound
} from '@/apis/aigc'
import { Disposable } from '@/utils/disposable'
import { createFileWithUniversalUrl } from '../../common/cloud'
import { ensureValidSoundName, validateSoundName, type SoundLikeParent } from '../common/asset-name'
import { sound2Asset } from '../common/asset'
import { Sound } from '../sound'
import { Phase, Task } from './common'

export type SoundGenInits = {
  id?: string
  generateTask?: Task<TaskType.GenerateSound> | null
  generatePhase?: Phase<Sound>
}

type GenerateSpeechSettingsUpdates = Partial<Omit<SpeechSoundSettings, 'speechSettings'>> & {
  speechSettings?: Partial<SpeechSettings>
}

export class SoundGen extends Disposable {
  id: string
  settings: SpeechSoundSettings
  private generateTask: Task<TaskType.GenerateSound> | null
  private generatePhase: Phase<Sound>

  constructor(inits: SoundGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
    this.settings = {
      name: '',
      description: '',
      category: SoundCategory.Voice,
      speechSettings: {
        text: '',
        voiceGender: 'male',
        voiceAgeGroup: 'youth',
        instruction: ''
      }
    }
    this.generateTask = inits.generateTask ?? null
    this.generatePhase = inits.generatePhase ?? new Phase({ en: 'generate sound', zh: '生成声音' })
    return reactive(this) as this
  }

  private parent: SoundLikeParent | null = null
  setParent(parent: SoundLikeParent | null) {
    this.parent = parent
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    const err = validateSoundName(name, this.parent)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.settings.name = name
    this.result?.setName(name)
  }

  setSettings(updates: GenerateSpeechSettingsUpdates) {
    if (updates.name != null && updates.name !== this.settings.name) {
      updates = { ...updates, name: ensureValidSoundName(updates.name, this.parent) }
    }
    const { speechSettings, ...rest } = updates
    Object.assign(this.settings, rest)
    if (speechSettings != null) {
      Object.assign(this.settings.speechSettings, speechSettings)
    }
    if (updates.name != null) this.result?.setName(updates.name)
  }

  get generateState() {
    return this.generatePhase.state
  }

  get result() {
    return this.generatePhase.state.status === 'finished' ? this.generatePhase.state.result : null
  }

  reset() {
    this.generateTask = null
    this.generatePhase.reset()
  }

  async generate() {
    return this.generatePhase.run(async (reporter) => {
      this.generateTask?.tryCancel()
      this.generateTask = new Task(TaskType.GenerateSound)
      await this.generateTask.start({ settings: this.settings })
      const taskResult = await this.generateTask.untilCompleted(reporter)
      return this.createSound(taskResult)
    })
  }

  private async createSound(taskResult: TaskResultGenerateSound) {
    const file = createFileWithUniversalUrl(taskResult.audioUrl)
    const sound = await Sound.create(this.settings.name, file)
    sound.setAssetMetadata({
      description: this.settings.description,
      extraSettings: {
        category: this.settings.category
      }
    })
    sound.setExtraConfig({
      builder_soundGen: {
        ...this.settings,
        result: {
          audioUrl: taskResult.audioUrl
        }
      }
    })
    return sound
  }

  async recordAdoption() {
    const sound = this.result
    if (sound == null) throw new Error('result sound expected')
    const taskIds = this.generateTask?.data?.status === TaskStatus.Completed ? [this.generateTask.data.id] : []
    const assetData = await sound2Asset(sound)
    return adoptAsset({
      taskIds,
      asset: {
        ...assetData,
        displayName: this.settings.name,
        description: this.settings.description,
        extraSettings: {
          category: this.settings.category
        }
      }
    })
  }

  cancel() {
    return this.generateTask?.tryCancel()
  }
}
