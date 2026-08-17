export function scrollCurrentCourseIntoView(courseList: HTMLElement | null) {
  courseList?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: 'center' })
}
