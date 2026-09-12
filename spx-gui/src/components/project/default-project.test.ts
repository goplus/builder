import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { addProject, ProjectType, Visibility } from '@/apis/project'
import { getProjectRelease, type ProjectRelease } from '@/apis/project-release'
import { cloudHelpers } from '@/models/common/cloud'
import { createDefaultProject } from './default-project'

vi.mock('@/apis/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/project')>()),
  addProject: vi.fn()
}))

vi.mock('@/apis/project-release', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/project-release')>()),
  getProjectRelease: vi.fn()
}))

const templateRelease: ProjectRelease = {
  id: 'release-id',
  createdAt: '2026-08-29T00:00:00Z',
  updatedAt: '2026-08-29T00:00:00Z',
  projectFullName: 'curator/default-project-template',
  name: 'v1.0.0',
  description: '',
  files: {
    'assets/index.json': 'data:application/json,%7B%7D',
    'assets/fonts/basic-chinese/font.ttf': 'kodo://bucket/files/font.ttf'
  },
  thumbnail: 'kodo://bucket/files/thumbnail.jpeg',
  remixCount: 0
}

describe('createDefaultProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(cloudHelpers, 'save').mockResolvedValue({} as Awaited<ReturnType<typeof cloudHelpers.save>>)
    vi.mocked(addProject).mockResolvedValue({} as Awaited<ReturnType<typeof addProject>>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a project with the configured template release content', async () => {
    vi.mocked(getProjectRelease).mockResolvedValue(templateRelease)

    await createDefaultProject('alice', 'new-project', 'curator/default-project-template/v1.0.0')

    expect(getProjectRelease).toHaveBeenCalledWith('curator', 'default-project-template', 'v1.0.0')
    expect(addProject).toHaveBeenCalledWith({
      name: 'new-project',
      displayName: 'new-project',
      type: ProjectType.Game,
      visibility: Visibility.Private,
      files: templateRelease.files,
      thumbnail: templateRelease.thumbnail
    })
    expect(cloudHelpers.save).not.toHaveBeenCalled()
  })

  it('uses a minimal local project when the configured template is unavailable', async () => {
    vi.mocked(getProjectRelease).mockRejectedValue(new Error('not found'))

    await createDefaultProject('alice', 'new-project', 'curator/default-project-template/v1.0.0')

    expect(addProject).not.toHaveBeenCalled()
    expect(cloudHelpers.save).toHaveBeenCalledOnce()
    const serialized = vi.mocked(cloudHelpers.save).mock.calls[0][0]
    expect(serialized.metadata).toMatchObject({
      owner: 'alice',
      name: 'new-project',
      displayName: 'new-project',
      type: ProjectType.Game,
      visibility: Visibility.Private
    })
    expect(Object.keys(serialized.files)).toEqual(['assets/index.json', 'main.spx'])
  })

  it('uses a minimal local project when no template is configured', async () => {
    await createDefaultProject('alice', 'new-project', null)

    expect(getProjectRelease).not.toHaveBeenCalled()
    expect(addProject).not.toHaveBeenCalled()
    expect(cloudHelpers.save).toHaveBeenCalledOnce()
  })

  it('does not fall back after the template content has been loaded', async () => {
    vi.mocked(getProjectRelease).mockResolvedValue(templateRelease)
    vi.mocked(addProject).mockRejectedValue(new Error('create failed'))

    await expect(
      createDefaultProject('alice', 'new-project', 'curator/default-project-template/v1.0.0')
    ).rejects.toThrow('create failed')
    expect(cloudHelpers.save).not.toHaveBeenCalled()
  })
})
