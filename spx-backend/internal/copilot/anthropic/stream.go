package anthropic

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"sync"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/packages/ssestream"
)

// streamWrapper implements io.ReadCloser interface for streaming responses from Anthropic's API.
// It handles buffering of incoming events and provides synchronized access to the stream data.
type streamWrapper struct {
	stream *ssestream.Stream[anthropic.MessageStreamEvent] // Underlying SSE stream
	buffer *bytes.Buffer                                   // Buffer for storing received data
	mu     sync.Mutex                                      // Mutex for protecting shared resources
	cond   *sync.Cond                                      // Condition variable for signaling data availability
	closed bool                                            // Indicates if the stream is closed
	err    error                                           // Stores any error that occurred during streaming
}

// Read implements io.Reader interface. It reads data from the buffer in a thread-safe manner.
// Blocks until data is available or the stream is closed.
// Returns io.EOF when the stream is closed normally, or any error that occurred during streaming.
func (s *streamWrapper) Read(p []byte) (n int, err error) {
	s.cond.L.Lock()
	defer s.cond.L.Unlock()

	for s.buffer.Len() == 0 {
		if s.closed {
			if s.err != nil {
				return 0, s.err
			}
			return 0, io.EOF
		}
		s.cond.Wait()
	}

	return s.buffer.Read(p)
}

// Close implements io.Closer interface. It closes the stream and signals any waiting readers.
// Multiple calls to Close are safe and will return nil.
func (s *streamWrapper) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true
	s.err = io.ErrClosedPipe
	s.cond.Broadcast()
	return s.stream.Close()
}

// processEvents handles the continuous processing of incoming SSE events from the Anthropic API.
// It runs in a separate goroutine and processes events until the context is canceled or the stream ends.
// The function will close the stream when it exits.
func (s *streamWrapper) processEvents(ctx context.Context) {
	defer s.Close()

	for s.stream.Next() {
		select {
		case <-ctx.Done():
			s.setError(ctx.Err())
			return
		default:
			event := s.stream.Current()
			// Special handling for message_start events that contain content blocks
			if messageStart, ok := event.AsUnion().(anthropic.MessageStartEvent); ok {
				if len(messageStart.Message.Content) > 0 {
					// Process each content block in the message
					for _, contentBlock := range messageStart.Message.Content {
						if err := s.processContentBlock(contentBlock); err != nil {
							s.setError(err)
							return
						}
					}
				}
				continue
			}

			// Handle content_block_start events
			if blockStart, ok := event.AsUnion().(anthropic.ContentBlockStartEvent); ok {
				if err := s.processContentBlock(blockStart.ContentBlock); err != nil {
					s.setError(err)
					return
				}
				continue
			}

			// Handle delta events
			switch delta := event.Delta.(type) {
			case anthropic.ContentBlockDeltaEventDelta:
				switch deltaUnion := delta.AsUnion().(type) {
				case anthropic.TextDelta:
					s.appendData([]byte(deltaUnion.Text))
				case anthropic.InputJSONDelta:
					// For tool_use blocks, handle JSON delta
					s.appendData([]byte(deltaUnion.PartialJSON))
				}
			case anthropic.MessageDeltaEventDelta:
				// End of message
				s.setError(io.EOF)
			}
		}
	}

	// Check for any errors
	if err := s.stream.Err(); err != nil {
		s.setError(err)
	}
}

// processContentBlock handles different types of content blocks, especially tool_use blocks
func (s *streamWrapper) processContentBlock(contentBlock interface{}) error {
	switch block := contentBlock.(type) {
	case anthropic.ContentBlock:
		// Process based on block type
		switch block.Type {
		case anthropic.ContentBlockTypeToolUse:
			if block.Name != "" {
				s.appendData([]byte(block.Name))
			}
			if block.Input != nil {
				s.appendData(block.Input)
			}

		case anthropic.ContentBlockTypeText:
			// Regular text content
			if block.Text != "" {
				s.appendData([]byte(block.Text))
			}
		}

	case anthropic.ContentBlockStartEventContentBlock:
		// Process for content block start events
		if block.Type == anthropic.ContentBlockStartEventContentBlockTypeToolUse {
			toolUseBlock := block.AsUnion().(anthropic.ToolUseBlock)

			if toolUseBlock.Name != "" {
				s.appendData([]byte(toolUseBlock.Name))
			}
			if toolUseBlock.Input != nil {
				s.appendData(toolUseBlock.Input)
			}
		} else if block.Type == anthropic.ContentBlockStartEventContentBlockTypeText {
			if block.Text != "" {
				s.appendData([]byte(block.Text))
			}
		}
	}

	return nil
}

// appendData adds new data to the buffer in a thread-safe manner.
// It signals waiting readers that new data is available.
// If the stream is closed, the data is discarded.
func (r *streamWrapper) appendData(data []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return
	}

	r.buffer.Write(data)
	r.cond.Broadcast()
}

// setError sets the stream error state in a thread-safe manner.
// It handles both normal stream completion (io.EOF) and error conditions.
// Once an error is set, the stream is marked as closed and waiting readers are notified.
func (r *streamWrapper) setError(err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return
	}

	if errors.Is(err, io.EOF) {
		r.err = io.EOF
	} else {
		r.err = fmt.Errorf("stream error: %w", err)
	}

	r.closed = true
	r.cond.Broadcast()
}
