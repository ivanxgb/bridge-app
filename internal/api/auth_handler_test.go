package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ivanxgb/bridge-app/internal/auth"
)

func TestRefreshUsesRefreshCookie(t *testing.T) {
	secret := []byte("test-secret")
	refreshToken, err := auth.GenerateToken(42, "maintainer", secret, time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "bridge_refresh", Value: refreshToken})
	rec := httptest.NewRecorder()

	h := &AuthHandler{
		JWTSecret:  secret,
		AccessTTL:  time.Minute,
		RefreshTTL: time.Hour,
	}
	h.Refresh(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if cookie := findCookie(rec.Result().Cookies(), "bridge_token"); cookie == nil {
		t.Fatal("expected refreshed bridge_token cookie")
	}
	if !strings.Contains(rec.Body.String(), refreshToken) {
		t.Fatal("expected response to preserve refresh token")
	}
}

func TestRefreshAcceptsJSONBody(t *testing.T) {
	secret := []byte("test-secret")
	refreshToken, err := auth.GenerateToken(7, "json-user", secret, time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	body := strings.NewReader(`{"refresh_token":"` + refreshToken + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
	rec := httptest.NewRecorder()

	h := &AuthHandler{JWTSecret: secret, AccessTTL: time.Minute}
	h.Refresh(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRefreshRejectsMissingToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
	rec := httptest.NewRecorder()

	h := &AuthHandler{JWTSecret: []byte("test-secret"), AccessTTL: time.Minute}
	h.Refresh(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func findCookie(cookies []*http.Cookie, name string) *http.Cookie {
	for _, cookie := range cookies {
		if cookie.Name == name {
			return cookie
		}
	}
	return nil
}
