package db

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	return db, nil
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(migrationSQL)
	return err
}

const migrationSQL = `
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL CHECK(kind IN ('codex','commandcode')),
    title      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','waiting_input','done','error','stopped')),
    cwd        TEXT NOT NULL DEFAULT '',
    tmux_name  TEXT NOT NULL DEFAULT '',
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content         TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'streaming' CHECK(status IN ('streaming','done','error')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS thinking_blocks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id      INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
    title           TEXT NOT NULL DEFAULT '',
    content         TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'streaming' CHECK(status IN ('streaming','done')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
`
