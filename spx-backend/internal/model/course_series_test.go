package model

import (
	"encoding/json"
	"reflect"
	"testing"
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
			src:      []byte(`["course1","course2"]`),
			expected: CourseIDCollection{"course1", "course2"},
			wantErr:  false,
		},
		{
			name:     "NilValue",
			src:      nil,
			expected: CourseIDCollection{},
			wantErr:  false,
		},
		{
			name:     "InvalidJSON",
			src:      []byte(`invalid json`),
			expected: CourseIDCollection{},
			wantErr:  true,
		},
		{
			name:     "IncompatibleType",
			src:      42,
			expected: CourseIDCollection{},
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var cic CourseIDCollection
			err := cic.Scan(tt.src)
			if (err != nil) != tt.wantErr {
				t.Errorf("CourseIDCollection.Scan() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && !reflect.DeepEqual(cic, tt.expected) {
				t.Errorf("CourseIDCollection.Scan() = %v, want %v", cic, tt.expected)
			}
		})
	}
}

func TestCourseIDCollectionValue(t *testing.T) {
	cic := CourseIDCollection{"course1", "course2"}
	value, err := cic.Value()
	if err != nil {
		t.Errorf("CourseIDCollection.Value() error = %v", err)
		return
	}

	var result CourseIDCollection
	if err := json.Unmarshal(value.([]byte), &result); err != nil {
		t.Errorf("failed to unmarshal returned value: %v", err)
		return
	}

	if !reflect.DeepEqual(result, cic) {
		t.Errorf("CourseIDCollection.Value() = %v, want %v", result, cic)
	}
}
