import { computed } from 'vue'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import type { TutorialProject } from '@/models/tutorial/project'
import type { History } from '@/components/editor/history'
import {
  CodeChangeKind,
  getTextDocumentId,
  type ClassFramework,
  type ICodeOwner,
  type IXGoProject
} from '@/components/xgo-code-editor'
import { XGoLSPClient } from '@/components/xgo-code-editor/lsp/xgo-lsp-client'

import { tutorialClassfileConfig } from './class-framework'

export class TutorialCodeEditorProject implements IXGoProject {
  readonly classFramework: ClassFramework = {
    projectClass: { ext: '_course.gox', className: 'Course' },
    workClasses: [],
    pkgPaths: ['github.com/goplus/builder/tools/tutorial'],
    autoImports: []
  }

  private files = computed(() => this.project.mainCourse.export())
  private editAction = { name: { en: 'Update program', zh: '修改程序' }, mergeable: true }
  private codeOwner: ICodeOwner = {
    id: mainCourseFilePath,
    name: { en: 'Program', zh: '程序' },
    getTextDocumentId: () => getTextDocumentId(mainCourseFilePath),
    getCode: () => this.project.mainCourse.code,
    setCode: (code, kind) => {
      if (kind === CodeChangeKind.User) {
        void this.history.doAction(this.editAction, () => this.project.mainCourse.setCode(code))
      } else {
        this.project.mainCourse.setCode(code)
      }
    }
  }

  constructor(
    private project: TutorialProject,
    private history: History
  ) {}

  getCodeFiles() {
    return [mainCourseFilePath]
  }

  getCodeOwner(path: string) {
    return path === mainCourseFilePath ? this.codeOwner : null
  }

  exportFiles(): Files {
    return this.files.value
  }
}

export function createTutorialLSPClient(project: TutorialCodeEditorProject) {
  return new XGoLSPClient(project, {
    classfileConfig: tutorialClassfileConfig,
    sourceExtensions: ['.gox']
  })
}
