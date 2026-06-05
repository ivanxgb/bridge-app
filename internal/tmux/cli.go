package tmux

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/ivanxgb/bridge-app/internal/model"
)

func ListSessions() ([]model.Session, error) {
	out, err := exec.Command("tmux", "list-sessions", "-F",
		"#{session_id}\t#{session_name}\t#{session_windows}\t#{session_created}\t#{session_attached}").Output()
	if err != nil {
		return nil, fmt.Errorf("tmux list-sessions: %w", err)
	}
	return parseSessions(string(out)), nil
}

func ListWindows(session string) ([]model.Window, error) {
	out, err := exec.Command("tmux", "list-windows", "-t", session, "-F",
		"#{window_index}\t#{window_name}\t#{window_active}").Output()
	if err != nil {
		return nil, fmt.Errorf("tmux list-windows: %w", err)
	}
	return parseWindows(string(out)), nil
}

func ListPanes(session, window string) ([]model.Pane, error) {
	out, err := exec.Command("tmux", "list-panes", "-t", fmt.Sprintf("%s:%s", session, window), "-F",
		"#{pane_index}\t#{pane_title}\t#{pane_active}\t#{pane_pid}").Output()
	if err != nil {
		return nil, fmt.Errorf("tmux list-panes: %w", err)
	}
	return parsePanes(string(out)), nil
}

func NewSession(name, cmd string) error {
	args := []string{"new-session", "-d", "-s", name}
	if cmd != "" {
		args = append(args, cmd)
	}
	return exec.Command("tmux", args...).Run()
}

func KillSession(name string) error {
	return exec.Command("tmux", "kill-session", "-t", name).Run()
}

func RenameSession(old, newName string) error {
	return exec.Command("tmux", "rename-session", "-t", old, newName).Run()
}

func NewWindow(session, name, cmd string) error {
	args := []string{"new-window", "-t", session}
	if name != "" {
		args = append(args, "-n", name)
	}
	if cmd != "" {
		args = append(args, cmd)
	}
	return exec.Command("tmux", args...).Run()
}

func KillWindow(session, window string) error {
	return exec.Command("tmux", "kill-window", "-t", fmt.Sprintf("%s:%s", session, window)).Run()
}

func SplitPane(session, window, cmd string, horizontal bool) error {
	target := fmt.Sprintf("%s:%s", session, window)
	flag := "-v"
	if horizontal {
		flag = "-h"
	}
	args := []string{"split-window", flag, "-t", target}
	if cmd != "" {
		args = append(args, cmd)
	}
	return exec.Command("tmux", args...).Run()
}

func KillPane(session, window, pane string) error {
	return exec.Command("tmux", "kill-pane", "-t", fmt.Sprintf("%s:%s.%s", session, window, pane)).Run()
}

func parseSessions(raw string) []model.Session {
	var sessions []model.Session
	for _, line := range strings.Split(strings.TrimSpace(raw), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 5 {
			continue
		}
		w, _ := strconv.Atoi(parts[2])
		attached := parts[4] == "1"
		sessions = append(sessions, model.Session{
			ID: parts[0], Name: parts[1], Windows: w,
			Created: parts[3], Attached: attached,
		})
	}
	return sessions
}

func parseWindows(raw string) []model.Window {
	var windows []model.Window
	for _, line := range strings.Split(strings.TrimSpace(raw), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 3 {
			continue
		}
		windows = append(windows, model.Window{
			ID: parts[0], Name: parts[1], Active: parts[2] == "1",
		})
	}
	return windows
}

func parsePanes(raw string) []model.Pane {
	var panes []model.Pane
	for _, line := range strings.Split(strings.TrimSpace(raw), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 4 {
			continue
		}
		panes = append(panes, model.Pane{
			ID: parts[0], Title: parts[1], Active: parts[2] == "1", PID: parts[3],
		})
	}
	return panes
}
