/**
 * @desc IInputHelperProvider interface + InputHelperProvider default implementation.
 * Uses ILSPClient. Handles primitive built-in input types and resource names.
 * Framework-specific types are handled by framework adapters.
 */

import type { VNode } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import type { ComponentDefinition } from '@/utils/types'
import type {
  BaseContext,
  InPlaceInput,
  Input,
  InputSlot,
  InputSlotAccept,
  ResourceInputSlotAccept,
  InputValueForType
} from './common'
import { BuiltInInputType, rangeContains } from './common'
import type { ILSPClient } from './lsp/types'
import BooleanInput, * as booleanInput from './ui/input-helper/BooleanInput.vue'
import IntegerInput, * as integerInput from './ui/input-helper/IntegerInput.vue'
import DecimalInput, * as decimalInput from './ui/input-helper/DecimalInput.vue'
import StringInput, * as stringInput from './ui/input-helper/StringInput.vue'
import ResourceInput, * as resourceInput from './ui/input-helper/ResourceInput.vue'
import type { IResourceAdapter } from './resource'

export type InputHelperContext = BaseContext

/** Props contract for input helper components */
export type InputHelperComponentProps<T> = {
  readonly accept?: InputSlotAccept
  readonly value: T
}

/** Emits contract for input helper components */
export type InputHelperComponentEmits<T> = {
  'update:value': [value: T]
  submit: []
}

export type InputTypeHandler<T = any> = {
  /** Vue component rendered inside the input helper popup */
  component: ComponentDefinition<InputHelperComponentProps<T>, InputHelperComponentEmits<T>>
  /** Title for the in-place value tab, shown in the tab header */
  getTitle(accept: InputSlotAccept): LocaleMessage
  /** Initial value when the user opens the input */
  getDefaultValue(): T
  /** Convert an Input to a code expression string */
  exprForInput(input: InPlaceInput): string | null
}

export type InputValuePreview = {
  vnode?: VNode
  key?: LocaleMessage
  color?: string
  text?: LocaleMessage
}

export interface IInputHelperProvider {
  provideInputSlots(ctx: InputHelperContext): Promise<InputSlot[]>
  /**
   * Provide a handler for the given input type string.
   * Returns null if the input type is not handled by this provider.
   */
  provideInputTypeHandler(type: string): InputTypeHandler | null
  /**
   * Provide a display preview for a parsed input value in markdown views.
   * Return null to let the generic fallback renderer handle it.
   */
  provideInputValuePreview(input: Input): InputValuePreview | null
}

/**
 * Default implementation of IInputHelperProvider.
 * Handles input slot detection via LSP, primitive built-in input types, and resource names.
 * Spx-specific input types are handled by SpxInputHelperProvider.
 */
export class InputHelperProvider implements IInputHelperProvider {
  constructor(
    private lspClient: ILSPClient,
    private getResourceAdapter: () => IResourceAdapter
  ) {}

  async provideInputSlots(ctx: InputHelperContext): Promise<InputSlot[]> {
    const slots = await this.lspClient.getInputSlots({ signal: ctx.signal }, ctx.textDocument.id)
    return slots.filter((slot) => {
      // Filter out nested slots (keep only the outermost)
      if (slots.some((s) => s !== slot && rangeContains(s.range, slot.range))) return false
      return true
    })
  }

  provideInputTypeHandler(type: string): InputTypeHandler | null {
    switch (type) {
      case BuiltInInputType.Integer:
        return {
          component: IntegerInput,
          getTitle: () => ({ en: 'Input a number', zh: '输入数字' }),
          getDefaultValue: integerInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== BuiltInInputType.Integer) return null
            const value = input.value as InputValueForType<BuiltInInputType.Integer>
            return value + ''
          }
        } satisfies InputTypeHandler<number>
      case BuiltInInputType.Decimal:
        return {
          component: DecimalInput,
          getTitle: () => ({ en: 'Input a number', zh: '输入数字' }),
          getDefaultValue: decimalInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== BuiltInInputType.Decimal) return null
            const value = input.value as InputValueForType<BuiltInInputType.Decimal>
            return value + ''
          }
        } satisfies InputTypeHandler<number>
      case BuiltInInputType.String:
        return {
          component: StringInput,
          getTitle: () => ({ en: 'Input text', zh: '输入文本' }),
          getDefaultValue: stringInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== BuiltInInputType.String) return null
            const value = input.value as InputValueForType<BuiltInInputType.String>
            return JSON.stringify(value)
          }
        } satisfies InputTypeHandler<string>
      case BuiltInInputType.Boolean:
        return {
          component: BooleanInput,
          getTitle: () => ({ en: 'Input a boolean', zh: '输入布尔值' }),
          getDefaultValue: booleanInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== BuiltInInputType.Boolean) return null
            const value = input.value as InputValueForType<BuiltInInputType.Boolean>
            return value ? 'true' : 'false'
          }
        } satisfies InputTypeHandler<boolean>
      case BuiltInInputType.ResourceName:
        return {
          component: ResourceInput,
          getTitle: (accept: InputSlotAccept) => {
            const resourceContext = (accept as ResourceInputSlotAccept).resourceContext
            return (
              this.getResourceAdapter().provideResourceSelector(resourceContext)?.title ?? {
                en: 'Select a resource',
                zh: '选择资源'
              }
            )
          },
          getDefaultValue: resourceInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== BuiltInInputType.ResourceName) return null
            const value = input.value as InputValueForType<BuiltInInputType.ResourceName>
            const resourceName = this.getResourceAdapter().provideResourceName({ uri: value })
            return JSON.stringify(resourceName)
          }
        }
      default:
        return null
    }
  }

  provideInputValuePreview(_input: Input): InputValuePreview | null {
    return null
  }
}
