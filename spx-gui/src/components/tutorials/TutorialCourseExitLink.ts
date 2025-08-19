import { z } from 'zod'
import { defineComponent, h } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useChildrenWithDefault } from '@/utils/vnode'
import { useTutorial } from './tutorial'

export const tagName = 'tutorial-course-exit-link'

export const isRaw = false

export const description = 'Link to exit the current tutorial course.'

export const detailedDescription = `Link to exit the current tutorial course. By clicking on the link, \
the user will exit learning of the current course. For example, \
<tutorial-course-exit-link>Exit Course</tutorial-course-exit-link> will create such a link with text "Exit Course".`

export const attributes = z.object({})

export type Props = {}

export default defineComponent<Props>(
  () => {
    const i18n = useI18n()
    const tutorial = useTutorial()
    const handleClick = useMessageHandle(
      () => {
        if (!tutorial.currentCourse || !tutorial.currentSeries) {
          throw new Error('No course or series in progress')
        }
        tutorial.endCurrentCourse()
      },
      {
        en: 'Failed to exit course',
        zh: '退出课程失败'
      }
    ).fn
    const children = useChildrenWithDefault(
      i18n.t({
        en: 'Exit Course',
        zh: '退出课程'
      })
    )
    return function render() {
      return h(
        'a',
        {
          href: 'javascript:void(0)',
          onClick: handleClick
        },
        children
      )
    }
  },
  {
    name: 'TutorialCourseExitLink',
    props: {}
  }
)
