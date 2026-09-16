import { createApp, defineComponent, ref, nextTick } from 'vue'
import { describe, it, expect } from 'vitest'
import { createRadar, RadarSelectorSyntaxError, type RadarNodeMeta } from './index'

describe('Radar', () => {
  function createTestEnvironment() {
    const radar = createRadar()
    const container = document.createElement('div')
    document.body.appendChild(container)
    return { radar, container }
  }

  function mountComponent(component: any, radar: ReturnType<typeof createRadar>, container: HTMLElement) {
    const app = createApp(component)
    radar.install(app)
    app.mount(container)
    return app
  }

  it('should correctly collect a tree of radar nodes from DOM structure', async () => {
    const { radar, container } = createTestEnvironment()

    const TestComponent = defineComponent({
      template: `
        <div>
          <div 
            id="root1"
            v-radar="{ name: 'root-one', desc: 'First root node' }"
          >
            <div 
              id="child1"
              v-radar="{ name: 'child-one', desc: 'First child of root 1' }"
            ></div>
            <div 
              id="child2"
              v-radar="{ name: 'child-two', desc: 'Second child of root 1' }"
            ></div>
          </div>
          <div 
            id="root2"
            v-radar="{ name: 'root-two', desc: 'Second root node' }"
          >
            <div 
              id="child3"
              v-radar="{ name: 'child-three', desc: 'Child of root 2' }"
            ></div>
          </div>
        </div>
      `
    })

    mountComponent(TestComponent, radar, container)

    await nextTick()

    const rootNodes = radar.getRootNodes()
    expect(rootNodes).toHaveLength(2)

    const root1Node = rootNodes.find((node) => node.name === 'root-one')
    expect(root1Node).toBeDefined()
    expect(root1Node!.name).toBe('root-one')
    expect(root1Node!.desc).toBe('First root node')
    expect(root1Node!.getElement().id).toBe('root1')
    expect(root1Node!.getChildren()).toHaveLength(2)

    const child1Node = root1Node!.getChildren().find((node) => node.name === 'child-one')
    const child2Node = root1Node!.getChildren().find((node) => node.name === 'child-two')
    expect(child1Node).toBeDefined()
    expect(child2Node).toBeDefined()
    expect(child1Node!.getElement().id).toBe('child1')
    expect(child2Node!.getElement().id).toBe('child2')
    expect(child1Node!.getChildren()).toHaveLength(0)
    expect(child2Node!.getChildren()).toHaveLength(0)

    const root2Node = rootNodes.find((node) => node.name === 'root-two')
    expect(root2Node).toBeDefined()
    expect(root2Node!.name).toBe('root-two')
    expect(root2Node!.desc).toBe('Second root node')
    expect(root2Node!.getElement().id).toBe('root2')
    expect(root2Node!.getChildren()).toHaveLength(1)

    const child3Node = root2Node!.getChildren()[0]
    expect(child3Node.name).toBe('child-three')
    expect(child3Node.desc).toBe('Child of root 2')
    expect(child3Node.getElement().id).toBe('child3')
    expect(child3Node.getChildren()).toHaveLength(0)
  })

  it('should find nodes by ID', async () => {
    const { radar, container } = createTestEnvironment()

    const TestComponent = defineComponent({
      template: `
        <div v-radar="{ name: 'test-node', desc: 'A test node' }"></div>
      `
    })

    mountComponent(TestComponent, radar, container)

    await nextTick()

    const rootNodes = radar.getRootNodes()
    const testNode = rootNodes[0]

    const foundNode = radar.getNodeById(testNode.id)
    expect(foundNode).toBe(testNode)
    expect(foundNode!.name).toBe('test-node')

    const notFoundNode = radar.getNodeById('non-existent-id')
    expect(notFoundNode).toBeNull()
  })

  it('should handle node updates correctly', async () => {
    const { radar, container } = createTestEnvironment()

    const nodeData = ref<RadarNodeMeta>({
      name: 'original-name',
      desc: 'Original description'
    })

    const TestComponent = defineComponent({
      setup() {
        return { nodeData }
      },
      template: `
        <div v-radar="nodeData"></div>
      `
    })

    mountComponent(TestComponent, radar, container)

    await nextTick()

    const rootNodes = radar.getRootNodes()
    expect(rootNodes).toHaveLength(1)
    expect(rootNodes[0].name).toBe('original-name')
    expect(rootNodes[0].desc).toBe('Original description')
    const originalId = rootNodes[0].id

    nodeData.value = {
      name: 'updated-name',
      desc: 'Updated description'
    }

    await nextTick()

    const updatedRootNodes = radar.getRootNodes()
    expect(updatedRootNodes).toHaveLength(1)
    expect(updatedRootNodes[0].name).toBe('updated-name')
    expect(updatedRootNodes[0].desc).toBe('Updated description')
    expect(updatedRootNodes[0].id).toBe(originalId)
  })

  it('should handle node unregistration correctly', async () => {
    const { radar, container } = createTestEnvironment()

    const showNode = ref(true)

    const TestComponent = defineComponent({
      setup() {
        return { showNode }
      },
      template: `
        <div v-if="showNode" v-radar="{ name: 'test-node', desc: 'A test node' }"></div>
      `
    })

    mountComponent(TestComponent, radar, container)

    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(1)

    showNode.value = false

    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(0)
  })

  it('should handle nested unregistration correctly', async () => {
    const { radar, container } = createTestEnvironment()

    const showChild = ref(true)
    const showParent = ref(true)

    const TestComponent = defineComponent({
      setup() {
        return { showChild, showParent }
      },
      template: `
        <div v-if="showParent" v-radar="{ name: 'parent', desc: 'Parent node' }">
          <div v-if="showChild" v-radar="{ name: 'child', desc: 'Child node' }"></div>
        </div>
      `
    })

    mountComponent(TestComponent, radar, container)

    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(1)
    expect(radar.getRootNodes()[0].getChildren()).toHaveLength(1)

    showChild.value = false

    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(1)
    expect(radar.getRootNodes()[0].getChildren()).toHaveLength(0)

    showParent.value = false

    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(0)
  })

  it('should handle complex nested unregistration with dynamic updates', async () => {
    const { radar, container } = createTestEnvironment()

    const showLevel1 = ref(true)
    const showLevel2a = ref(true)
    const showLevel2b = ref(true)
    const showLevel3a = ref(true)
    const showLevel3b = ref(true)
    const showLevel3c = ref(true)
    const level2aName = ref('level-two-a')
    const level3bDesc = ref('Third level node B')

    const TestComponent = defineComponent({
      setup() {
        return {
          showLevel1,
          showLevel2a,
          showLevel2b,
          showLevel3a,
          showLevel3b,
          showLevel3c,
          level2aName,
          level3bDesc
        }
      },
      template: `
        <div v-if="showLevel1" v-radar="{ name: 'level-one', desc: 'Root level node' }">
          <div v-if="showLevel2a" v-radar="{ name: level2aName, desc: 'Second level node A' }">
            <div v-if="showLevel3a" v-radar="{ name: 'level-three-a', desc: 'Third level node A' }"></div>
            <div v-if="showLevel3b" v-radar="{ name: 'level-three-b', desc: level3bDesc }"></div>
          </div>
          <div v-if="showLevel2b" v-radar="{ name: 'level-two-b', desc: 'Second level node B' }">
            <div v-if="showLevel3c" v-radar="{ name: 'level-three-c', desc: 'Third level node C' }"></div>
          </div>
        </div>
      `
    })

    mountComponent(TestComponent, radar, container)
    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(1)
    const rootNode = radar.getRootNodes()[0]
    expect(rootNode.name).toBe('level-one')
    expect(rootNode.getChildren()).toHaveLength(2)

    const level2aNode = rootNode.getChildren().find((node) => node.name === 'level-two-a')
    const level2bNode = rootNode.getChildren().find((node) => node.name === 'level-two-b')
    expect(level2aNode).toBeDefined()
    expect(level2bNode).toBeDefined()
    expect(level2aNode!.getChildren()).toHaveLength(2)
    expect(level2bNode!.getChildren()).toHaveLength(1)

    level2aName.value = 'updated-level-two-a'
    level3bDesc.value = 'Updated third level node B'
    await nextTick()

    const updatedLevel2aNode = rootNode.getChildren().find((node) => node.name === 'updated-level-two-a')
    expect(updatedLevel2aNode).toBeDefined()
    expect(updatedLevel2aNode!.getChildren()[1].desc).toBe('Updated third level node B')

    showLevel3a.value = false
    await nextTick()

    expect(rootNode.getChildren()).toHaveLength(2)
    expect(updatedLevel2aNode!.getChildren()).toHaveLength(1)
    expect(updatedLevel2aNode!.getChildren()[0].name).toBe('level-three-b')

    showLevel2b.value = false
    await nextTick()

    expect(rootNode.getChildren()).toHaveLength(1)
    expect(rootNode.getChildren()[0].name).toBe('updated-level-two-a')

    showLevel3b.value = false
    await nextTick()

    expect(rootNode.getChildren()).toHaveLength(1)
    expect(rootNode.getChildren()[0].getChildren()).toHaveLength(0)

    showLevel2a.value = false
    await nextTick()

    expect(rootNode.getChildren()).toHaveLength(0)

    showLevel1.value = false
    await nextTick()

    expect(radar.getRootNodes()).toHaveLength(0)
  })

  it('should handle node visibility correctly', async () => {
    const { radar, container } = createTestEnvironment()

    const TestComponent = defineComponent({
      template: `
        <div v-radar="{ name: 'parent', desc: 'Parent node' }">
          <div id="visible-child" v-radar="{ name: 'visible-child', desc: 'Visible child node', visible: true }"></div>
          <div id="invisible-child" v-radar="{ name: 'invisible-child', desc: 'Invisible child node', visible: false }"></div>
        </div>
      `
    })

    mountComponent(TestComponent, radar, container)
    await nextTick()

    const rootNodes = radar.getRootNodes()
    expect(rootNodes).toHaveLength(1)
    const parentNode = rootNodes[0]

    // By default, getChildren() filters out invisible nodes
    const visibleChildren = parentNode.getChildren()
    expect(visibleChildren).toHaveLength(1)
    expect(visibleChildren[0].name).toBe('visible-child')
    expect(visibleChildren[0].visible).toBe(true)

    // When includeInvisible is true, all children should be returned
    const allChildren = parentNode.getChildren(true)
    expect(allChildren).toHaveLength(2)

    const visibleChild = allChildren.find((node) => node.name === 'visible-child')
    const invisibleChild = allChildren.find((node) => node.name === 'invisible-child')

    expect(visibleChild).toBeDefined()
    expect(invisibleChild).toBeDefined()
    expect(visibleChild!.visible).toBe(true)
    expect(invisibleChild!.visible).toBe(false)

    // Check that aria attributes are properly set based on visibility
    expect(visibleChild!.getElement().getAttribute('aria-hidden')).toBe('false')
    expect(invisibleChild!.getElement().getAttribute('aria-hidden')).toBe('true')
  })

  it('should update node visibility when the prop changes', async () => {
    const { radar, container } = createTestEnvironment()

    const nodeVisibility = ref(true)

    const TestComponent = defineComponent({
      setup() {
        return { nodeVisibility }
      },
      template: `
        <div v-radar="{ name: 'test-node', desc: 'A test node', visible: nodeVisibility }"></div>
      `
    })

    mountComponent(TestComponent, radar, container)
    await nextTick()

    const rootNodes = radar.getRootNodes()
    expect(rootNodes).toHaveLength(1)
    expect(rootNodes[0].visible).toBe(true)
    expect(rootNodes[0].getElement().getAttribute('aria-hidden')).toBe('false')

    // Change visibility to false
    nodeVisibility.value = false
    await nextTick()

    // Node should still exist but be invisible
    const updatedRootNodes = radar.getRootNodes()
    expect(updatedRootNodes).toHaveLength(0) // Should not be included in visible nodes

    // We can still get the node by its ID
    const nodeId = rootNodes[0].id
    const invisibleNode = radar.getNodeById(nodeId)
    expect(invisibleNode).not.toBeNull()
    expect(invisibleNode!.visible).toBe(false)
    expect(invisibleNode!.getElement().getAttribute('aria-hidden')).toBe('true')
  })

  it('selects visible descendants by name and attributes in document order', async () => {
    const { radar, container } = createTestEnvironment()

    const TestComponent = defineComponent({
      template: `
        <section v-radar="{ name: 'api-references', desc: '' }">
          <div
            id="first"
            v-radar="{ name: 'api-reference', desc: '', attrs: { name: 'Sprite.stepTo', 'overload-id': '0' } }"
          ></div>
          <div v-radar="{ name: 'category', desc: '' }">
            <div
              id="second"
              v-radar="{ name: 'api-reference', desc: '', attrs: { name: 'Sprite.stepTo', 'overload-id': '1' } }"
            ></div>
          </div>
          <div
            id="hidden"
            v-radar="{ name: 'api-reference', desc: '', attrs: { name: 'Sprite.stepTo', 'overload-id': '2' }, visible: false }"
          ></div>
        </section>
      `
    })

    mountComponent(TestComponent, radar, container)
    await nextTick()

    expect(radar.selectAll('api-reference[name="Sprite.stepTo"]').map((node) => node.getElement().id)).toEqual([
      'first',
      'second'
    ])
    expect(
      radar
        .selectAll('api-references api-reference[name="Sprite.stepTo"][overload-id="1"]')
        .map((node) => node.getElement().id)
    ).toEqual(['second'])
    expect(radar.select('api-reference[name="Sprite.stepTo"]')?.getElement().id).toBe('first')
    expect(radar.select('api-references api-reference[overload-id="1"]')?.getElement().id).toBe('second')
    expect(radar.select('api-reference[overload-id="2"]')).toBeNull()
  })

  it('updates labels and normalized attributes with metadata changes', async () => {
    const { radar, container } = createTestEnvironment()
    const nodeData = ref({
      name: 'sound-item',
      desc: '',
      attrs: { name: 'meow', unused: null, ignored: undefined }
    })

    const TestComponent = defineComponent({
      setup() {
        return { nodeData }
      },
      template: '<div v-radar="nodeData"></div>'
    })

    mountComponent(TestComponent, radar, container)
    await nextTick()

    const node = radar.selectAll('sound-item[name="meow"]')[0]
    expect(node.label).toBe('Sound item "meow"')
    expect(node.attrs).toEqual({ name: 'meow' })

    nodeData.value = {
      name: 'sound-item',
      desc: '',
      attrs: { name: 'woof', unused: null, ignored: undefined }
    }
    await nextTick()

    expect(radar.selectAll('sound-item[name="meow"]')).toHaveLength(0)
    expect(radar.selectAll('sound-item[name="woof"]')[0].label).toBe('Sound item "woof"')
  })

  it('uses an explicit label when supplied', async () => {
    const { radar, container } = createTestEnvironment()

    const TestComponent = defineComponent({
      template: "<div v-radar=\"{ name: 'api-references', label: 'API References', desc: '' }\"></div>"
    })

    mountComponent(TestComponent, radar, container)
    await nextTick()

    expect(radar.selectAll('api-references')[0].label).toBe('API References')
  })

  it('rejects malformed selectors', () => {
    const radar = createRadar()

    expect(() => radar.selectAll('')).toThrow(RadarSelectorSyntaxError)
    expect(() => radar.selectAll('api-reference > button')).toThrow(RadarSelectorSyntaxError)
    expect(() => radar.selectAll('api-reference[name=Sprite.stepTo]')).toThrow(RadarSelectorSyntaxError)
    expect(() => radar.selectAll('api-reference[overload-id="1"')).toThrow(RadarSelectorSyntaxError)
    expect(() => radar.select('api-reference > button')).toThrow(RadarSelectorSyntaxError)
  })
})
