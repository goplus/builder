/**
 * The course explorer shows the course as a tree of nodes projected from the Tutorial project's records. A node
 * stands for one record or for a package of records: the embedded project is one opaque node over its root
 * directory, a resource is one node over its package directory, and the course itself (the tree root) stands for the
 * config record plus the course metadata. Records nobody claims appear as plain files, so whatever the explorer
 * shows is exactly what gets saved.
 *
 * The shape follows the parts of a course, not the directories its records export to: the top level is the course
 * program, one group per resource kind, the embedded project, and a heading collecting the records the format
 * gives no role to. Paths stay in the nodes, because the route addresses a node by path and the model writes
 * records by path, but the author is not asked to think in them: `getNodeLabel` names every node by what it is.
 *
 * The projection is pure: `buildCourseTree` reads the model and returns fresh node objects every time, and
 * `CourseEditor.vue` wraps it in a `computed` so the tree follows the model. The other exports answer questions
 * about a built tree (lookup, route resolution, unsaved marks) without touching the model.
 */

import type { LocaleMessage } from '@/utils/i18n'
import { extname, filename } from '@/utils/path'
import { isText, type File, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, imagesKind, videosKind } from '@/models/tutorial/resource'
import { dirname, isPathWithin, pathToSegments } from './route'

/**
 * How a plain record is presented and edited:
 * - `'text'`: shown in `CourseTextDoc` (Monaco) and editable; decided by MIME type or by a known text extension.
 * - `'image'`: shown as an `<img>` preview; decided by an `image/*` MIME type.
 * - `'other'`: no preview; only the MIME type (if any) is shown.
 */
export type FileKind = 'text' | 'image' | 'other'

/**
 * The embedded learner project, one opaque node over its root directory (its records are never listed here; the
 * Project Editor owns them).
 * - `path`: the project root directory from `index.json` (`config.project.root`), e.g. `project`.
 * - `projectType`: `config.project.type` (`'spx'` today), shown as a hint in the explorer.
 */
export type ProjectNode = { type: 'project'; path: string; projectType: string }
/**
 * A resource package under `assets/<kind>/`, one node over its package directory.
 * - `path`: the package directory (`Resource.assetPath`, i.e. `assets/<kind>/<name>`).
 * - `kind`: the directory under `assets/` (`videos`, `images`, ...).
 * - `name`: the package name, also the directory name and the base of the payload file name.
 * - `id`: `Resource.id`, stable across renames (the path is not).
 * - `file`: the payload `File` the package manifest points at.
 */
export type ResourceNode = { type: 'resource'; path: string; kind: string; name: string; id: string; file: File }
/**
 * A single record shown as a file.
 * - `path`: the record's path in the course.
 * - `name`: the last path segment.
 * - `file`: the record itself.
 * - `kind`: how it is presented, see `FileKind`.
 * - `known`: see below.
 */
export type FileNode = {
  type: 'file'
  path: string
  name: string
  file: File
  kind: FileKind
  /** Whether the course format gives this record a role (as opposed to a record nobody claims). */
  known: boolean
}
/**
 * A resource group: all packages of one kind, shown as a folder of the tree. Its `path` is the kind's directory,
 * which is where uploads of that kind land, but the author never sees it: the explorer labels the node by kind.
 * - `path`: `assets/<kind>`.
 * - `name`: the kind (`videos`, `images`, ...), used for the label and for radar identity.
 * - `children`: the packages of that kind, sorted by name.
 */
export type FolderNode = { type: 'folder'; path: string; name: string; children: CourseNode[] }
/**
 * The records the course format gives no role to, collected under one heading instead of being scattered over
 * the directories they happen to sit in. A group stands for no record and has no path: it cannot be opened, and
 * the explorer renders it as a heading that folds its children away.
 * - `key`: identifies the group (only `'unused'` today); used as the Vue key and in radar attributes.
 * - `children`: the unclaimed records as file nodes, sorted by path.
 */
export type GroupNode = { type: 'group'; key: 'unused'; children: CourseNode[] }
/** Any node of the course tree; discriminated by `type`. */
export type CourseNode = ProjectNode | ResourceNode | FileNode | FolderNode | GroupNode

/**
 * What the explorer opens: the course itself (root), the embedded project, one of the tree's nodes, or nothing.
 * - `root`: the empty path; `CourseEditor.vue` shows `CourseConfigDoc`.
 * - `project`: a path at or under the project root; `inEditorPath` is the tail after the root as segments and is
 *   what the SPX Project Editor sees as its own in-editor path.
 * - `node`: a folder, resource or file node of the tree (never the project node, which is `project` above, and
 *   never a group, which stands for no record and has no path).
 * - `missing`: a path with no node; `CourseEditor.vue` shows a "does not exist" placeholder.
 */
