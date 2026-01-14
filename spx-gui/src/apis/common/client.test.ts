import { describe, it, expect, vi } from 'vitest'
import { Client } from './client'

describe('requestSSE', () => {
  /**
   * Helper to create a mock client with a mocked requestTextStream
   */
  function createMockClient(chunks: string[]) {
    const client = new Client()
    // Mock the private requestTextStream method
    vi.spyOn(client as any, 'requestTextStream').mockImplementation(async function* () {
      for (const chunk of chunks) {
        yield chunk
      }
    })
    return client
  }

  /**
   * Helper to collect all events from the SSE stream
   */
  async function collectEvents(client: Client, path: string) {
    const events = []
    const stream = (client as any).requestSSE(path, null)
    for await (const event of stream) {
      events.push(event)
    }
    return events
  }

  describe('line ending handling', () => {
    it('should handle \\n line endings', async () => {
      const client = createMockClient(['data: hello\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle \\r\\n line endings', async () => {
      const client = createMockClient(['data: hello\r\n\r\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle mixed line endings', async () => {
      const client = createMockClient(['data: line1\r\ndata: line2\n\r\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'line1\nline2' }])
    })
  })

  describe('multiple data lines', () => {
    it('should concatenate multiple data lines with newlines', async () => {
      const client = createMockClient(['data: line1\ndata: line2\ndata: line3\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'line1\nline2\nline3' }])
    })

    it('should handle JSON split across multiple data lines', async () => {
      const client = createMockClient(['data: {"key":\n', 'data: "value"}\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: '{"key":\n"value"}' }])
    })

    it('should handle multiple data lines with \\r\\n endings', async () => {
      const client = createMockClient(['data: line1\r\ndata: line2\r\n\r\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'line1\nline2' }])
    })
  })

  describe('event dispatching', () => {
    it('should dispatch event only on empty line', async () => {
      const client = createMockClient(['data: first\ndata: second\n\ndata: third\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([
        { type: 'message', data: 'first\nsecond' },
        { type: 'message', data: 'third' }
      ])
    })

    it('should handle custom event types', async () => {
      const client = createMockClient(['event: custom\ndata: payload\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'custom', data: 'payload' }])
    })

    it('should reset event type to "message" after dispatch', async () => {
      const client = createMockClient(['event: custom\ndata: first\n\nevent: message\ndata: second\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([
        { type: 'custom', data: 'first' },
        { type: 'message', data: 'second' }
      ])
    })

    it('should not dispatch event if no data lines', async () => {
      const client = createMockClient(['event: custom\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([])
    })

    it('should handle event type without following data', async () => {
      // When event type is set but no data follows before empty line,
      // the event type persists to the next data
      const client = createMockClient(['event: custom\n\ndata: test\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'custom', data: 'test' }])
    })
  })

  describe('streaming and buffering', () => {
    it('should handle data split across multiple chunks', async () => {
      const client = createMockClient(['data: hel', 'lo\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle line break split across chunks', async () => {
      const client = createMockClient(['data: hello\r', '\ndata: world\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'hello\nworld' }])
    })

    it('should handle multiple events split across chunks', async () => {
      const client = createMockClient(['data: first\n\nda', 'ta: second\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([
        { type: 'message', data: 'first' },
        { type: 'message', data: 'second' }
      ])
    })

    it('should handle remaining buffered data at end of stream', async () => {
      // Note: "data: world" needs a newline after it to be parsed as a complete line
      // Without the newline, only "data: hello" is parsed
      const client = createMockClient(['data: hello\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })
  })

  describe('field parsing', () => {
    it('should ignore lines without colon', async () => {
      const client = createMockClient(['invalid line\ndata: valid\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'valid' }])
    })

    it('should strip leading space from field value', async () => {
      const client = createMockClient(['data: value\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'value' }])
    })

    it('should not strip space if not leading', async () => {
      const client = createMockClient(['data:  value with spaces  \n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: ' value with spaces  ' }])
    })

    it('should handle empty data value', async () => {
      const client = createMockClient(['data:\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: '' }])
    })

    it('should ignore other fields like id and retry', async () => {
      const client = createMockClient(['id: 123\nretry: 1000\ndata: test\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'test' }])
    })
  })

  describe('complex scenarios', () => {
    it('should handle real-world SSE stream with mixed content', async () => {
      const client = createMockClient([
        'event: status\n',
        'data: {"status":"processing"}\n',
        '\n',
        'event: progress\n',
        'data: {"percent":50}\n',
        '\n',
        'data: {"result":"complete"}\n',
        '\n'
      ])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([
        { type: 'status', data: '{"status":"processing"}' },
        { type: 'progress', data: '{"percent":50}' },
        { type: 'message', data: '{"result":"complete"}' }
      ])
    })

    it('should handle multi-line JSON data', async () => {
      const client = createMockClient([
        'data: {\n',
        'data:   "name": "test",\n',
        'data:   "value": 123\n',
        'data: }\n',
        '\n'
      ])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([
        {
          type: 'message',
          data: '{\n  "name": "test",\n  "value": 123\n}'
        }
      ])
    })

    it('should handle consecutive empty lines', async () => {
      const client = createMockClient(['data: first\n\n\ndata: second\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([
        { type: 'message', data: 'first' },
        { type: 'message', data: 'second' }
      ])
    })

    it('should handle stream with only whitespace and empty lines', async () => {
      const client = createMockClient(['\n\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([])
    })

    it('should handle data with colons in value', async () => {
      const client = createMockClient(['data: http://example.com:8080\n\n'])
      const events = await collectEvents(client, '/test')
      expect(events).toEqual([{ type: 'message', data: 'http://example.com:8080' }])
    })
  })
})
