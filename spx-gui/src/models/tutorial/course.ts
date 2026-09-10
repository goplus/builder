import { reactive } from 'vue'

import { fromText, toText, type Files } from '@/models/common/file'

import { DerivedFile } from './derived-file'

export const mainCourseFilePath = 'main_course.gox'

export class Course {
  code: string

  private codeFile = new DerivedFile((code) => fromText(mainCourseFilePath, code))

  constructor(code = '') {
    this.code = code
    return reactive(this) as this
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
    return { [mainCourseFilePath]: this.codeFile.get(this.code) }
  }
}
