package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"regexp"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/copilot"
)

var (
	ClassifierPrompt = `You are a specialized problem classifier. Your task is to analyze the user's input and determine what type of question or problem they're asking about.

Based on the input, identify the most appropriate category from the following classification options:
{{range $key, $_ := .cases}}
- {{$key}}
{{end}}

Important instructions:
1. Carefully understand the user's question or problem
2. Select ONLY from the classification options listed above
3. If none of the options match the user's input, use: <classifier name="other" />
4. Return ONLY an XML tag in this exact format: <classifier name="selected_classification" />
5. Do not include any explanation, greeting, or additional text
6. Do not wrap your response in markdown code blocks
7. Just return the single XML tag with the appropriate classification

Example proper responses:
<classifier name="math_problem" />
<classifier name="other" />

Remember: Your entire response should consist of only the XML classifier tag with either one of the provided classification options or "other" if no options match.`
)

type NodeClassifier struct {
	copilot *copilot.Copilot // Reference to the copilot client used to communicate with the LLM
	cases   map[string]INode // Map of cases for classification
	def     INode            // default

	system  string            // System prompt template to be rendered with cases
	id      string            // Unique identifier for this node
	prepare func(env Env) Env // Function to prepare the environment before execution
}

func NewClassifierNode(copilot *copilot.Copilot, system string) *NodeClassifier {
	return &NodeClassifier{
		copilot: copilot,
		system:  system,
	}
}

// GetId returns the unique identifier for this node
func (ln *NodeClassifier) GetId() string {
	return ln.id
}

// GetType returns the node type classification (Classifier type)
func (ln *NodeClassifier) GetType() NodeType {
	return NodeTypeClassifier
}

// Prompt renders the system prompt template with environment data
// Uses Go's template engine to replace variables and apply formatting functions
func (ln *NodeClassifier) Prompt() (string, error) {
	// Define custom template functions
	funcMap := template.FuncMap{
		"formatJSON": func(v interface{}) string {
			indented, err := json.MarshalIndent(v, "", "\t")
			if err != nil {
				return fmt.Sprintf("Error formatting JSON: %v", err)
			}
			return string(indented)
		},
	}

	system := fmt.Sprintf("%s\n%s\n", ln.system, ClassifierPrompt)
	tmpl, err := template.New("system").Funcs(funcMap).Parse(system)
	if err != nil {
		return "", err
	}

	var sb strings.Builder
	if err := tmpl.Execute(&sb, map[string]interface{}{
		"cases": ln.cases,
	}); err != nil {
		return "", err
	}

	return sb.String(), nil
}

func (ln *NodeClassifier) Classifier(ctx context.Context, read io.Reader) (string, error) {
	// Read all content from reader
	content, err := io.ReadAll(read)
	if err != nil {
		return "", fmt.Errorf("failed to read classification content: %w", err)
	}

	// Convert to string for regex parsing
	text := string(content)

	// Use regex to find classifier tag
	// Pattern matches: <classifier name="value"/>
	pattern := `<classifier\s+name="([^"]+)"\s*/?>`
	re := regexp.MustCompile(pattern)

	// Find the first match
	matches := re.FindStringSubmatch(text)
	if len(matches) < 2 {
		return "", fmt.Errorf("no classifier tag found or missing name attribute")
	}

	// Extract the name value (captured group)
	name := matches[1]

	return name, nil
}

// Next returns the node corresponding to the classification result
func (ln *NodeClassifier) Next(ctx context.Context, env Env) INode {
	// Get classification from environment
	classification, ok := env.Get("classification").(string)
	if !ok {
		// Default case if classification is missing or not a string
		return nil
	}

	// Look up the corresponding node
	if node, ok := ln.cases[classification]; ok {
		return node
	}

	// Return the default node if no matching case is found
	if ln.def != nil {
		return ln.def
	}

	// Return nil if no matching case is found
	return nil
}

// AddCase adds a new case to the classifier
func (ln *NodeClassifier) AddCase(name string, node INode) *NodeClassifier {
	if ln.cases == nil {
		ln.cases = make(map[string]INode)
	}
	ln.cases[name] = node
	return ln
}

func (ln *NodeClassifier) Default(node INode) *NodeClassifier {
	ln.def = node
	return ln
}

// Prepare sets up the environment for the node before execution
func (ln *NodeClassifier) Prepare(ctx context.Context, env Env) Env {
	if ln.prepare != nil {
		return ln.prepare(env)
	}
	return env
}

func (ln *NodeClassifier) WithPrepare(f func(env Env) Env) *NodeClassifier {
	ln.prepare = f
	return ln
}

// Execute processes the node
func (ln *NodeClassifier) Execute(ctx context.Context, w *Response, r *Request) error {
	// Render the system prompt with the environment data
	prompt, err := ln.Prompt()
	if err != nil {
		return err
	}

	// Prepare parameters for the LLM call
	params := &copilot.Params{
		System: copilot.Content{
			Text: prompt,
		},
	}

	// Get conversation history from environment if available
	msgs := r.env.Get("messages")
	if msgs != nil {
		if messages, ok := msgs.([]copilot.Message); ok {
			params.Messages = messages
		}
	}

	// Stream the message from the LLM
	read, err := ln.copilot.StreamMessage(ctx, params)
	if err != nil {
		return err
	}

	// Classify the response to determine the case
	caseName, err := ln.Classifier(ctx, read)
	if err != nil {
		return err
	}

	// Add the classification result to the output
	w.output["classification"] = caseName

	return err
}
