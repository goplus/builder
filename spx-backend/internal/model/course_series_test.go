package model

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCourseIDCollectionScan(t *testing.T) {
	tests := []struct {
		name     string
		src      any
		expected CourseIDCollection
		wantErr  bool
	}{
		{
			name:     "ValidJSON",
			src:      []byte(`[123, 456]`),
			expected: CourseIDCollection{123, 456},
			wantErr:  false,
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
			var cic CourseIDCollection
			err := cic.Scan(tt.src)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, cic)
			}
		})
	}
}

func TestCourseIDCollectionValue(t *testing.T) {
	cic := CourseIDCollection{123, 456}
	value, err := cic.Value()
	assert.NoError(t, err)

	var result CourseIDCollection
	err = json.Unmarshal(value.([]byte), &result)
	assert.NoError(t, err)

	assert.Equal(t, cic, result)
}
