package httpclient

import (
	"bytes"
	"io"
	"net/http"
)

// requestBodyWrapper wraps a request body to allow reading its content without destroying the original request
type requestBodyWrapper struct {
	body     io.ReadCloser
	buffered *bytes.Buffer
}

func (r *requestBodyWrapper) Read(p []byte) (int, error) {
	n, err := r.body.Read(p)
	if n > 0 {
		r.buffered.Write(p[:n])
	}
	return n, err
}

func (r *requestBodyWrapper) Close() error {
	return r.body.Close()
}

// responseBodyWrapper wraps a response body to allow reading its content without destroying the original response
type responseBodyWrapper struct {
	body     io.ReadCloser
	buffered *bytes.Buffer
}

func (r *responseBodyWrapper) Read(p []byte) (int, error) {
	n, err := r.body.Read(p)
	if n > 0 {
		r.buffered.Write(p[:n])
	}
	return n, err
}

func (r *responseBodyWrapper) Close() error {
	return r.body.Close()
}

// wrapRequestBody wraps request body for tracing
func wrapRequestBody(req *http.Request) *bytes.Buffer {
	if req.Body == nil {
		return &bytes.Buffer{}
	}

	buf := &bytes.Buffer{}
	wrapper := &requestBodyWrapper{
		body:     req.Body,
		buffered: buf,
	}
	req.Body = wrapper
	return buf
}

// wrapResponseBody wraps response body for tracing
func wrapResponseBody(resp *http.Response) *bytes.Buffer {
	if resp.Body == nil {
		return &bytes.Buffer{}
	}

	buf := &bytes.Buffer{}
	wrapper := &responseBodyWrapper{
		body:     resp.Body,
		buffered: buf,
	}
	resp.Body = wrapper
	return buf
}
