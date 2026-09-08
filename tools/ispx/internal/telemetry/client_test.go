package telemetry

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/goplus/builder/tools/ispx/internal/rpc"
	"github.com/goplus/xgo/x/jsonrpc2"
)

func TestClientStartAndFinishWireContract(t *testing.T) {
	var (
		client       *rpc.Client
		startRequest StartRequest
		finishes     []FinishNotification
	)
	client = rpc.NewClient(rpc.MessageSenderFunc(func(message jsonrpc2.Message) error {
		request := message.(*jsonrpc2.Request)
		switch request.Method {
		case OperationStartMethod:
			if err := json.Unmarshal(request.Params, &startRequest); err != nil {
				t.Fatalf("decode start request: %v", err)
			}
			response, err := jsonrpc2.NewResponse(request.ID, StartResult{
				OperationID: "operation-1",
				PropagationHeaders: map[string]string{
					"Sentry-Trace": "trace-value",
				},
			}, nil)
			if err != nil {
				return err
			}
			return client.HandleMessage(response)
		case OperationFinishMethod:
			var finish FinishNotification
			if err := json.Unmarshal(request.Params, &finish); err != nil {
				t.Fatalf("decode finish notification: %v", err)
			}
			finishes = append(finishes, finish)
			return nil
		default:
			t.Fatalf("unexpected method %q", request.Method)
			return nil
		}
	}))

	beforeStart := time.Now().UnixMilli()
	op, err := NewClient(client).Start(t.Context(), StartRequest{
		Name:       "POST /ai-interaction/turns",
		Operation:  "http.client",
		Attributes: map[string]any{"attempt": float64(1)},
	})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if startRequest.StartTimeUnixMilli < beforeStart {
		t.Fatalf("start time = %d; want >= %d", startRequest.StartTimeUnixMilli, beforeStart)
	}
	if startRequest.Propagation != "" {
		t.Fatalf("propagation = %q; want empty", startRequest.Propagation)
	}

	headers := op.PropagationHeaders()
	headers["Sentry-Trace"] = "changed"
	if got := op.PropagationHeaders()["Sentry-Trace"]; got != "trace-value" {
		t.Fatalf("PropagationHeaders() = %q after caller mutation; want trace-value", got)
	}

	beforeFinish := time.Now().UnixMilli()
	op.Finish(StatusOK, map[string]any{"result": "done"})
	op.Finish(StatusError, nil)
	if len(finishes) != 1 {
		t.Fatalf("finish count = %d; want 1", len(finishes))
	}
	if finishes[0].OperationID != "operation-1" || finishes[0].Status != StatusOK {
		t.Fatalf("finish = %+v; want operation-1/ok", finishes[0])
	}
	if finishes[0].EndTimeUnixMilli < beforeFinish {
		t.Fatalf("end time = %d; want >= %d", finishes[0].EndTimeUnixMilli, beforeFinish)
	}
}

func TestClientStartPreservesHTTPPropagationRequest(t *testing.T) {
	var client *rpc.Client
	client = rpc.NewClient(rpc.MessageSenderFunc(func(message jsonrpc2.Message) error {
		request := message.(*jsonrpc2.Request)
		var start StartRequest
		if err := json.Unmarshal(request.Params, &start); err != nil {
			t.Fatalf("decode start request: %v", err)
		}
		if start.Propagation != "http" {
			t.Fatalf("propagation = %q; want http", start.Propagation)
		}
		response, err := jsonrpc2.NewResponse(request.ID, StartResult{OperationID: "operation-1"}, nil)
		if err != nil {
			return err
		}
		return client.HandleMessage(response)
	}))

	_, err := NewClient(client).Start(t.Context(), StartRequest{
		Name:        "POST /ai-interaction/turns",
		Operation:   "http.client",
		Propagation: "http",
	})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
}
