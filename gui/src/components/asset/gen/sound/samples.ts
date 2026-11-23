import { trimAndApplyGainToWavBlob } from '@/utils/audio'

export type SoundKind = 'music' | 'effect' | 'speech'

export type Sample = {
  blob: Blob
  peaks: number[]
  seconds: number
}

/** 53 × 2px bars + 52 × 2px gaps = 210px, matching SoundTakeCard's waveform track width without subpixel snapping. */
export const PEAK_COUNT = 53

function computePeaks(mono: Float32Array, end: number): number[] {
  const peaks = Array.from({ length: PEAK_COUNT }, (_, index) => {
    const start = Math.floor((end * index) / PEAK_COUNT)
    const stop = Math.max(start + 1, Math.floor((end * (index + 1)) / PEAK_COUNT))
    let energy = 0
    for (let i = start; i < stop; i++) energy += mono[i] ** 2
    return Math.sqrt(energy / (stop - start))
  })
  const max = Math.max(...peaks, 0.001)
  return peaks.map((value) => value / max)
}

export async function loadSample(
  kind: SoundKind,
  version: number,
  lengthOrSpeed: number,
  signal: AbortSignal,
  style: string | null = null
): Promise<Sample> {
  if (kind === 'speech') {
    signal.throwIfAborted()
    return synthesizeSpeechTake(version, lengthOrSpeed, style ?? 'narrator')
  }

  const file = `${kind}-${version}`
  const url = new URL(`./samples/${file}.mp3`, import.meta.url).href
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Could not load sample ${file}: ${response.status}`)

  const decoder = new OfflineAudioContext(1, 1, 24000)
  const audio = await decoder.decodeAudioData(await response.arrayBuffer())
  signal.throwIfAborted()

  const end = Math.min(Math.round(lengthOrSpeed * audio.sampleRate), audio.length)
  // Fade out the tail across all channels so shorter excerpts end cleanly without clicks.
  const fade = Math.min(end, Math.round(0.03 * audio.sampleRate))
  for (let channel = 0; channel < audio.numberOfChannels; channel++) {
    const pcm = audio.getChannelData(channel)
    for (let i = 0; i < fade; i++) {
      pcm[end - fade + i] *= 1 - i / fade
    }
  }

  const peaks = computePeaks(audio.getChannelData(0), end)
  const blob = await trimAndApplyGainToWavBlob(audio, 0, end / audio.length, 1)

  return {
    blob,
    peaks,
    seconds: end / audio.sampleRate
  }
}

export function formatAudioTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export type StylePreview = {
  blob: Blob
  seconds: number
}

const PREVIEW_SAMPLE_RATE = 24000
const stylePreviewCache = new Map<string, StylePreview>()

function encodeMonoWav(samples: Float32Array, sampleRate: number): Blob {
  const byteLength = 44 + samples.length * 2
  const buffer = new ArrayBuffer(byteLength)
  const view = new DataView(buffer)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, byteLength - 8, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function addPluckNote(
  out: Float32Array,
  sampleRate: number,
  startSec: number,
  durationSec: number,
  freq: number,
  gain: number,
  waveform: 'sine' | 'square' | 'saw' | 'triangle' = 'sine'
) {
  const start = Math.max(0, Math.floor(startSec * sampleRate))
  const count = Math.floor(durationSec * sampleRate)
  const attack = Math.max(1, Math.floor(0.008 * sampleRate))
  const end = Math.min(out.length, start + count)

  for (let i = start; i < end; i++) {
    const local = i - start
    const t = local / sampleRate
    const env = Math.min(1, local / attack) * Math.exp(-3.6 * (local / count))
    const phase = (t * freq) % 1
    let osc = 0
    if (waveform === 'sine') osc = Math.sin(2 * Math.PI * t * freq)
    else if (waveform === 'square') osc = phase < 0.5 ? 1 : -1
    else if (waveform === 'saw') osc = 2 * phase - 1
    else osc = 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))
    out[i] += osc * env * gain
  }
}

function renderVoiceCadence(
  pcm: Float32Array,
  sampleRate: number,
  voice: string,
  syllables: ReadonlyArray<{ start: number; dur: number; pitchMul: number; vowel: number }>,
  speed = 1
) {
  const basePitchMap: Record<string, { f0: number; formantShift: number; robotic?: boolean }> = {
    narrator: { f0: 145, formantShift: 1.0 },
    hero: { f0: 225, formantShift: 1.18 },
    fairy: { f0: 340, formantShift: 1.38 },
    elder: { f0: 105, formantShift: 0.84 },
    robot: { f0: 165, formantShift: 1.05, robotic: true }
  }
  const profile = basePitchMap[voice] ?? basePitchMap.narrator

  for (const s of syllables) {
    const startIdx = Math.max(0, Math.floor((s.start / speed) * sampleRate))
    const len = Math.max(1, Math.floor((s.dur / speed) * sampleRate))
    const endIdx = Math.min(pcm.length, startIdx + len)

    let phase = 0
    for (let i = startIdx; i < endIdx; i++) {
      const u = (i - startIdx) / len
      const t = (i - startIdx) / sampleRate
      const env =
        Math.sin(Math.min(1, u / 0.16) * (Math.PI / 2)) * Math.sin(Math.min(1, (1 - u) / 0.22) * (Math.PI / 2))
      const contour = profile.robotic ? 1 : 1 + 0.08 * Math.sin(Math.PI * u)
      const freq = profile.f0 * s.pitchMul * contour
      phase += (2 * Math.PI * freq) / sampleRate

      // Blend vowel formants (F1/F2-like harmonic emphasis)
      const f1 = (520 + s.vowel * 240) * profile.formantShift
      const f2 = (1350 + (1 - s.vowel) * 550) * profile.formantShift
      let wave =
        0.55 * Math.sin(phase) +
        0.28 * Math.sin(2 * phase) * (0.6 + 0.4 * Math.sin(2 * Math.PI * (f1 / 400) * t)) +
        0.17 * Math.sin(3 * phase) * Math.sin(2 * Math.PI * (f2 / 700) * t)

      if (profile.robotic) {
        wave = Math.tanh(wave * 1.8) * (0.65 + 0.35 * Math.sin(2 * Math.PI * 52 * t))
      }
      pcm[i] += wave * env * 0.48
    }
  }
}

function synthesizeSpeechTake(version: number, speed: number, voice: string): Sample {
  const safeSpeed = speed > 0 ? speed : 1
  const baseSeconds = 2.6
  const seconds = Math.round((baseSeconds / safeSpeed) * 100) / 100
  const pcm = new Float32Array(Math.floor(seconds * PREVIEW_SAMPLE_RATE))

  const pitchShift = [1.0, 1.06, 0.95, 1.1][Math.max(0, Math.min(3, version - 1))]
  const syllables = [
    { start: 0.06, dur: 0.22, pitchMul: 1.0 * pitchShift, vowel: 0.2 },
    { start: 0.31, dur: 0.19, pitchMul: 1.12 * pitchShift, vowel: 0.7 },
    { start: 0.54, dur: 0.26, pitchMul: 1.04 * pitchShift, vowel: 0.4 },
    { start: 0.92, dur: 0.2, pitchMul: 1.16 * pitchShift, vowel: 0.85 },
    { start: 1.16, dur: 0.18, pitchMul: 1.08 * pitchShift, vowel: 0.3 },
    { start: 1.38, dur: 0.28, pitchMul: 1.2 * pitchShift, vowel: 0.6 },
    { start: 1.78, dur: 0.22, pitchMul: 1.02 * pitchShift, vowel: 0.5 },
    { start: 2.04, dur: 0.38, pitchMul: version % 2 === 0 ? 1.18 * pitchShift : 0.92 * pitchShift, vowel: 0.75 }
  ]

  renderVoiceCadence(pcm, PREVIEW_SAMPLE_RATE, voice, syllables, safeSpeed)
  const fadeSamples = Math.floor(0.025 * PREVIEW_SAMPLE_RATE)
  for (let i = 0; i < fadeSamples && i < pcm.length; i++) {
    pcm[i] *= i / fadeSamples
    pcm[pcm.length - 1 - i] *= i / fadeSamples
  }

  return {
    blob: encodeMonoWav(pcm, PREVIEW_SAMPLE_RATE),
    peaks: computePeaks(pcm, pcm.length),
    seconds
  }
}

function synthesizeStyleSamples(style: string, sampleRate: number): { pcm: Float32Array; seconds: number } {
  const isEffect = ['cartoon', 'retro', 'scifi', 'realistic', 'ui'].includes(style)
  const isVoice = ['narrator', 'hero', 'fairy', 'elder', 'robot'].includes(style)
  const seconds = isEffect || isVoice ? 1.4 : 2.2
  const pcm = new Float32Array(Math.floor(seconds * sampleRate))

  if (isVoice) {
    renderVoiceCadence(pcm, sampleRate, style, [
      { start: 0.08, dur: 0.22, pitchMul: 1.0, vowel: 0.25 },
      { start: 0.34, dur: 0.24, pitchMul: 1.15, vowel: 0.7 },
      { start: 0.64, dur: 0.2, pitchMul: 1.06, vowel: 0.45 },
      { start: 0.9, dur: 0.36, pitchMul: 1.18, vowel: 0.8 }
    ])
    const fadeSamples = Math.floor(0.025 * sampleRate)
    for (let i = 0; i < fadeSamples && i < pcm.length; i++) {
      pcm[i] *= i / fadeSamples
      pcm[pcm.length - 1 - i] *= i / fadeSamples
    }
    return { pcm, seconds }
  }

  switch (style) {
    case 'pop': {
      const melody = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25, 587.33]
      melody.forEach((f, idx) => addPluckNote(pcm, sampleRate, idx * 0.25, 0.32, f, 0.28, 'sine'))
      melody.forEach((f, idx) => addPluckNote(pcm, sampleRate, idx * 0.25, 0.2, f * 2, 0.08, 'triangle'))
      addPluckNote(pcm, sampleRate, 0, 1.0, 130.81, 0.25, 'sine')
      addPluckNote(pcm, sampleRate, 1.0, 1.1, 196.0, 0.25, 'sine')
      break
    }
    case 'electronic': {
      const arp = [440, 523.25, 659.25, 783.99, 880, 659.25, 523.25, 659.25, 783.99, 880, 1046.5, 880]
      arp.forEach((f, idx) => addPluckNote(pcm, sampleRate, idx * 0.17, 0.15, f, 0.22, 'saw'))
      for (let beat = 0; beat < 4; beat++) {
        addPluckNote(pcm, sampleRate, beat * 0.5, 0.22, 110, 0.34, 'triangle')
      }
      break
    }
    case 'orchestral': {
      const chord1 = [261.63, 329.63, 392.0, 523.25]
      const chord2 = [293.66, 369.99, 440.0, 587.33]
      for (let i = 0; i < pcm.length; i++) {
        const t = i / sampleRate
        const chord = t < 1.1 ? chord1 : chord2
        const localT = t < 1.1 ? t : t - 1.1
        const swell = Math.sin(Math.min(1, localT / 1.1) * Math.PI)
        let sample = 0
        for (const f of chord) {
          sample += Math.sin(2 * Math.PI * f * t + 0.15 * Math.sin(2 * Math.PI * 5 * t))
        }
        pcm[i] += (sample / chord.length) * swell * 0.34
      }
      break
    }
    case 'chiptune': {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1046.5, 783.99, 659.25, 523.25, 783.99]
      notes.forEach((f, idx) => addPluckNote(pcm, sampleRate, idx * 0.16, 0.13, f, 0.2, 'square'))
      break
    }
    case 'ambient': {
      const pad = [220, 329.63, 440, 493.88, 659.25]
      for (let i = 0; i < pcm.length; i++) {
        const t = i / sampleRate
        const env = Math.sin((t / seconds) * Math.PI)
        let sample = 0
        for (const f of pad) {
          sample += Math.sin(2 * Math.PI * f * t)
        }
        pcm[i] += (sample / pad.length) * env * 0.32
      }
      break
    }
    case 'rock': {
      const roots = [164.81, 164.81, 196.0, 220.0, 146.83, 146.83, 196.0, 164.81]
      roots.forEach((f, idx) => {
        addPluckNote(pcm, sampleRate, idx * 0.26, 0.24, f, 0.26, 'saw')
        addPluckNote(pcm, sampleRate, idx * 0.26, 0.24, f * 1.5, 0.22, 'saw')
      })
      break
    }
    case 'cartoon': {
      for (let i = 0; i < pcm.length; i++) {
        const t = i / sampleRate
        if (t > 0.75) break
        const freq = 260 + 620 * (t / 0.75) * (t / 0.75) + 35 * Math.sin(2 * Math.PI * 18 * t)
        const env = Math.sin((t / 0.75) * Math.PI)
        pcm[i] += Math.sin(2 * Math.PI * freq * t) * env * 0.42
      }
      addPluckNote(pcm, sampleRate, 0.8, 0.35, 1046.5, 0.32, 'triangle')
      break
    }
    case 'retro': {
      addPluckNote(pcm, sampleRate, 0.05, 0.12, 987.77, 0.28, 'square')
      addPluckNote(pcm, sampleRate, 0.17, 0.55, 1318.51, 0.28, 'square')
      addPluckNote(pcm, sampleRate, 0.82, 0.1, 1046.5, 0.24, 'square')
      addPluckNote(pcm, sampleRate, 0.92, 0.4, 1567.98, 0.26, 'square')
      break
    }
    case 'scifi': {
      for (let i = 0; i < pcm.length; i++) {
        const t = i / sampleRate
        if (t > 1.1) break
        const sweep = 1200 * Math.exp(-2.2 * t) + 180
        const fm = Math.sin(2 * Math.PI * 28 * t) * 90
        const env = Math.min(1, t / 0.02) * Math.exp(-2.4 * t)
        pcm[i] += Math.sin(2 * Math.PI * (sweep + fm) * t) * env * 0.38
      }
      break
    }
    case 'realistic': {
      const partials = [185, 372, 540, 810]
      partials.forEach((f, idx) => addPluckNote(pcm, sampleRate, 0.04, 0.32 / (idx + 1), f, 0.24 / (idx + 1), 'sine'))
      partials.forEach((f, idx) =>
        addPluckNote(pcm, sampleRate, 0.52, 0.45 / (idx + 1), f * 1.12, 0.26 / (idx + 1), 'sine')
      )
      break
    }
    case 'ui':
    default: {
      addPluckNote(pcm, sampleRate, 0.08, 0.28, 783.99, 0.3, 'sine')
      addPluckNote(pcm, sampleRate, 0.24, 0.55, 1174.66, 0.32, 'sine')
      break
    }
  }

  return { pcm, seconds }
}

export function getStylePreview(style: string): StylePreview {
  const cached = stylePreviewCache.get(style)
  if (cached != null) return cached

  const { pcm, seconds } = synthesizeStyleSamples(style, PREVIEW_SAMPLE_RATE)
  const preview = {
    blob: encodeMonoWav(pcm, PREVIEW_SAMPLE_RATE),
    seconds
  }
  stylePreviewCache.set(style, preview)
  return preview
}
