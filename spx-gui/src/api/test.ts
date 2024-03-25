import { IsPublic } from './common';
import * as assetApis from './asset'
import * as projectApis from './project'

;(window as any).assetApis = assetApis
;(window as any).projectApis = projectApis

function is<T>(src: T, target: T) {
  if (src !== target) throw new Error('not equal')
}

;(window as any).testAsset = async function testAsset() {
  {
    const { data: assets } = await assetApis.listAsset({ pageSize: 100 })
    for (const p of assets) {
      await assetApis.deleteAsset(p.id)
    }
  }
  {
    const res = await assetApis.listAsset()
    is(res.total, 0)
    is(res.data.length, 0)
  }
  {
    const res = await assetApis.listAsset({ owner: "*" })
    is(res.total, 0)
    is(res.data.length, 0)
  }
  {
    const res = await assetApis.listAsset({ owner: "xxx" })
    is(res.total, 0)
    is(res.data.length, 0)
  }
  {
    const p = await assetApis.addAsset({
      displayName: 't1',
      isPublic: IsPublic.public,
      files: { a: 'aaa' },
      assetType: assetApis.AssetType.Sprite,
      category: 'test',
      preview: 'a'
    })
    is(p.displayName, 't1')
    is(p.isPublic, IsPublic.public)
    is(p.files.a, 'aaa')
    is(p.assetType, assetApis.AssetType.Sprite)
    is(p.category, 'test')
    is(p.preview, 'a')
    is(p.clickCount, 0)
  }
  let t2: assetApis.AssetData
  {
    const p = t2 = await assetApis.addAsset({
      displayName: 't2',
      isPublic: IsPublic.personal,
      files: { a: 'aaa', b: 'bbb' },
      assetType: assetApis.AssetType.Backdrop,
      category: 'test',
      preview: 'b'
    })
    is(p.displayName, 't2')
    is(p.isPublic, IsPublic.personal)
    is(p.files.a, 'aaa')
    is(p.files.b, 'bbb')
    is(p.assetType, assetApis.AssetType.Backdrop)
    is(p.category, 'test')
    is(p.preview, 'b')
    is(p.clickCount, 0)
  }
  {
    const p = await assetApis.addAsset({
      displayName: 't3',
      isPublic: IsPublic.public,
      files: {},
      assetType: assetApis.AssetType.Sound,
      category: 'test',
      preview: 'c'
    })
    is(p.displayName, 't3')
    is(p.isPublic, IsPublic.public)
    is(JSON.stringify(p.files), '{}')
    is(p.assetType, assetApis.AssetType.Sound)
    is(p.category, 'test')
    is(p.preview, 'c')
    is(p.clickCount, 0)
  }
  {
    const p = await assetApis.addAsset({
      displayName: 't4',
      isPublic: IsPublic.personal,
      files: {},
      assetType: assetApis.AssetType.Sound,
      category: 'test-2',
      preview: 'd'
    })
    is(p.displayName, 't4')
    is(p.isPublic, IsPublic.personal)
    is(JSON.stringify(p.files), '{}')
    is(p.assetType, assetApis.AssetType.Sound)
    is(p.category, 'test-2')
    is(p.preview, 'd')
    is(p.clickCount, 0)
  }
  {
    const { total, data } = await assetApis.listAsset()
    is(total, 4)
    is(data.length, 4)
    is(data.map(p => p.displayName).join(','), 't1,t2,t3,t4')
  }
  {
    const { total, data } = await assetApis.listAsset({ pageSize: 2 })
    is(total, 4)
    is(data.length, 2)
    is(data.map(p => p.displayName).join(','), 't1,t2')
  }
  {
    const { total, data } = await assetApis.listAsset({ pageIndex: 2, pageSize: 10 })
    is(total, 4)
    is(data.length, 0)
  }
  {
    const { total, data } = await assetApis.listAsset({ pageIndex: 2, pageSize: 2 })
    is(total, 4)
    is(data.length, 2)
    is(data.map(p => p.displayName).join(','), 't3,t4')
  }
  {
    const p = await assetApis.updateAsset(t2.id, {
      ...t2,
      isPublic: IsPublic.public,
      files: {}
    })
    is(p.displayName, 't2')
    is(p.isPublic, IsPublic.public)
    is(JSON.stringify(p.files), '{}')
  }
  {
    const { total, data } = await assetApis.listAsset({ isPublic: IsPublic.public })
    is(total, 3)
    is(data.length, 3)
    is(data.map(p => p.displayName).join(','), 't1,t2,t3')
  }
  {
    const { total, data } = await assetApis.listAsset({ owner: '*' })
    is(total, 3)
    is(data.length, 3)
    is(data.map(p => p.displayName).join(','), 't1,t2,t3')
  }
  {
    await assetApis.increaseAssetClickCount(t2.id)
    t2 = await assetApis.getAsset(t2.id)
    is(t2.clickCount, 1)
  }
}

