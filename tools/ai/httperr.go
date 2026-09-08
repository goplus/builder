package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// quotaExceededCode is the existing backend errorPayload code for long-window
// quota exhaustion (HTTP 403). This client consumes that contract as-is.
const quotaExceededCode = 40301

// httpErrorPayload is the JSON body returned by the AI interaction API on failure.
type httpErrorPayload struct {
	Code int `json:"code"`
}

// QuotaExceededError is HTTP 403 with JSON code 40301. Think/Archive must stop
// retrying immediately. Other 403s are not quota.
type QuotaExceededError struct {
	Err error
}

func (e *QuotaExceededError) Error() string {
	if e == nil {
		return ""
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return "quota exceeded"
}

func (e *QuotaExceededError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

// HTTPError is a non-429, non-quota HTTP failure. The backend error body stays
// in the wrapped error message; its fields are owned by the server trace.
type HTTPError struct {
	Status int
	Err    error
}

func (e *HTTPError) Error() string {
	if e == nil {
		return ""
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return fmt.Sprintf("http %d", e.Status)
}

func (e *HTTPError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

// TimeoutError marks a transport call that hit its attempt deadline. Prefer
// context.DeadlineExceeded over AbortError strings.
type TimeoutError struct {
	Err error
}

func (e *TimeoutError) Error() string {
	if e == nil {
		return ""
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return "transport timeout"
}

func (e *TimeoutError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

func isQuotaExceeded(err error) bool {
	var typed *QuotaExceededError
	return errors.As(err, &typed)
}

func isTransportTimeout(err error) bool {
	var typed *TimeoutError
	return errors.As(err, &typed)
}

func parseHTTPErrorPayload(body string) httpErrorPayload {
	var payload httpErrorPayload
	if body == "" {
		return payload
	}
	_ = json.Unmarshal([]byte(body), &payload)
	return payload
}

// ErrorFromHTTPResponse classifies a failed AI interaction HTTP response.
// Only status 403 with JSON code 40301 is quota; 429 stays TooManyRequestsError.
func ErrorFromHTTPResponse(status int, retryAfter time.Duration, body string, fallback error) error {
	if fallback == nil {
		fallback = fmt.Errorf("failed to fetch with status %d", status)
	}
	payload := parseHTTPErrorPayload(body)
	switch {
	case status == 403 && payload.Code == quotaExceededCode:
		return &QuotaExceededError{
			Err: fallback,
		}
	case status == 429:
		return &TooManyRequestsError{
			RetryAfter: retryAfter,
			Err:        fallback,
		}
	default:
		return &HTTPError{
			Status: status,
			Err:    fallback,
		}
	}
}

func AnnotateTransportError(ctx context.Context, err error) error {
	if err == nil {
		return nil
	}
	if isTransportTimeout(err) || isQuotaExceeded(err) {
		return err
	}
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return &TimeoutError{Err: err}
	}
	return err
}
