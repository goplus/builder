/**
 * @desc SpxInputHelperProvider — spx-specific input helper provider.
 * Extends the generic InputHelperProvider with spx-specific input type handlers
 * (SpxDirection, SpxColor, SpxKey, etc.).
 */

import { h } from 'vue'
import { exprForSpxDirection, exprForSpxColor } from '@/utils/spx'
import {
  cssColorStringForSpxColor,
  effectKinds,
  nameKeyMap,
  playActions,
  rotationStyles,
  specialDirections,
  specialObjs
} from '@/utils/spx'
import type { ColorValue } from '@/utils/spx'
import {
  type Input,
  type InPlaceInput,
  type IResourceProvider,
  InputKind,
  InputHelperProvider,
  type InputTypeHandler,
  type InputValuePreview
} from '../xgo-code-editor'
import { SpxInputType, type InputValueForSpxType } from './common'
import type { SpxLSPClient } from './lsp/spx-lsp-client'
import SpxDirectionInput, * as spxDirectionInput from './ui/input-helper/SpxDirectionInput.vue'
import SpxLayerActionInput, * as spxLayerActionInput from './ui/input-helper/SpxLayerActionInput.vue'
import SpxDirActionInput, * as spxDirActionInput from './ui/input-helper/SpxDirActionInput.vue'
import SpxColorInput, * as spxColorInput from './ui/input-helper/spx-color-input/SpxColorInput.vue'
import SpxEffectKindInput, * as spxEffectKindInput from './ui/input-helper/spx-effect-input/SpxEffectKindInput.vue'
import SpxEffectKindItem from './ui/input-helper/spx-effect-input/SpxEffectKindItem.vue'
import SpxKeyInput, * as spxKeyInput from './ui/input-helper/SpxKeyInput.vue'
import SpxPlayActionInput, * as spxPlayActionInput from './ui/input-helper/SpxPlayActionInput.vue'
import SpxSpecialObjInput, * as spxSpecialObjInput from './ui/input-helper/SpxSpecialObjInput.vue'
import SpxRotationStyleInput, * as spxRotationStyleInput from './ui/input-helper/SpxRotationStyleInput.vue'
import SpxPropertyNameInput, * as spxPropertyNameInput from './ui/input-helper/SpxPropertyNameInput.vue'

export class SpxInputHelperProvider extends InputHelperProvider {
  constructor(lspClient: SpxLSPClient, resourceProvider: IResourceProvider) {
    super(lspClient, resourceProvider)
  }

  override provideInputTypeHandler(type: string): InputTypeHandler | null {
    switch (type) {
      case SpxInputType.SpxDirection:
        return {
          component: SpxDirectionInput,
          getTitle: () => ({ en: 'Select a direction', zh: '选择方向' }),
          getDefaultValue: spxDirectionInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxDirection) return null
            return exprForSpxDirection(input.value as InputValueForSpxType<SpxInputType.SpxDirection>)
          }
        } satisfies InputTypeHandler<number>
      case SpxInputType.SpxLayerAction:
        return {
          component: SpxLayerActionInput,
          getTitle: () => ({ en: 'Select a layer', zh: '选择向最前/后移' }),
          getDefaultValue: spxLayerActionInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxLayerAction) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxLayerAction>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxDirAction:
        return {
          component: SpxDirActionInput,
          getTitle: () => ({ en: 'Select a direction', zh: '选择向前/向后' }),
          getDefaultValue: spxDirActionInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxDirAction) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxDirAction>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxColor:
        return {
          component: SpxColorInput,
          getTitle: () => ({ en: 'Select a color', zh: '选取颜色' }),
          getDefaultValue: spxColorInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxColor) return null
            return exprForSpxColor(input.value as InputValueForSpxType<SpxInputType.SpxColor>)
          }
        } satisfies InputTypeHandler<ColorValue>
      case SpxInputType.SpxEffectKind:
        return {
          component: SpxEffectKindInput,
          getTitle: () => ({ en: 'Select an effect', zh: '选择特效' }),
          getDefaultValue: spxEffectKindInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxEffectKind) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxEffectKind>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxKey:
        return {
          component: SpxKeyInput,
          getTitle: () => ({ en: 'Select a key', zh: '输入按键' }),
          getDefaultValue: spxKeyInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxKey) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxKey>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxPlayAction:
        return {
          component: SpxPlayActionInput,
          getTitle: () => ({ en: 'Select a play action', zh: '选择播放动作' }),
          getDefaultValue: spxPlayActionInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxPlayAction) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxPlayAction>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxSpecialObj:
        return {
          component: SpxSpecialObjInput,
          getTitle: () => ({ en: 'Select a special object', zh: '选择特殊对象' }),
          getDefaultValue: spxSpecialObjInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxSpecialObj) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxSpecialObj>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxRotationStyle:
        return {
          component: SpxRotationStyleInput,
          getTitle: () => ({ en: 'Select a rotation style', zh: '选择旋转方式' }),
          getDefaultValue: spxRotationStyleInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxRotationStyle) return null
            return input.value as InputValueForSpxType<SpxInputType.SpxRotationStyle>
          }
        } satisfies InputTypeHandler<string>
      case SpxInputType.SpxPropertyName:
        return {
          component: SpxPropertyNameInput,
          getTitle: () => ({ en: 'Select a property', zh: '选择属性' }),
          getDefaultValue: spxPropertyNameInput.getDefaultValue,
          exprForInput: (input: InPlaceInput) => {
            if (input.type !== SpxInputType.SpxPropertyName) return null
            if (input.value === '') return null // guard empty default
            return JSON.stringify(input.value as InputValueForSpxType<SpxInputType.SpxPropertyName>)
          }
        } satisfies InputTypeHandler<string>
      default:
        return super.provideInputTypeHandler(type)
    }
  }

  override provideInputValuePreview(input: Input): InputValuePreview | null {
    if (input.kind === InputKind.Predefined) return null
    switch (input.type) {
      case SpxInputType.SpxEffectKind: {
        const effectKind = effectKinds.find((d) => d.name === (input.value as string))?.name
        if (effectKind == null) return null
        return {
          vnode: h(SpxEffectKindItem, { name: effectKind, active: false, interactive: false })
        }
      }
      case SpxInputType.SpxKey: {
        const key = nameKeyMap.get(input.value as string)
        if (key == null) return null
        return { text: key.text }
      }
      case SpxInputType.SpxColor:
        return { color: cssColorStringForSpxColor(input.value as ColorValue) }
      case SpxInputType.SpxDirection: {
        const direction = specialDirections.find((d) => d.value === (input.value as number))
        if (direction == null) return null
        return { text: direction.text }
      }
      case SpxInputType.SpxPlayAction: {
        const action = playActions.find((d) => d.name === (input.value as string))
        if (action == null) return null
        return { text: action.text }
      }
      case SpxInputType.SpxSpecialObj: {
        const obj = specialObjs.find((d) => d.name === (input.value as string))
        if (obj == null) return null
        return { text: obj.text }
      }
      case SpxInputType.SpxRotationStyle: {
        const style = rotationStyles.find((d) => d.name === (input.value as string))
        if (style == null) return null
        return { text: style.text }
      }
      default:
        return null
    }
  }
}
