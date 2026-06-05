package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ivanxgb/bridge-app/internal/api"
	"github.com/ivanxgb/bridge-app/internal/db"
)

type Config struct {
	Port           int
	DBPath         string
	JWTSecret      string
	StaticDir      string
	AllowedOrigins []string
}

func Run(cfg Config) error {
	database, err := db.Open(cfg.DBPath)
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer database.Close()

	if err := db.Migrate(database); err != nil {
		return fmt.Errorf("migrate db: %w", err)
	}

	apiHandler := api.NewRouter(database, []byte(cfg.JWTSecret), cfg.AllowedOrigins)

	var handler http.Handler = apiHandler
	if cfg.StaticDir != "" {
		fs := http.FileServer(http.Dir(cfg.StaticDir))
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// API routes take priority
			if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" {
				apiHandler.ServeHTTP(w, r)
				return
			}
			// Try static file, fallback to index.html for SPA
			path := cfg.StaticDir + r.URL.Path
			if _, err := os.Stat(path); err == nil {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, cfg.StaticDir+"/index.html")
		})
	}

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: handler,
	}

	go func() {
		log.Printf("bridge-server listening on :%d\n", cfg.Port)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(ctx)
}
