import { addProject, ProjectType, Visibility } from '@/apis/project'
import { getProjectRelease, parseProjectReleaseFullName, type ProjectRelease } from '@/apis/project-release'
import { cloudHelpers } from '@/models/common/cloud'
import { SpxProject } from '@/models/spx/project'

export async function createDefaultProject(owner: string, name: string, templateReleaseFullName: string | null) {
  let templateRelease: ProjectRelease | null = null
  if (templateReleaseFullName != null) {
    try {
      const {
        owner: templateOwner,
        project: templateProject,
        release
      } = parseProjectReleaseFullName(templateReleaseFullName)
      templateRelease = await getProjectRelease(templateOwner, templateProject, release)
    } catch (error) {
      console.warn(`Failed to load default project template ${templateReleaseFullName}; using fallback`, error)
    }
  }

  if (templateRelease != null) {
    await addProject({
      name,
      displayName: name,
      type: ProjectType.Game,
      visibility: Visibility.Private,
      files: templateRelease.files,
      thumbnail: templateRelease.thumbnail
    })
    return
  }

  const project = new SpxProject(owner, name)
  project.setVisibility(Visibility.Private)
  await cloudHelpers.save(await project.export())
}
