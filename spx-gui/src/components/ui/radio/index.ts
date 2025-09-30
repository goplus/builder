import { createTooltipable } from '../utils/tooltipable'

import UIRadio from './UIRadio.vue'

export { default as UIRadioGroup } from './UIRadioGroup.vue'
// TODO: consider merging `UITagRadio`, `UITabRadio` with `UIRadio` (with prop `style="default|tag|tab"`)
export { default as UITagRadio } from './UITagRadio.vue'
export { default as UITagRadioGroup } from './UITagRadioGroup.vue'
export { default as UITabRadio } from './UITabRadio.vue'
export { default as UITabRadioGroup } from './UITabRadioGroup.vue'

export const UIRadioWithTooltip = createTooltipable(UIRadio)

export { UIRadio }
