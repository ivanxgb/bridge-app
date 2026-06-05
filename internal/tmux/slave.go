package tmux

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/creack/pty"
)

type TmuxSlave struct {
	cmd  *exec.Cmd
	ptmx *os.File
}

func NewTmuxSlave(sessionName string, cols, rows int) (*TmuxSlave, error) {
	cmd := exec.Command("tmux", "new-session", "-A", "-s", sessionName)
	// Set environment
	env := os.Environ()
	env = append(env,
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)
	// Filter out any conflicting TERM
	filtered := make([]string, 0, len(env))
	for _, e := range env {
		if len(e) > 5 && e[:5] == "TERM=" {
			continue
		}
		if len(e) > 10 && e[:10] == "COLORTERM=" {
			continue
		}
		filtered = append(filtered, e)
	}
	cmd.Env = append(filtered,
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	log.Printf("[tmux] starting: tmux new-session -A -s %s (user=%s, cols=%d, rows=%d)",
		sessionName, os.Getenv("USER"), cols, rows)

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
	if err != nil {
		log.Printf("[tmux] pty.StartWithSize FAILED: %v (stderr: %s)", err, stderr.String())
		return nil, fmt.Errorf("pty start: %w (stderr: %s)", err, stderr.String())
	}

	log.Printf("[tmux] pty started, cmd PID: %d", cmd.Process.Pid)
	return &TmuxSlave{cmd: cmd, ptmx: ptmx}, nil
}

func NewBashSlave(cols, rows int) (*TmuxSlave, error) {
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/bash"
	}
	cmd := exec.Command(shell, "-l")
	env := os.Environ()
	filtered := make([]string, 0, len(env))
	for _, e := range env {
		if len(e) > 5 && e[:5] == "TERM=" {
			continue
		}
		if len(e) > 10 && e[:10] == "COLORTERM=" {
			continue
		}
		filtered = append(filtered, e)
	}
	cmd.Env = append(filtered,
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	log.Printf("[bash] starting %s (cols=%d, rows=%d)", shell, cols, rows)

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
	if err != nil {
		log.Printf("[bash] pty.StartWithSize FAILED: %v (stderr: %s)", err, stderr.String())
		return nil, fmt.Errorf("pty start: %w (stderr: %s)", err, stderr.String())
	}

	log.Printf("[bash] started, PID: %d", cmd.Process.Pid)
	return &TmuxSlave{cmd: cmd, ptmx: ptmx}, nil
}

func (s *TmuxSlave) Read(p []byte) (int, error) {
	return s.ptmx.Read(p)
}

func (s *TmuxSlave) Write(p []byte) (int, error) {
	return s.ptmx.Write(p)
}

func (s *TmuxSlave) Close() error {
	s.ptmx.Close()
	return s.cmd.Wait()
}

func (s *TmuxSlave) Resize(cols, rows int) error {
	return pty.Setsize(s.ptmx, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}
