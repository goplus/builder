import { h, defineComponent, type Component, type ExtractPropTypes } from 'vue'

import UITooltip from '../UITooltip.vue'

type TooltipProps = ExtractPropTypes<InstanceType<typeof UITooltip>['$props']>

export function createTooltipable<T extends Record<string, any>>(originalComponent: Component<T>) {
  const originalProps = 'props' in originalComponent ? originalComponent.props : {}
  return defineComponent<T['$props'] & { tooltip: string | TooltipProps }>(
    (props, { slots }) => {
      return function render() {
        return h(UITooltip, typeof props.tooltip === 'string' ? {} : props.tooltip, {
          trigger: () => h(originalComponent, props, slots.default),
          default: () => (slots.tooltip != null ? slots.tooltip : props.tooltip)
        })
      }
    },
    {
      props: {
        tooltip: {
          type: [String, Object],
          default: ''
        },
        ...originalProps
      }
    }
  )
}
