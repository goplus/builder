package core

import (
	"context"
	"strings"
	"testing"
)

func TestGetUser(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	userId, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}
	uid := "52951442"
	if userId != uid {
		t.Errorf("unexpected user id: got %v, want %v", userId, uid)
	}
}
