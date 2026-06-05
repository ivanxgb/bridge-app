package auth

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const ClaimsKey contextKey = "claims"

func Middleware(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := ""

			// Try cookie first
			cookie, err := r.Cookie("bridge_token")
			if err == nil && cookie.Value != "" {
				token = cookie.Value
			}

			// Fallback to Authorization header
			if token == "" {
				header := r.Header.Get("Authorization")
				if header != "" && strings.HasPrefix(header, "Bearer ") {
					token = strings.TrimPrefix(header, "Bearer ")
				}
			}

			// Fallback to query param (WebSocket)
			if token == "" {
				token = r.URL.Query().Get("token")
			}

			if token == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := ParseToken(token, secret)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(ClaimsKey).(*Claims)
	return claims
}
