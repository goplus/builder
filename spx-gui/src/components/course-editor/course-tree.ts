/**
 * The course explorer shows the course as a tree of nodes projected from the Tutorial project's records. A node
 * stands for one record or for a package of records: the embedded project is one opaque node over its root
 * directory, a resource is one node over its package directory, and the course itself (the tree root) stands for the
 * config record plus the course metadata. Records nobody claims appear as plain files, so whatever the explorer
 * shows is exactly what gets saved.
 *
 * The projection is pure: `buildCourseTree` reads the model and returns fresh node objects every time, and
 * `CourseEditor.vue` wraps it in a `computed` so the tree follows the model. The other exports answer questions
 * about a built tree (lookup, route resolution, unsaved marks) without touching the model.
 */

import { extname, filename } from '@/utils/path'
import { isText, type File, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, videosKind } from '@/models/tutorial/resource'
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
 * A directory. Directories are not records: one exists exactly when some node's path lies under it (plus the
 * always-present videos folder).
 * - `path`: the directory path; `''` only for the internal root of `buildCourseTree`, which is never returned.
 * - `name`: the last path segment.
 * - `children`: sorted by `sortChildren` (folders and the project first, then packages, then known files, then
 *   unclaimed files; alphabetical within each group).
 */
export type FolderNode = { type: 'folder'; path: string; name: string; children: CourseNode[] }
/** Any node of the course tree; discriminated by `type`. */
export type CourseNode = ProjectNode | ResourceNode | FileNode | FolderNode

/**
 * What the explorer opens: the course itself (root), the embedded project, one of the tree's nodes, or nothing.
 * - `root`: the empty path; `CourseEditor.vue` shows `CourseConfigDoc`.
 * - `project`: a path at or under the project root; `inEditorPath` is the tail after the root as segments and is
 *   what the SPX Project Editor sees as its own in-editor path.
 * - `node`: a folder, resource or file node of the tree (never the project node, which is `project` above).
 * - `missing`: a path with no node; `CourseEditor.vue` shows a "does not exist" placeholder.
 */
export type CourseDoc =
  | { type: 'root' }
  | { type: 'project'; inEditorPath: string[] }
  | { type: 'node'; node: Exclude<CourseNode, ProjectNode> }
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
 * Sort group of a node within its folder: containers first, then packages, then the file the course uses, then
 * files it does not. Lower ranks come first.
 *
 * @param node - Any node.
 * @returns 0 for folders and the project, 1 for resources, 2 for known files, 3 for unclaimed files.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#sortChildren
 */
function rank(node: CourseNode) {
  switch (node.type) {
    case 'folder':
    case 'project':
      return 0
    case 'resource':
      return 1
    case 'file':
      return node.known ? 2 : 3
  }
}

/**
 * The display name used for alphabetical ordering. The project node has no `name` field, so its root directory
 * name is used.
 *
 * @param node - Any node.
 * @returns The node's `name`, or the last segment of the project's root path.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#sortChildren
 */
function nodeName(node: CourseNode) {
  return node.type === 'project' ? filename(node.path) : node.name
}

/**
 * Sort a list of sibling nodes in place, then recurse into every folder. Order is by `rank`, then by name using
 * `localeCompare` so the explorer reads naturally for the author.
 *
 * @param children - The siblings to sort; mutated in place.
 * @returns Nothing; `children` and every nested `FolderNode.children` end up sorted.
 *
 * Called by:
 * - components/course-editor/course-tree.ts#buildCourseTree (on the root's children)
 * - components/course-editor/course-tree.ts#sortChildren (recursively, for each folder)
 */
function sortChildren(children: CourseNode[]) {
  // Group by rank first; within a group fall back to the localized name order.
  children.sort((a, b) => rank(a) - rank(b) || nodeName(a).localeCompare(nodeName(b)))
  // Folders carry their own child lists, which need the same treatment.
  for (const child of children) if (child.type === 'folder') sortChildren(child.children)
}

