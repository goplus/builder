import { ref, type Ref } from 'vue'

/**
 * renderScale is used to scale the image to fit the map
 * so that the whole image could always be visible when the image is larger than the map.
 *
 * @param props The width and height of the container. Pass a ref if the size is reactive.
 * @param shrinkingOnly If true, the image will only be scaled down. 
 * 	Set it to false to scale up the image when the image is small.
 * @returns
 */
export function useRenderScale(
  props: {
    width: number | Ref<number>
    height: number | Ref<number>
    fillPercent: number | Ref<number>
  },
  shrinkingOnly = true
) {
  const renderScale = ref(1)

  const updateRenderScale = (width: number, height: number) => {
    const containerWidth = typeof props.width === 'number' ? props.width : props.width.value
    const containerHeight = typeof props.height === 'number' ? props.height : props.height.value
    const fillPercent =
      typeof props.fillPercent === 'number' ? props.fillPercent : props.fillPercent.value
    const scale = Math.min(containerWidth / width, containerHeight / height) * fillPercent
    if (scale < 1 || !shrinkingOnly) {
      renderScale.value = scale
    }
  }

  return {
    renderScale,
    updateRenderScale
  }
}
