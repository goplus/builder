import { onMounted, defineComponent } from 'vue'
import { z } from 'zod'

import { useTutorial } from './tutorial'
import type { CustomElementDefinition } from '@/components/copilot/copilot'

type Props = {}

// Maximum number of consecutive abandon predictions allowed before automatically ending the course
const maxAbandonPredictionCount = 3

const predictionTagName = 'tutorial-course-abandon-prediction'
export const tutorialCourseAbandonPrediction: CustomElementDefinition = {
  tagName: predictionTagName,
  isRaw: false,
  description: `When user deviates from the course content, \
add <${predictionTagName} /> at the beginning of your message to trigger an abandon prediction.`,
  attributes: z.object({}),
  component: defineComponent<Props>(
    () => {
      const tutorial = useTutorial()
      onMounted(() => {
        const count = tutorial.predictAbandon()
        if (count > maxAbandonPredictionCount) {
          tutorial.endCurrentCourse()
        }
      })

      return function render() {
        return null
      }
    },
    {
      name: 'TutorialCourseAbandonPrediction',
      props: {}
    }
  )
}

const dismissalTagName = 'tutorial-course-abandon-dismissal'
export const tutorialCourseAbandonDismissal: CustomElementDefinition = {
  tagName: dismissalTagName,
  isRaw: false,
  description: `When user returns to the course content after an abandon prediction, \
add <${dismissalTagName} /> at the beginning of your message to dismiss the abandon prediction.`,
  attributes: z.object({}),
  component: defineComponent<Props>(
    () => {
      const tutorial = useTutorial()
      onMounted(() => tutorial.dismissAbandon())

      return function render() {
        return null
      }
    },
    {
      name: 'TutorialCourseAbandonDismissal',
      props: {}
    }
  )
}
