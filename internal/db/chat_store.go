package db

import (
	"database/sql"

	"github.com/ivanxgb/bridge-app/internal/model"
)

// ---- Chat Sessions ----

func CreateChatSession(db *sql.DB, s *model.ChatSession) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO chat_sessions (kind, title, status, cwd, tmux_name, user_id, prompt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		s.Kind, s.Title, s.Status, s.CWD, s.TmuxName, s.UserID, s.Prompt,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetChatSession(db *sql.DB, id, userID int64) (*model.ChatSession, error) {
	s := &model.ChatSession{}
	err := db.QueryRow(
		`SELECT id, kind, title, status, cwd, tmux_name, user_id, prompt, created_at, updated_at FROM chat_sessions WHERE id = ? AND user_id = ?`,
		id, userID,
	).Scan(&s.ID, &s.Kind, &s.Title, &s.Status, &s.CWD, &s.TmuxName, &s.UserID, &s.Prompt, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func ListChatSessions(db *sql.DB, userID int64) ([]model.ChatSession, error) {
	rows, err := db.Query(
		`SELECT id, kind, title, status, cwd, tmux_name, user_id, prompt, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []model.ChatSession
	for rows.Next() {
		var s model.ChatSession
		if err := rows.Scan(&s.ID, &s.Kind, &s.Title, &s.Status, &s.CWD, &s.TmuxName, &s.UserID, &s.Prompt, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func UpdateChatSessionStatus(db *sql.DB, id int64, status model.ChatStatus) error {
	_, err := db.Exec(`UPDATE chat_sessions SET status = ?, updated_at = datetime('now') WHERE id = ?`, status, id)
	return err
}

func UpdateChatSessionTmuxName(db *sql.DB, id int64, tmuxName string) error {
	_, err := db.Exec(`UPDATE chat_sessions SET tmux_name = ?, updated_at = datetime('now') WHERE id = ?`, tmuxName, id)
	return err
}

// ---- Chat Messages ----

func CreateChatMessage(db *sql.DB, m *model.ChatMessage) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO chat_messages (chat_session_id, role, content, status) VALUES (?, ?, ?, ?)`,
		m.ChatSessionID, m.Role, m.Content, m.Status,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func UpdateMessageContent(db *sql.DB, id int64, content string, status model.MessageStatus) error {
	_, err := db.Exec(`UPDATE chat_messages SET content = ?, status = ? WHERE id = ?`, content, status, id)
	return err
}

func ListChatMessages(db *sql.DB, sessionID int64) ([]model.ChatMessage, error) {
	rows, err := db.Query(
		`SELECT id, chat_session_id, role, content, status, created_at FROM chat_messages WHERE chat_session_id = ? ORDER BY created_at ASC`,
		sessionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []model.ChatMessage
	for rows.Next() {
		var m model.ChatMessage
		if err := rows.Scan(&m.ID, &m.ChatSessionID, &m.Role, &m.Content, &m.Status, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

// ---- Thinking Blocks ----

func CreateThinkingBlock(db *sql.DB, tb *model.ThinkingBlock) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO thinking_blocks (chat_session_id, message_id, title, content, status) VALUES (?, ?, ?, ?, ?)`,
		tb.ChatSessionID, tb.MessageID, tb.Title, tb.Content, tb.Status,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func UpdateThinkingBlock(db *sql.DB, id int64, content string, status model.ThinkStatus) error {
	_, err := db.Exec(`UPDATE thinking_blocks SET content = ?, status = ? WHERE id = ?`, content, status, id)
	return err
}

func ListThinkingBlocksForMessage(db *sql.DB, messageID int64) ([]model.ThinkingBlock, error) {
	rows, err := db.Query(
		`SELECT id, chat_session_id, message_id, title, content, status, created_at FROM thinking_blocks WHERE message_id = ? ORDER BY created_at ASC`,
		messageID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []model.ThinkingBlock
	for rows.Next() {
		var tb model.ThinkingBlock
		if err := rows.Scan(&tb.ID, &tb.ChatSessionID, &tb.MessageID, &tb.Title, &tb.Content, &tb.Status, &tb.CreatedAt); err != nil {
			return nil, err
		}
		blocks = append(blocks, tb)
	}
	return blocks, nil
}

func GetChatSessionByTmuxName(db *sql.DB, tmuxName string, userID int64) (*model.ChatSession, error) {
	s := &model.ChatSession{}
	err := db.QueryRow(
		`SELECT id, kind, title, status, cwd, tmux_name, user_id, prompt, created_at, updated_at FROM chat_sessions WHERE tmux_name = ? AND user_id = ?`,
		tmuxName, userID,
	).Scan(&s.ID, &s.Kind, &s.Title, &s.Status, &s.CWD, &s.TmuxName, &s.UserID, &s.Prompt, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}
