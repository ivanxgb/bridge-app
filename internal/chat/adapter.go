package chat

import (
	"context"
	"time"

	"github.com/ivanxgb/bridge-app/internal/model"
)

type SessionConfig struct {
	Kind              model.ChatKind
	SessionName       string
	CWD               string
	InitialInstruction string
	Cols              int
	Rows              int
}

type CliChatAdapter interface {
	Start(ctx context.Context, cfg SessionConfig) error
	SendMessage(ctx context.Context, text string) error
	Stop() error
	Events() <-chan model.ChatEvent
	UnderlyingSession() string
}

func baseSessionName(prefix string) string {
	return prefix + "-" + time.Now().UTC().Format("0102-1504")
}
