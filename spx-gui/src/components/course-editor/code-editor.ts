import { computed, toValue, type WatchSource } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import type { TutorialProject } from '@/models/tutorial/project'
import type { History } from '@/components/editor/history'
import {
  CodeChangeKind,
  CodeEditor,
  loadMonaco,
  useProvideCodeEditor,
  getTextDocumentId,
  type ICodeOwner,
  type IXGoProject
} from '@/components/xgo-code-editor'
import { XGoLSPClient } from '@/components/xgo-code-editor/lsp/xgo-lsp-client'

import { tutorialClassFrameworkConfig } from './class-framework'

export class TutorialCodeEditorProject implements IXGoProject {
  readonly classFramework = tutorialClassFrameworkConfig.projects[0]

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
    classFrameworkConfig: tutorialClassFrameworkConfig
  })
}

/** The Course Editor owns this session; program views only attach their UI to it. */
export function useCourseCodeEditor(projectSource: WatchSource<TutorialProject>, history: History) {
  const lang = useI18n().lang.value
  const query = useQuery(
    async ({ signal }) => {
      const project = toValue(projectSource)
      const monaco = await loadMonaco(lang)
      signal.throwIfAborted()
      const editorProject = new TutorialCodeEditorProject(project, history)
      const lspClient = createTutorialLSPClient(editorProject)
      const editor = new CodeEditor({ project: editorProject, history, monaco, lspClient })
      editor.disposeOnSignal(signal)
      lspClient.init()
      // Initialize documents with the session rather than from a view.
      for (const path of editorProject.getCodeFiles()) editor.getTextDocument(getTextDocumentId(path))
      return editor
    },
    { en: 'Failed to load code editor', zh: '加载代码编辑器失败' },
    { clearDataOnFetch: true }
  )
  useProvideCodeEditor(query.data, { appWide: false })
  return query
}
