import { inject, type InjectionKey, type Ref } from 'vue'
import type { Type as IconType } from '@/components/ui/icons/UIIcon.vue'

export type ResourceTool = {
  id: string
  label: string
  icon: IconType
}

export type ResourceWorkspace = {
  activeTool: Ref<string | null>
  selected: Ref<boolean>
  busy: Readonly<Ref<boolean>>
  aiActive: Readonly<Ref<boolean>>
  canReview: Readonly<Ref<boolean>>
  previewTopSpace: Readonly<Ref<number>>
  previewArea: Ref<{ left: number; top: number; width: number; height: number } | null>
  selectionLocked: Readonly<Ref<boolean>>
  resourceKey: Readonly<Ref<string | null>>
  tools: Map<string, ResourceTool>
  panel: Ref<HTMLElement | null>
  details: Ref<HTMLElement | null>
  instruction: Ref<string>
  previewBottomSpace: Readonly<Ref<number>>
}

export const resourceWorkspaceKey: InjectionKey<ResourceWorkspace | null> = Symbol('resource-workspace')
export function useResourceWorkspace() {
  return inject(resourceWorkspaceKey, null)
}
