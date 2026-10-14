import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, shallowRef } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import {
  makeChildScopedRouter,
  repeatableParamToPathSegments,
  useScopedRouterWithPathParam,
  type IScopedRouter
} from './route'

describe('repeatableParamToPathSegments', () => {
  it('treats an empty repeatable param as no segments', () => {
    expect(repeatableParamToPathSegments('')).toEqual([])
  })

  it('preserves decoded segments without splitting them again', () => {
    expect(repeatableParamToPathSegments('A/B')).toEqual(['A/B'])
    expect(repeatableParamToPathSegments(['sprites', 'A/B', 'code'])).toEqual(['sprites', 'A/B', 'code'])
  })
})

describe('makeChildScopedRouter', () => {
  it('only navigates within an active prefix, including nested scopes', async () => {
    const currentPath = shallowRef(['editor', 'project', 'stage'])
    const push = vi.fn(async (path: string[]) => {
      currentPath.value = path
    })
    const editor = makeChildScopedRouter({ currentPath, push }, ['editor'])
    const project = makeChildScopedRouter(editor, ['project'])
    expect(project.currentPath.value).toEqual(['stage'])
    await project.push(['sprites', 'A/B', 'code'], { replace: true })
    expect(push).toHaveBeenLastCalledWith(['editor', 'project', 'sprites', 'A/B', 'code'], { replace: true })
    currentPath.value = ['preview', 'stage']
    expect(project.currentPath.value).toEqual([])
    push.mockClear()
    await project.push(['stage'])
    expect(push).not.toHaveBeenCalled()
    currentPath.value = ['editor', 'program']
    await project.push(['stage'])
    expect(push).not.toHaveBeenCalled()
  })

  it('recognizes a bare prefix and rejects shorter or partial matches', async () => {
    const currentPath = shallowRef(['editor', 'project'])
    const push = vi.fn(async () => {})
    const router = makeChildScopedRouter({ currentPath, push }, ['editor', 'project'])
    await router.push(['stage'])
    expect(push).toHaveBeenCalledWith(['editor', 'project', 'stage'], undefined)
    push.mockClear()
    for (const path of [[], ['editor'], ['editor', 'project-other']]) {
      currentPath.value = path
      await router.push(['stage'])
    }
    expect(push).not.toHaveBeenCalled()
  })
})

describe('host-provided scoped navigation', () => {
  it.each([
    { path: '/course/:series/:course/playground/:tail*', initial: '/course/s/c/playground/stage', prefix: [] },
    { path: '/course-editor/:series/:course/:tail*', initial: '/course-editor/s/c/preview/stage', prefix: ['preview'] }
  ])('preserves host state and browser history in $initial', async ({ path, initial, prefix }) => {
    let navigation!: IScopedRouter
    const Host = defineComponent(() => {
      navigation = makeChildScopedRouter(useScopedRouterWithPathParam('tail'), prefix)
      return () => null
    })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path, component: Host }] })
    await router.push(initial + '?from=list#anchor')
    const wrapper = mount(RouterView, { global: { plugins: [router] } })
    await flushPromises()
    expect(navigation.currentPath.value).toEqual(['stage'])
    await navigation.push(['sprites', 'A/B', 'code'])
    expect(router.currentRoute.value.params).toEqual({
      series: 's',
      course: 'c',
      tail: [...prefix, 'sprites', 'A/B', 'code']
    })
    expect(router.currentRoute.value.query).toEqual({ from: 'list' })
    expect(router.currentRoute.value.hash).toBe('#anchor')
    await navigation.push(['map', 'sprites', 'Bird'], { replace: true })
    router.back()
    await flushPromises()
    expect(navigation.currentPath.value).toEqual(['stage'])
    router.forward()
    await flushPromises()
    expect(navigation.currentPath.value).toEqual(['map', 'sprites', 'Bird'])
    expect(router.currentRoute.value.query).toEqual({ from: 'list' })
    expect(router.currentRoute.value.hash).toBe('#anchor')
    wrapper.unmount()
  })
})
