import { shallowRef } from 'vue'

import type { LocaleMessage } from '@/utils/i18n'

// Max age (ms) for a skip request to still suppress the leave confirmation. Time-bound so a
// request that is never consumed cannot get "stuck": some navigations (e.g. editor -> editor
// route updates, or starting a course from a non-editor page) never reach the editor's
// `onBeforeRouteLeave`, and an un-expiring request would otherwise suppress a later, genuine
// leave confirmation.
const skipConfirmTimeout = 1000

/**
 * Controls the editor's "leave editor" confirmation.
 *
 * This is an editor-owned extension point: other features (e.g. tutorials) can drive the
 * editor's leave behavior without the editor depending on them. The editor only exposes
 * generic capabilities here and stays ignorant of who is driving it.
 *
 * - `messageOverride`: replace the confirmation message (e.g. tutorial-specific copy).
 * - `requestSkipOnce` / `consumeSkipOnce`: skip the confirmation for a single, expected
 *   navigation (e.g. starting a course, or returning to the course series).
 */
class EditorLeaveConfirm {
  private messageOverrideRef = shallowRef<LocaleMessage | null>(null)

  get messageOverride(): LocaleMessage | null {
    return this.messageOverrideRef.value
  }
  setMessageOverride(message: LocaleMessage | null) {
    this.messageOverrideRef.value = message
  }

  private skipRequestedAt = 0
  requestSkipOnce() {
    this.skipRequestedAt = Date.now()
  }
  consumeSkipOnce() {
    const skip = Date.now() - this.skipRequestedAt < skipConfirmTimeout
    this.skipRequestedAt = 0
    return skip
  }
}

// App-level single instance: there is only ever one editor leave confirmation in play, and
// the drivers (tutorial, success modal) live outside the editor component tree, so they reach
// it by import rather than provide/inject.
export const editorLeaveConfirm = new EditorLeaveConfirm()
