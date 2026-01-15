import { describe, it, expect } from 'vitest'
import { parseSSE } from './sse'

describe('parseSSE', () => {
  /** Helper to create a mocked text stream */
  function createMockStream(chunks: string[]): AsyncGenerator<string> {
    return (async function* () {
      yield* chunks
    })()
  }

  /** Helper to collect all events from the SSE stream */
  async function collectEvents(stream: AsyncGenerator<string>) {
    const events = []
    const sseStream = parseSSE(stream)
    for await (const event of sseStream) {
      events.push(event)
    }
    return events
  }

  describe('line ending handling', () => {
    it('should handle \\n line endings', async () => {
      const stream = createMockStream(['data: hello\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle \\r\\n line endings', async () => {
      const stream = createMockStream(['data: hello\r\n\r\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle \\r line endings', async () => {
      const stream = createMockStream(['data: hello\r\r'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle mixed line endings', async () => {
      const stream = createMockStream(['data: line1\r\ndata: line2\n\r\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'line1\nline2' }])
    })

    it('should handle standalone \\r line endings', async () => {
      const stream = createMockStream(['data: hello\r\rdata: world\r\r'])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        { type: 'message', data: 'hello' },
        { type: 'message', data: 'world' }
      ])
    })
  })

  describe('multiple data lines', () => {
    it('should concatenate multiple data lines with newlines', async () => {
      const stream = createMockStream(['data: line1\ndata: line2\ndata: line3\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'line1\nline2\nline3' }])
    })

    it('should handle JSON split across multiple data lines', async () => {
      const stream = createMockStream(['data: {"key":\n', 'data: "value"}\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: '{"key":\n"value"}' }])
    })

    it('should handle multiple data lines with \\r\\n endings', async () => {
      const stream = createMockStream(['data: line1\r\ndata: line2\r\n\r\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'line1\nline2' }])
    })
  })

  describe('event dispatching', () => {
    it('should dispatch event only on empty line', async () => {
      const stream = createMockStream(['data: first\ndata: second\n\ndata: third\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        { type: 'message', data: 'first\nsecond' },
        { type: 'message', data: 'third' }
      ])
    })

    it('should handle custom event types', async () => {
      const stream = createMockStream(['event: custom\ndata: payload\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'custom', data: 'payload' }])
    })

    it('should reset event type to "message" after dispatch', async () => {
      const stream = createMockStream(['event: custom\ndata: first\n\nevent: message\ndata: second\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        { type: 'custom', data: 'first' },
        { type: 'message', data: 'second' }
      ])
    })

    it('should not dispatch event if no data lines', async () => {
      const stream = createMockStream(['event: custom\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([])
    })

    it('should handle event type without following data', async () => {
      const stream = createMockStream(['event: custom\n\ndata: test\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'test' }])
    })
  })

  describe('streaming and buffering', () => {
    it('should handle data split across multiple chunks', async () => {
      const stream = createMockStream(['data: hel', 'lo\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })

    it('should handle multiple events split across chunks', async () => {
      const stream = createMockStream(['data: first\n\nda', 'ta: second\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        { type: 'message', data: 'first' },
        { type: 'message', data: 'second' }
      ])
    })

    it('should handle remaining buffered data at end of stream', async () => {
      // Note: "data: world" needs a newline after it to be parsed as a complete line
      // Without the newline, only "data: hello" is parsed
      const stream = createMockStream(['data: hello\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'hello' }])
    })
  })

  describe('field parsing', () => {
    it('should ignore comment lines starting with colon', async () => {
      const stream = createMockStream(['data: valid\n: this is a comment\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'valid' }])
    })

    it('should parse lines without a colon as a field with an empty value', async () => {
      const stream = createMockStream(['data\ndata: valid\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: '\nvalid' }])
    })

    it('should strip leading space from field value', async () => {
      const stream = createMockStream(['data: value\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'value' }])
    })

    it('should not strip space if not leading', async () => {
      const stream = createMockStream(['data:  value with spaces  \n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: ' value with spaces  ' }])
    })

    it('should handle empty data value', async () => {
      const stream = createMockStream(['data:\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: '' }])
    })

    it('should ignore other fields like id and retry', async () => {
      const stream = createMockStream(['id: 123\nretry: 1000\ndata: test\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'test' }])
    })
  })

  describe('complex scenarios', () => {
    it('should handle real-world SSE stream with mixed content', async () => {
      const stream = createMockStream([
        'event: status\n',
        'data: {"status":"processing"}\n',
        '\n',
        'event: progress\n',
        'data: {"percent":50}\n',
        '\n',
        'data: {"result":"complete"}\n',
        '\n'
      ])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        { type: 'status', data: '{"status":"processing"}' },
        { type: 'progress', data: '{"percent":50}' },
        { type: 'message', data: '{"result":"complete"}' }
      ])
    })

    it('should handle multi-line JSON data', async () => {
      const stream = createMockStream([
        'data: {\n',
        'data:   "name": "test",\n',
        'data:   "value": 123\n',
        'data: }\n',
        '\n'
      ])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        {
          type: 'message',
          data: '{\n  "name": "test",\n  "value": 123\n}'
        }
      ])
    })

    it('should handle consecutive empty lines', async () => {
      const stream = createMockStream(['data: first\n\n\ndata: second\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([
        { type: 'message', data: 'first' },
        { type: 'message', data: 'second' }
      ])
    })

    it('should handle stream with only whitespace and empty lines', async () => {
      const stream = createMockStream(['\n\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([])
    })

    it('should handle data with colons in value', async () => {
      const stream = createMockStream(['data: http://example.com:8080\n\n'])
      const events = await collectEvents(stream)
      expect(events).toEqual([{ type: 'message', data: 'http://example.com:8080' }])
    })
  })
})