export type CourseDoc =
  | { type: 'root' }
  | { type: 'project'; inEditorPath: string[] }
  | { type: 'node'; node: Exclude<CourseNode, ProjectNode | GroupNode> }
  | { type: 'missing'; path: string }

// Extensions of text records that have no MIME type in the file table, or none that marks them as text.
// Compared lower-case and without the dot; see `getFileKind`.
const textExts = ['txt', 'md', 'mod', 'yaml', 'yml', 'csv', 'vtt', 'srt']

/**
 * Classify a record for presentation. The MIME type (set from the extension when the `File` was created, or from
 * the native file on upload) wins; `textExts` covers text formats the MIME table does not know.
 *
 * @param file - The record; only its `type` (MIME) is read.
 * @param path - The record's path (or file name); only its extension is read.
 * @returns `'image'` for `image/*`, `'text'` for text MIME types or listed extensions, `'other'` otherwise.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#buildCourseTree (for unclaimed records)
 * - components/course-editor/CourseResourceDoc.vue#preview (for a non-video package payload)
 */
export function getFileKind(file: File, path: string): FileKind {
  // `image/*` MIME types are images, whatever the extension says.
  if (file.type.startsWith('image/')) return 'image'
  // Text is decided by MIME type or, failing that, by the extension list above.
  if (isText(file) || textExts.includes(extname(path).slice(1).toLowerCase())) return 'text'
  return 'other'
}

/**
 * What a node is called in the explorer and in its document header. The author is shown what the node is, not
 * where its records sit: the course program, a resource group, the embedded project, or one of the records the
 * course does not use. Only those last ones are named by path, because they have nothing else to go by and the
 * author may well want to know where an unused file came from.
 *
 * @param node - Any node of the tree.
 * @returns A localized label; names (packages) and paths (unclaimed records) are the same in both languages.
 *
 * Called by:
 * - components/course-editor/CourseExplorerNode.vue#label
 * - components/course-editor/CourseFolderDoc.vue#template (the group header)
 * - components/course-editor/course-tree.test.ts
 */
export function getNodeLabel(node: CourseNode): LocaleMessage {
  switch (node.type) {
    case 'project':
      return { en: 'Project', zh: '工程' }
    case 'resource':
      return { en: node.name, zh: node.name }
    case 'file':
      // The course program is the only record the format names; the rest are shown by path.
      return node.known ? { en: 'Course program', zh: '课程程序' } : { en: node.path, zh: node.path }
    case 'folder':
      return getResourceKindLabel(node.name)
    case 'group':
      return { en: 'Files the course does not use', zh: '课程不使用的文件' }
  }
}

/**
 * What a resource kind is called. The kinds the editor knows get a word; any other kind a course carries is
 * shown by its directory name, which is the only thing known about it.
 *
 * @param kind - The resource kind (`videos`, `images`, or whatever a course brought along).
 * @returns A localized label.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#getNodeLabel
 * - components/course-editor/CourseFolderDoc.vue#template, components/course-editor/CourseUploadModal.vue
 * - components/course-editor/upload.ts#uploadTypes
 */
export function getResourceKindLabel(kind: string): LocaleMessage {
  switch (kind) {
    case videosKind:
      return { en: 'Videos', zh: '视频' }
    case imagesKind:
      return { en: 'Pictures', zh: '图片' }
    default:
      return { en: kind, zh: kind }
  }
}

/**
 * A stable key for a node, for `v-for` and for looking one up. Every node but a group is identified by its path;
 * a group stands for no record, so its own key is used.
 *
 * @param node - Any node of the tree.
 * @returns The node's path, or `group:<key>` for a group.
 *
 * Called by:
 * - components/course-editor/CourseExplorer.vue#template, components/course-editor/CourseExplorerNode.vue#template
 * - components/course-editor/CourseFolderDoc.vue#template
 */
export function getNodeKey(node: CourseNode) {
  return node.type === 'group' ? `group:${node.key}` : node.path
}

/**
 * The display name used for ordering siblings: packages and known files by name, unclaimed records by path (that
 * is what the explorer shows for them), the project by its root directory. Groups are never sorted among
 * siblings, since the top level keeps the order `buildCourseTree` gives it.
 *
 * @param node - Any node.
 * @returns The text to order this node by.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#sortChildren
 */
function nodeName(node: CourseNode) {
  switch (node.type) {
    case 'project':
      return filename(node.path)
    case 'group':
      return node.key
    case 'file':
      return node.known ? node.name : node.path
    default:
      return node.name
  }
}

