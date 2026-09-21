/**
 * What a Playground Course contains the moment it is created, before its author has written anything.
 *
 * A course cannot start empty: the Course Editor needs a configuration to know where the embedded project lives,
 * the learner needs a project to work in, and the course program has to compile for Preview to say anything
 * useful. So a new course starts as a default SPX project plus a program that shows the shape of a lesson and
 * runs as it stands.
 *
 * The embedded project's records come in as an argument rather than being built here: in the app they come from
 * `createDefaultProject`, which fetches the template assets, while a test supplies a minimal project instead.
 */

import { fromConfig, fromText, prefixFiles, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProjectConfig } from '@/models/tutorial/project'

/** Directory the embedded project starts in; the author can move it by editing the configuration. */
const starterProjectRoot = 'project'

/**
 * The program a new course starts with. It uses only calls a course can rely on, and it is written to be edited:
 * one message to state the task, one reaction to finish the course. Left in English, like the rest of the course
 * format's examples; the author rewrites these lines in whatever language their course is in.
 */
const starterProgram = `// This program runs while the learner works. Replace the messages with your own.
onStart => {
	showMessage "Tell the learner what to do here."
}

// The learner's project can print a marker this course recognizes, for example \`println "done"\`.
Editor.Runtime.onLog log => {
	if log == "done" {
		completeWith "Well done!"
	}
}
`

/**
 * Build the records a new Playground Course starts with.
 *
 * @param projectFiles - The embedded project's records, keyed by path relative to the project root (what
 *   `SpxProject.exportFiles()` returns). They are placed under the course's project directory.
 * @returns The course's records keyed by path: the configuration, the starter program, and the project. The
 *   files are local; the caller uploads them before creating the course.
 *
 * Called by:
 * - components/course/management/playground/PlaygroundCourseEditModal.vue#handleSubmit (creating a course)
 * - components/course-editor/starter.test.ts
 */
export function createStarterCourseFiles(projectFiles: Files): Files {
  const config: TutorialProjectConfig = {
    project: { type: 'spx', root: starterProjectRoot },
    // Left empty: the learner's editor opens wherever it would by default until the author picks a path.
    inEditorPath: '',
    copilotContext: ''
  }
  return {
    [configFilePath]: fromConfig(configFilePath, config),
    [mainCourseFilePath]: fromText(mainCourseFilePath, starterProgram),
    ...prefixFiles(projectFiles, starterProjectRoot)
  }
}
