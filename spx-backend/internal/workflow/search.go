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
	_ INode = (*Search)(nil)
)

type Search struct {
	db *gorm.DB

	next INode
}

func NewSearch(db *gorm.DB) *Search {
	return &Search{
		db: db,
	}
}

func (p *Search) Execute(ctx context.Context, w *Response, r *Request) error {
	v := r.env.Get("reference_id")
	if v != nil {
		id := v.(string)
		result := p.searchByID(ctx, id)

		// Add search result to the output
		if result != nil {
			r.env.Add("reference", result)
		}
		return nil
	}
	// Read the input from the request
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, r.rd); err != nil {
		return fmt.Errorf("failed to read request: %w", err)
	}
	input := buf.String()

	// Look for search pattern in the input
	searchPattern := regexp.MustCompile(`<search>\s*<keys>(.*?)</keys>\s*</search>`)
	matches := searchPattern.FindStringSubmatch(input)

	if len(matches) > 1 {
		// Extract search keys
		keysStr := matches[1]
		keys := strings.Split(keysStr, "|")

		// Trim whitespace from keys
		for i, key := range keys {
			keys[i] = strings.TrimSpace(key)
		}

		// Perform the search
		result := p.search(ctx, keys)

		// Add search result to the output
		if result != nil {
			r.env.Add("reference", result)
			w.output["reference_id"] = result.ID
		}
	} else {
		w.output["error"] = "No search pattern found in the input"
		fmt.Fprintf(w.w, "<error>No search pattern found in the input</error>")
	}

	return nil
}

func (p *Search) GetId() string {
	return "project_search"
}

func (p *Search) GetType() NodeType {
	return NodeTypeLLM
}

func (p *Search) Next(ctx context.Context, env Env) INode {
	return p.next
}

func (p *Search) SetNext(node INode) INode {
	p.next = node
	return p
}

func (p *Search) search(ctx context.Context, keys []string) *model.Project {
	var proj model.Project
	p.db.WithContext(ctx).Where("project.name In ?", keys).Where("project.visibility = ?", model.VisibilityPublic).Limit(1).First(&proj)
	return &proj
}

func (p *Search) searchByID(ctx context.Context, id string) *model.Project {
	var proj model.Project
	p.db.WithContext(ctx).Where("project.id = ?", id).First(&proj)
	return &proj
}
