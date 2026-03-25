/**
 * @desc SpxCodeEditorProject — implements IXGoProject for spx projects.
 * This adapter wraps SpxProject and exposes the IXGoProject interface
 * consumed by the generic CodeEditor core.
 */

import type { Files } from '@/models/common/file'
import type { SpxProject } from '@/models/spx/project'
import type { History } from '@/components/editor/history'
import type { ClassFramework, IXGoProject, ICodeOwner } from '../xgo-code-editor'
import { CodeOwnerStage, CodeOwnerSprite } from './text-document'

/**
 * The spx class framework descriptor.
 * Maps to `modfile.Project` fields for the spx game engine.
 */
export const spxClassFramework: ClassFramework = {
  projectClass: {
    ext: '.spx',
    className: 'Game'
  },
  workClasses: [
    {
      ext: '.spx',
      className: 'Sprite'
    }
  ],
  pkgPaths: ['github.com/goplus/spx/v2'],
  autoImports: [{ path: 'github.com/goplus/spx/v2' }]
}

/**
 * Adapts a SpxProject to the IXGoProject interface consumed by the generic CodeEditor.
 * All spx-specific project navigation logic lives here.
 */
export class SpxCodeEditorProject implements IXGoProject {
  readonly classFramework = spxClassFramework

  constructor(
    private project: SpxProject,
    private history: History
  ) {}

  getCodeFiles(): string[] {
    const { stage, sprites } = this.project
    return [stage.codeFilePath, ...sprites.map((s) => s.codeFilePath)]
  }

  exportFiles(): Files {
    return this.project.exportFiles()
  }

  getCodeOwner(filePath: string): ICodeOwner | null {
    const { stage, sprites } = this.project
    if (filePath === stage.codeFilePath) {
      return new CodeOwnerStage(() => this.project.stage, this.history)
    }
    const sprite = sprites.find((s) => s.codeFilePath === filePath)
    if (sprite != null) {
      return new CodeOwnerSprite(() => this.project.sprites.find((s) => s.id === sprite.id) ?? null, this.history)
    }
    return null
  }
}
