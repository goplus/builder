import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { renderToString } from '@vue/test-utils'
import { useSlotText } from '@/utils/vnode'
import MarkdowView, {
  preprocessCustomRawComponents,
  preprocessSelfClosingCustomComponents,
  preprocessIncompleteTags
} from './MarkdownView'

describe('preprocessCustomRawComponents', () => {
  it('should convert custom raw components to <pre> tags', () => {
    const value = '<custom-raw-component>Content</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component">Content</pre>')
  })
  it('should handle multiple custom raw components', () => {
    const value = '<custom-raw-1>Content 1</custom-raw-1><custom-raw-2>Content 2</custom-raw-2>'
    const tagNames = ['custom-raw-1', 'custom-raw-2']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-1">Content 1</pre><pre is="custom-raw-2">Content 2</pre>')
  })
  it('should not modify content without custom raw components', () => {
    const value = '<div>Normal content</div>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<div>Normal content</div>')
  })
  it('should handle empty value', () => {
    const value = ''
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('')
  })
  it('should handle no tag names', () => {
    const value = '<custom-raw-component>Content</custom-raw-component>'
    const tagNames: string[] = []
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<custom-raw-component>Content</custom-raw-component>')
  })
  it('should handle tags with attributes', () => {
    const value = '<custom-raw-component attr="value">Content</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component" attr="value">Content</pre>')
  })
  it('should handle self-closing tags', () => {
    const value = '<custom-raw-component />'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component" />')
  })
  it('should handle nested custom raw components', () => {
    const value = '<custom-raw-component><nested-component>Content</nested-component></custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component"><nested-component>Content</nested-component></pre>')
  })
  it('should handle multiple occurrences of the same tag', () => {
    const value =
      '<custom-raw-component>Content 1</custom-raw-component><custom-raw-component>Content 2</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component">Content 1</pre><pre is="custom-raw-component">Content 2</pre>')
  })
  it('should handle mixed content with custom raw components', () => {
    const value = '<div>Normal content</div><custom-raw-component>Content</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<div>Normal content</div><pre is="custom-raw-component">Content</pre>')
  })
  it('should handle custom raw components with special characters', () => {
    const value = '<custom-raw-component>Content with special characters: !@#$%^&*()</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component">Content with special characters: !@#$%^&*()</pre>')
  })
  it('should handle custom raw components with empty content', () => {
    const value = '<custom-raw-component></custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component"></pre>')
  })
  it('should handle custom raw components with more than one attributes', () => {
    const value = '<custom-raw-component attr1="value1" attr2="value2">Content</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component" attr1="value1" attr2="value2">Content</pre>')
  })
  it('should handle custom raw components with attributes mixed with more than one spaces', () => {
    const value = '<custom-raw-component  attr1="value1"   attr2="value2">Content</custom-raw-component>'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component"  attr1="value1"   attr2="value2">Content</pre>')
  })
  it('should handle custom raw components with attributes and self-closing tag', () => {
    const value = '<custom-raw-component attr1="value1" attr2="value2" />'
    const tagNames = ['custom-raw-component']
    const result = preprocessCustomRawComponents(value, tagNames)
    expect(result).toBe('<pre is="custom-raw-component" attr1="value1" attr2="value2" />')
  })
})

describe('preprocessSelfClosingCustomComponents', () => {
  it('should convert self-closing custom components to normal tags', () => {
    const value = '<custom-self-closing-component />'
    const tagNames = ['custom-self-closing-component']
    const result = preprocessSelfClosingCustomComponents(value, tagNames)
    expect(result).toBe('<custom-self-closing-component></custom-self-closing-component>')
  })
  it('should handle multiple self-closing custom components', () => {
    const value = '<custom-self-closing-1 /><custom-self-closing-2 />'
    const tagNames = ['custom-self-closing-1', 'custom-self-closing-2']
    const result = preprocessSelfClosingCustomComponents(value, tagNames)
    expect(result).toBe(
      '<custom-self-closing-1></custom-self-closing-1><custom-self-closing-2></custom-self-closing-2>'
    )
  })
  it('should not modify content without self-closing custom components', () => {
    const value = '<div>Normal content</div>'
    const tagNames = ['custom-self-closing-component']
    const result = preprocessSelfClosingCustomComponents(value, tagNames)
    expect(result).toBe('<div>Normal content</div>')
  })
  it('should handle empty value', () => {
    const value = ''
    const tagNames = ['custom-self-closing-component']
    const result = preprocessSelfClosingCustomComponents(value, tagNames)
    expect(result).toBe('')
  })
  it('should handle no tag names', () => {
    const value = '<custom-self-closing-component />'
    const tagNames: string[] = []
    const result = preprocessSelfClosingCustomComponents(value, tagNames)
    expect(result).toBe('<custom-self-closing-component />')
  })
  it('should handle tags with attributes', () => {
    const value = '<custom-self-closing-component attr="value" />'
    const tagNames = ['custom-self-closing-component']
    const result = preprocessSelfClosingCustomComponents(value, tagNames)
    expect(result).toBe('<custom-self-closing-component attr="value"></custom-self-closing-component>')
  })
})

