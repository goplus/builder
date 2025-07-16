package model

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestReferenceCollectionScan(t *testing.T) {
	tests := []struct {
		name     string
		src      any
		expected ReferenceCollection
		wantErr  bool
	}{
		{
			name: "ValidJSON",
			src:  []byte(`[{"type":"project","fullName":"owner/project"}]`),
			expected: ReferenceCollection{
				{Type: "project", FullName: "owner/project"},
			},
			wantErr: false,
		},
		{
			name:     "NilValue",
			src:      nil,
			expected: nil,
			wantErr:  false,
		},
		{
			name:     "InvalidJSON",
			src:      []byte(`invalid json`),
			expected: nil,
			wantErr:  true,
		},
		{
			name:     "IncompatibleType",
			src:      42,
			expected: nil,
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

func TestReferenceCollectionValue(t *testing.T) {
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
