/**
 * @desc wave-surfer-related helpers for Go+ Builder Sound
 */

import { ref, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import { useUIVariables } from '@/components/ui'
import { getAudioContext } from '@/utils/audio'

export function useWavesurfer(
  container: () => HTMLElement | undefined,
  gain: () => number,
  recording: boolean
) {
  const uiVariables = useUIVariables()

  const wavesurfer = ref<WaveSurfer | null>(null)
  let gainNode: GainNode
  let audioElement: HTMLAudioElement

  watch(gain, (value) => {
    if (!gainNode) return
    gainNode.gain.value = value
    if (wavesurfer?.value?.getDecodedData()) {
      // Trigger a redraw only when loaded
      wavesurfer.value.zoom(1)
    }
  })

  watch(container, (newContainer, oldContainer, onCleanup) => {
    if (newContainer == null) throw new Error('wavesurfer container not ready')
    audioElement = document.createElement('audio')

    const audioContext = getAudioContext()
    const source = audioContext.createMediaElementSource(audioElement)
    const gainNode_ = audioContext.createGain()
    source.connect(gainNode_)
    gainNode_.connect(audioContext.destination)
    gainNode_.gain.value = gain()
    gainNode = gainNode_

    /**
     * Cache for averaged data. Only used for recording.
     * As we expect the `WaveSurfer` to be destroyed and recreated on every recording,
     * we don't need to reset the cache when the recording stops.
     */
    let cache: {
      averagedData: number[]
      originalLength: number
      blockSize: number
    }

    wavesurfer.value = new WaveSurfer({
      interact: false,
      container: newContainer,
      waveColor: uiVariables.color.sound[400],
      progressColor: uiVariables.color.sound[400],
      height: 'auto',
      cursorWidth: 1,
      cursorColor: uiVariables.color.grey[800],
      normalize: true,
      media: audioElement,
      renderFunction: (peaks: (Float32Array | number[])[], ctx: CanvasRenderingContext2D): void => {
        try {
          const halfHeight = ctx.canvas.height / 2

          const averageBlock = (data: number[] | Float32Array, blockSize: number): number[] => {
            // Check if we can use the cached data
            if (
              recording &&
              cache &&
              cache.blockSize === blockSize &&
              cache.originalLength <= data.length
            ) {
              const newBlocks =
                Math.floor(data.length / blockSize) - Math.floor(cache.originalLength / blockSize)

              // If there are new blocks to process
              if (newBlocks > 0) {
                const newAveragedData = cache.averagedData.slice()
                const startIndex = cache.originalLength
                for (let i = 0; i < newBlocks; i++) {
                  let sum = 0
                  for (let j = 0; j < blockSize; j++) {
                    const index = startIndex + i * blockSize + j
                    sum += Math.max(0, data[index])
                  }
                  newAveragedData.push(sum / blockSize)
                }

                cache = {
                  averagedData: newAveragedData,
                  originalLength: data.length,
                  blockSize
                }
                return newAveragedData
              }

              // If no new blocks to process, return cached data
              return cache.averagedData
            }

            // Calculate new averaged data if cache is not valid or not present
            const averagedData: number[] = new Array(Math.floor(data.length / blockSize))
            for (let i = 0; i < averagedData.length; i++) {
              let sum = 0
              for (let j = 0; j < blockSize; j++) {
                const index = i * blockSize + j
                sum += Math.max(0, data[index])
              }
              averagedData[i] = sum / blockSize
            }

            // Update cache with new averaged data
            cache = {
              averagedData,
              originalLength: data.length,
              blockSize
            }

            return averagedData
          }

          const drawSmoothCurve = (
            ctx: CanvasRenderingContext2D,
            points: number[],
            getPoint: (index: number) => number
          ) => {
            const segmentLength = ctx.canvas.width / (points.length - 1)

            ctx.beginPath()
            ctx.moveTo(0, halfHeight)

            for (let i = 0; i < points.length - 2; i++) {
              const xc = (i * segmentLength + (i + 1) * segmentLength) / 2
              const yc = (getPoint(i) + getPoint(i + 1)) / 2
              ctx.quadraticCurveTo(i * segmentLength, getPoint(i), xc, yc)
            }

            ctx.quadraticCurveTo(
              (points.length - 2) * segmentLength,
              getPoint(points.length - 2),
              ctx.canvas.width,
              getPoint(points.length - 1)
            )

            ctx.lineTo(ctx.canvas.width, halfHeight)

            ctx.strokeStyle = uiVariables.color.sound[400]
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.closePath()
            ctx.fillStyle = uiVariables.color.sound[400]
            ctx.fill()
          }

          const channel = peaks[0]

          const scale = gain() * 3000

          const blockSize = channel.length > 200000 ? 2000 : channel.length > 100000 ? 1000 : 500

          const smoothedChannel = averageBlock(channel, blockSize)

          drawSmoothCurve(
            ctx,
            smoothedChannel,
            (index: number) => smoothedChannel[index] * scale + halfHeight
          )
          drawSmoothCurve(
            ctx,
            smoothedChannel,
            (index: number) => -smoothedChannel[index] * scale + halfHeight
          )
        } catch (e) {
          // wavesurfer does not log errors so we do it ourselves
          console.error(e)
        }
      }
    })

    onCleanup(() => {
      wavesurfer.value?.destroy()
    })
  })

  return wavesurfer
}