describe('preprocessIncompleteTags', () => {
  it('should remove the last incomplete tag', () => {
    const value = 'Before<custom-incomplete-component>Content'
    const tagNames = ['custom-incomplete-component']
    const result = preprocessIncompleteTags(value, tagNames)
    expect(result).toBe('Before')
  })
  it('should remove the last incomplete tag 2', () => {
    const value = 'Before<custom-incomplete-'
    const tagNames = ['custom-incomplete-component']
    const result = preprocessIncompleteTags(value, tagNames)
    expect(result).toBe('Before')
  })
  it('should handle multiple incomplete tags', () => {
    const value = 'Before<custom-incomplete-1>Content 1<custom-incomplete-2>Content 2'
    const tagNames = ['custom-incomplete-1', 'custom-incomplete-2']
    const result = preprocessIncompleteTags(value, tagNames)
    expect(result).toBe('Before')
  })
  it('should not modify content without incomplete tags', () => {
    const value = '<div>Normal content</div>'
    const tagNames = ['custom-incomplete-component']
    const result = preprocessIncompleteTags(value, tagNames)
    expect(result).toBe('<div>Normal content</div>')
  })
  it('should handle empty value', () => {
    const value = ''
    const tagNames = ['custom-incomplete-component']
    const result = preprocessIncompleteTags(value, tagNames)
    expect(result).toBe('')
  })
  it('should handle no tag names', () => {
    const value = '<custom-incomplete-component>Content'
    const tagNames: string[] = []
    const result = preprocessIncompleteTags(value, tagNames)
    expect(result).toBe('<custom-incomplete-component>Content')
  })
})

describe('MarkdownView', () => {
  it('should render correctly', async () => {
    const result = await renderToString(MarkdowView, {
      props: {
        value: '# Hello World'
      }
    })
    expect(result).toBe('<div><h1>Hello World</h1></div>')
  })
  it('should handle custom components', async () => {
    const testComp1 = {
      template: '<div class="test-comp-1">{{content}}</div>',
      props: ['content']
    }
    const result = await renderToString(MarkdowView, {
      props: {
        value: 'Before<test-comp-1 content="Hello" />After',
        components: {
          custom: {
            'test-comp-1': testComp1
          }
        }
      }
    })
    expect(result).toBe('<div><p>Before<div class="test-comp-1">Hello</div>After</p></div>')
  })
  it('should handle custom components with children', async () => {
    const testComp1 = {
      template: '<div class="test-comp-1"><slot /></div>'
    }
    const result = await renderToString(MarkdowView, {
      props: {
        value: 'Before<test-comp-1>Content</test-comp-1>After',
        components: {
          custom: {
            'test-comp-1': testComp1
          }
        }
      }
    })
    expect(result).toBe('<div><p>Before<div class="test-comp-1"><!--[-->Content<!--]--></div>After</p></div>')
  })
  it('should handle custom raw components', async () => {
    const customRawComponent = defineComponent(
      () => {
        const innerText = useSlotText()
        return function render() {
          return h('div', { class: 'test-comp-1' }, [innerText.value])
        }
      },
      {
        props: []
      }
    )
    const result = await renderToString(MarkdowView, {
      props: {
        value: `
Before

<custom-raw-component>
Content1

  Content2
</custom-raw-component>

After`,
        components: {
          customRaw: {
            'custom-raw-component': customRawComponent
          }
        }
      }
    })
    expect(result).toBe(`<div><p>Before</p>
<div class="test-comp-1">Content1

  Content2
</div>
<p>After</p></div>`)
  })
})