/**
 * The top-level nodes of the course tree. Projects every part of the model into nodes: the embedded project (one
 * node), each resource package (one node), the course program (a known file) and every unclaimed record (a plain
 * file). Folders are created implicitly from the nodes' paths; the config record `index.json` gets no node
 * because the tree root (the course itself) stands for it.
 *
 * @param project - The loaded Tutorial project; its `config`, `resources`, `mainCourse` and `extraFiles` are
 *   read. Reading them inside a `computed` makes the tree reactive to model changes.
 * @returns Fresh node objects for the root's children, sorted by `sortChildren`.
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

  // Folders are memoized by path so every node lands in exactly one `FolderNode`; the empty path is the root.
  const root: FolderNode = { type: 'folder', path: '', name: '', children: [] }
  const folders = new Map<string, FolderNode>([['', root]])
  /**
   * Get or create the folder node for `path`, creating missing ancestors on the way up. This is what makes
   * directories exist "as soon as a record's path names them".
   *
   * @param path - A directory path; `''` is the root.
   * @returns The (possibly new) folder node, already attached to its parent.
   *
   * Called by:
   * - components/course-editor/course-tree.ts#buildCourseTree (for every node placed, and recursively)
   */
  function folder(path: string): FolderNode {
    const existing = folders.get(path)
    if (existing != null) return existing
    // Create the folder and attach it to its parent, which is created recursively when missing.
    const created: FolderNode = { type: 'folder', path, name: filename(path), children: [] }
    folder(dirname(path)).children.push(created)
    folders.set(path, created)
    return created
  }

  // The embedded project: one opaque node placed in the folder containing its root.
  const projectRoot = config.project.root
  folder(dirname(projectRoot)).children.push({ type: 'project', path: projectRoot, projectType: config.project.type })

  // The videos folder is where videos get added, so it exists even while there is none.
  folder(getResourceKindDir(videosKind))
  // One node per resource package, placed in its kind folder (`assets/<kind>`), which is created on demand.
  for (const resource of project.resources) {
    folder(getResourceKindDir(resource.kind)).children.push({
      type: 'resource',
      path: resource.assetPath,
      kind: resource.kind,
      name: resource.name,
      id: resource.id,
      file: resource.file
    })
  }

  // The course program is a known text file. Its `File` is taken from the export so it is the same instance
  // `exportFiles()` reports (`DerivedFile` keeps it while the code is unchanged), which `getChangedPaths` relies on.
  const mainCourseFile = project.mainCourse.export()[mainCourseFilePath]!
  folder(dirname(mainCourseFilePath)).children.push({
    type: 'file',
    path: mainCourseFilePath,
    name: filename(mainCourseFilePath),
    file: mainCourseFile,
    kind: 'text',
    known: true
  })

  // Every unclaimed record becomes a plain file node so nothing that will be saved is hidden from the author.
  for (const [path, file] of Object.entries(project.extraFiles)) {
    if (file == null) continue
    folder(dirname(path)).children.push({
      type: 'file',
      path,
      name: filename(path),
      file,
      kind: getFileKind(file, path),
      known: false
    })
  }

  // Order everything for display; the root folder itself is not part of the result.
  sortChildren(root.children)
  return root.children
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
    if (node.path === path) return node
    // Only a folder on the way to `path` is worth descending into.
    if (node.type === 'folder' && isPathWithin(path, node.path)) return findNode(node.children, path)
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
  if (node == null || node.type === 'project') return { type: 'missing', path }
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
export function isNodeDirty(node: CourseNode | { type: 'root' }, changedPaths: Set<string>) {
  // The root has no path of its own; it is dirty exactly when `index.json` changed.
  if (node.type === 'root') return changedPaths.has(configFilePath)
  // Any node is dirty when a changed record is the node itself or lives inside it.
  for (const path of changedPaths) if (isPathWithin(path, node.path)) return true
  return false
}