;(window as any).testProject = async function testProject() {
  {
    const { data: projects } = await projectApis.listProject({ pageSize: 100 })
    for (const p of projects) {
      await projectApis.deleteProject(p.owner, p.name)
    }
  }
  {
    const res = await projectApis.listProject()
    is(res.total, 0)
    is(res.data.length, 0)
  }
  {
    const res = await projectApis.listProject({ owner: "*" })
    is(res.total, 0)
    is(res.data.length, 0)
  }
  {
    const res = await projectApis.listProject({ owner: "xxx" })
    is(res.total, 0)
    is(res.data.length, 0)
  }
  {
    const p = await projectApis.addProject({ name: 't1', isPublic: IsPublic.public, files: { a: 'aaa' } })
    is(p.name, 't1')
    is(p.isPublic, IsPublic.public)
    is(p.files.a, 'aaa')
    is(p.version, 1)
  }
  {
    const p = await projectApis.addProject({ name: 't2', isPublic: IsPublic.personal, files: { a: 'aaa', b: 'bbb' } })
    is(p.name, 't2')
    is(p.isPublic, IsPublic.personal)
    is(p.files.a, 'aaa')
    is(p.files.b, 'bbb')
    is(p.version, 1)
  }
  {
    const p = await projectApis.addProject({ name: 't3', isPublic: IsPublic.public, files: { a: 'aaa', b: 'bbb', c: 'ccc' } })
    is(p.name, 't3')
    is(p.isPublic, IsPublic.public)
    is(p.files.a, 'aaa')
    is(p.files.b, 'bbb')
    is(p.files.c, 'ccc')
    is(p.version, 1)
  }
  {
    const p = await projectApis.addProject({ name: 't4', isPublic: IsPublic.personal, files: {} })
    is(p.name, 't4')
    is(p.isPublic, IsPublic.personal)
    is(JSON.stringify(p.files), '{}')
    is(p.version, 1)
  }
  {
    const { total, data } = await projectApis.listProject()
    is(total, 4)
    is(data.length, 4)
    is(data.map(p => p.name).join(','), 't1,t2,t3,t4')
  }
  {
    const { total, data } = await projectApis.listProject({ pageSize: 2 })
    is(total, 4)
    is(data.length, 2)
    is(data.map(p => p.name).join(','), 't1,t2')
  }
  {
    const { total, data } = await projectApis.listProject({ pageIndex: 2, pageSize: 10 })
    is(total, 4)
    is(data.length, 0)
  }
  {
    const { total, data } = await projectApis.listProject({ pageIndex: 2, pageSize: 2 })
    is(total, 4)
    is(data.length, 2)
    is(data.map(p => p.name).join(','), 't3,t4')
  }
  {
    const p = await projectApis.updateProject('nighca', 't2', {
      isPublic: IsPublic.public,
      files: {}
    })
    is(p.name, 't2')
    is(p.version, 2)
    is(p.isPublic, IsPublic.public)
    is(JSON.stringify(p.files), '{}')
  }
  {
    const { total, data } = await projectApis.listProject({ isPublic: IsPublic.public })
    is(total, 3)
    is(data.length, 3)
    is(data.map(p => p.name).join(','), 't1,t2,t3')
  }
  {
    const { total, data } = await projectApis.listProject({ owner: '*' })
    is(total, 3)
    is(data.length, 3)
    is(data.map(p => p.name).join(','), 't1,t2,t3')
  }
}