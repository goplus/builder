import { type Ref } from 'vue'
import paper from 'paper'

/**
 * EN: Returns a throttled function that updates paper.view via requestAnimationFrame.
 *     - Coalesces multiple calls in the same frame using a shared ref flag.
 *     - Safeguards against missing paper.view (e.g., during teardown).
 * CN: 返回一个使用 requestAnimationFrame 节流的画布更新函数。
 *     - 通过共享的 ref 合并同一帧的多次调用。
 *     - 在 paper.view 不可用时安全退出（如销毁阶段）。
 */
export const createViewUpdateScheduler = (isUpdateScheduled: Ref<boolean>): (() => void) => {
  return () => {
    if (isUpdateScheduled.value) return
    isUpdateScheduled.value = true
    requestAnimationFrame(() => {
      if (!paper.view) {
        isUpdateScheduled.value = false
        return
      }
      paper.view.update()
      isUpdateScheduled.value = false
    })
  }
}
