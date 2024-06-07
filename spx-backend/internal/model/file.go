package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

// FileCollection is a map from relative path to universal URL. It is used to
// store files information for [Projetc] and [Asset].
type FileCollection map[string]string

// Scan implements [sql.Scanner].
func (fc *FileCollection) Scan(src any) error {
	switch src := src.(type) {
	case []byte:
		var parsed FileCollection
		if err := json.Unmarshal(src, &parsed); err != nil {
			return fmt.Errorf("failed to unmarshal FileCollection: %w", err)
		}
		*fc = parsed
	case nil:
		*fc = FileCollection{}
	default:
		return errors.New("incompatible type for FileCollection")
	}
	return nil
}

// Value implements [driver.Valuer].
func (fc FileCollection) Value() (driver.Value, error) {
	return json.Marshal(fc)
}
