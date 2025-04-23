package workflow

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"regexp"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

var (
	// Type assertion to ensure Search implements the INode interface
	_ INode = (*Search)(nil)
)

// Search represents a node that searches for projects in the database
// It can search by ID or by keywords extracted from the input text
type Search struct {
	db   *gorm.DB // Database connection for performing queries
	next INode    // Reference to the next node in the workflow
}

// NewSearch creates a new search node with the given database connection
func NewSearch(db *gorm.DB) *Search {
	return &Search{
		db: db,
	}
}

// Execute processes the search operation based on input
// It can search by ID from environment or by extracting search keys from input text
func (p *Search) Execute(ctx context.Context, w *Response, r *Request) error {
	// First check if a reference_id exists in the environment
	v := r.env.Get("reference_id")
	if v != nil {
		// If ID exists, perform direct ID-based search
		id := v.(string)
		result := p.searchByID(ctx, id)

		// Add search result to the environment
		if result != nil {
			r.env.Add("reference", result)
		}
		return nil
	}

	// Otherwise, read the input from the request to extract search keys
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, r.rd); err != nil {
		return fmt.Errorf("failed to read request: %w", err)
	}
	input := buf.String()

	// Look for search pattern in the input using regex
	// Pattern matches content between <search><keys>...</keys></search> tags
	searchPattern := regexp.MustCompile(`<search>\s*<keys>(.*?)</keys>\s*</search>`)
	matches := searchPattern.FindStringSubmatch(input)

	if len(matches) > 1 {
		// Extract search keys from the matched pattern
		keysStr := matches[1]
		keys := strings.Split(keysStr, "|")

		// Trim whitespace from all keys
		for i, key := range keys {
			keys[i] = strings.TrimSpace(key)
		}

		// Perform the search with the extracted keys
		result := p.search(ctx, keys)

		// Add search result to the environment and output
		if result != nil {
			r.env.Add("reference", result)
			w.output["reference_id"] = result.ID
		}
	} else {
		// No search pattern found, report error
		w.output["error"] = "No search pattern found in the input"
		fmt.Fprintf(w.w, "<error>No search pattern found in the input</error>")
	}

	return nil
}

// GetId returns the unique identifier for this node
func (p *Search) GetId() string {
	return "project_search"
}

// GetType returns the node type classification
func (p *Search) GetType() NodeType {
	return NodeTypeSearch
}

// Next returns the next node in the workflow
func (p *Search) Next(ctx context.Context, env Env) INode {
	return p.next
}

// SetNext sets the next node in the workflow chain
// Returns this node to enable method chaining
func (p *Search) SetNext(node INode) INode {
	p.next = node
	return p
}

// search performs a database query to find projects matching any of the provided keys
// Returns the first matching public project found
func (p *Search) search(ctx context.Context, keys []string) *model.Project {
	var proj model.Project
	p.db.WithContext(ctx).Where("project.name In ?", keys).Where("project.visibility = ?", model.VisibilityPublic).Limit(1).First(&proj)
	return &proj
}

// searchByID performs a database query to find a project with the specified ID
// Returns the matching project or nil if not found
func (p *Search) searchByID(ctx context.Context, id string) *model.Project {
	var proj model.Project
	p.db.WithContext(ctx).Where("project.id = ?", id).First(&proj)
	return &proj
}
