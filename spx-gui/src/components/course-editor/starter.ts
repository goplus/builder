import { fromConfig, fromText, prefixFiles, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProjectConfig } from '@/models/tutorial/project'

/** Directory the embedded project starts in; the author can move it by editing the configuration. */
const starterProjectRoot = 'project'

// Uses only calls every host implements, so a new course's first Preview works. Left in English, like the course
// format's other examples; the author rewrites these lines in their course's language.
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
 * Build the files a new Playground Course starts with. A course cannot start empty: the Course Editor needs the
 * configuration to find the embedded project, the learner needs a project to work in, and Preview needs a program.
 */
export function createStarterCourseFiles(
  /** The embedded project's files, keyed by path relative to the project root. */
  projectFiles: Files
): Files {
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
