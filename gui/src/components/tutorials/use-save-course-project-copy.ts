import { useRouter } from 'vue-router'
import { getProjectEditorRoute } from '@/apps/xbuilder/router'
import { useEnsureSignedIn } from '@/utils/user'
import { useAction, useMessageHandle } from '@/utils/exception'
import type { SpxProject } from '@/models/spx/project'
import { useSaveProjectAs } from '@/components/project'

export function useSaveCourseProjectCopy(beforeOpen?: (source: SpxProject) => boolean | Promise<boolean>) {
  const router = useRouter()
  const ensureSignedIn = useEnsureSignedIn()
  const saveAs = useSaveProjectAs()
  const save = useAction(
    async (project: SpxProject) => {
      await ensureSignedIn()
      const { owner, name } = await saveAs(await project.export(project.getSignal()))
      return getProjectEditorRoute(owner, name)
    },
    { en: 'Failed to save project', zh: '保存项目失败' }
  )

  const open = useAction(
    async (path: string) => {
      const failure = await router.push({ path, state: { savedCourseCopy: path } })
      if (failure != null) throw failure
    },
    {
      en: 'Your copy was saved, but it couldn’t be opened. Try opening it from My projects.',
      zh: '副本已保存，但没能打开。请从“我的项目”重新打开。'
    }
  )
  return useMessageHandle(async (project: SpxProject) => {
    const path = await save(project)
    if (beforeOpen != null && !(await beforeOpen(project))) return
    await open(path)
  }).fn
}
