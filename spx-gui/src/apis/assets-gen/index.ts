/* eslint-disable @typescript-eslint/no-unused-vars */
import { AssetType } from '@/apis/asset'
import type { AssetSettings } from '@/models/common/asset'
import { timeout } from '@/utils/utils'

// Mock data imports
import defaultCostumeUrl from './mockdata/balrog/default_costume.png'
import idleFrameUrl from './mockdata/balrog/idle_frame.png'
import walkFrameUrl from './mockdata/balrog/walk_frame.png'
import attackStartUrl from './mockdata/balrog/attack_start.png'
import attackEndUrl from './mockdata/balrog/attack_end.png'
import idleVideoUrl from './mockdata/balrog/idle.mp4'
import walkVideoUrl from './mockdata/balrog/walk.mp4'
import attackVideoUrl from './mockdata/balrog/attack.mp4'
import soundUrl from './mockdata/sound.mp3'
import backdropUrl from './mockdata/backdrop.png'

/**
 * Base settings type that can be enriched
 */
export type BaseSettings = Partial<AssetSettings>

/**
 * Settings specific to sprite generation
 */
export type SpriteSettings = AssetSettings & {
  name?: string
}

/**
 * Settings specific to costume generation
 */
export type CostumeSettings = AssetSettings & {
  spriteName?: string
  name?: string
}

/**
 * Settings specific to animation generation
 */
export type AnimationSettings = AssetSettings & {
  spriteName?: string
  name?: string
}

/**
 * Settings specific to backdrop generation
 */
export type BackdropSettings = AssetSettings & {
  name?: string
}

/**
 * Settings specific to sound generation
 */
export type SoundSettings = AssetSettings & {
  name?: string
  duration?: number
}

/**
 * Union type for all settings
 */
export type Settings = SpriteSettings | CostumeSettings | AnimationSettings | BackdropSettings | SoundSettings

/**
 * Enriches initial settings with AI-generated details based on asset type
 * @param initialSettings Partial settings to enrich
 * @param assetType Type of asset being generated
 * @returns Promise resolving to enriched settings
 */
export async function enrichSettings(
  initialSettings: BaseSettings,
  assetType: AssetType | 'costume' | 'animation'
): Promise<Settings> {
  // Simulate AI processing delay
  await timeout(800)

  const baseEnriched: AssetSettings = {
    ...initialSettings,
    description: null,
    projectDescription: null,
    artStyle: initialSettings.artStyle ?? 'pixel-art',
    perspective: initialSettings.perspective ?? 'side-view',
    category: null
  }

  switch (assetType) {
    case AssetType.Sprite:
      return {
        ...baseEnriched,
        name: '炎魔',
        description:
          initialSettings.description +
          '一个由深灰色像素块组成的高大魁梧身影。肌肉发达的躯干和四肢上布满了橙黄色余烬般的发光裂纹。',
        category: 'character'
      } satisfies SpriteSettings

    case 'costume':
      return {
        ...baseEnriched,
        name: '战士装扮',
        description:
          initialSettings.description + '一套像素风格的角色服装，具有精细的细节和鲜艳的色彩'
      } satisfies CostumeSettings

    case 'animation':
      return {
        ...baseEnriched,
        name: '行走循环',
        description:
          initialSettings.description + '一段流畅的动画序列，展示角色的自然移动'
      } satisfies AnimationSettings

    case AssetType.Backdrop:
      return {
        ...baseEnriched,
        name: '森林空地',
        description: initialSettings.description + '一幅精细的像素风格背景场景，具有丰富的氛围元素',
        category: 'scene'
      } satisfies BackdropSettings

    case AssetType.Sound:
      return {
        ...baseEnriched,
        name: '风声呼啸',
        description: initialSettings.description + '一段清晰的氛围音效',
        duration: 3,
        category: 'effect'
      } satisfies SoundSettings

    default:
      throw new Error(`Unknown asset type: ${assetType}`)
  }
}

export type AnimationDescription = {
  name: string
  description: string
}

/**
 * Description for a costume to be generated
 */
export type CostumeDescription = {
  name: string
  description: string
}

/**
 * Sprite content descriptions including costumes and animations
 */
export type SpriteContentDescriptions = {
  costumes: CostumeDescription[]
  animations: AnimationDescription[]
}

