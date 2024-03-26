import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectRunner from './ProjectRunner.vue'

test('project runner', () => {
  // TODO: need to mock `project`
  const component = mount(ProjectRunner, {})
  expect(component.html()).toMatchSnapshot()
})
