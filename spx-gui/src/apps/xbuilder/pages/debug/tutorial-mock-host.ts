import type { TutorialFrameworkHost } from '@/utils/tutorial-framework'

// The learner code the mock host hands back to the Course program, standing in
// for what `editor.project.getCode` would read from the real project model.
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
    course: {
      async showPrelude(preludeMessage) {
        log(`[host] course.showPrelude: ${preludeMessage}`)
      },
      async showMessage(message) {
        log(`[host] course.showMessage: ${message}`)
      },
      async showVideo(videoName) {
        log(`[host] course.showVideo: ${videoName}`)
      },
      async complete() {
        log('[host] course.complete')
      },
      async completeWith(message) {
        log(`[host] course.completeWith: ${message}`)
      }
    },
    editor: {
      codeEditor: {
        filterAPIs(apis) {
          log(`[host] editor.codeEditor.filterAPIs: ${apis.join(', ')}`)
        },
        async formatWorkspace() {
          log('[host] editor.codeEditor.formatWorkspace')
        }
      },
      project: {
        getCode(sprite) {
          log(`[host] editor.project.getCode: ${sprite}`)
          return mockLearnerCode
        },
        listSprites() {
          log('[host] editor.project.listSprites')
          return ['Lita', 'Mushroom']
        }
      },
      ruler: {
        show() {
          log('[host] editor.ruler.show')
        },
        hide() {
          log('[host] editor.ruler.hide')
        }
      }
    },
    copilot: {
      async generateText(message) {
        log(`[host] copilot.generateText: ${message}`)
        return 'You used stepTo to walk Lita right up to the mushroom.'
      },
      async generateJSON(message, schema) {
        log(`[host] copilot.generateJSON: ${message} (schema: ${JSON.stringify(schema)})`)
        return {}
      }
    },
    spotlight: {
      async reveal(target, tip, options) {
        log(`[host] spotlight.reveal: ${target} (tip: ${tip}, options: ${JSON.stringify(options)})`)
      }
    }
  }
}
