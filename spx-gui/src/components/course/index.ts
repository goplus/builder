import { useModal } from '@/components/ui'
import CourseManagementModal from './management/CourseManagementModal.vue'
import CourseSeriesManagementModal from './management/CourseSeriesManagementModal.vue'

export function useCourseManagement() {
  const invokeCourseManagementModal = useModal(CourseManagementModal)
  return function manageCourses() {
    return invokeCourseManagementModal({})
  }
}

export function useCourseSeriesManagement() {
  const invokeCourseSeriesManagementModal = useModal(CourseSeriesManagementModal)
  return function manageCourseSeries() {
    return invokeCourseSeriesManagementModal({})
  }
}
