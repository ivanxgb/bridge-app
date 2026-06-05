package model

type Session struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Windows  int    `json:"windows"`
	Created  string `json:"created"`
	Attached bool   `json:"attached"`
}

type Window struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Active bool   `json:"active"`
	Panes  []Pane `json:"panes"`
}

type Pane struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Active bool   `json:"active"`
	PID    string `json:"pid"`
}
