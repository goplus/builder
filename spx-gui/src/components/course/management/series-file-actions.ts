import saveAs from 'file-saver'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { DefaultException } from '@/utils/exception'
import { selectFile } from '@/utils/file'
import type { CourseSeries } from '@/apis/course-series'
import { useDeleteCourse } from '@/stores/course'
import { useUpdateCourseSeries } from '@/stores/course-series'
import { useSignedInUser } from '@/stores/user'
import { useConfirmDialog, useMessage } from '@/components/ui'
import {
  exportCourseSeriesFile,
  importCourseSeriesFile,
  importCourseSeriesFileAsNew,
  inspectCourseSeriesFileImport,
  type CourseSeriesFileImportInspection,
  type CourseSeriesImportResult
} from './course-series-file'
import { courseKindNames } from './kind'

/** Export a series to a course series file, and import files into a series or as a new one, asking first. */
export function useCourseSeriesFileActions() {
  const i18n = useI18n()
  const m = useMessage()
  const confirm = useConfirmDialog()
  const signedInUser = useSignedInUser()
  const updateCourseSeries = useUpdateCourseSeries()
  const deleteCourse = useDeleteCourse()

  function getSignedInUsername() {
    const username = signedInUser.value?.username
    if (username == null) throw new DefaultException({ en: 'Please sign in first', zh: '请先登录' })
    return username
  }

  async function exportSeries(courseSeries: CourseSeries) {
    const exported = await m.withLoading(
      exportCourseSeriesFile(courseSeries),
      i18n.t({ en: 'Exporting course series file', zh: '导出课程系列文件中' })
    )
    saveAs(exported, exported.name)
  }

  /** Pick a file and inspect what importing it would change, into `courseSeries` or as a new series. */
  async function pickAndInspect(courseSeries: CourseSeries | null) {
    const username = getSignedInUsername()
    const file = await selectFile({ accept: ['xbcs.zip'] })
    const inspection = await m.withLoading(
      inspectCourseSeriesFileImport(courseSeries, file, username),
      i18n.t({ en: 'Inspecting course series file', zh: '检查课程系列文件中' })
    )
    return { username, file, inspection }
  }

  function reportImported({ undeletedCourseIDs }: CourseSeriesImportResult) {
    if (undeletedCourseIDs.length === 0) {
      m.success(i18n.t({ en: 'Course series imported successfully', zh: '课程系列导入成功' }))
      return
    }
    // The series already holds the imported courses. The old ones are in no series now, so course management does not
    // show them; their IDs are given for cleaning them up.
    const ids = undeletedCourseIDs.join(', ')
    m.warning(
      i18n.t({
        en: `Course series imported, but ${undeletedCourseIDs.length} of its old courses could not be deleted (IDs: ${ids}).`,
        zh: `课程系列已导入，但有 ${undeletedCourseIDs.length} 门旧课程没能删除（课程 ID：${ids}）。`
      })
    )
  }

  /** Replace the courses of `courseSeries` with those of a file the author picks. */
  async function importIntoSeries(courseSeries: CourseSeries) {
    const { username, file, inspection } = await pickAndInspect(courseSeries)
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Import course series file', zh: '导入课程系列文件' }),
      content: i18n.t({
        en: `Courses currently in "${courseSeries.title}" will be deleted and rebuilt from the imported file. Deleted courses: ${formatNameList(inspection.deletedCourses).en}.${describeProjects(inspection).en} This operation cannot be undone. Continue?`,
        zh: `当前课程系列“${courseSeries.title}”中的旧课程会被删除，并根据导入文件重建。会删除的课程：${formatNameList(inspection.deletedCourses).zh}。${describeProjects(inspection).zh}此操作不可撤销，确定继续吗？`
      }),
      confirmText: i18n.t({ en: 'Import', zh: '导入' })
    })
    const result = await m.withLoading(
      importCourseSeriesFile(courseSeries, file, username, { updateCourseSeries, deleteCourse }),
      i18n.t({ en: 'Importing course series file', zh: '导入课程系列文件中' })
    )
    reportImported(result)
    return result
  }

  /** Create a series, of the kind the file holds, from a file the author picks. */
  async function importAsNewSeries(
    /** The `order` of the new series. */
    order: number
  ) {
    const { username, file, inspection } = await pickAndInspect(null)
    const kind = courseKindNames[inspection.kind]
    await confirm({
      title: i18n.t({ en: 'Import course series file', zh: '导入课程系列文件' }),
      content: i18n.t({
        en: `A new ${kind.en} course series will be created from the imported file.${describeProjects(inspection).en} Continue?`,
        zh: `将根据导入文件创建一个新的${kind.zh}课程系列。${describeProjects(inspection).zh}确定继续吗？`
      }),
      confirmText: i18n.t({ en: 'Import', zh: '导入' })
    })
    const result = await m.withLoading(
      importCourseSeriesFileAsNew(file, order, username),
      i18n.t({ en: 'Importing course series file', zh: '导入课程系列文件中' })
    )
    reportImported(result)
    return result
  }

  return { exportSeries, importIntoSeries, importAsNewSeries }
}

/** The projects importing would overwrite, said only for a guided series: a Playground one overwrites none. */
function describeProjects({ kind, overwrittenProjects }: CourseSeriesFileImportInspection): LocaleMessage {
  if (kind !== 'guided') return { en: '', zh: '' }
  const names = formatNameList(overwrittenProjects)
  return {
    en: ` Projects to be overwritten and published: ${names.en}.`,
    zh: `会覆盖并发布的项目：${names.zh}。`
  }
}

function formatNameList(names: string[]): LocaleMessage {
  if (names.length === 0) return { en: 'None', zh: '无' }
  const visibleNames = names.slice(0, 8).map((name) => `"${name}"`)
  if (names.length <= visibleNames.length) return { en: visibleNames.join(', '), zh: visibleNames.join('、') }
  return {
    en: `${visibleNames.join(', ')} and ${names.length - visibleNames.length} more`,
    zh: `${visibleNames.join('、')} 等 ${names.length} 个`
  }
}
