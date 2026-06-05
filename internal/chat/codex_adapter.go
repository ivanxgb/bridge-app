package chat

import (
	"bytes"
	"context"
	"log"
	"os/exec"
	"strings"

	"github.com/ivanxgb/bridge-app/internal/model"
)

type CodexAdapter struct {
	cfg     SessionConfig
	events  chan model.ChatEvent
	session string
	done    chan struct{}
	msgID   int64
}

func NewCodexAdapter() *CodexAdapter {
	return &CodexAdapter{
		events: make(chan model.ChatEvent, 64),
		done:   make(chan struct{}),
	}
}

func (a *CodexAdapter) Start(ctx context.Context, cfg SessionConfig) error {
	a.cfg = cfg
	a.session = cfg.SessionName
	if a.session == "" {
		a.session = baseSessionName("chat-codex")
	}

	log.Printf("[chat-codex] session=%s ready", a.session)

	if cfg.InitialInstruction != "" {
		go a.runOneShot(ctx, cfg.InitialInstruction)
	}
	return nil
}

func (a *CodexAdapter) SendMessage(ctx context.Context, text string) error {
	a.msgID++
	msgID := a.msgID

	a.events <- model.NewStatusEvent(0, model.ChatStatusRunning)
	a.events <- model.NewMessageStartEvent(msgID, model.RoleUser)
	a.events <- model.NewMessageDeltaEvent(msgID, text)
	a.events <- model.NewMessageDoneEvent(msgID, text)

	go a.runOneShot(ctx, text)
	return nil
}

func (a *CodexAdapter) Stop() error {
	select {
	case <-a.done:
	default:
		close(a.done)
	}
	return nil
}

func (a *CodexAdapter) Events() <-chan model.ChatEvent { return a.events }
func (a *CodexAdapter) UnderlyingSession() string      { return a.session }

func (a *CodexAdapter) runOneShot(ctx context.Context, prompt string) {
	cmd := exec.CommandContext(ctx, "codex", "exec", "--skip-git-repo-check")
	cmd.Dir = a.cfg.CWD
	cmd.Stdin = strings.NewReader(prompt + "\n")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil && stderr.Len() > 0 {
		log.Printf("[chat-codex] exec error: %v stderr: %s", err, stderr.String())
		a.events <- model.NewErrorEvent("codex failed: " + err.Error())
		return
	}

	output := stdout.String()
	lines := strings.Split(output, "\n")

	inHeader := true
	var acc strings.Builder
	assistantID := a.nextMsgID()
	started := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if inHeader {
			if strings.Contains(trimmed, "OpenAI Codex") ||
				strings.Contains(trimmed, "workdir:") ||
				strings.Contains(trimmed, "model:") ||
				strings.Contains(trimmed, "provider:") ||
				strings.Contains(trimmed, "approval:") ||
				strings.Contains(trimmed, "sandbox:") ||
				strings.Contains(trimmed, "reasoning") ||
				strings.Contains(trimmed, "session id:") ||
				strings.Contains(trimmed, "Reading") ||
				strings.HasPrefix(trimmed, "----") {
				continue
			}
			inHeader = false
		}

		// Skip user echo
		if trimmed == "user" {
			continue
		}

		// Start assistant on "codex"
		if trimmed == "codex" {
			if !started {
				started = true
				a.events <- model.NewMessageStartEvent(assistantID, model.RoleAssistant)
			}
			continue
		}

		// Done
		if strings.HasPrefix(trimmed, "tokens used") {
			break
		}

		if acc.Len() > 0 {
			acc.WriteByte('\n')
		}
		acc.WriteString(line)

		if !started {
			started = true
			a.events <- model.NewMessageStartEvent(assistantID, model.RoleAssistant)
		}
		a.events <- model.NewMessageDeltaEvent(assistantID, line+"\n")
	}

	content := acc.String()
	if started {
		a.events <- model.NewMessageDoneEvent(assistantID, content)
	}
	a.events <- model.NewStatusEvent(0, model.ChatStatusDone)
}

func (a *CodexAdapter) nextMsgID() int64 {
	a.msgID++
	return a.msgID
}
