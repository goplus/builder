package rpc

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/goplus/xgo/x/jsonrpc2"
)

func TestClientCallMatchesResponse(t *testing.T) {
	var client *Client
	client = NewClient(MessageSenderFunc(func(message jsonrpc2.Message) error {
		request, ok := message.(*jsonrpc2.Request)
		if !ok {
			t.Fatalf("sent message = %T; want *jsonrpc2.Request", message)
		}
		if request.Method != "example/get" {
			t.Fatalf("method = %q; want example/get", request.Method)
		}
		response, err := jsonrpc2.NewResponse(request.ID, map[string]string{"value": "ok"}, nil)
		if err != nil {
			t.Fatalf("NewResponse() error = %v", err)
		}
		return client.HandleMessage(response)
	}))

	var result struct {
		Value string `json:"value"`
	}
	if err := client.Call(t.Context(), "example/get", map[string]string{"input": "value"}, &result); err != nil {
		t.Fatalf("Call() error = %v", err)
	}
	if result.Value != "ok" {
		t.Fatalf("Call() value = %q; want ok", result.Value)
	}
}

func TestClientCallReturnsRPCError(t *testing.T) {
	wantErr := jsonrpc2.NewError(-32010, "request failed")
	var client *Client
	client = NewClient(MessageSenderFunc(func(message jsonrpc2.Message) error {
		request := message.(*jsonrpc2.Request)
		response, err := jsonrpc2.NewResponse(request.ID, nil, wantErr)
		if err != nil {
			t.Fatalf("NewResponse() error = %v", err)
		}
		return client.HandleMessage(response)
	}))

	if err := client.Call(t.Context(), "example/fail", nil, nil); !errors.Is(err, wantErr) {
		t.Fatalf("Call() error = %v; want %v", err, wantErr)
	}
}

func TestClientCallDoesNotSendWhenContextIsDone(t *testing.T) {
	sent := false
	client := NewClient(MessageSenderFunc(func(jsonrpc2.Message) error {
		sent = true
		return nil
	}))
	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	if err := client.Call(ctx, "example/canceled", nil, nil); !errors.Is(err, context.Canceled) {
		t.Fatalf("Call() error = %v; want context.Canceled", err)
	}
	if sent {
		t.Fatal("Call() sent a message for an already canceled context")
	}
}

func TestClientCancelRemovesPendingAndNotifiesPeer(t *testing.T) {
	messages := make(chan jsonrpc2.Message, 2)
	client := NewClient(MessageSenderFunc(func(message jsonrpc2.Message) error {
		messages <- message
		return nil
	}))
	ctx, cancel := context.WithCancel(t.Context())
	callDone := make(chan error, 1)
	go func() {
		callDone <- client.Call(ctx, "example/wait", nil, nil)
	}()

	request := receiveRequest(t, messages, "example/wait")
	cancel()
	if err := receiveError(t, callDone); !errors.Is(err, context.Canceled) {
		t.Fatalf("Call() error = %v; want context.Canceled", err)
	}
	cancelRequest := receiveRequest(t, messages, cancelRequestMethod)
	if cancelRequest.IsCall() {
		t.Fatal("cancel message is a call; want notification")
	}
	var cancelParams struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(cancelRequest.Params, &cancelParams); err != nil {
		t.Fatalf("decode cancel params: %v", err)
	}
	if cancelParams.ID != request.ID.Raw() {
		t.Fatalf("cancel id = %v; want %v", cancelParams.ID, request.ID.Raw())
	}

	response, err := jsonrpc2.NewResponse(request.ID, nil, nil)
	if err != nil {
		t.Fatalf("NewResponse() error = %v", err)
	}
	if err := client.HandleMessage(response); err != nil {
		t.Fatalf("late HandleMessage() error = %v; want nil", err)
	}
}

