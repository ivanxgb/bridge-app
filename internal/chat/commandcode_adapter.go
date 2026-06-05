package chat

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os/exec"
	"strings"

	"github.com/ivanxgb/bridge-app/internal/model"
)

type CommandCodeAdapter struct {
	cfg     SessionConfig
	events  chan model.ChatEvent
	session string
	done    chan struct{}
	msgID   int64
}

func NewCommandCodeAdapter() *CommandCodeAdapter {
	return &CommandCodeAdapter{
		events: make(chan model.ChatEvent, 64),
		done:   make(chan struct{}),
	}
}

func (a *CommandCodeAdapter) Start(ctx context.Context, cfg SessionConfig) error {
	a.cfg = cfg
	a.session = cfg.SessionName
	if a.session == "" {
		a.session = baseSessionName("chat-cc")
	}

	log.Printf("[chat-cc] session=%s ready", a.session)

	if cfg.InitialInstruction != "" {
		go a.runCommand(ctx, cfg.InitialInstruction)
	}
	return nil
}

func (a *CommandCodeAdapter) SendMessage(ctx context.Context, text string) error {
	a.msgID++
	msgID := a.msgID

	a.events <- model.NewStatusEvent(0, model.ChatStatusRunning)
	a.events <- model.NewMessageStartEvent(msgID, model.RoleUser)
	a.events <- model.NewMessageDeltaEvent(msgID, text)
	a.events <- model.NewMessageDoneEvent(msgID, text)

	go a.runCommand(ctx, text)
	return nil
}

func (a *CommandCodeAdapter) Stop() error {
	select {
	case <-a.done:
	default:
		close(a.done)
	}
	return nil
}

func (a *CommandCodeAdapter) Events() <-chan model.ChatEvent { return a.events }
func (a *CommandCodeAdapter) UnderlyingSession() string      { return a.session }

func (a *CommandCodeAdapter) runCommand(ctx context.Context, prompt string) {
	cmd := exec.CommandContext(ctx, "commandcode", "-p", prompt)
	cmd.Dir = a.cfg.CWD

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		errMsg := fmt.Sprintf("commandcode failed: %v", err)
		if stderr.Len() > 0 {
			errMsg += " — " + stderr.String()
		}
		log.Printf("[chat-cc] %s", errMsg)
		a.events <- model.NewErrorEvent(errMsg)
		return
	}

	output := strings.TrimSpace(stdout.String())
	if output == "" {
		output = "(no output)"
	}

	assistantID := a.nextMsgID()
	a.events <- model.NewMessageStartEvent(assistantID, model.RoleAssistant)
	for _, line := range strings.Split(output, "\n") {
		a.events <- model.NewMessageDeltaEvent(assistantID, line+"\n")
	}
	a.events <- model.NewMessageDoneEvent(assistantID, output)
	a.events <- model.NewStatusEvent(0, model.ChatStatusDone)

	log.Printf("[chat-cc] response: %d chars", len(output))
}

func (a *CommandCodeAdapter) nextMsgID() int64 {
	a.msgID++
	return a.msgID
}
