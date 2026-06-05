package db

import (
	"database/sql"

	"github.com/ivanxgb/bridge-app/internal/model"
)

func CreateUser(db *sql.DB, username, passwordHash string) (*model.User, error) {
	res, err := db.Exec("INSERT INTO users (username, password) VALUES (?, ?)", username, passwordHash)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &model.User{ID: id, Username: username}, nil
}

func GetUserByUsername(db *sql.DB, username string) (*model.User, error) {
	u := &model.User{}
	err := db.QueryRow("SELECT id, username, password, created_at, updated_at FROM users WHERE username = ?", username).
		Scan(&u.ID, &u.Username, &u.Password, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func GetUserByID(db *sql.DB, id int64) (*model.User, error) {
	u := &model.User{}
	err := db.QueryRow("SELECT id, username, password, created_at, updated_at FROM users WHERE id = ?", id).
		Scan(&u.ID, &u.Username, &u.Password, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}
