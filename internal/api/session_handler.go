package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/ivanxgb/bridge-app/internal/model"
	"github.com/ivanxgb/bridge-app/internal/tmux"
)

type SessionHandler struct{}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (h *SessionHandler) List(w http.ResponseWriter, r *http.Request) {
	sessions, err := tmux.ListSessions()
	if err != nil {
		// If tmux is not running, return empty list instead of 500
		sessions = []model.Session{}
	}
	writeJSON(w, sessions)
}

func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
		Cmd  string `json:"cmd"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if err := tmux.NewSession(req.Name, req.Cmd); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *SessionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	session := chi.URLParam(r, "sessionID")
	if err := tmux.KillSession(session); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SessionHandler) Rename(w http.ResponseWriter, r *http.Request) {
	session := chi.URLParam(r, "sessionID")
	var req struct {
		NewName string `json:"new_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := tmux.RenameSession(session, req.NewName); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SessionHandler) ListWindows(w http.ResponseWriter, r *http.Request) {
	session := chi.URLParam(r, "sessionID")
	windows, err := tmux.ListWindows(session)
	if err != nil {
		windows = []model.Window{}
	}
	writeJSON(w, windows)
}

func (h *SessionHandler) CreateWindow(w http.ResponseWriter, r *http.Request) {
	session := chi.URLParam(r, "sessionID")
	var req struct {
		Name string `json:"name"`
		Cmd  string `json:"cmd"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := tmux.NewWindow(session, req.Name, req.Cmd); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *SessionHandler) DeleteWindow(w http.ResponseWriter, r *http.Request) {
	session := chi.URLParam(r, "sessionID")
	window := chi.URLParam(r, "windowID")
	if err := tmux.KillWindow(session, window); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SessionHandler) ListPanes(w http.ResponseWriter, r *http.Request) {
	session := chi.URLParam(r, "sessionID")
	window := chi.URLParam(r, "windowID")
	panes, err := tmux.ListPanes(session, window)
	if err != nil {
		panes = []model.Pane{}
	}
	writeJSON(w, panes)
}
