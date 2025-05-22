package ai

import (
	"reflect"
	"testing"
)

func TestDefaultKnowledgeBase(t *testing.T) {
	originalKB := DefaultKnowledgeBase()
	t.Cleanup(func() { SetDefaultKnowledgeBase(originalKB) })
	SetDefaultKnowledgeBase(nil)

	if got := DefaultKnowledgeBase(); got != nil {
		t.Errorf("got %#v, want nil", got)
	}

	customKB := map[string]any{
		"worldName": "TestWorld",
		"gravity":   9.8,
	}
	SetDefaultKnowledgeBase(customKB)
	if got, want := DefaultKnowledgeBase(), customKB; !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}

	SetDefaultKnowledgeBase(nil)
	if got := DefaultKnowledgeBase(); got != nil {
		t.Errorf("got %#v, want nil", got)
	}
}
