package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

// CourseSeries is the model for course series.
type CourseSeries struct {
	Model

	// OwnerID is the ID of the course series owner.
	OwnerID int64 `gorm:"column:owner_id;index"`
	Owner   User  `gorm:"foreignKey:OwnerID"`

	// Title is the title of the course series.
	Title string `gorm:"column:title;index:,class:FULLTEXT"`

	// Thumbnail is the universal URL of the course series's thumbnail image.
	Thumbnail string `gorm:"column:thumbnail"`

	// Description is the description of the course series.
	Description string `gorm:"column:description"`

	// CourseIDs contains the array of course IDs included in this series.
	CourseIDs CourseIDCollection `gorm:"column:course_ids"`

	// Order is the order/priority of the course series for sorting.
	Order int `gorm:"column:order;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (CourseSeries) TableName() string {
	return "course_series"
}

// CourseIDCollection is a slice of course IDs. It is used to store course IDs information.
type CourseIDCollection []int64

// Scan implements [sql.Scanner].
func (cic *CourseIDCollection) Scan(src any) error {
	switch src := src.(type) {
	case []byte:
		var parsed CourseIDCollection
		if err := json.Unmarshal(src, &parsed); err != nil {
			return fmt.Errorf("failed to unmarshal CourseIDCollection: %w", err)
		}
		*cic = parsed
	case nil:
		*cic = nil
	default:
		return errors.New("incompatible type for CourseIDCollection")
	}
	return nil
}

// Value implements [driver.Valuer].
func (cic CourseIDCollection) Value() (driver.Value, error) {
	return json.Marshal(cic)
}
