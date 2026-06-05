package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/ivanxgb/bridge-app/internal/auth"
	"github.com/ivanxgb/bridge-app/internal/db"
	"github.com/ivanxgb/bridge-app/internal/model"
)

type ChatHandler struct {
	DB *sql.DB
}

type createChatRequest struct {
	Kind              model.ChatKind `json:"kind"`
	Title             string         `json:"title"`
	CWD               string         `json:"cwd"`
	InitialInstruction string        `json:"initialInstruction"`
}

func (h *ChatHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	sessions, err := db.ListChatSessions(h.DB, claims.UserID)
	if err != nil {
		log.Printf("[chat] list error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if sessions == nil {
		sessions = []model.ChatSession{}
	}
	writeJSON(w, sessions)
}

func (h *ChatHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Kind != model.ChatKindCodex && req.Kind != model.ChatKindCommandCode {
		http.Error(w, "kind must be codex or commandcode", http.StatusBadRequest)
		return
	}

	s := &model.ChatSession{
		Kind:   req.Kind,
		Title:  req.Title,
		Status: model.ChatStatusRunning,
		CWD:    req.CWD,
		UserID: claims.UserID,
		Prompt: req.InitialInstruction,
	}
	if s.Title == "" {
		s.Title = string(req.Kind) + " chat"
	}

	id, err := db.CreateChatSession(h.DB, s)
	if err != nil {
		log.Printf("[chat] create error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	// Re-read to get timestamps
	created, err := db.GetChatSession(h.DB, id, claims.UserID)
	if err != nil {
		s.ID = id
		writeJSON(w, s)
		return
	}
	writeJSON(w, created)
}

func (h *ChatHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "chatSessionID"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	session, err := db.GetChatSession(h.DB, id, claims.UserID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	messages, err := db.ListChatMessages(h.DB, session.ID)
	if err != nil {
		log.Printf("[chat] messages error: %v", err)
		messages = []model.ChatMessage{}
	}
	if messages == nil {
		messages = []model.ChatMessage{}
	}
	writeJSON(w, map[string]interface{}{
		"session":  session,
		"messages": messages,
	})
}

func (h *ChatHandler) AttachTerminal(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "chatSessionID"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	session, err := db.GetChatSession(h.DB, id, claims.UserID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if session.TmuxName == "" {
		http.Error(w, "no terminal session available", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]string{"tmuxName": session.TmuxName})
}

type sendMessageRequest struct {
	Content string `json:"content"`
}

func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "chatSessionID"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req sendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	// Save user message (actual send is handled via WebSocket)
	um := &model.ChatMessage{
		ChatSessionID: id,
		Role:          model.RoleUser,
		Content:       req.Content,
		Status:        model.MessageStatusDone,
	}
	msgID, err := db.CreateChatMessage(h.DB, um)
	if err != nil {
		log.Printf("[chat] save message error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	um.ID = msgID
	writeJSON(w, um)
}

func (h *ChatHandler) Stop(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "chatSessionID"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	db.UpdateChatSessionStatus(h.DB, id, model.ChatStatusStopped)
	w.WriteHeader(http.StatusNoContent)
}

type lookupRequest struct {
	TmuxName string `json:"tmuxName"`
}

func (h *ChatHandler) LookupByTmux(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	tmuxName := r.URL.Query().Get("tmuxName")
	if tmuxName == "" {
		http.Error(w, "tmuxName query param required", http.StatusBadRequest)
		return
	}
	session, err := db.GetChatSessionByTmuxName(h.DB, tmuxName, claims.UserID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, session)
}
