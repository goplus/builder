import { courseSeries, type Course, type CourseSeries } from '@/data/mock'

export function listCourseSeries(): CourseSeries[] {
  return courseSeries
}

export function getCourseSeries(id: string): CourseSeries {
  return courseSeries.find((series) => series.id === id) ?? courseSeries[0]
}

export function getCourse(seriesId: string, courseId: string): Course {
  const series = getCourseSeries(seriesId)
  return series.courses.find((course) => course.id === courseId) ?? series.courses[0]
}
