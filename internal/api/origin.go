package api

import (
	"net/http"
	"net/url"
	"strings"
)

func websocketOriginChecker(allowedOrigins []string) func(*http.Request) bool {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		normalized := normalizeOrigin(origin)
		if normalized != "" {
			allowed[normalized] = struct{}{}
		}
	}

	return func(r *http.Request) bool {
		origin := normalizeOrigin(r.Header.Get("Origin"))
		if origin == "" {
			return true
		}
		if _, ok := allowed[origin]; ok {
			return true
		}
		if len(allowed) == 0 {
			return isSameOrigin(origin, r)
		}
		return false
	}
}

func normalizeOrigin(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + strings.ToLower(u.Host)
}

func isSameOrigin(origin string, r *http.Request) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return strings.EqualFold(u.Host, r.Host)
}
