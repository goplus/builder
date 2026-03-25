import type { Files } from '@/models/common/file'
import type { ICodeOwner } from './text-document'

/**
 * Describes the class framework in use for a project.
 * The fields map directly to `modfile.Project` in the XGo module system.
 * This is the single source of truth for all framework-level structural information.
 */
export interface ClassFramework {
  projectClass: {
    /** File extension for the project class file, e.g. ".spx" */
    ext: string
    /** Base class name, e.g. "Game" */
    className: string
  }
  workClasses: Array<{
    /** File extension for work class files, e.g. ".spx" */
    ext: string
    /** Base class name, e.g. "Sprite" */
    className: string
    /** Method name prefix (from `class -prefix=T`) */
    prefix?: string
    /** Whether instance is embedded into project (from `class -embed`) */
    embedded?: boolean
  }>
  /** Package import paths; pkgPaths[0] is the classfile package itself */
  pkgPaths: string[]
  /** Packages auto-imported into every classfile */
  autoImports: Array<{ name?: string; path: string }>
}

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
