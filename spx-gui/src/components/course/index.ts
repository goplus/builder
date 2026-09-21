import { useModal } from '@/components/ui'
import CourseManagementModal from './management/CourseManagementModal.vue'
import CourseSeriesManagementModal from './management/CourseSeriesManagementModal.vue'
import PlaygroundManagementModal from './management/playground/PlaygroundManagementModal.vue'

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

/**
 * Manage Playground Courses, by series: the modal lists the author's Playground Course series and, inside one,
 * the courses it holds, which is where a course is created and opened for editing.
 * Called by: components/navbar/NavbarProfile.vue (the profile menu).
 */
export function usePlaygroundManagement() {
  const invokePlaygroundManagementModal = useModal(PlaygroundManagementModal)
  return function managePlaygroundCourses() {
    return invokePlaygroundManagementModal({})
  }
}