func TestClientRequestIDsDoNotRepeatAcrossSessions(t *testing.T) {
	firstMessages := make(chan jsonrpc2.Message, 1)
	first := NewClient(MessageSenderFunc(func(message jsonrpc2.Message) error {
		firstMessages <- message
		return nil
	}))
	firstDone := make(chan error, 1)
	go func() {
		firstDone <- first.Call(t.Context(), "example/first", nil, nil)
	}()
	firstRequest := receiveRequest(t, firstMessages, "example/first")
	first.Close()
	if err := receiveError(t, firstDone); !errors.Is(err, jsonrpc2.ErrClientClosing) {
		t.Fatalf("first Call() error = %v; want ErrClientClosing", err)
	}

	secondMessages := make(chan jsonrpc2.Message, 1)
	second := NewClient(MessageSenderFunc(func(message jsonrpc2.Message) error {
		secondMessages <- message
		return nil
	}))
	secondDone := make(chan error, 1)
	go func() {
		secondDone <- second.Call(t.Context(), "example/second", nil, nil)
	}()
	secondRequest := receiveRequest(t, secondMessages, "example/second")
	if firstRequest.ID.Raw() == secondRequest.ID.Raw() {
		t.Fatalf("request IDs repeated across sessions: %v", firstRequest.ID.Raw())
	}

	lateResponse, err := jsonrpc2.NewResponse(firstRequest.ID, nil, nil)
	if err != nil {
		t.Fatalf("NewResponse(first) error = %v", err)
	}
	if err := second.HandleMessage(lateResponse); err != nil {
		t.Fatalf("late HandleMessage() error = %v; want nil", err)
	}
	response, err := jsonrpc2.NewResponse(secondRequest.ID, nil, nil)
	if err != nil {
		t.Fatalf("NewResponse(second) error = %v", err)
	}
	if err := second.HandleMessage(response); err != nil {
		t.Fatalf("HandleMessage(second) error = %v", err)
	}
	if err := receiveError(t, secondDone); err != nil {
		t.Fatalf("second Call() error = %v; want nil", err)
	}
}

func TestClientCloseCompletesPendingAndRejectsNewMessages(t *testing.T) {
	messages := make(chan jsonrpc2.Message, 1)
	client := NewClient(MessageSenderFunc(func(message jsonrpc2.Message) error {
		messages <- message
		return nil
	}))
	callDone := make(chan error, 1)
	go func() {
		callDone <- client.Call(t.Context(), "example/wait", nil, nil)
	}()

	request := receiveRequest(t, messages, "example/wait")
	client.Close()
	client.Close()
	if err := receiveError(t, callDone); !errors.Is(err, jsonrpc2.ErrClientClosing) {
		t.Fatalf("pending Call() error = %v; want ErrClientClosing", err)
	}
	if err := client.Call(t.Context(), "example/new", nil, nil); !errors.Is(err, jsonrpc2.ErrClientClosing) {
		t.Fatalf("new Call() error = %v; want ErrClientClosing", err)
	}
	if err := client.Notify("example/event", nil); !errors.Is(err, jsonrpc2.ErrClientClosing) {
		t.Fatalf("Notify() error = %v; want ErrClientClosing", err)
	}

	response, err := jsonrpc2.NewResponse(request.ID, nil, nil)
	if err != nil {
		t.Fatalf("NewResponse() error = %v", err)
	}
	if err := client.HandleMessage(response); err != nil {
		t.Fatalf("late HandleMessage() error = %v; want nil", err)
	}
}

func TestClientHandleMessageRejectsRequest(t *testing.T) {
	client := NewClient(MessageSenderFunc(func(jsonrpc2.Message) error { return nil }))
	request, err := jsonrpc2.NewNotification("example/event", nil)
	if err != nil {
		t.Fatalf("NewNotification() error = %v", err)
	}
	if err := client.HandleMessage(request); err == nil {
		t.Fatal("HandleMessage() error = nil; want error")
	}
}

func receiveRequest(t *testing.T, messages <-chan jsonrpc2.Message, method string) *jsonrpc2.Request {
	t.Helper()
	select {
	case message := <-messages:
		request, ok := message.(*jsonrpc2.Request)
		if !ok {
			t.Fatalf("message = %T; want *jsonrpc2.Request", message)
		}
		if request.Method != method {
			t.Fatalf("method = %q; want %q", request.Method, method)
		}
		return request
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for %q message", method)
		return nil
	}
}

func receiveError(t *testing.T, errors <-chan error) error {
	t.Helper()
	select {
	case err := <-errors:
		return err
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for error")
		return nil
	}
}
