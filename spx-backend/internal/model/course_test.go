package model

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestReferenceCollection_Scan(t *testing.T) {
	tests := []struct {
		name     string
		src      any
		expected ReferenceCollection
		wantErr  bool
	}{
		{
			name: "valid JSON",
			src:  []byte(`[{"type":"project","fullName":"owner/project"}]`),
			expected: ReferenceCollection{
				{Type: "project", FullName: "owner/project"},
			},
			wantErr: false,
		},
		{
			name:     "nil value",
			src:      nil,
			expected: ReferenceCollection{},
			wantErr:  false,
		},
		{
			name:     "invalid JSON",
			src:      []byte(`invalid json`),
			expected: ReferenceCollection{},
			wantErr:  true,
		},
		{
			name:     "incompatible type",
			src:      42,
			expected: ReferenceCollection{},
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var rc ReferenceCollection
			err := rc.Scan(tt.src)
			if (err != nil) != tt.wantErr {
				t.Errorf("ReferenceCollection.Scan() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && !reflect.DeepEqual(rc, tt.expected) {
				t.Errorf("ReferenceCollection.Scan() = %v, want %v", rc, tt.expected)
			}
		})
	}
}

func TestReferenceCollection_Value(t *testing.T) {
	rc := ReferenceCollection{
		{Type: "project", FullName: "owner/project"},
	}
	value, err := rc.Value()
	if err != nil {
		t.Errorf("ReferenceCollection.Value() error = %v", err)
		return
	}

	var result ReferenceCollection
	if err := json.Unmarshal(value.([]byte), &result); err != nil {
		t.Errorf("failed to unmarshal returned value: %v", err)
		return
	}

	if !reflect.DeepEqual(result, rc) {
		t.Errorf("ReferenceCollection.Value() = %v, want %v", result, rc)
	}
}
