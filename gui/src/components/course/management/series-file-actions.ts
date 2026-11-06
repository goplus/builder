import { selectFile } from '@/utils/file'
import type { CourseSeries } from '@/apis/course-series'
import { useModal } from '@/components/ui'
import CourseSeriesExportModal from './CourseSeriesExportModal.vue'
import CourseSeriesImportModal from './CourseSeriesImportModal.vue'

/**
 * Export a series to a course series file, and import files into a series or as a new one, each in a dialog that shows
 * how it goes.
 */
export function useCourseSeriesFileActions() {
  const invokeExportModal = useModal(CourseSeriesExportModal)
  const invokeImportModal = useModal(CourseSeriesImportModal)

  function exportSeries(courseSeries: CourseSeries) {
    return invokeExportModal({ courseSeries })
  }

  /** Replace the courses of `courseSeries` with those of a file the author picks. */
  async function importIntoSeries(courseSeries: CourseSeries) {
    const file = await selectFile({ accept: ['xbcs.zip'] })
    return invokeImportModal({ file, courseSeries, newSeriesOrder: courseSeries.order })
  }

  /** Create a series, of the kind the file holds, from a file the author picks. */
  async function importAsNewSeries(
    /** The `order` of the new series. */
    order: number
  ) {
    const file = await selectFile({ accept: ['xbcs.zip'] })
    return invokeImportModal({ file, courseSeries: null, newSeriesOrder: order })
  }

  return { exportSeries, importIntoSeries, importAsNewSeries }
}
