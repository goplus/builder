import type { ClassFramework } from '@/utils/xgo/gox-mod'
import type { Files } from '@/models/common/file'
import type { ICodeOwner } from './text-document'

export type { ClassFramework } from '@/utils/xgo/gox-mod'

/**
 * The key abstraction that replaces direct SpxProject usage in the Code Editor core.
 * Provides structural information and code file enumeration without any framework-specific detail.
 */
export interface IXGoProject {
  /** Class framework metadata for this project */
  classFramework: ClassFramework
  /** List paths of all code files in this project */
  getCodeFiles(): string[]
  /** Get the code owner for a code file path (for TextDocument creation and display name) */
  getCodeOwner(filePath: string): ICodeOwner | null
  /** Export all project files as a Files map; same project state should return the same object reference */
  exportFiles(): Files
}
