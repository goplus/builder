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

export function getNextCourse(seriesId: string, courseId: string): Course | null {
  const series = getCourseSeries(seriesId)
  const index = series.courses.findIndex((course) => course.id === courseId)
  return series.courses[index + 1] ?? null
}
