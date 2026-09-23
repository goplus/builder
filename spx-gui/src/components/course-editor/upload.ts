/**
 * Adding videos and pictures to a course. The page the author adds from says what is being added, so the only
 * choice left is which files: each becomes a resource package of that kind under `assets/<kind>`, with a generated
 * manifest and a name derived from the file's, made unique among the resources of that kind. Nothing else is added
 * through the editor: records the course format gives no role to are kept when a course carries them, but the
 * editor does not create them.
 *
 * `validateResourceUpload` returns `LocaleMessage | null` (a reason to refuse, or nothing) so the page can say why;
 * `addUploadedResources` is the only function here that mutates the project.
 */

import type { LocaleMessage } from '@/utils/i18n'
import { stripExt } from '@/utils/path'
import { fromNativeFile, type File } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import {
  getResourceKindDir,
  getResourceName,
  Resource,
  validateResourceKind,
  validateResourceName
} from '@/models/tutorial/resource'
import { isPathWithin } from './route'

/**
 * Why files cannot be added as resources of `kind`, or null when they can. What can be in the way only arises in a
 * course whose records this editor did not write: the embedded project placed over the kind's directory, or a file
 * sitting where that directory has to be.
 *
 * @param project - The loaded Tutorial project (its `config.project.root` is read).
 * @param kind - The resource kind being added to.
 * @returns A localized reason to refuse, or `null`.
 * @throws Error when the project has not been loaded (`config == null`).
 *
 * Called by:
 * - components/course-editor/CourseResourceGrid.vue#handleAdd
 * - components/course-editor/upload.test.ts
 */
export function validateResourceUpload(project: TutorialProject, kind: string): LocaleMessage | null {
  const config = project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  const dir = getResourceKindDir(kind)
  // The project root and everything under it is the Project Editor's.
  if (isPathWithin(dir, config.project.root)) {
    return {
      en: `The embedded project occupies ${dir}, where these belong`,
      zh: `内嵌工程占用了它们所在的目录 ${dir}`
    }
  }
  // A folder cannot be where a file is: nothing could be added under it.
  const fileInTheWay = project.getRecordPathConflict(dir, true)
  if (fileInTheWay != null) {
    return { en: `${fileInTheWay} is a file, not a folder`, zh: `${fileInTheWay} 是文件，不是目录` }
  }
  return null
}

/**
 * Pick a unique resource name for a file added as a resource of `kind`. Starts from the file name without its
 * extension; when that is not a valid resource name on its own (blank, too long, contains `/`), starts from the
 * kind instead. Either way the name is made unique among the project's resources of that kind.
 *
 * @param project - The loaded Tutorial project (existing resources are consulted for uniqueness).
 * @param kind - The resource kind (`assets/<kind>`).
 * @param file - The payload file; its name without extension seeds the resource name, its extension the payload path.
 * @returns A name that `validateResourceName` accepts for `project`, e.g. `step-to` or `step-to2`.
 *
 * Called by:
 * - components/course-editor/upload.ts#addUploadedResources
 */
export function deriveResourceName(project: TutorialProject, kind: string, file: File) {
  const base = stripExt(file.name)
  // Derive the resource name from the file name when it is well formed, otherwise start from the kind.
  // `validateResourceName` gets `null` as the project here so a name that merely clashes still counts as usable;
  // `getResourceName` then appends a suffix until the whole layout (uniqueness, payload path) is valid.
  return getResourceName(project, kind, validateResourceName(kind, base, null) == null ? base : kind, {
    file,
    extraFiles: new Map()
  })
}

/**
 * Add each file as a new resource of `kind`, all or nothing: a failure part-way leaves the course as it was.
 *
 * @param project - The loaded Tutorial project; mutated through `addResource`.
 * @param kind - The resource kind, which `validateResourceUpload` accepted.
 * @param files - The native files chosen by the author.
 * @returns The new resources, in the order of `files`.
 * @throws Error when `kind` is not a valid resource kind (a guard: the pages only pass the kinds they show), or
 *   whatever `addResource` throws, after undoing the resources already added.
 *
 * Called by:
 * - components/course-editor/CourseResourceGrid.vue#handleAdd
 * - components/course-editor/upload.test.ts
 */
export function addUploadedResources(project: TutorialProject, kind: string, files: globalThis.File[]): Resource[] {
  if (validateResourceKind(kind) != null) throw new Error(`invalid resource kind ${kind}`)
  const added: Resource[] = []
  try {
    for (const nativeFile of files) {
      const file = fromNativeFile(nativeFile)
      const resource = new Resource(kind, deriveResourceName(project, kind, file), file)
      project.addResource(resource)
      added.push(resource)
    }
    return added
  } catch (error) {
    for (const resource of added) project.removeResource(resource.id)
    throw error
  }
}
