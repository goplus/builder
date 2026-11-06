import { computed, reactive, toValue, type ComputedRef } from 'vue'

import { fromText, toText, type File, type Files } from '@/models/common/file'

export const mainCourseFilePath = 'main_course.gox'

export class Course {
  code: string

  // Kept as the same `File` while the code is unchanged, so that exports can be compared by identity.
  private codeFile: ComputedRef<File>

  constructor(code = '') {
    this.code = code
    const reactiveThis = reactive(this) as this
    this.codeFile = computed(() => fromText(mainCourseFilePath, reactiveThis.code))
    return reactiveThis
  }

  setCode(code: string) {
    this.code = code
  }

  async loadFiles(files: Files) {
    const file = files[mainCourseFilePath]
    if (file == null) throw new Error(`file ${mainCourseFilePath} not found`)
    this.code = await toText(file)
  }

  export(): Files {
    return { [mainCourseFilePath]: toValue(this.codeFile) }
  }
}
