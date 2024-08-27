import { ref, type Ref } from 'vue'

/**
 * renderScale is used to scale the image to fit the map
 * so that the whole image could always be visible when the image is larger than the map.
 *
 * The renderScale will not be updated if the image is smaller than the map.
 * @param props
 * @returns
 */
export function useRenderScale(props: {
  width: number | Ref<number>
  height: number | Ref<number>
  fillPercent: number | Ref<number>
}) {
  const renderScale = ref(1)

  const updateRenderScale = (width: number, height: number) => {
    const containerWidth = typeof props.width === 'number' ? props.width : props.width.value
    const containerHeight = typeof props.height === 'number' ? props.height : props.height.value
    const fillPercent =
      typeof props.fillPercent === 'number' ? props.fillPercent : props.fillPercent.value
    const scale = Math.min(containerWidth / width, containerHeight / height) * fillPercent
    if (scale < 1) {
      renderScale.value = scale
    }
  }

  return {
    renderScale,
    updateRenderScale
  }
}
