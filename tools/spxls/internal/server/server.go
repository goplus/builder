package server

import (
	"fmt"
	"io/fs"

	"github.com/goplus/builder/tools/spxls/internal/jsonrpc2"
)

// MessageReplier is an interface for sending messages back to the client.
type MessageReplier interface {
	// ReplyMessage sends a message back to the client.
	//
	// The message can be one of:
	//   - [jsonrpc2.Response]: sent in response to a call.
	//   - [jsonrpc2.Notification]: sent for server-initiated notifications.
	ReplyMessage(m jsonrpc2.Message) error
}

// Server is the core language server implementation that handles LSP messages
type Server struct {
	rootFS  fs.ReadDirFS
	replier MessageReplier
}

// New creates a new Server instance.
func New(rootFS fs.ReadDirFS, replier MessageReplier) *Server {
	return &Server{
		rootFS:  rootFS,
		replier: replier,
	}
}

// HandleMessage handles an incoming LSP message.
func (s *Server) HandleMessage(m jsonrpc2.Message) error {
	switch m := m.(type) {
	case *jsonrpc2.Call:
		return s.handleCall(m)
	case *jsonrpc2.Notification:
		return s.handleNotification(m)
	}
	return fmt.Errorf("unsupported message type: %T", m)
}

// handleCall handles a call message.
func (s *Server) handleCall(c *jsonrpc2.Call) error {
	switch c.Method() {
	case "textDocument/formatting":
		var params DocumentFormattingParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.run(c.ID(), func() error {
			result, err := s.formatting(&params)
			resp, err := jsonrpc2.NewResponse(c.ID(), result, err)
			if err != nil {
				return err
			}
			return s.replier.ReplyMessage(resp)
		})
	default:
		return s.replyMethodNotFound(c.ID(), c.Method())
	}
	return nil
}

// handleNotification handles a notification message.
func (s *Server) handleNotification(n *jsonrpc2.Notification) error {
	return fmt.Errorf("unsupported notification method: %s", n.Method())
}

// run runs the given function in a goroutine and replies to the client with any
// errors.
func (s *Server) run(id jsonrpc2.ID, fn func() error) {
	go func() {
		if err := fn(); err != nil {
			s.replyError(id, err)
		}
	}()
}

// replyError replies to the client with an error response.
func (s *Server) replyError(id jsonrpc2.ID, err error) error {
	resp, err := jsonrpc2.NewResponse(id, nil, err)
	if err != nil {
		return err
	}
	return s.replier.ReplyMessage(resp)
}

// replyMethodNotFound replies to the client with a method not found error response.
func (s *Server) replyMethodNotFound(id jsonrpc2.ID, method string) error {
	return s.replyError(id, fmt.Errorf("%w: %s", jsonrpc2.ErrMethodNotFound, method))
}

// replyParseError replies to the client with a parse error response.
func (s *Server) replyParseError(id jsonrpc2.ID, err error) error {
	return s.replyError(id, fmt.Errorf("%w: %s", jsonrpc2.ErrParse, err))
}
