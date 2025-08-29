import { z } from 'zod'
import { defineComponent, h } from 'vue'
import { RouterLink } from 'vue-router'
import { useChildrenWithDefault } from '@/utils/vnode'

export const tagName = 'page-link'

export const isRaw = false

export const description = 'Link to a XBuilder page with given path.'

export const detailedDescription = `Link to a XBuilder page with given path. By clicking on the link, \
the user will be navigated to the page. For example, \
<page-link path="/editor/foo/bar">Edit foo/bar</page-link> will create a link to \
the page with path "/editor/foo/bar" with text "Edit foo/bar". \
DO NOT make up routes or urls that you are not sure.`

export const attributes = z.object({
  path: z.string().describe('Path of the page, e.g., `/`, `/editor/owner/project`')
})

export type Props = {
  /** Path of the page, e.g., `/` */
  path: string
}

export default defineComponent<Props>(
  (props) => {
    const children = useChildrenWithDefault(props.path)
    return function render() {
      // We use render function to define `CodeLink` to properly pass `slots` to `RouterLink`
      return h(
        RouterLink,
        {
          to: props.path
        },
        children
      )
    }
  },
  {
    name: 'PageLink',
    props: {
      path: {
        type: String,
        required: true
      }
    }
  }
)
