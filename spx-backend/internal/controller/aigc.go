package controller

import (
	"context"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/log"
)

type MattingParams struct {
	// ImageUrl is the image URL to be matted.
	ImageUrl string `json:"imageUrl"`
}

var lookupIP = net.LookupIP

func (p *MattingParams) Validate() (ok bool, msg string) {
	if p.ImageUrl == "" {
		return false, "missing imageUrl"
	}

	// It may introduce security risk if we allow arbitrary image URL.
	// Urls targeting local or private network should be rejected.

	url, err := url.Parse(p.ImageUrl)
	if err != nil || url.Host == "" {
		return false, "invalid imageUrl"
	}
	if url.Scheme != "http" && url.Scheme != "https" {
		return false, "invalid imageUrl: unsupported scheme"
	}

	hostname := url.Hostname()
	if hostname == "" {
		return false, "invalid imageUrl"
	}

	if isLocalHostname(hostname) {
		return false, "invalid imageUrl: private IP"
	}

	if ip := net.ParseIP(hostname); ip != nil {
		if isIPPrivate(ip) {
			return false, "invalid imageUrl: private IP"
		}
		return true, ""
	}

	ips, err := lookupIP(hostname)
	if err != nil {
		return false, "invalid imageUrl: lookup IP failed"
	}

	if slices.ContainsFunc(ips, isIPPrivate) {
		return false, "invalid imageUrl: private IP"
	}

	return true, ""
}

func isLocalHostname(hostname string) bool {
	trimmed := strings.TrimSuffix(strings.ToLower(hostname), ".")
	switch trimmed {
	case "localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback":
		return true
	default:
		return false
	}
}

func isIPPrivate(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() || ip.IsUnspecified() {
		return true
	}
	return false
}

type MattingResult struct {
	// ImageUrl is the image URL that has been matted.
	ImageUrl string `json:"imageUrl"`
}

// Matting removes background of given image.
func (ctrl *Controller) Matting(ctx context.Context, params *MattingParams) (*MattingResult, error) {
	logger := log.GetReqLogger(ctx)
	aigcParams := struct {
		ImageUrl string `json:"image_url"`
	}{
		ImageUrl: params.ImageUrl,
	}
	var aigcResult struct {
		ImageUrl string `json:"image_url"`
	}
	err := ctrl.aigc.Call(ctx, http.MethodPost, "/matting", &aigcParams, &aigcResult)
	if err != nil {
		logger.Printf("failed to call: %v", err)
		return nil, err
	}
	return &MattingResult{
		ImageUrl: aigcResult.ImageUrl,
	}, nil
}
