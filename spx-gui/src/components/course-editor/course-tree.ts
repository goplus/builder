/**
 * The course explorer shows the course as a tree of nodes projected from the Tutorial project's records. A node
 * stands for one record or for a package of records: the embedded project is one opaque node over its root
 * directory, a resource is one node over its package directory, and the course itself (the tree root) stands for the
 * config record plus the course metadata. Records nobody claims appear as plain files, so whatever the explorer
 * shows is exactly what gets saved.
 */

import { extname, filename } from '@/utils/path'
import { isText, type File, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, videosKind } from '@/models/tutorial/resource'
import { dirname, isPathWithin, pathToSegments } from './route'

export type FileKind = 'text' | 'image' | 'other'

export type ProjectNode = { type: 'project'; path: string; projectType: string }
/** A resource package under `assets/<kind>/`. */
export type ResourceNode = { type: 'resource'; path: string; kind: string; name: string; id: string; file: File }
export type FileNode = {
  type: 'file'
  path: string
  name: string
  file: File
  kind: FileKind
  /** Whether the course format gives this record a role (as opposed to a record nobody claims). */
  known: boolean
}
export type FolderNode = { type: 'folder'; path: string; name: string; children: CourseNode[] }
export type CourseNode = ProjectNode | ResourceNode | FileNode | FolderNode

/** What the explorer opens: the course itself (root), the embedded project, one of the tree's nodes, or nothing. */
export type CourseDoc =
  | { type: 'root' }
  | { type: 'project'; inEditorPath: string[] }
  | { type: 'node'; node: Exclude<CourseNode, ProjectNode> }
  | { type: 'missing'; path: string }

// Extensions of text records that have no MIME type in the file table, or none that marks them as text.
const textExts = ['txt', 'md', 'mod', 'yaml', 'yml', 'csv', 'vtt', 'srt']

export function getFileKind(file: File, path: string): FileKind {
  if (file.type.startsWith('image/')) return 'image'
  if (isText(file) || textExts.includes(extname(path).slice(1).toLowerCase())) return 'text'
  return 'other'
}

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

function nodeName(node: CourseNode) {
  return node.type === 'project' ? filename(node.path) : node.name
}

function sortChildren(children: CourseNode[]) {
  children.sort((a, b) => rank(a) - rank(b) || nodeName(a).localeCompare(nodeName(b)))
  for (const child of children) if (child.type === 'folder') sortChildren(child.children)
}

/** The top-level nodes of the course tree. */
export function buildCourseTree(project: TutorialProject): CourseNode[] {
  const config = project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')

  const root: FolderNode = { type: 'folder', path: '', name: '', children: [] }
  const folders = new Map<string, FolderNode>([['', root]])
  function folder(path: string): FolderNode {
    const existing = folders.get(path)
    if (existing != null) return existing
    const created: FolderNode = { type: 'folder', path, name: filename(path), children: [] }
    folder(dirname(path)).children.push(created)
    folders.set(path, created)
    return created
  }

  const projectRoot = config.project.root
  folder(dirname(projectRoot)).children.push({ type: 'project', path: projectRoot, projectType: config.project.type })

  // The videos folder is where videos get added, so it exists even while there is none.
  folder(getResourceKindDir(videosKind))
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

  const mainCourseFile = project.mainCourse.export()[mainCourseFilePath]!
  folder(dirname(mainCourseFilePath)).children.push({
    type: 'file',
    path: mainCourseFilePath,
    name: filename(mainCourseFilePath),
    file: mainCourseFile,
    kind: 'text',
    known: true
  })

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

  sortChildren(root.children)
  return root.children
}

export function findNode(nodes: CourseNode[], path: string): CourseNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.type === 'folder' && isPathWithin(path, node.path)) return findNode(node.children, path)
  }
  return null
}

/** `path` if the tree has a node for it, otherwise its nearest ancestor that exists (the root at worst). */
export function nearestExistingPath(tree: CourseNode[], path: string): string {
  while (path !== '' && findNode(tree, path) == null) path = dirname(path)
  return path
}

export function resolveCourseDoc(tree: CourseNode[], projectRoot: string, path: string): CourseDoc {
  if (path === '') return { type: 'root' }
  if (isPathWithin(path, projectRoot)) {
    return { type: 'project', inEditorPath: pathToSegments(path.slice(projectRoot.length)) }
  }
  const node = findNode(tree, path)
  if (node == null || node.type === 'project') return { type: 'missing', path }
  return { type: 'node', node }
}

/** Paths whose record differs between two exports: added, removed, or replaced by another `File` instance. */
export function getChangedPaths(baseline: Files, current: Files): Set<string> {
  const changed = new Set<string>()
  for (const path of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    if (baseline[path] !== current[path]) changed.add(path)
  }
  return changed
}

/** Whether a node (or the course root, which stands for the config record) has records among `changedPaths`. */
export function isNodeDirty(node: CourseNode | { type: 'root' }, changedPaths: Set<string>) {
  if (node.type === 'root') return changedPaths.has(configFilePath)
  for (const path of changedPaths) if (isPathWithin(path, node.path)) return true
  return false
}
