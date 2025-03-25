package qnaigc

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
)

// StreamReader implements io.ReadCloser interface for handling Server-Sent Events (SSE)
// from the Qiniu AI API. It processes the streaming response and provides
// a synchronized reading interface for the response content.
type StreamReader struct {
	body    io.ReadCloser  // Original response body from the HTTP request
	scanner *bufio.Scanner // Scanner for reading SSE events line by line
	buffer  *bytes.Buffer  // Buffer for storing processed content
	mu      sync.Mutex     // Mutex for thread-safe operations
	closed  bool           // Flag indicating if the stream is closed
	err     error          // Stores any error that occurred during streaming
}

// Read implements io.Reader interface. It reads data from the buffer in a thread-safe manner.
// The method processes SSE events and extracts the content from the stream.
// If the stream is closed or an error occurs, it returns immediately.
// Returns io.EOF when the stream is completed or closed.
func (r *StreamReader) Read(p []byte) (n int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return 0, io.EOF
	}

	if r.err != nil {
		return 0, r.err
	}

	// First read from the existing buffer if there's any data
	if r.buffer.Len() > 0 {
		return r.buffer.Read(p)
	}

	// Process SSE events until we get some content or reach the end
	for {
		if !r.scanner.Scan() {
			if err := r.scanner.Err(); err != nil {
				r.err = fmt.Errorf("stream scan error: %w", err)
			} else {
				r.err = io.EOF
			}
			return 0, r.err
		}

		line := r.scanner.Bytes()
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		// Process only data events
		if !bytes.HasPrefix(line, []byte("data: ")) {
			continue
		}

		data := bytes.TrimPrefix(line, []byte("data: "))
		// Check for stream completion marker
		if bytes.Equal(data, []byte("[DONE]")) {
			return 0, io.EOF
		}

		// Parse the streaming response
		var streamResp ChatCompletionStream
		if err := json.Unmarshal(data, &streamResp); err != nil {
			r.err = fmt.Errorf("json unmarshal error: %w", err)
			return 0, r.err
		}

		// Skip empty content
		if len(streamResp.Choices) == 0 || (streamResp.Choices[0].Delta.Content == "" &&
			len(streamResp.Choices[0].Delta.ToolCalls) == 0) {
			continue
		}

		if streamResp.Choices[0].Delta.Content != "" {
			// Write content to buffer and break the loop
			content := []byte(streamResp.Choices[0].Delta.Content)
			r.buffer.Write(content)
		} else {
			// fmt.Printf("-----------%+v\n", streamResp.Choices[0].Delta.ToolCalls)
			for _, tool := range streamResp.Choices[0].Delta.ToolCalls {
				if tool.Function.Name != "" {
					r.buffer.WriteString(tool.Function.Name)
					// fmt.Printf("-----------%+v\n", tool.Function.Name)
				}
				if tool.Function.Arguments != "" {
					r.buffer.WriteString(tool.Function.Arguments)
					// fmt.Printf("-----------%+v\n", tool.Function.Arguments)
				}
			}
			// Convert tool calls to XML-like format and write to buffer
			// toolCallBytes := serializeToolCalls(streamResp.Choices[0].Delta.ToolCalls)
			// if toolCallBytes != nil {
			// 	r.buffer.Write(toolCallBytes)
			// }
		}

		break
	}

	return r.buffer.Read(p)
}

// Close implements io.Closer interface. It closes the underlying response body
// and marks the stream as closed. Multiple calls to Close are safe and will
// return nil.
func (r *StreamReader) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return nil
	}

	r.closed = true
	return r.body.Close()
}

// serializeToolCalls converts API tool calls to a byte slice with XML-like formatting
// for MCP client recognition.
func serializeToolCalls(toolCalls []ToolCall) []byte {
	if len(toolCalls) == 0 {
		return nil
	}

	// Sort tool calls by index if available
	sortedToolCalls := make([]ToolCall, len(toolCalls))
	copy(sortedToolCalls, toolCalls)

	// Sort by index if available
	sort.SliceStable(sortedToolCalls, func(i, j int) bool {
		// If both have index, compare them
		if sortedToolCalls[i].Index != nil && sortedToolCalls[j].Index != nil {
			return *sortedToolCalls[i].Index < *sortedToolCalls[j].Index
		}
		// If only one has index, prioritize the one with index
		if sortedToolCalls[i].Index != nil {
			return true
		}
		if sortedToolCalls[j].Index != nil {
			return false
		}
		// If neither has index, keep original order
		return i < j
	})

	// Format as XML-like structure
	var buf bytes.Buffer
	buf.WriteString("<TOOL_CALL>")

	for _, call := range sortedToolCalls {
		// Escape any special characters in arguments to prevent XML injection
		escapedArgs := escapeXMLContent(call.Function.Arguments)

		// Format each call as a Call tag with name and arguments attributes
		buf.WriteString(fmt.Sprintf(
			`<Call name="%s" arguments="%s" id="%s">`,
			escapeXMLAttr(call.Function.Name),
			escapedArgs,
			escapeXMLAttr(call.ID),
		))
		buf.WriteString("</Call>")
	}

	buf.WriteString("</TOOL_CALL>")

	return buf.Bytes()
}

// escapeXMLContent escapes special characters in XML content
func escapeXMLContent(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

// escapeXMLAttr escapes special characters in XML attribute values
func escapeXMLAttr(s string) string {
	return escapeXMLContent(s)
}
