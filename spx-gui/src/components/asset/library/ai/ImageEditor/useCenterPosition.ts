import { ref, type Ref } from 'vue'

/**
 * Calculate the position to center an object in a container.
 *
 * @param props The width and height of the container. Pass a ref if the size is reactive.
 * @returns `position`: The reactive position object.
 * @returns `updatePosition`: Update the position with the width and height of the object.
 */
export function useCenterPosition(props: {
  width: number | Ref<number>
  height: number | Ref<number>
}) {
  const position = ref({ x: 0, y: 0 })

  const updatePosition = (width: number, height: number) => {
    const containerWidth = typeof props.width === 'number' ? props.width : props.width.value
    const containerHeight = typeof props.height === 'number' ? props.height : props.height.value
    position.value = {
      x: (containerWidth - width) / 2,
      y: (containerHeight - height) / 2
    }
  }

  return {
    position,
    updatePosition
  }
}

/**
 * Get a transition effect for the position.
 *
 * When the target position is updated, the current position will move towards the target position
 * with given step.
 *
 * @param initital The initial position.
 * @param step The step to move towards the target position.
 * @returns `currentPos`: The reactive current position.
 * @returns `updatePosition`: Update the target position.
 * @returns `immediateUpdatePosition`: Update the target position immediately without animation.
 */
export function useAnimatedPosition(initital: { x: number; y: number }, step = 0.1) {
  const currentPos = ref(initital)
  const targetPos = ref(initital)

  const updatePosition = (x: number, y: number) => {
    targetPos.value = { x, y }
    animateToTarget()
  }

  const immediateUpdatePosition = (x: number, y: number) => {
    targetPos.value = { x, y }
    currentPos.value = { x, y }
  }

  const animateToTarget = () => {
    currentPos.value.x += (targetPos.value.x - currentPos.value.x) * step
    currentPos.value.y += (targetPos.value.y - currentPos.value.y) * step

    if (
      Math.abs(targetPos.value.x - currentPos.value.x) >= step ||
      Math.abs(targetPos.value.y - currentPos.value.y) >= step
    ) {
      requestAnimationFrame(animateToTarget)
    }
  }

  return {
    currentPos,
    updatePosition,
    immediateUpdatePosition
  }
}

/**
 * Calculate the position to center an object in a container with animation.
 *
 * @param props The width and height of the container. Pass a ref if the size is reactive.
 * @returns `currentPos`: The reactive current position.
 * @returns `updateCenterPosition`: Update the position with the width and height of the object with animation.
 * @returns `immediateUpdatePosition`: Update the position with the width and height of the object immediately without animation.
 */
export function useAnimatedCenterPosition(props: {
  width: number | Ref<number>
  height: number | Ref<number>
}) {
  const { currentPos, updatePosition, immediateUpdatePosition } = useAnimatedPosition({
    x: 0,
    y: 0
  })
  let init = true
  const updateCenterPosition = (width: number, height: number) => {
    const containerWidth = typeof props.width === 'number' ? props.width : props.width.value
    const containerHeight = typeof props.height === 'number' ? props.height : props.height.value
    const targetX = (containerWidth - width) / 2
    const targetY = (containerHeight - height) / 2
    if (init) {
      // avoid animation on first render. And thus the object will be centered immediately on show up.
      init = false
      immediateUpdatePosition(targetX, targetY)
      return
    }
    updatePosition(targetX, targetY)
  }

  return {
    currentPos,
    updateCenterPosition,
    immediateUpdatePosition
  }
}