/**
 * Sort a list of sibling nodes in place, then recurse into folders and groups. Siblings inside a folder or a
 * group are all of one kind (the packages of a resource kind, or the unclaimed records), so the localized name
 * order is the only rule needed here; the top level keeps the fixed order `buildCourseTree` gives it.
 *
 * @param children - The siblings to sort; mutated in place.
 * @returns Nothing; `children` and the children of every nested folder or group end up sorted.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#buildCourseTree (per resource kind and for the unclaimed records)
 * - components/course-editor/course-tree.ts#sortChildren (recursively)
 */
function sortChildren(children: CourseNode[]) {
  children.sort((a, b) => nodeName(a).localeCompare(nodeName(b)))
  for (const child of children) if (child.type === 'folder' || child.type === 'group') sortChildren(child.children)
}

/**
 * Resource kinds the explorer always shows, so the author can add a video or a picture before the course has
 * any. `TutorialProject.isReservedDirectory` keeps the matching directories free for exactly this reason.
 */
const alwaysShownKinds = [videosKind, imagesKind]

/**
 * The top-level nodes of the course tree: the course program, one group per resource kind, the embedded project,
 * and (when the course carries any) the records the format gives no role to. The shape follows what the parts of
 * the course are, not where their records sit: directories are an export detail, so `assets` never appears and
 * unclaimed records are collected under one heading instead of the folders they happen to live in. The config
 * record `index.json` gets no node because the tree root (the course itself) stands for it.
 *
 * @param project - The loaded Tutorial project; its `config`, `resources`, `mainCourse` and `extraFiles` are
 *   read. Reading them inside a `computed` makes the tree reactive to model changes.
 * @returns Fresh node objects in display order.
 * @throws Error when the project has not been loaded (`config == null`).
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#tree
 * - components/course-editor/course-tree.test.ts
 */
export function buildCourseTree(project: TutorialProject): CourseNode[] {
  // The project root and type come from `index.json`; without it there is nothing to project.
  const config = project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')

  // The course program. Its `File` comes from the export so it is the same instance `exportFiles()` reports
  // (`DerivedFile` keeps it while the code is unchanged), which `getChangedPaths` relies on.
  const program: FileNode = {
    type: 'file',
    path: mainCourseFilePath,
    name: filename(mainCourseFilePath),
    file: project.mainCourse.export()[mainCourseFilePath]!,
    kind: 'text',
    known: true
  }

  // The kinds always offered first, then any other kind the course already carries, in first-seen order.
  const kinds = [...alwaysShownKinds]
  for (const resource of project.resources) if (!kinds.includes(resource.kind)) kinds.push(resource.kind)
  const kindFolders = kinds.map((kind): FolderNode => {
    const children: CourseNode[] = project.resources
      .filter((resource) => resource.kind === kind)
      .map((resource) => ({
        type: 'resource',
        path: resource.assetPath,
        kind: resource.kind,
        name: resource.name,
        id: resource.id,
        file: resource.file
      }))
    sortChildren(children)
    return { type: 'folder', path: getResourceKindDir(kind), name: kind, children }
  })

  // The embedded learner project: one opaque node, wherever its root directory sits.
  const projectNode: ProjectNode = { type: 'project', path: config.project.root, projectType: config.project.type }

  // Every unclaimed record, so nothing that will be saved is hidden from the author.
  const unused: CourseNode[] = []
  for (const [path, file] of project.extraFiles) {
    if (file == null) continue
    unused.push({ type: 'file', path, name: filename(path), file, kind: getFileKind(file, path), known: false })
  }
  sortChildren(unused)

  const groups: CourseNode[] = unused.length > 0 ? [{ type: 'group', key: 'unused', children: unused }] : []
  return [program, ...kindFolders, projectNode, ...groups]
}

/**
 * Look up the node at exactly `path`. Descends only into folders whose path contains `path`, so the walk touches
 * one branch of the tree. The project node is found by its root path, but paths under the project root return
 * `null` (the tree does not list the project's records).
 *
 * @param nodes - Siblings to search; the tree's top level or a folder's `children`.
 * @param path - The normalized path wanted; `''` never matches (the root is not a node).
 * @returns The matching node, or `null` when none.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#findNode (recursively)
 * - components/course-editor/course-tree.ts#nearestExistingPath
 * - components/course-editor/course-tree.ts#resolveCourseDoc
 * - components/course-editor/course-tree.test.ts
 */
