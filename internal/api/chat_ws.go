package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/ivanxgb/bridge-app/internal/auth"
	"github.com/ivanxgb/bridge-app/internal/chat"
	"github.com/ivanxgb/bridge-app/internal/db"
	"github.com/ivanxgb/bridge-app/internal/model"
)

var chatUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type ChatWSHandler struct {
	DB        *sql.DB
	JWTSecret []byte
}

type chatWSMessage struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
}

func (h *ChatWSHandler) ServeChatWS(w http.ResponseWriter, r *http.Request) {
	// Auth
	var token string
	cookie, err := r.Cookie("bridge_token")
	if err == nil && cookie.Value != "" {
		token = cookie.Value
	}
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	claims, err := auth.ParseToken(token, h.JWTSecret)
	if err != nil {
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

	conn, err := chatUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[chat-ws] upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Create adapter
	var adapter chat.CliChatAdapter
	switch session.Kind {
	case model.ChatKindCodex:
		adapter = chat.NewCodexAdapter()
	case model.ChatKindCommandCode:
		adapter = chat.NewCommandCodeAdapter()
	default:
		conn.WriteJSON(model.NewErrorEvent("unsupported kind: " + string(session.Kind)))
		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	cfg := chat.SessionConfig{
		Kind:   session.Kind,
		CWD:    session.CWD,
		Cols:   120,
		Rows:   40,
	}
	if session.TmuxName != "" {
		cfg.SessionName = session.TmuxName
	}
	if session.Prompt != "" {
		cfg.InitialInstruction = session.Prompt
	}
	if err := adapter.Start(ctx, cfg); err != nil {
		log.Printf("[chat-ws] adapter start failed: %v", err)
		conn.WriteJSON(model.NewErrorEvent(err.Error()))
		return
	}

	// Store tmux name
	if tn := adapter.UnderlyingSession(); tn != "" && session.TmuxName == "" {
		db.UpdateChatSessionTmuxName(h.DB, session.ID, tn)
	}

	log.Printf("[chat-ws] kind=%s session=%d tmux=%s", session.Kind, session.ID, adapter.UnderlyingSession())
	conn.WriteJSON(model.NewStatusEvent(session.ID, model.ChatStatusRunning))

	// Event relay goroutine
	go func() {
		var currentMsgID int64
		for ev := range adapter.Events() {
			if ev.Type == "status" {
				if d, ok := ev.Data.(model.StatusData); ok {
					db.UpdateChatSessionStatus(h.DB, session.ID, d.Status)
				}
			}
			// Save assistant messages on message_done
			if ev.Type == "message_start" {
				if d, ok := ev.Data.(model.MessageStartData); ok && d.Role == model.RoleAssistant {
					um := &model.ChatMessage{
						ChatSessionID: session.ID,
						Role:          model.RoleAssistant,
						Content:       "",
						Status:        model.MessageStatusStreaming,
					}
					id, err := db.CreateChatMessage(h.DB, um)
					if err == nil {
						currentMsgID = id
					}
				}
			}
			if ev.Type == "message_done" && currentMsgID > 0 {
				if d, ok := ev.Data.(model.MessageDoneData); ok {
					db.UpdateMessageContent(h.DB, currentMsgID, d.Content, model.MessageStatusDone)
				}
				currentMsgID = 0
			}
			if err := conn.WriteJSON(ev); err != nil {
				log.Printf("[chat-ws] write error: %v", err)
				cancel()
				return
			}
		}
	}()

	// Read loop
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[chat-ws] read error: %v", err)
			adapter.Stop()
			db.UpdateChatSessionStatus(h.DB, session.ID, model.ChatStatusStopped)
			return
		}

		var wsMsg chatWSMessage
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			continue
		}

		switch wsMsg.Type {
		case "message":
			if wsMsg.Content == "" {
				continue
			}
			// Save user message
			um := &model.ChatMessage{
				ChatSessionID: session.ID,
				Role:          model.RoleUser,
				Content:       wsMsg.Content,
				Status:        model.MessageStatusDone,
			}
			db.CreateChatMessage(h.DB, um)

			if err := adapter.SendMessage(ctx, wsMsg.Content); err != nil {
				conn.WriteJSON(model.NewErrorEvent(err.Error()))
			}
		case "stop":
			adapter.Stop()
			db.UpdateChatSessionStatus(h.DB, session.ID, model.ChatStatusStopped)
			conn.WriteJSON(model.NewStatusEvent(session.ID, model.ChatStatusStopped))
		}
	}
}
