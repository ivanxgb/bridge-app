package api

import (
	"net/http/httptest"
	"testing"
)

func TestWebSocketOriginCheckerDefaultsToSameOrigin(t *testing.T) {
	check := websocketOriginChecker(nil)

	req := httptest.NewRequest("GET", "http://bridge.local/api/ws/session/dev", nil)
	req.Host = "bridge.local"
	req.Header.Set("Origin", "http://bridge.local")
	if !check(req) {
		t.Fatal("expected same-origin request to pass")
	}

	req.Header.Set("Origin", "https://evil.example")
	if check(req) {
		t.Fatal("expected cross-origin request to fail without allowlist")
	}
}

func TestWebSocketOriginCheckerUsesAllowlist(t *testing.T) {
	check := websocketOriginChecker([]string{"https://app.example.com"})

	req := httptest.NewRequest("GET", "http://api.example.com/api/ws/session/dev", nil)
	req.Host = "api.example.com"
	req.Header.Set("Origin", "https://app.example.com")
	if !check(req) {
		t.Fatal("expected allowlisted origin to pass")
	}

	req.Header.Set("Origin", "https://other.example.com")
	if check(req) {
		t.Fatal("expected non-allowlisted origin to fail")
	}
}
