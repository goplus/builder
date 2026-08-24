import type { TutorialFrameworkHost } from '@/utils/tutorial-framework'

// The learner code the mock host hands back to the Course program, standing in
// for what `editor_project_getCode` would read from the real project model.
export const mockLearnerCode = `onClick => {
	stepTo Mushroom
}
`

/**
 * Mock TutorialFrameworkHost: reports every capability call through `log` and
 * answers with canned values, so Course programs can run end-to-end through
 * the real wasm bridge before the real host (Tutorial module) exists.
 */
export function createMockTutorialHost(log: (message: string) => void): TutorialFrameworkHost {
  return {
    async course_showPrelude(preludeMessage) {
      log(`[host] showPrelude: ${preludeMessage}`)
    },
    async course_showMessage(message) {
      log(`[host] showMessage: ${message}`)
    },
    async course_showVideo(videoName) {
      log(`[host] showVideo: ${videoName}`)
    },
    async course_complete() {
      log('[host] complete')
    },
    async course_completeWith(message) {
      log(`[host] completeWith: ${message}`)
    },
    editor_codeEditor_filterAPIs(apis) {
      log(`[host] filterAPIs: ${apis.join(', ')}`)
    },
    async editor_codeEditor_formatWorkspace() {
      log('[host] formatWorkspace')
    },
    editor_project_getCode(sprite) {
      log(`[host] getCode: ${sprite}`)
      return mockLearnerCode
    },
    editor_project_listSprites() {
      log('[host] listSprites')
      return ['Lita', 'Mushroom']
    },
    editor_ruler_show() {
      log('[host] ruler.show')
    },
    editor_ruler_hide() {
      log('[host] ruler.hide')
    },
    async copilot_generateText(message) {
      log(`[host] generateText: ${message}`)
      return 'You used stepTo to walk Lita right up to the mushroom.'
    },
    async copilot_generateJSON(message, schema) {
      log(`[host] generateJSON: ${message} (schema: ${JSON.stringify(schema)})`)
      return {}
    },
    async spotlight_reveal(target, tip, options) {
      log(`[host] spotlight.reveal: ${target} (tip: ${tip}, options: ${JSON.stringify(options)})`)
    }
  }
}
