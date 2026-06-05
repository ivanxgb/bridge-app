package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/ivanxgb/bridge-app/internal/auth"
	"github.com/ivanxgb/bridge-app/internal/db"
)

func main() {
	dbPath := flag.String("db", "bridge.db", "SQLite database path")
	user := flag.String("user", "admin", "Username")
	pass := flag.String("pass", "", "Password (or BRIDGE_SEED_PASS env)")
	flag.Parse()

	password := *pass
	if password == "" {
		password = os.Getenv("BRIDGE_SEED_PASS")
	}
	if password == "" {
		fmt.Fprintln(os.Stderr, "error: --pass or BRIDGE_SEED_PASS required")
		os.Exit(1)
	}

	database, err := db.Open(*dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		os.Exit(1)
	}
	defer database.Close()

	if err := db.Migrate(database); err != nil {
		fmt.Fprintf(os.Stderr, "migrate: %v\n", err)
		os.Exit(1)
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "hash: %v\n", err)
		os.Exit(1)
	}

	u, err := db.CreateUser(database, *user, hash)
	if err != nil {
		fmt.Fprintf(os.Stderr, "create user: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("user created: %s (id=%d)\n", u.Username, u.ID)
}
