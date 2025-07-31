package httpclient

import (
	"bytes"
	"io"
	"net/http"
)

// requestBodyWrapper 包装一个请求体以便能够在不破坏原始请求的情况下读取其内容
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

// responseBodyWrapper 包装一个响应体以便能够在不破坏原始响应的情况下读取其内容
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

// wrapRequestBody 包装请求体以便跟踪
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

// wrapResponseBody 包装响应体以便跟踪
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
