import { z } from 'zod'
import { defineComponent, h } from 'vue'
import { RouterLink } from 'vue-router'

export const tagName = 'page-link'

export const isRaw = false

export const description = 'Link to a XBuilder page with given path.'

export const detailedDescription = `Link to a XBuilder page with given path. By clicking on the link, \
the user will be navigated to the page. For example, \
<page-link path="/editor/foo/bar">Edit foo/bar</page-link> will create a link to \
the page with path "/editor/foo/bar" with text "Edit foo/bar".`

export const attributes = z.object({
  path: z.string().describe('Path of the page, e.g., `/`, `/editor/owner/project`')
})

export type Props = {
  /** Path of the page, e.g., `/` */
  path: string
}

export default defineComponent<Props>(
  (props, { slots }) => {
    return function render() {
      // We use render function to define `CodeLink` to properly pass `slots` to `RouterLink`
      return h(
        RouterLink,
        {
          to: props.path
        },
        () => slots.default?.() || props.path
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
