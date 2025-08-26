package model

import (
	"testing"
	"time"
)

func TestAIResourceTableName(t *testing.T) {
	resource := AIResource{}
	if got := resource.TableName(); got != "aiResource" {
		t.Errorf("AIResource.TableName() = %v, want %v", got, "aiResource")
	}
}

func TestLabelTableName(t *testing.T) {
	label := Label{}
	if got := label.TableName(); got != "label" {
		t.Errorf("Label.TableName() = %v, want %v", got, "label")
	}
}

func TestResourceLabelTableName(t *testing.T) {
	resourceLabel := ResourceLabel{}
	if got := resourceLabel.TableName(); got != "resource_label" {
		t.Errorf("ResourceLabel.TableName() = %v, want %v", got, "resource_label")
	}
}

func TestResourceUsageStatsTableName(t *testing.T) {
	stats := ResourceUsageStats{}
	if got := stats.TableName(); got != "resource_usage_stats" {
		t.Errorf("ResourceUsageStats.TableName() = %v, want %v", got, "resource_usage_stats")
	}
}

func TestAIResourceFields(t *testing.T) {
	resource := AIResource{
		Model: Model{
			ID:        1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		URL: "https://example.com/image.svg",
	}
	
	if resource.URL == "" {
		t.Error("AIResource URL field should not be empty")
	}
	
	if resource.ID == 0 {
		t.Error("AIResource ID should not be zero")
	}
}

func TestLabelFields(t *testing.T) {
	label := Label{
		Model: Model{
			ID:        1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		LabelName: "test-label",
	}
	
	if label.LabelName == "" {
		t.Error("Label LabelName field should not be empty")
	}
	
	if label.ID == 0 {
		t.Error("Label ID should not be zero")
	}
}

func TestResourceUsageStatsFields(t *testing.T) {
	stats := ResourceUsageStats{
		ID:             1,
		AIResourceID:   123,
		ViewCount:      10,
		SelectionCount: 5,
		LastUsedAt:     time.Now(),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	
	if stats.AIResourceID == 0 {
		t.Error("ResourceUsageStats AIResourceID should not be zero")
	}
	
	if stats.ViewCount < 0 {
		t.Error("ResourceUsageStats ViewCount should not be negative")
	}
	
	if stats.SelectionCount < 0 {
		t.Error("ResourceUsageStats SelectionCount should not be negative")
	}
}