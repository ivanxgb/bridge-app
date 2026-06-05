.PHONY: build build-go build-web dev dev-go dev-web clean seed run

GOPATH := $(shell go env GOPATH)
export PATH := $(PATH):/usr/local/go/bin:$(GOPATH)/bin

BRIDGE_PORT ?= 8080
JWT_SECRET ?= $(BRIDGE_JWT_SECRET)
DB_PATH ?= bridge.db

build: build-go build-web

build-go:
	go build -o bin/bridge-server ./cmd/bridge-server

build-web:
	cd web && npm run build

dev:
	@echo "Starting bridge-app in dev mode..."
	@echo "Backend: http://localhost:$(BRIDGE_PORT)"
	@echo "Frontend: http://localhost:5173"
	@$(MAKE) -j2 dev-go dev-web

dev-go:
	@echo "--- Backend ---"
	BRIDGE_JWT_SECRET="$(JWT_SECRET)" go run ./cmd/bridge-server --port $(BRIDGE_PORT) --db $(DB_PATH) --jwt-secret "$(JWT_SECRET)"

dev-web:
	@echo "--- Frontend ---"
	cd web && npm run dev

run: build
	@echo "Running bridge-app on :$(BRIDGE_PORT)..."
	BRIDGE_JWT_SECRET="$(JWT_SECRET)" ./bin/bridge-server --port $(BRIDGE_PORT) --db $(DB_PATH) --jwt-secret "$(JWT_SECRET)" --static-dir web/dist

clean:
	rm -rf bin/ web/dist/

seed:
	bash scripts/seed-user.sh