/**
 * Generates costume and animation descriptions for a sprite
 * @param settings Sprite settings
 * @returns Promise resolving to costume and animation descriptions
 */
export async function generateSpriteContentDescriptions(_settings: SpriteSettings): Promise<SpriteContentDescriptions> {
  // Simulate AI processing delay
  await timeout(1500)

  // Return mock descriptions based on Balrog example
  return {
    costumes: [
      {
        name: '默认',
        description: '默认站立姿势，身体上可见发光的余烬裂纹'
      }
    ],
    animations: [
      {
        name: '待机',
        description:
          '角色静止站立，有轻微的呼吸动画，身体上的余烬轻轻闪烁'
      },
      {
        name: '行走',
        description: '角色向前迈着有力的步伐，身体随着每一步轻轻摇摆'
      },
      {
        name: '攻击',
        description: '角色猛然向前冲刺，释放出强力的攻击动作'
      }
    ]
  }
}

/**
 * Generates animation type descriptions based on sprite settings
 * @param settings Sprite settings
 * @returns Promise resolving to array of animation descriptions
 */
export async function generateAnimationDescriptions(_settings: SpriteSettings): Promise<AnimationDescription[]> {
  // Simulate AI processing delay
  await timeout(1000)

  // Return mock animation descriptions based on Balrog example
  return [
    {
      name: '待机',
      description:
        '角色静止站立，有轻微的呼吸动画，身体上的余烬轻轻闪烁'
    },
    { name: '行走', description: '角色向前迈着有力的步伐，身体随着每一步轻轻摇摆' },
    {
      name: '攻击',
      description: '角色猛然向前冲刺，释放出强力的攻击动作'
    }
  ]
}

/**
 * Generates a single costume image based on settings
 * @param settings Costume settings
 * @returns Promise resolving to image URL
 */
export async function generateCostumeImage(_settings: CostumeSettings): Promise<string> {
  // Simulate image generation delay
  await timeout(2000)

  // Return mock costume image from balrog mockdata
  return defaultCostumeUrl
}

/**
 * Modifies an existing costume image based on user instructions
 * @param imageUrl URL of the existing image
 * @param instruction User's modification instructions
 * @param settings Current costume settings
 * @returns Promise resolving to modified image URL
 */
export async function modifyCostumeImage(
  _imageUrl: string,
  _instruction: string,
  _settings: CostumeSettings
): Promise<string> {
  // Simulate image modification delay
  await timeout(2000)

  // Return mock modified image (in reality, this would call an AI service)
  return defaultCostumeUrl
}

/**
 * Generates a reference frame image for an animation based on a costume reference
 * @param settings Animation settings
 * @param referenceImageUrl URL of the reference costume image
 * @returns Promise resolving to frame image URL
 */
export async function generateAnimationFrame(
  _settings: AnimationSettings,
  _referenceImageUrl: string
): Promise<string> {
  // Simulate frame generation delay
  await timeout(2000)

  // Return mock frame image
  return idleFrameUrl
}

/**
 * Modifies an existing animation frame image based on user instructions
 * @param imageUrl URL of the existing image
 * @param instruction User's modification instructions
 * @param settings Current animation settings
 * @returns Promise resolving to modified image URL
 */
export async function modifyAnimationFrame(
  _imageUrl: string,
  _instruction: string,
  _settings: AnimationSettings
): Promise<string> {
  // Simulate image modification delay
  await timeout(2000)

  // Return mock modified image
  return idleFrameUrl
}

/**
 * Generates start and end frame images for an animation
 * @param settings Animation settings
 * @returns Promise resolving to start and end frame URLs
 */
export async function generateAnimationFrames(settings: AnimationSettings): Promise<{
  startFrameUrl: string
  endFrameUrl: string
}> {
  // Simulate frame generation delay
  await timeout(2500)

  const animType = settings.name?.toLowerCase() || 'idle'

  // Return appropriate mock frames based on animation type
  const frameMap: Record<string, { start: string; end: string }> = {
    idle: {
      start: idleFrameUrl,
      end: idleFrameUrl
    },
    walk: {
      start: walkFrameUrl,
      end: walkFrameUrl
    },
    attack: {
      start: attackStartUrl,
      end: attackEndUrl
    }
  }

  const frames = frameMap[animType] || frameMap.idle

  return {
    startFrameUrl: frames.start,
    endFrameUrl: frames.end
  }
}

