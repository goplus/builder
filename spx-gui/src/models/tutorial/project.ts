import { reactive } from 'vue'

import type { PlaygroundCourse } from '@/apis/course'
import { getFiles } from '@/models/common/cloud'
import { assign } from '@/models/common'
import { fromText, prefixFiles, toConfig, unprefixFiles, type File, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'

import { Course, mainCourseFilePath } from './course'
import { DerivedFile } from './derived-file'
import { ensureValidResourceName, Resource } from './resource'

/**
 * Path (relative to the Tutorial-project root) of the course configuration record.
 * Consumed by: models/tutorial/project.ts#TutorialProject (`configFile`, `loadFiles`, `exportConfig`),
 * models/tutorial/project.ts#isClaimedPath, components/course-editor/upload.ts#validateUploadPath,
 * components/course-editor/course-tree.ts#isNodeDirty (the root node stands for this record).
 */
export const configFilePath = 'index.json'

/**
 * Contents of `index.json`: everything the course author configures besides the program and the resources.
 * Consumed by: models/tutorial/project.ts#TutorialProject (`config`, `setConfig`, `loadFiles`),
 * components/course-editor/project/index.ts#TutorialProjectType (derives the project type union),
 * components/course-editor/CourseConfigDoc.vue (edits `inEditorPath` and `copilotContext`),
 * components/course-editor/CourseEditor.vue (reads `project.root`, `project.type`, `inEditorPath`),
 * components/tutorials/playground/CoursePlayground.vue#initialize (opens `inEditorPath`),
 * components/tutorials/playground/runner.ts#PlaygroundCourseRunner.createCopilotTopic (uses `copilotContext`).
 */
export type TutorialProjectConfig = {
  /** The embedded learner project. */
  project: {
    /** Project kind; selects the editor host (`components/course-editor/project/index.ts`). Only `spx` so far. */
    type: 'spx'
    /** Directory (relative to the Tutorial-project root, no trailing slash) holding the learner project's files. */
    root: string
  }
  /** The route initially displayed in the editor. */
  inEditorPath: string
  /** Copilot instructions supplied by the course author. */
  copilotContext: string
}

/**
 * The course fields that live outside the file records: everything of a `PlaygroundCourse` except `content`
 * (id, owner, kind, title, thumbnail). Persisted by the course API, not by the Tutorial-project files.
 * Consumed by: models/tutorial/project.ts#TutorialProject.setMetadata and #export,
 * models/tutorial/project.test.ts.
 */
export type TutorialProjectMetadata = Omit<PlaygroundCourse, 'content'>

/**
 * A Tutorial project as a plain value: metadata plus the flat record map. This is what `load` accepts and what
 * `export` / `snapshot` return, so a project can be cloned by feeding one instance's output to another.
 * Consumed by: models/tutorial/project.ts#TutorialProject.load, #snapshot and #export,
 * components/course-editor/CourseEditor.vue#loadPreviewSnapshot (clones the working copy for preview).
 */
export type TutorialProjectSerialized = {
  metadata: TutorialProjectMetadata
  files: Files
}

// Re-exported so consumers can import the whole model from `@/models/tutorial/project`.
export { Resource } from './resource'
export { Course } from './course'

/**
 * A Tutorial project is a collection of records (path → file). Typed parts of the model claim the records they
 * understand: the config claims `index.json`, the course program claims `main_course.gox`, the embedded project
 * claims its root directory and each resource package claims its directory. Records nobody claims are kept in
 * `extraFiles` and written back as they are, so a course produced by a newer format, or carrying files this
 * model does not understand, is never silently trimmed.
 *
 * Invariants:
 * - `config` is null until `load()` / `loadFiles()` succeeded; methods that need it throw
 *   'Tutorial project has not been loaded' otherwise (`setConfig`, `isClaimedPath`, `exportConfig`, `exportFiles`).
 * - Every `Resource` in `resources` has `_project === this` and a name unique within its kind; a resource removed
 *   from the list is detached (`_project === null`).
 * - `extraFiles` never holds a path claimed by the model (`isClaimedPath` is false for every key); enforced by
 *   `setExtraFile` and by the filtering in `loadFiles`.
 * - `project` (the embedded `SpxProject`) and `mainCourse` are created once in the constructor and reloaded in
 *   place by `loadFiles`, so editor state bound to them survives a reload.
 * - Generated records (`index.json`, `main_course.gox`, resource manifests) keep their `File` identity while their
 *   source is unchanged, so two `exportFiles()` results can be compared instance-wise.
 * - The instance is reactive (`reactive(this)`); `exportFiles()` is used as a watch source by the Course Editor.
 *
 * Consumed by: apps/xbuilder/pages/course-editor/index.vue (loads the course to edit),
 * apps/xbuilder/pages/tutorials/course-playground.vue (loads the course to learn),
 * components/course-editor/CourseEditor.vue (save, preview snapshot, dirty tracking, program editing),
 * components/course-editor/CourseConfigDoc.vue, CourseResourceDoc.vue, CourseFileDoc.vue, CourseFolderDoc.vue,
 * CourseExplorer.vue and CourseUploadModal.vue (document editors), components/course-editor/upload.ts,
 * components/course-editor/course-tree.ts, components/tutorials/playground/CoursePlayground.vue and runner.ts,
 * and the tests models/tutorial/project.test.ts, components/course-editor/upload.test.ts,
 * components/course-editor/course-tree.test.ts, components/tutorials/playground/runner.test.ts.
 */
export class TutorialProject {
  /** Course id from the API; empty until metadata is set. */
  id = ''
  /** Username of the course owner. */
  owner = ''
  /** Always `playground`: only Playground Courses are backed by a Tutorial project. */
  kind = 'playground' as const
  /** Course title (edited in course management, displayed by the Course Editor). */
  title = ''
  /** Universal URL of the course thumbnail. */
  thumbnail = ''

  /** Tutorial-project configuration. */
  config: TutorialProjectConfig | null = null
  /** The embedded learner project. */
  project: SpxProject
  /** The course author's main program. */
  mainCourse: Course
  /** Course-local resource packages under `assets/` (videos, and whatever other kinds the author added). */
  resources: Resource[] = []
  /** Records claimed by no part of the model, keyed by path. */
  extraFiles: Files = {}

  /** Memo generating the `index.json` record from `config`; see `DerivedFile` for why identity matters. */
  private configFile = new DerivedFile((json) => fromText(configFilePath, json))

  /**
   * Creates an empty, not-yet-loaded Tutorial project with a fresh embedded `SpxProject` and `Course`.
   * @returns A reactive `TutorialProject`; call `load()` or `loadFiles()` before using it.
   * Called by: models/tutorial/project.ts#TutorialProject.load (static),
   * components/course-editor/CourseEditor.vue#loadPreviewSnapshot, and the tests models/tutorial/project.test.ts,
   * components/course-editor/upload.test.ts, components/course-editor/course-tree.test.ts,
   * components/tutorials/playground/runner.test.ts.
   */
  constructor() {
    this.project = new SpxProject()
    this.mainCourse = new Course()
    return reactive(this) as this
  }

  /**
   * Builds a Tutorial project from a course fetched from the API.
   * @param course - The Playground Course; its `content` maps record paths to universal URLs.
   * @throws Error (from `loadFiles`) when the content lacks `index.json` or `main_course.gox`.
   * @returns Promise of the loaded project.
   * Called by: apps/xbuilder/pages/course-editor/index.vue#entryQueryRet (useQuery callback),
   * apps/xbuilder/pages/tutorials/course-playground.vue#entryQueryRet (useQuery callback).
   */
  static async load(course: PlaygroundCourse) {
    const project = new TutorialProject()
    // `getFiles` turns the universal-URL map into lazy `File` records; nothing is downloaded until read.
    await project.load({ metadata: course, files: getFiles(course.content) })
    return project
  }

  /**
   * Patches the API-side course fields (title, thumbnail, ...).
   * @param metadata - Any subset of `TutorialProjectMetadata`; given fields overwrite the current ones.
   * @returns void; assigns the fields onto `this`.
   * Called by: models/tutorial/project.ts#TutorialProject.load,
   * components/course-editor/CourseEditor.vue#save (picks up title/thumbnail edited elsewhere),
   * models/tutorial/project.test.ts.
   */
  setMetadata(metadata: Partial<TutorialProjectMetadata>) {
    assign<TutorialProject>(this, metadata)
  }

  /**
   * Patches the `index.json` configuration.
   * @param config - Any subset of `TutorialProjectConfig`; given fields overwrite the current ones.
   * @throws Error when the project has not been loaded yet (`config` is null).
   * @returns void; replaces `config` with a new object so watchers of `config` fire.
   * Called by: components/course-editor/CourseConfigDoc.vue#handleGenerateCopilotContext and #template,
   * models/tutorial/project.test.ts, components/course-editor/course-tree.test.ts.
   */
  setConfig(config: Partial<TutorialProjectConfig>) {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    this.config = { ...this.config, ...config }
  }

  /**
   * Loads metadata and records together (the inverse of `export`).
   * @param serialized.metadata - Course fields to assign.
   * @param serialized.files - All records of the Tutorial project, keyed by path relative to its root.
   * @throws Error (from `loadFiles`) when mandatory records are missing.
   * @returns Promise resolving once every part of the model has been (re)loaded.
   * Called by: models/tutorial/project.ts#TutorialProject.load (static),
   * components/course-editor/CourseEditor.vue#loadPreviewSnapshot.
   */
  async load({ metadata, files }: TutorialProjectSerialized) {
    this.setMetadata(metadata)
    await this.loadFiles(files)
  }

  /**
   * (Re)loads every part of the model from a flat record map. The embedded `SpxProject` and `Course` instances
   * are reused; resources and extra files are replaced.
   * @param files - All records of the Tutorial project, keyed by path relative to its root.
   * @throws Error when `index.json` is missing, or (from `Course.loadFiles`) when `main_course.gox` is missing.
   * @returns Promise resolving once `config`, `project`, `mainCourse`, `resources` and `extraFiles` are set.
   * Called by: models/tutorial/project.ts#TutorialProject.load, models/tutorial/project.test.ts,
   * components/course-editor/upload.test.ts, components/course-editor/course-tree.test.ts.
   */
  async loadFiles(files: Files) {
    // The config comes first: it tells where the embedded project lives.
    const configFile = files[configFilePath]
    if (configFile == null) throw new Error(`file ${configFilePath} not found`)
    const config = (await toConfig(configFile)) as TutorialProjectConfig
    // Hand each typed part the records it understands; the embedded project sees paths relative to its root.
    await this.project.loadFiles(unprefixFiles(files, config.project.root))
    await this.mainCourse.loadFiles(files)
    const resources = await Resource.loadAll(files)

    // Whatever no typed part claimed is kept verbatim so it is written back unchanged.
    const extraFiles: Files = {}
    for (const [path, file] of Object.entries(files)) {
      if (file != null && !isClaimedPath(path, config, resources)) extraFiles[path] = file
    }

    // Commit the tutorial-level state only after every await succeeded (the embedded project and the program
    // were already reloaded in place above).
    this.config = config
    // Detach the old resources before attaching the new ones: each resource tracks its owning project.
    this.resources.splice(0).forEach((resource) => resource.setProject(null))
    resources.forEach((resource) => this.addResource(resource))
    this.extraFiles = extraFiles
  }

  /**
   * Finds a resource package by kind and name.
   * @param kind - Resource kind.
   * @param name - Resource name.
   * @returns The matching `Resource`, or null when there is none.
   * Called by: models/tutorial/resource.ts#validateResourceName (uniqueness check),
   * components/course-editor/CourseResourceDoc.vue#resource (computed), models/tutorial/project.test.ts.
   */
  getResource(kind: string, name: string): Resource | null {
    return this.resources.find((resource) => resource.kind === kind && resource.name === name) ?? null
  }

  /**
   * Makes a resource ready to join `resources`: resolves name conflicts within its kind and attaches it.
   * @param resource - The resource about to be added.
   * @returns void; may rename `resource` and sets its owning project to `this`.
   * Called by: models/tutorial/project.ts#TutorialProject.addResource.
   */
  private prepareAddResource(resource: Resource) {
    // Rename first (validated against this project), then attach: the resource is not in `resources` yet, so
    // its own current name cannot be reported as a conflict.
    const name = ensureValidResourceName(resource.kind, resource.name, this)
    resource.setName(name)
    resource.setProject(this)
  }

  /**
   * Adds a resource package to the course, renaming it if its name is taken within its kind.
   * @param resource - The resource to add.
   * @returns void; appends to `resources`.
   * Called by: models/tutorial/project.ts#TutorialProject.loadFiles,
   * components/course-editor/upload.ts#addUploadedFiles, models/tutorial/project.test.ts.
   */
  addResource(resource: Resource) {
    this.prepareAddResource(resource)
    this.resources.push(resource)
  }

  /**
   * Removes a resource package by id and detaches it.
   * @param id - The resource's `id`.
   * @throws Error when no resource has that id.
   * @returns void; removes from `resources` and sets the resource's owning project to null.
   * Called by: components/course-editor/CourseResourceDoc.vue#handleDelete, models/tutorial/project.test.ts.
   */
  removeResource(id: string) {
    const index = this.resources.findIndex((resource) => resource.id === id)
    if (index < 0) throw new Error(`resource ${id} not found`)
    const [resource] = this.resources.splice(index, 1)
    resource.setProject(null)
  }

  /**
   * Whether `path` is claimed by a typed part of the model, so that it cannot hold an extra file.
   * @param path - Record path relative to the Tutorial-project root.
   * @throws Error when the project has not been loaded yet.
   * @returns `true` for `index.json`, `main_course.gox`, anything under the project root or a package directory.
   * Called by: models/tutorial/project.ts#TutorialProject.setExtraFile,
   * components/course-editor/upload.ts#validateUploadPath.
   */
  isClaimedPath(path: string) {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    return isClaimedPath(path, this.config, this.resources)
  }

  /**
   * Reads an unclaimed record.
   * @param path - Record path relative to the Tutorial-project root.
   * @returns The `File`, or null when there is no extra file at `path`.
   * Called by: components/course-editor/upload.ts#getUploadConflicts, models/tutorial/project.test.ts,
   * components/course-editor/upload.test.ts.
   */
  getExtraFile(path: string): File | null {
    return this.extraFiles[path] ?? null
  }

  /**
   * Adds or replaces an unclaimed record.
   * @param path - Record path relative to the Tutorial-project root.
   * @param file - The record content.
   * @throws Error when `path` is claimed by the model (config, program, project root or a package directory).
   * @returns void; writes into `extraFiles`.
   * Called by: components/course-editor/CourseFileDoc.vue#handleTextChange,
   * components/course-editor/upload.ts#addUploadedFiles, models/tutorial/project.test.ts.
   */
  setExtraFile(path: string, file: File) {
    if (this.isClaimedPath(path)) throw new Error(`path ${path} is claimed by the course model`)
    this.extraFiles[path] = file
  }

  /**
   * Deletes an unclaimed record.
   * @param path - Record path relative to the Tutorial-project root.
   * @throws Error when there is no extra file at `path`.
   * @returns void; deletes the key from `extraFiles`.
   * Called by: components/course-editor/CourseFileDoc.vue#handleDelete, models/tutorial/project.test.ts,
   * components/course-editor/course-tree.test.ts.
   */
  removeExtraFile(path: string) {
    if (this.extraFiles[path] == null) throw new Error(`file ${path} not found`)
    delete this.extraFiles[path]
  }

  /**
   * The config record, generated from `config`.
   * @throws Error when the project has not been loaded yet.
   * @returns A `Files` map holding only `index.json`; the `File` is reused while the config JSON is unchanged.
   * Called by: models/tutorial/project.ts#TutorialProject.exportFiles.
   */
  exportConfig(): Files {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    return { [configFilePath]: this.configFile.get(JSON.stringify(this.config)) }
  }

  /**
   * Produces the complete flat record map of the course: extra files, config, the embedded project (prefixed by
   * its root), the program and every resource package. Reading it inside a Vue effect tracks every part of the
   * model, which is how the Course Editor detects unsaved changes.
   * @throws Error when the project has not been loaded yet.
   * @returns A fresh `Files` map keyed by path relative to the Tutorial-project root.
   * Called by: models/tutorial/project.ts#TutorialProject.export,
   * components/course-editor/CourseEditor.vue (dirty watch source, `filesBaseline`, `changedPaths`),
   * models/tutorial/project.test.ts, components/course-editor/upload.test.ts,
   * components/course-editor/course-tree.test.ts.
   */
  exportFiles() {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    const files: Files = {}
    // Extra files first, so the typed parts merged below win should a path ever overlap.
    for (const [path, file] of Object.entries(this.extraFiles)) {
      if (file != null) files[path] = file
    }
    // Merge every typed part; the embedded project's paths are moved back under its root directory.
    Object.assign(
      files,
      this.exportConfig(),
      prefixFiles(this.project.exportFiles(), this.config.project.root),
      this.mainCourse.export(),
      ...this.resources.map((resource) => resource.export())
    )
    return files
  }

  /**
   * Export after any in-flight transaction of the embedded project (undo/redo, imports) has finished,
   * so the result never captures an intermediate state. Use this for saving and previewing.
   * @returns Promise of the serialized project, produced while holding the embedded project's mutex.
   * Called by: components/course-editor/CourseEditor.vue#save and #loadPreviewSnapshot,
   * components/course-editor/CourseConfigDoc.vue#handleGenerateCopilotContext.
   */
  snapshot(): Promise<TutorialProjectSerialized> {
    return this.project.mutex.runExclusive(() => this.export())
  }

  /**
   * Serializes the project synchronously (the inverse of `load`). Prefer `snapshot()` when the embedded project
   * may be mid-transaction.
   * @throws Error (from `exportFiles`) when the project has not been loaded yet.
   * @returns Metadata plus the flat record map.
   * Called by: models/tutorial/project.ts#TutorialProject.snapshot, models/tutorial/project.test.ts.
   */
  export(): TutorialProjectSerialized {
    return {
      metadata: {
        id: this.id,
        owner: this.owner,
        kind: this.kind,
        title: this.title,
        thumbnail: this.thumbnail
      },
      files: this.exportFiles()
    }
  }
}

/**
 * Whether a record path is owned by a typed part of the model, given the config and resources to check against.
 * Kept as a free function so `loadFiles` can use it before committing the new config to `this.config`.
 * @param path - Record path relative to the Tutorial-project root.
 * @param config - The configuration (for the embedded project's root).
 * @param resources - The resource packages (for their directories).
 * @returns `true` when `path` is the config, the program, or lies under the project root or a package directory.
 * Called by: models/tutorial/project.ts#TutorialProject.loadFiles,
 * models/tutorial/project.ts#TutorialProject.isClaimedPath.
 */
function isClaimedPath(path: string, config: TutorialProjectConfig, resources: Resource[]) {
  if (path === configFilePath || path === mainCourseFilePath) return true
  if (path.startsWith(config.project.root + '/')) return true
  return resources.some((resource) => path.startsWith(resource.assetPath + '/'))
}
