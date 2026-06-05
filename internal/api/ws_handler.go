package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/ivanxgb/bridge-app/internal/auth"
	"github.com/ivanxgb/bridge-app/internal/tmux"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

type WSHandler struct {
	JWTSecret []byte
}

func (h *WSHandler) ServeSessionWS(w http.ResponseWriter, r *http.Request) {
	// Auth via cookie, query param, or header
	var token string
	cookie, err := r.Cookie("bridge_token")
	if err == nil && cookie.Value != "" {
		token = cookie.Value
	}
	if token == "" {
		ah := r.Header.Get("Authorization")
		if len(ah) > 7 && ah[:7] == "Bearer " {
			token = ah[7:]
		} else {
			token = r.URL.Query().Get("token")
		}
	}
	if _, err := auth.ParseToken(token, h.JWTSecret); err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	sessionName := chi.URLParam(r, "sessionID")
	mode := r.URL.Query().Get("mode") // "bash" for test mode, empty for tmux

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	var slave *tmux.TmuxSlave

	if mode == "bash" {
		slave, err = tmux.NewBashSlave(80, 24)
	} else {
		sessionName = r.URL.Query().Get("name") // optional override for fresh session
		if sessionName == "" {
			sessionName = chi.URLParam(r, "sessionID")
		}
		slave, err = tmux.NewTmuxSlave(sessionName, 80, 24)
	}

	if err != nil {
		log.Printf("[ws] session=%s mode=%s FAILED: %v", sessionName, mode, err)
		conn.WriteMessage(websocket.TextMessage, []byte("failed to open terminal: "+err.Error()+"\r\n"))
		return
	}
	defer slave.Close()

	log.Printf("[ws] session=%s mode=%s connected", sessionName, mode)

	// PTY read → WS write
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := slave.Read(buf)
			if err != nil {
				log.Printf("[ws] session=%s read done: %v", sessionName, err)
				return
			}
			if err := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
				log.Printf("[ws] session=%s write failed: %v", sessionName, err)
				return
			}
		}
	}()

	// WS read → PTY write
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[ws] session=%s client disconnected: %v", sessionName, err)
			return
		}

		var resize struct {
			Columns int `json:"columns"`
			Rows    int `json:"rows"`
		}
		if json.Unmarshal(msg, &resize) == nil && resize.Columns > 0 && resize.Rows > 0 {
			log.Printf("[ws] session=%s resize: %dx%d", sessionName, resize.Columns, resize.Rows)
			slave.Resize(resize.Columns, resize.Rows)
			continue
		}

		slave.Write(msg)
	}
}
