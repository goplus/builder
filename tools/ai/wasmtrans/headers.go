package wasmtrans

import "strings"

var protectedHeaderNames = map[string]struct{}{
	"authorization":       {},
	"content-length":      {},
	"content-type":        {},
	"cookie":              {},
	"host":                {},
	"origin":              {},
	"proxy-authorization": {},
	"referer":             {},
}

// mergeExtraHeaders copies base and adds opaque extra headers without allowing
// them to replace credentials, payload metadata, or browser-controlled fields.
func mergeExtraHeaders(base map[string]any, extra map[string]string) map[string]any {
	merged := make(map[string]any, len(base)+len(extra))
	for name, value := range base {
		merged[name] = value
	}
	for name, value := range extra {
		if _, protected := protectedHeaderNames[strings.ToLower(name)]; protected {
			continue
		}
		merged[matchingHeaderName(merged, name)] = value
	}
	return merged
}

func matchingHeaderName(headers map[string]any, name string) string {
	for existing := range headers {
		if strings.EqualFold(existing, name) {
			return existing
		}
	}
	return name
}