export function findNode(nodes: CourseNode[], path: string): CourseNode | null {
  for (const node of nodes) {
    // A group stands for no record and has no path of its own: it is never the answer, only its children are.
    if (node.type !== 'group' && node.path === path) return node
    // Look inside anything that holds other nodes. Being under a resource group's directory does not put a node
    // in that group: a record the course does not use sits in the unused heading wherever its path points, so a
    // branch that does not have it must not end the search.
    if (node.type === 'folder' || node.type === 'group') {
      const found = findNode(node.children, path)
      if (found != null) return found
    }
  }
  return null
}

/**
 * `path` if the tree has a node for it, otherwise its nearest ancestor that exists (the root at worst). Used after
 * a node disappears (deletion) to land the author somewhere sensible.
 *
 * @param tree - The top-level nodes.
 * @param path - The normalized path to start from.
 * @returns `path`, or the closest ancestor with a node, or `''` (the course root).
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#template (the `@deleted` handler of `CourseFileDoc`)
 * - components/course-editor/course-tree.test.ts
 */
export function nearestExistingPath(tree: CourseNode[], path: string): string {
  // Walk up one directory at a time until a node exists; the empty path always "exists" as the root.
  while (path !== '' && findNode(tree, path) == null) path = dirname(path)
  return path
}

/**
 * Map the route's in-Course-Editor path to what the editor should show. The project root is checked before the
 * tree because paths under it (the Project Editor's own route tail) have no nodes of their own.
 *
 * @param tree - The top-level nodes.
 * @param projectRoot - `config.project.root`, the embedded project's directory.
 * @param path - The normalized active path from the route; `''` for the course itself.
 * @returns A `CourseDoc` telling `CourseEditor.vue` which document component to render.
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#doc
 * - components/course-editor/course-tree.test.ts
 */
export function resolveCourseDoc(tree: CourseNode[], projectRoot: string, path: string): CourseDoc {
  // The empty path is the course itself (config + metadata).
  if (path === '') return { type: 'root' }
  // Anything at or under the project root opens the Project Editor with the remaining segments as its path.
  if (isPathWithin(path, projectRoot)) {
    return { type: 'project', inEditorPath: pathToSegments(path.slice(projectRoot.length)) }
  }
  // Otherwise it must be a tree node. A project node cannot come back here (its path was caught above), but the
  // type system does not know that, so that case is folded into `missing`.
  const node = findNode(tree, path)
  // `findNode` returns neither of these (the project's path was caught above, a group has no path), but the
  // type system does not know that, so both are folded into `missing`.
  if (node == null || node.type === 'project' || node.type === 'group') return { type: 'missing', path }
  return { type: 'node', node }
}

/**
 * Paths whose record differs between two exports: added, removed, or replaced by another `File` instance. Identity
 * comparison is enough because the model reuses `File` instances while their source is unchanged (`DerivedFile`
 * for generated records; edits always produce a new instance).
 *
 * @param baseline - The export taken at load or after the last successful save.
 * @param current - The export of the working copy now.
 * @returns The set of paths present in either export whose `File` differs (including `undefined` on one side).
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#changedPaths
 * - components/course-editor/course-tree.test.ts
 */
export function getChangedPaths(baseline: Files, current: Files): Set<string> {
  const changed = new Set<string>()
  // Union of both key sets so additions and removals are both seen.
  for (const path of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    if (baseline[path] !== current[path]) changed.add(path)
  }
  return changed
}

/**
 * Whether a node (or the course root, which stands for the config record) has records among `changedPaths`.
 * Drives the unsaved dot in the explorer.
 *
 * @param node - A tree node, or `{ type: 'root' }` for the course itself.
 * @param changedPaths - The result of `getChangedPaths`.
 * @returns `true` when the root's config record changed, or when any changed path is at or under the node's path
 *   (a folder, package or the project is dirty when anything inside it is).
 *
 * Called by:
 * - components/course-editor/CourseExplorer.vue#rootDirty
 * - components/course-editor/CourseExplorerNode.vue#dirty
 * - components/course-editor/course-tree.test.ts
 */
export function isNodeDirty(node: CourseNode | { type: 'root' }, changedPaths: Set<string>): boolean {
  // The root has no path of its own; it is dirty exactly when `index.json` changed.
  if (node.type === 'root') return changedPaths.has(configFilePath)
  // A group has no path either; it is dirty when any record it collects is.
  if (node.type === 'group') return node.children.some((child) => isNodeDirty(child, changedPaths))
  // Any node is dirty when a changed record is the node itself or lives inside it.
  for (const path of changedPaths) if (isPathWithin(path, node.path)) return true
  return false
}
