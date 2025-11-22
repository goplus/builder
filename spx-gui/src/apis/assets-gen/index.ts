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
export type Settings =
  | SpriteSettings
  | CostumeSettings
  | AnimationSettings
  | BackdropSettings
  | SoundSettings

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

  const baseEnriched = {
    ...initialSettings,
    artStyle: initialSettings.artStyle ?? 'pixel-art',
    perspective: initialSettings.perspective ?? 'side-view'
  }

  switch (assetType) {
    case AssetType.Sprite:
      return {
        ...baseEnriched,
        assetType: AssetType.Sprite,
        description:
          initialSettings.description ||
          'A towering, broad-shouldered figure composed of dark, charcoal-gray pixel clusters. Glowing cracks of orange and yellow embers cover its muscular torso and limbs.'
      } as SpriteSettings

    case 'costume':
      return {
        ...baseEnriched,
        assetType: 'costume',
        description:
          initialSettings.description || 'A pixel-art character costume with detailed features and vibrant colors'
      } as CostumeSettings

    case 'animation':
      return {
        ...baseEnriched,
        assetType: 'animation',
        description:
          initialSettings.description ||
          'A smooth animation sequence showing character movement with fluid transitions'
      } as AnimationSettings

    case AssetType.Backdrop:
      return {
        ...baseEnriched,
        assetType: AssetType.Backdrop,
        description: initialSettings.description || 'A detailed pixel-art background scene with atmospheric elements'
      } as BackdropSettings

    case AssetType.Sound:
      return {
        ...baseEnriched,
        assetType: AssetType.Sound,
        description: initialSettings.description || 'An atmospheric sound effect with clear audio quality',
        duration: 3
      } as SoundSettings

    default:
      throw new Error(`Unknown asset type: ${assetType}`)
  }
}

export type AnimationDescription = {
  name: string
  description: string
}

/**
 * Generates animation type descriptions based on sprite settings
 * @param settings Sprite settings
 * @returns Promise resolving to array of animation descriptions
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateAnimationDescriptions(_settings: SpriteSettings): Promise<AnimationDescription[]> {
  // Simulate AI processing delay
  await timeout(1000)

  // Return mock animation descriptions based on Balrog example
  return [
    { name: 'idle', description: 'The character stands motionless with subtle breathing animation, embers flickering gently on its body' },
    { name: 'walk', description: 'The character moves forward with powerful strides, its body swaying with each step' },
    { name: 'attack', description: 'The character lunges forward aggressively, unleashing a powerful strike with dramatic motion' }
  ]
}

/**
 * Generates a single costume image based on settings
 * @param settings Costume settings
 * @returns Promise resolving to image URL
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateCostumeImage(_settings: CostumeSettings): Promise<string> {
  // Simulate image generation delay
  await timeout(2000)

  // Return mock costume image from balrog mockdata
  return defaultCostumeUrl
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
 * Generates animation video from start and end frames
 * @param settings Animation settings
 * @param startFrameUrl URL of the starting frame
 * @param endFrameUrl URL of the ending frame
 * @returns Promise resolving to video URL
 */
export async function generateAnimationVideo(
  settings: AnimationSettings,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _startFrameUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _endFrameUrl: string
): Promise<string> {
  // Simulate video generation delay
  await timeout(3000)

  const animType = settings.name?.toLowerCase() || 'idle'

  // Return appropriate mock video based on animation type
  const videoMap: Record<string, string> = {
    idle: idleVideoUrl,
    walk: walkVideoUrl,
    attack: attackVideoUrl
  }

  return videoMap[animType] || videoMap.idle
}

/**
 * Extracts frames from a video at specified intervals
 * @param videoUrl URL of the video
 * @param interval Interval between frames in milliseconds
 * @returns Promise resolving to array of frame URLs
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateBackdropImage(_settings: BackdropSettings): Promise<string> {
  // Simulate image generation delay
  await timeout(2000)

  // For now, return the default costume as a placeholder backdrop
  // In real implementation, this would generate appropriate backdrop images
  return defaultCostumeUrl
}

/**
 * Generates sound audio based on settings
 * @param settings Sound settings
 * @returns Promise resolving to audio URL
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateSoundAudio(_settings: SoundSettings): Promise<string> {
  // Simulate audio generation delay
  await timeout(2000)

  // Return mock sound file
  return soundUrl
}
