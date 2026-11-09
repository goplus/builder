import type { ComponentDefinition } from '@/utils/types'
import type { File } from '@/models/common/file'

export type MethodComponentProps = {
  input: File[]
  active: boolean
  /** If the processing is already applied (to image) */
  applied: boolean
}

export type MethodComponentEmits = {
  applied: [output: File[]]
  cancel: []
}

export type MethodComponent = ComponentDefinition<MethodComponentProps, MethodComponentEmits>
