package model

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
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
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, rc)
			}
		})
	}
}

func TestReferenceCollectionValue(t *testing.T) {
	rc := ReferenceCollection{
		{Type: "project", FullName: "owner/project"},
	}
	value, err := rc.Value()
	assert.NoError(t, err)

	var result ReferenceCollection
	err = json.Unmarshal(value.([]byte), &result)
	assert.NoError(t, err)

	assert.Equal(t, rc, result)
}
