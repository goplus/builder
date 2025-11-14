package controller

import (
	"errors"
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMattingParamsValidate(t *testing.T) {
	originalLookupIP := lookupIP
	t.Cleanup(func() {
		lookupIP = originalLookupIP
	})

	fakeDNS := map[string]struct {
		ips []net.IP
		err error
	}{
		"example.com": {
			ips: []net.IP{net.ParseIP("93.184.216.34")},
		},
		"private.example": {
			ips: []net.IP{net.ParseIP("10.0.0.5")},
		},
		"lookup-error.example": {
			err: errors.New("mock lookup failure"),
		},
	}

	lookupIP = func(host string) ([]net.IP, error) {
		resp, ok := fakeDNS[host]
		if !ok {
			return nil, errors.New("unknown host: " + host)
		}
		if resp.err != nil {
			return nil, resp.err
		}
		return resp.ips, nil
	}

	t.Run("Normal", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "https://example.com/image.jpg",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyImageUrl", func(t *testing.T) {
		params := &MattingParams{}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing imageUrl", msg)
	})

	t.Run("InvalidImageUrl", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "example.com/image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl", msg)
	})

	t.Run("InvalidImageUrl2", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "https://",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl", msg)
	})

	t.Run("InvalidImageUrl3", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl", msg)
	})

	t.Run("InvalidScheme", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "ftp://example.com/image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: unsupported scheme", msg)
	})

	t.Run("LocalImageUrl", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://localhost:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LocalImageUrl2", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://127.0.0.1:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LocalImageUrl3", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://[::1]:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("UnspecifiedIPv4", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://0.0.0.0:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("UnspecifiedIPv6", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://[::]:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LocalHostnameVariant", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://localhost.localdomain:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LanImageUrl1", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://192.168.0.1:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LanImageUrl2", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "http://[fe80::1]:8080/a.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})

	t.Run("LookupError", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "https://lookup-error.example/image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: lookup IP failed", msg)
	})

	t.Run("DomainResolvesToPrivateIP", func(t *testing.T) {
		params := &MattingParams{
			ImageUrl: "https://private.example/image.jpg",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid imageUrl: private IP", msg)
	})
}
