package api

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/ivanxgb/bridge-app/internal/auth"
	"github.com/ivanxgb/bridge-app/internal/db"
)

type AuthHandler struct {
	DB         *sql.DB
	JWTSecret  []byte
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func setAccessCookie(w http.ResponseWriter, token string, ttl time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name:     "bridge_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
	})
}

func setRefreshCookie(w http.ResponseWriter, token string, ttl time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name:     "bridge_refresh",
		Value:    token,
		Path:     "/api/auth/refresh",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Password == "" {
		http.Error(w, "username and password required", http.StatusBadRequest)
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "hash error", http.StatusInternalServerError)
		return
	}
	user, err := db.CreateUser(h.DB, req.Username, hash)
	if err != nil {
		http.Error(w, "user exists or db error", http.StatusConflict)
		return
	}
	accessToken, _ := auth.GenerateToken(user.ID, user.Username, h.JWTSecret, h.AccessTTL)
	refreshToken, _ := auth.GenerateToken(user.ID, user.Username, h.JWTSecret, h.RefreshTTL)
	json.NewEncoder(w).Encode(tokenResponse{AccessToken: accessToken, RefreshToken: refreshToken})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	user, err := db.GetUserByUsername(h.DB, req.Username)
	if err != nil || !auth.CheckPassword(user.Password, req.Password) {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	accessToken, _ := auth.GenerateToken(user.ID, user.Username, h.JWTSecret, h.AccessTTL)
	refreshToken, _ := auth.GenerateToken(user.ID, user.Username, h.JWTSecret, h.RefreshTTL)

	setAccessCookie(w, accessToken, h.AccessTTL)
	setRefreshCookie(w, refreshToken, h.RefreshTTL)

	// Also return user info in response body
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
		},
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Clear both cookies
	http.SetCookie(w, &http.Cookie{
		Name:   "bridge_token",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:   "bridge_refresh",
		Value:  "",
		Path:   "/api/auth/refresh",
		MaxAge: -1,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken := ""
	if cookie, err := r.Cookie("bridge_refresh"); err == nil {
		refreshToken = cookie.Value
	}
	if refreshToken == "" {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
			http.Error(w, "refresh token required", http.StatusUnauthorized)
			return
		}
		refreshToken = req.RefreshToken
	}
	if refreshToken == "" {
		http.Error(w, "refresh token required", http.StatusUnauthorized)
		return
	}
	claims, err := auth.ParseToken(refreshToken, h.JWTSecret)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}
	accessToken, _ := auth.GenerateToken(claims.UserID, claims.Username, h.JWTSecret, h.AccessTTL)
	setAccessCookie(w, accessToken, h.AccessTTL)
	json.NewEncoder(w).Encode(tokenResponse{AccessToken: accessToken, RefreshToken: refreshToken})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	user, err := db.GetUserByID(h.DB, claims.UserID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(user)
}
