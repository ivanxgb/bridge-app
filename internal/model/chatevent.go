package model

import "time"

// ---- Event wire struct ----

type ChatEvent struct {
	Type      string      `json:"type"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

// ---- Per-event data payloads ----

type MessageStartData struct {
	MessageID int64       `json:"messageId"`
	Role      MessageRole `json:"role"`
}

type MessageDeltaData struct {
	MessageID int64  `json:"messageId"`
	Delta     string `json:"delta"`
}

type MessageDoneData struct {
	MessageID int64  `json:"messageId"`
	Content   string `json:"content"`
}

type ThinkingStartData struct {
	BlockID int64  `json:"blockId"`
	Title   string `json:"title,omitempty"`
}

type ThinkingDeltaData struct {
	BlockID int64  `json:"blockId"`
	Delta   string `json:"delta"`
}

type ThinkingDoneData struct {
	BlockID int64  `json:"blockId"`
	Content string `json:"content"`
}

type ToolStartData struct {
	BlockID  int64  `json:"blockId"`
	ToolName string `json:"toolName"`
	Input    string `json:"input,omitempty"`
}

type ToolDeltaData struct {
	BlockID int64  `json:"blockId"`
	Delta   string `json:"delta"`
}

type ToolDoneData struct {
	BlockID  int64  `json:"blockId"`
	Output   string `json:"output,omitempty"`
	ExitCode *int   `json:"exitCode,omitempty"`
}

type StatusData struct {
	SessionID int64      `json:"sessionId"`
	Status    ChatStatus `json:"status"`
}

type ErrorData struct {
	Message string `json:"message"`
}

// ---- Event constructors ----

func now() string { return time.Now().UTC().Format(time.RFC3339) }

func NewMessageStartEvent(msgID int64, role MessageRole) ChatEvent {
	return ChatEvent{Type: "message_start", Timestamp: now(), Data: MessageStartData{MessageID: msgID, Role: role}}
}

func NewMessageDeltaEvent(msgID int64, delta string) ChatEvent {
	return ChatEvent{Type: "message_delta", Timestamp: now(), Data: MessageDeltaData{MessageID: msgID, Delta: delta}}
}

func NewMessageDoneEvent(msgID int64, content string) ChatEvent {
	return ChatEvent{Type: "message_done", Timestamp: now(), Data: MessageDoneData{MessageID: msgID, Content: content}}
}

func NewThinkingStartEvent(blockID int64, title string) ChatEvent {
	return ChatEvent{Type: "thinking_start", Timestamp: now(), Data: ThinkingStartData{BlockID: blockID, Title: title}}
}

func NewThinkingDeltaEvent(blockID int64, delta string) ChatEvent {
	return ChatEvent{Type: "thinking_delta", Timestamp: now(), Data: ThinkingDeltaData{BlockID: blockID, Delta: delta}}
}

func NewThinkingDoneEvent(blockID int64, content string) ChatEvent {
	return ChatEvent{Type: "thinking_done", Timestamp: now(), Data: ThinkingDoneData{BlockID: blockID, Content: content}}
}

func NewToolStartEvent(blockID int64, toolName, input string) ChatEvent {
	return ChatEvent{Type: "tool_start", Timestamp: now(), Data: ToolStartData{BlockID: blockID, ToolName: toolName, Input: input}}
}

func NewToolDeltaEvent(blockID int64, delta string) ChatEvent {
	return ChatEvent{Type: "tool_delta", Timestamp: now(), Data: ToolDeltaData{BlockID: blockID, Delta: delta}}
}

func NewToolDoneEvent(blockID int64, output string, exitCode *int) ChatEvent {
	return ChatEvent{Type: "tool_done", Timestamp: now(), Data: ToolDoneData{BlockID: blockID, Output: output, ExitCode: exitCode}}
}

func NewStatusEvent(sessionID int64, status ChatStatus) ChatEvent {
	return ChatEvent{Type: "status", Timestamp: now(), Data: StatusData{SessionID: sessionID, Status: status}}
}

func NewErrorEvent(msg string) ChatEvent {
	return ChatEvent{Type: "error", Timestamp: now(), Data: ErrorData{Message: msg}}
}
