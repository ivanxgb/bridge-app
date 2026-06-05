package chat

import (
	"bytes"
	"strings"
	"unicode"

	"github.com/ivanxgb/bridge-app/internal/model"
)

type parserState int

const (
	stateNormal   parserState = iota
	stateThinking
	stateTool
)

type OutputParser struct {
	state      parserState
	lineBuf    bytes.Buffer
	eventBuf   []model.ChatEvent

	// Current block IDs
	msgID   int64
	blockID int64
	role    model.MessageRole

	// Accumulators
	msgContent    strings.Builder
	blockContent  strings.Builder
	blockTitle    string
	toolName      string

	// ANSI strip state
	inEscape bool
	escSeq   bytes.Buffer

	// Role detection (Codex)
	sawCodexHeader bool
	roleSet        bool
	nextLineEmpty  bool

	// Line-by-line accumulator
	currentLine strings.Builder
}

func (p *OutputParser) Feed(data []byte) []model.ChatEvent {
	p.eventBuf = p.eventBuf[:0]
	for _, b := range data {
		p.feedByte(b)
	}
	return p.takeEvents()
}

func (p *OutputParser) feedByte(b byte) {
	// ANSI escape sequence stripping
	if p.inEscape {
		p.escSeq.WriteByte(b)
		if (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || b == '~' {
			p.inEscape = false
			p.escSeq.Reset()
		}
		return
	}
	if b == '\x1b' {
		p.inEscape = true
		p.escSeq.Reset()
		return
	}
	if b == '\r' {
		return
	}

	// Process byte
	if b == '\n' {
		p.processLine(p.currentLine.String())
		p.currentLine.Reset()
		return
	}
	p.currentLine.WriteByte(b)
}

func (p *OutputParser) processLine(line string) {
	trimmed := strings.TrimRightFunc(line, unicode.IsSpace)

	switch p.state {
	case stateNormal:
		p.processNormalLine(trimmed)
	case stateThinking:
		p.processThinkingLine(trimmed)
	case stateTool:
		p.processToolLine(trimmed)
	}
}

func (p *OutputParser) processNormalLine(line string) {
	// Skip Codex header lines
	if !p.sawCodexHeader {
		if strings.Contains(line, "OpenAI Codex") {
			return
		}
		if strings.Contains(line, "workdir:") || strings.Contains(line, "model:") ||
			strings.Contains(line, "provider:") || strings.Contains(line, "approval:") ||
			strings.Contains(line, "sandbox:") || strings.Contains(line, "reasoning") ||
			strings.Contains(line, "session id:") || strings.HasPrefix(line, "----") {
			return
		}
		p.sawCodexHeader = true
	}

	// Detect role markers (Codex)
	if !p.roleSet {
		if strings.HasPrefix(line, "user") && line == "user" {
			p.roleSet = true
			p.nextLineEmpty = true
			return
		}
	}

	if p.nextLineEmpty {
		if line == "" {
			return
		}
		p.nextLineEmpty = false
	}

	// Detect "codex" marker → role switch
	if line == "codex" && p.sawCodexHeader {
		// Flush user message if any
		if p.msgContent.Len() > 0 {
			p.flushMessage()
		}
		p.role = model.RoleAssistant
		p.msgID++
		p.msgContent.Reset()
		p.roleSet = true
		return
	}

	// Detect "tokens used" → session done
	if strings.HasPrefix(line, "tokens used") {
		p.flushMessage()
		return
	}

	// Detect thinking block
	if strings.Contains(line, "Thought for") || strings.Contains(line, "Thinking") ||
		strings.HasPrefix(line, "Thinking") {
		p.enterThinking(line)
		return
	}

	// Detect tool block
	if tool := detectTool(line); tool != "" {
		p.enterTool(tool, line)
		return
	}

	// Normal content → accumulate
	if !p.roleSet {
		p.role = model.RoleAssistant
		p.roleSet = true
	}
	if p.msgContent.Len() > 0 {
		p.msgContent.WriteByte('\n')
	}
	p.msgContent.WriteString(line)

	// Emit delta
	p.emit(model.NewMessageDeltaEvent(p.msgID, line))
}

func (p *OutputParser) processThinkingLine(line string) {
	if line == "" {
		return
	}
	// End of thinking block: next non-thinking line is handled by the caller's state
	p.blockContent.WriteString(line)
	p.blockContent.WriteByte('\n')
	p.emit(model.NewThinkingDeltaEvent(p.blockID, line))
}

func (p *OutputParser) processToolLine(line string) {
	// Empty line ends tool block
	if line == "" {
		p.exitTool()
		return
	}
	p.blockContent.WriteString(line)
	p.blockContent.WriteByte('\n')
	p.emit(model.NewToolDeltaEvent(p.blockID, line))
}

func (p *OutputParser) enterThinking(line string) {
	// Flush current tool if active
	if p.state == stateTool {
		p.exitTool()
	}
	// If we were in normal, end current thinking block if any
	if p.state == stateThinking {
		p.exitThinking()
	}
	// Flush accumulated message content before thinking
	p.flushMessageContent()

	p.state = stateThinking
	p.blockID++
	p.blockContent.Reset()
	p.blockTitle = strings.TrimSpace(line)
	p.blockContent.WriteString(line)
	p.blockContent.WriteByte('\n')
	p.emit(model.NewThinkingStartEvent(p.blockID, p.blockTitle))
	p.emit(model.NewThinkingDeltaEvent(p.blockID, line))
}

func (p *OutputParser) exitThinking() {
	p.emit(model.NewThinkingDoneEvent(p.blockID, p.blockContent.String()))
	p.state = stateNormal
}

func (p *OutputParser) enterTool(name, line string) {
	if p.state == stateTool {
		p.exitTool()
	}
	if p.state == stateThinking {
		p.exitThinking()
	}

	p.state = stateTool
	p.blockID++
	p.toolName = name
	p.blockContent.Reset()
	p.blockContent.WriteString(line)
	p.blockContent.WriteByte('\n')

	input := line
	if len(line) > len(name) {
		input = strings.TrimSpace(line[len(name):])
	}
	p.emit(model.NewToolStartEvent(p.blockID, name, input))
	p.emit(model.NewToolDeltaEvent(p.blockID, line))
}

func (p *OutputParser) exitTool() {
	exitCode := 0
	p.emit(model.NewToolDoneEvent(p.blockID, p.blockContent.String(), &exitCode))
	p.state = stateNormal
}

func (p *OutputParser) flushMessageContent() {
	if p.msgContent.Len() > 0 {
		if p.msgID == 0 {
			p.msgID = 1
		}
		if p.role == "" {
			p.role = model.RoleAssistant
		}
		p.emit(model.NewMessageStartEvent(p.msgID, p.role))
		p.emit(model.NewMessageDoneEvent(p.msgID, p.msgContent.String()))
	}
}

func (p *OutputParser) flushMessage() {
	if p.msgContent.Len() == 0 && p.msgID == 0 {
		return
	}
	if p.msgID == 0 {
		p.msgID = 1
	}
	if p.role == "" {
		p.role = model.RoleAssistant
	}
	p.emit(model.NewMessageDoneEvent(p.msgID, p.msgContent.String()))
}

func (p *OutputParser) emit(event model.ChatEvent) {
	p.eventBuf = append(p.eventBuf, event)
}

func (p *OutputParser) takeEvents() []model.ChatEvent {
	events := p.eventBuf
	p.eventBuf = nil
	return events
}

func (p *OutputParser) Flush() []model.ChatEvent {
	p.flushMessage()
	p.eventBuf = append(p.eventBuf, model.NewStatusEvent(0, model.ChatStatusDone))
	return p.takeEvents()
}

func (p *OutputParser) Reset() {
	p.state = stateNormal
	p.msgContent.Reset()
	p.blockContent.Reset()
	p.currentLine.Reset()
	p.sawCodexHeader = false
	p.roleSet = false
	p.inEscape = false
	p.role = ""
}

func detectTool(line string) string {
	upper := strings.ToUpper(line)
	for _, tool := range []string{"SHELL", "READ", "EDIT", "TODO", "WRITE", "DELETE", "LIST", "MOVE", "COPY"} {
		if strings.HasPrefix(upper, tool) && (len(line) == len(tool) || line[len(tool)] == ' ' || line[len(tool)] == ':') {
			return tool
		}
	}
	return ""
}
