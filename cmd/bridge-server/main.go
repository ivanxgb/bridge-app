package main

import (
	"flag"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/ivanxgb/bridge-app/internal/server"
)

func main() {
	port := flag.Int("port", envInt("BRIDGE_PORT", 8080), "HTTP port")
	dbPath := flag.String("db", envString("BRIDGE_DB", "bridge.db"), "SQLite database path")
	jwtSecret := flag.String("jwt-secret", os.Getenv("BRIDGE_JWT_SECRET"), "JWT signing secret (or BRIDGE_JWT_SECRET env)")
	staticDir := flag.String("static-dir", os.Getenv("BRIDGE_STATIC_DIR"), "Path to web/dist for SPA serving (blank = API only)")
	allowedOrigins := flag.String("allowed-origins", os.Getenv("BRIDGE_ALLOWED_ORIGINS"), "Comma-separated WebSocket origin allowlist (or BRIDGE_ALLOWED_ORIGINS env)")
	flag.Parse()

	if *jwtSecret == "" {
		log.Fatal("JWT secret required: use --jwt-secret or BRIDGE_JWT_SECRET env")
	}

	cfg := server.Config{
		Port:           *port,
		DBPath:         *dbPath,
		JWTSecret:      *jwtSecret,
		StaticDir:      *staticDir,
		AllowedOrigins: splitCSV(*allowedOrigins),
	}

	log.Printf("bridge-server: port=%d db=%s static=%q allowed_origins=%d", cfg.Port, cfg.DBPath, cfg.StaticDir, len(cfg.AllowedOrigins))
	if err := server.Run(cfg); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func splitCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if item := strings.TrimSpace(part); item != "" {
			out = append(out, item)
		}
	}
	return out
}

func envString(name, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(name string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
