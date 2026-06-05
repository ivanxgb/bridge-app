package tmux

import "testing"

func TestParseSessionsSkipsMalformedLines(t *testing.T) {
	raw := "$0\tdev\t2\t1710000000\t1\nmalformed\n$1\tbuild\t1\t1710000100\t0\n"

	sessions := parseSessions(raw)

	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}
	if sessions[0].Name != "dev" || !sessions[0].Attached || sessions[0].Windows != 2 {
		t.Fatalf("unexpected first session: %+v", sessions[0])
	}
	if sessions[1].Name != "build" || sessions[1].Attached {
		t.Fatalf("unexpected second session: %+v", sessions[1])
	}
}

func TestParseWindowsAndPanes(t *testing.T) {
	windows := parseWindows("0\teditor\t1\n1\ttests\t0\n")
	if len(windows) != 2 || windows[0].Name != "editor" || !windows[0].Active {
		t.Fatalf("unexpected windows: %+v", windows)
	}

	panes := parsePanes("0\tvim\t1\t1234\n1\tshell\t0\t5678\n")
	if len(panes) != 2 || panes[1].Title != "shell" || panes[1].PID != "5678" {
		t.Fatalf("unexpected panes: %+v", panes)
	}
}