/**
 * Task status for video generation
 */
export type VideoTaskStatus = {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  /** Result video URL, only available when status is 'completed' */
  resultUrl?: string
  /** Error message, only available when status is 'failed' */
  error?: string
}

// Mock task storage for simulating async video generation
const mockVideoTasks = new Map<
  string,
  {
    status: VideoTaskStatus['status']
    resultUrl?: string
    createdAt: number
    settings: AnimationSettings
  }
>()

// Video generation takes 30 seconds in mock
const VIDEO_GENERATION_DURATION = 30_000

/**
 * Submits an animation video generation task
 * @param settings Animation settings
 * @param referenceFrameUrl URL of the reference frame
 * @returns Promise resolving to task ID
 */
export async function submitAnimationVideoTask(
  settings: AnimationSettings,
  _referenceFrameUrl: string
): Promise<string> {
  // Simulate network delay for task submission
  await timeout(500)

  // Generate a mock task ID
  const taskId = `video-task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Store the task
  mockVideoTasks.set(taskId, {
    status: 'processing',
    createdAt: Date.now(),
    settings
  })

  return taskId
}

/**
 * Gets the status of an animation video generation task
 * @param taskId The task ID returned from submitAnimationVideoTask
 * @returns Promise resolving to task status
 */
export async function getAnimationVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
  // Simulate network delay
  await timeout(200)

  const task = mockVideoTasks.get(taskId)
  if (task == null) {
    return {
      status: 'failed',
      error: 'Task not found'
    }
  }

  // Check if the task has been processing long enough
  const elapsed = Date.now() - task.createdAt
  if (elapsed >= VIDEO_GENERATION_DURATION && task.status === 'processing') {
    // Task is complete, determine the result URL
    const animType = task.settings.name?.toLowerCase() || 'idle'
    const videoMap: Record<string, string> = {
      idle: idleVideoUrl,
      walk: walkVideoUrl,
      attack: attackVideoUrl
    }
    const resultUrl = videoMap[animType] || videoMap.idle

    // Update task status
    task.status = 'completed'
    task.resultUrl = resultUrl
  }

  return {
    status: task.status,
    resultUrl: task.resultUrl
  }
}

/**
 * Extracts frames from a video at specified intervals
 * @param videoUrl URL of the video
 * @param interval Interval between frames in milliseconds
 * @returns Promise resolving to array of frame URLs
 */
export async function getFramesFromVideo(videoUrl: string, _interval: number = 100): Promise<string[]> {
  // Simulate frame extraction delay
  await timeout(1500)

  // Determine which animation type based on video URL
  const animType = videoUrl.includes('walk')
    ? 'walk'
    : videoUrl.includes('attack')
      ? 'attack'
      : videoUrl.includes('idle')
        ? 'idle'
        : 'idle'

  // Return mock frames from appropriate directory
  // Note: In production, these would be dynamically loaded from the video
  const frameCount = 7

  const framePromises = Array.from({ length: frameCount }, async (_, i) => {
    const frameNum = String(i).padStart(4, '0')
    const frameModule = await import(`./mockdata/balrog/${animType}_frames/${animType}_${frameNum}.png`)
    return frameModule.default
  })

  return Promise.all(framePromises)
}

/**
 * Generates a backdrop image based on settings
 * @param settings Backdrop settings
 * @returns Promise resolving to image URL
 */
export async function generateBackdropImage(_settings: BackdropSettings): Promise<string> {
  // Simulate image generation delay
  await timeout(2000)

  return backdropUrl
}

/**
 * Modifies an existing backdrop image based on user instructions
 * @param imageUrl URL of the existing image
 * @param instruction User's modification instructions
 * @param settings Current backdrop settings
 * @returns Promise resolving to modified image URL
 */
export async function modifyBackdropImage(
  _imageUrl: string,
  _instruction: string,
  _settings: BackdropSettings
): Promise<string> {
  // Simulate image modification delay
  await timeout(2000)

  return backdropUrl
}

/**
 * Generates sound audio based on settings
 * @param settings Sound settings
 * @returns Promise resolving to audio URL
 */
export async function generateSoundAudio(_settings: SoundSettings): Promise<string> {
  // Simulate audio generation delay
  await timeout(2000)

  // Return mock sound file
  return soundUrl
}
