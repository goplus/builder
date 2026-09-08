// Package rpc provides the client side of the iSPX JSON-RPC channel.
package rpc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/goplus/xgo/x/jsonrpc2"
)

const cancelRequestMethod = "$/cancelRequest"

var (
	errNilContext = errors.New("rpc client: nil context")
	nextRequestID atomic.Int64
)

// MessageSender sends one JSON-RPC message to the peer.
type MessageSender interface {
	SendMessage(message jsonrpc2.Message) error
}

// MessageSenderFunc adapts a function to [MessageSender].
type MessageSenderFunc func(message jsonrpc2.Message) error

// SendMessage implements [MessageSender].
func (f MessageSenderFunc) SendMessage(message jsonrpc2.Message) error {
	return f(message)
}

type callResult struct {
	response *jsonrpc2.Response
	err      error
}

type pendingCall struct {
	done chan callResult
}

// Client sends JSON-RPC calls and matches their responses.
type Client struct {
	sender MessageSender

	mu      sync.Mutex
	closed  bool
	pending map[any]*pendingCall
}

// NewClient creates a JSON-RPC client that writes through sender.
func NewClient(sender MessageSender) *Client {
	return &Client{
		sender:  sender,
		pending: make(map[any]*pendingCall),
	}
}

// Call sends a JSON-RPC call and waits for its matching response.
func (c *Client) Call(ctx context.Context, method string, params, result any) error {
	if ctx == nil {
		return errNilContext
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	id := jsonrpc2.Int64ID(nextRequestID.Add(1))
	request, err := jsonrpc2.NewCall(id, method, params)
	if err != nil {
		return fmt.Errorf("rpc client: build call %q: %w", method, err)
	}
	pending := &pendingCall{done: make(chan callResult, 1)}
	if err := c.addPending(id.Raw(), pending); err != nil {
		return err
	}

	if err := c.send(request); err != nil {
		if c.removePending(id.Raw(), pending) {
			return fmt.Errorf("rpc client: send call %q: %w", method, err)
		}
	}

	select {
	case completed := <-pending.done:
		return decodeCallResult(completed, result)
	case <-ctx.Done():
		if c.removePending(id.Raw(), pending) {
			_ = c.Notify(cancelRequestMethod, struct {
				ID any `json:"id"`
			}{ID: id.Raw()})
			return ctx.Err()
		}
		return decodeCallResult(<-pending.done, result)
	}
}

// Notify sends a JSON-RPC notification.
func (c *Client) Notify(method string, params any) error {
	notification, err := jsonrpc2.NewNotification(method, params)
	if err != nil {
		return fmt.Errorf("rpc client: build notification %q: %w", method, err)
	}
	if err := c.send(notification); err != nil {
		return fmt.Errorf("rpc client: send notification %q: %w", method, err)
	}
	return nil
}

// HandleMessage delivers a response received from the peer. Responses without
// a matching pending call are ignored.
func (c *Client) HandleMessage(message jsonrpc2.Message) error {
	response, ok := message.(*jsonrpc2.Response)
	if !ok {
		return fmt.Errorf("rpc client: expected response, got %T", message)
	}

	c.mu.Lock()
	pending := c.pending[response.ID.Raw()]
	if pending != nil {
		delete(c.pending, response.ID.Raw())
	}
	c.mu.Unlock()
	if pending != nil {
		pending.done <- callResult{response: response}
	}
	return nil
}

// Close rejects new messages and completes all pending calls. It is safe to
// call more than once.
func (c *Client) Close() {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	c.closed = true
	pending := c.pending
	c.pending = make(map[any]*pendingCall)
	c.mu.Unlock()

	for _, call := range pending {
		call.done <- callResult{err: jsonrpc2.ErrClientClosing}
	}
}

func (c *Client) addPending(id any, pending *pendingCall) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return jsonrpc2.ErrClientClosing
	}
	if c.sender == nil {
		return errors.New("rpc client: no message sender")
	}
	c.pending[id] = pending
	return nil
}

func (c *Client) removePending(id any, pending *pendingCall) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.pending[id] != pending {
		return false
	}
	delete(c.pending, id)
	return true
}

func (c *Client) send(message jsonrpc2.Message) error {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return jsonrpc2.ErrClientClosing
	}
	sender := c.sender
	c.mu.Unlock()
	if sender == nil {
		return errors.New("rpc client: no message sender")
	}
	return sender.SendMessage(message)
}

func decodeCallResult(completed callResult, result any) error {
	if completed.err != nil {
		return completed.err
	}
	if completed.response.Error != nil {
		return completed.response.Error
	}
	if result == nil || len(completed.response.Result) == 0 {
		return nil
	}
	if err := json.Unmarshal(completed.response.Result, result); err != nil {
		return fmt.Errorf("rpc client: decode result: %w", err)
	}
	return nil
}
