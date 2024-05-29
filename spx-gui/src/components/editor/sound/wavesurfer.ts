/**
 * @desc wave-surfer-related helpers for Go+ Builder Sound
 */

import { ref, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import { useUIVariables } from '@/components/ui'
import { getAudioContext } from '@/utils/audio'

export function useWavesurfer(container: () => HTMLElement | undefined, gain: () => number) {
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

    wavesurfer.value = new WaveSurfer({
      interact: false,
      container: newContainer,
      waveColor: uiVariables.color.sound[400],
      progressColor: uiVariables.color.sound[300] + '80',
      height: 'auto',
      cursorWidth: 1,
      cursorColor: uiVariables.color.grey[800],
      normalize: true,
      media: audioElement,
      renderFunction: (peaks: (Float32Array | number[])[], ctx: CanvasRenderingContext2D): void => {
        // TODO: Better drawing algorithm to reduce flashing?
        const smoothAndDrawChannel = (channel: Float32Array, vScale: number) => {
          const { width, height } = ctx.canvas
          const halfHeight = height / 2
          const numPoints = Math.floor(width / 5)
          const blockSize = Math.floor(channel.length / numPoints)
          const smoothedData = new Float32Array(numPoints)

          // Smooth the data by averaging blocks
          for (let i = 0; i < numPoints; i++) {
            let sum = 0
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(channel[i * blockSize + j])
            }
            smoothedData[i] = sum / blockSize
          }

          // Draw with bezier curves
          ctx.beginPath()
          ctx.moveTo(0, halfHeight)

          for (let i = 1; i < smoothedData.length; i++) {
            const prevX = (i - 1) * (width / numPoints)
            const currX = i * (width / numPoints)
            const midX = (prevX + currX) / 2
            const prevY = halfHeight + smoothedData[i - 1] * halfHeight * vScale
            const currY = halfHeight + smoothedData[i] * halfHeight * vScale

            // Use a quadratic bezier curve to the middle of the interval for a smoother line
            ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + currY) / 2)
            ctx.quadraticCurveTo(midX, (prevY + currY) / 2, currX, currY)
          }

          ctx.lineTo(width, halfHeight)
          ctx.strokeStyle = uiVariables.color.sound[400]
          ctx.stroke()
          ctx.closePath()
          ctx.fillStyle = uiVariables.color.sound[400]
          ctx.fill()
        }

        const channel = Array.isArray(peaks[0]) ? new Float32Array(peaks[0] as number[]) : peaks[0]

        const scale = gain() * 5

        // Only one channel is assumed, render it twice (mirrored)
        smoothAndDrawChannel(channel, scale) // Upper part
        smoothAndDrawChannel(channel, -scale) // Lower part (mirrored)
      }
    })

    onCleanup(() => {
      wavesurfer.value?.destroy()
    })
  })

  return wavesurfer
}
