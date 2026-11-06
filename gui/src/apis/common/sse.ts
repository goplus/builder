/** Event received from Server-Sent Events API */
export type SSEEvent = {
  type: string
  data: string
}

/** Parse Server-Sent Events from a text stream */
export async function* parseSSE(stream: AsyncGenerator<string>): AsyncGenerator<SSEEvent> {
  let buffer = ''
  let eventName = 'message'
  let dataBuffer = ''

  for await (const chunk of stream) {
    buffer += chunk
    // Handle all SSE-allowed line endings: \r\n, \r, and \n.
    while (true) {
      const lineBreakRegex = /\r\n|\r|\n/
      const match = buffer.match(lineBreakRegex)
      if (match === null || match.index == null) break
      const line = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)

      if (line === '') {
        // Empty line: dispatch event
        if (dataBuffer !== '') {
          yield { type: eventName, data: dataBuffer.slice(0, -1) } // remove trailing newline
          dataBuffer = ''
        }
        eventName = 'message'
        continue
      }

      const colonIndex = line.indexOf(':')
      if (colonIndex === 0) continue // Ignore comment lines

      let field: string, value: string

      if (colonIndex === -1) {
        field = line
        value = ''
      } else {
        field = line.slice(0, colonIndex)
        value = line.slice(colonIndex + 1)
        if (value.startsWith(' ')) value = value.slice(1)
      }

      if (field === 'event') {
        eventName = value
      } else if (field === 'data') {
        dataBuffer += value + '\n'
      }
      // Other fields like 'id', 'retry' are ignored.
    }
  }
  // Dispatch any remaining buffered event data at the end of the stream
  if (dataBuffer !== '') {
    yield { type: eventName, data: dataBuffer.slice(0, -1) } // remove trailing newline
  }
}
