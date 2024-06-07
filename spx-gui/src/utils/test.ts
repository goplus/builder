/**
 * @desc Helpers for testing
 */

export function sleep(duration = 1000) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), duration))
}
