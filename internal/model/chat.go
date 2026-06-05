package model

type ChatKind string

const (
	ChatKindCodex       ChatKind = "codex"
	ChatKindCommandCode ChatKind = "commandcode"
)

type ChatStatus string

const (
	ChatStatusRunning      ChatStatus = "running"
	ChatStatusWaitingInput ChatStatus = "waiting_input"
	ChatStatusDone         ChatStatus = "done"
	ChatStatusError        ChatStatus = "error"
	ChatStatusStopped      ChatStatus = "stopped"
)

type MessageRole string

const (
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

type MessageStatus string

const (
	MessageStatusStreaming MessageStatus = "streaming"
	MessageStatusDone      MessageStatus = "done"
	MessageStatusError     MessageStatus = "error"
)

type ThinkStatus string

const (
	ThinkStatusStreaming ThinkStatus = "streaming"
	ThinkStatusDone      ThinkStatus = "done"
)

type ChatSession struct {
	ID        int64      `json:"id"`
	Kind      ChatKind   `json:"kind"`
	Title     string     `json:"title"`
	Status    ChatStatus `json:"status"`
	CWD       string     `json:"cwd"`
	TmuxName  string     `json:"tmuxName"`
	UserID    int64      `json:"userId"`
	CreatedAt string     `json:"createdAt"`
	UpdatedAt string     `json:"updatedAt"`
	Prompt    string     `json:"prompt"`
}

type ChatMessage struct {
	ID            int64         `json:"id"`
	ChatSessionID int64         `json:"chatSessionId"`
	Role          MessageRole   `json:"role"`
	Content       string        `json:"content"`
	Status        MessageStatus `json:"status"`
	CreatedAt     string        `json:"createdAt"`
}

type ThinkingBlock struct {
	ID            int64       `json:"id"`
	ChatSessionID int64       `json:"chatSessionId"`
	MessageID     int64       `json:"messageId"`
	Title         string      `json:"title"`
	Content       string      `json:"content"`
	Status        ThinkStatus `json:"status"`
	CreatedAt     string      `json:"createdAt"`
}
