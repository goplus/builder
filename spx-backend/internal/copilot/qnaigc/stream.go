package qnaigc

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"sync"
)

// StreamReader implements io.ReadCloser interface for handling Server-Sent Events (SSE)
// from the Qiniu AI API. It processes the streaming response and provides
// a synchronized reading interface for the response content.
type StreamReader struct {
	body       io.ReadCloser  // Original response body from the HTTP request
	scanner    *bufio.Scanner // Scanner for reading SSE events line by line
	buffer     *bytes.Buffer  // Buffer for storing processed content
	mu         sync.Mutex     // Mutex for thread-safe operations
	closed     bool           // Flag indicating if the stream is closed
	err        error          // Stores any error that occurred during streaming
	isThinking bool           // Flag indicating if the response is thinking
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
			streamResp.Choices[0].Delta.ReasoningContent == "") {
			continue
		}

		// Write content to buffer and break the loop
		// Handle thinking content
		thinking := streamResp.Choices[0].Delta.ReasoningContent
		content := streamResp.Choices[0].Delta.Content

		// fmt.Println(thinking != "", content != "", r.isThinking)
		if thinking != "" {
			if !r.isThinking {
				r.buffer.WriteString("<thinking>")
				r.isThinking = true
			}
			r.buffer.WriteString(thinking)
		} else if r.isThinking {
			r.buffer.WriteString("</thinking>\n")
			r.isThinking = false
		}

		// Handle regular content
		if content != "" {
			if r.isThinking {
				r.buffer.WriteString("</thinking>\n")
				r.isThinking = false
			}
			r.buffer.WriteString(content)
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
