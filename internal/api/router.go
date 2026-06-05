package api

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/ivanxgb/bridge-app/internal/auth"
)

func NewRouter(db *sql.DB, jwtSecret []byte) http.Handler {
	authH := &AuthHandler{
		DB:         db,
		JWTSecret:  jwtSecret,
		AccessTTL:  15 * time.Minute,
		RefreshTTL: 7 * 24 * time.Hour,
	}
	sessionH := &SessionHandler{}
	wsH := &WSHandler{JWTSecret: jwtSecret}
	chatH := &ChatHandler{DB: db}
	chatWSH := &ChatWSHandler{DB: db, JWTSecret: jwtSecret}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Public auth routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authH.Register)
		r.Post("/login", authH.Login)
		r.Post("/refresh", authH.Refresh)
	})

	// Logout (protected so we know whose session to clear)
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware(jwtSecret))
		r.Post("/api/auth/logout", authH.Logout)
	})

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware(jwtSecret))
		r.Get("/api/auth/me", authH.Me)

		r.Route("/api/sessions", func(r chi.Router) {
			r.Get("/", sessionH.List)
			r.Post("/", sessionH.Create)
			r.Route("/{sessionID}", func(r chi.Router) {
				r.Delete("/", sessionH.Delete)
				r.Post("/rename", sessionH.Rename)
				r.Get("/windows", sessionH.ListWindows)
				r.Post("/windows", sessionH.CreateWindow)
				r.Delete("/windows/{windowID}", sessionH.DeleteWindow)
				r.Get("/windows/{windowID}/panes", sessionH.ListPanes)
			})
		})

		r.Route("/api/chat-sessions", func(r chi.Router) {
			r.Get("/", chatH.List)
			r.Post("/", chatH.Create)
			r.Get("/lookup", chatH.LookupByTmux)
			r.Route("/{chatSessionID}", func(r chi.Router) {
				r.Get("/", chatH.Get)
				r.Post("/messages", chatH.SendMessage)
				r.Post("/stop", chatH.Stop)
				r.Post("/attach-terminal", chatH.AttachTerminal)
			})
		})
	})

	// WebSocket — real PTY with tmux new-session -A (raw bytes, binary WS)
	r.Get("/api/ws/session/{sessionID}", wsH.ServeSessionWS)

	// WebSocket — Chat events (JSON, structured)
	r.Get("/api/ws/chat/{chatSessionID}", chatWSH.ServeChatWS)

	return r
}
