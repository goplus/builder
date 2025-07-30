package aiinteraction

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRenderSystemPrompt(t *testing.T) {
	for _, tt := range []struct {
		name        string
		request     *Request
		wantErr     bool
		checkResult func(t *testing.T, result string)
	}{
		{
			name: "BasicRequestWithOnlyRoleAndCommands",
			request: &Request{
				Role: "TestRole",
				CommandSpecs: []CommandSpec{
					{
						Name:        "TestCommand",
						Description: "A test command",
						Parameters: []CommandParamSpec{
							{
								Name:        "Param1",
								Type:        "string",
								Description: "First parameter",
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(t *testing.T, result string) {
				assert.Contains(t, result, "TestRole")
				assert.Contains(t, result, `"name":"TestCommand","description":"A test command"`)
				assert.Contains(t, result, `"name":"Param1","type":"string","description":"First parameter"`)
				assert.NotContains(t, result, "Role context:")
				assert.NotContains(t, result, "Knowledge base:")
				assert.NotContains(t, result, "Result of the previous command:")
			},
		},
		{
			name: "CompleteRequestWithAllFields",
			request: &Request{
				Role: "Developer",
				RoleContext: map[string]any{
					"experience": "Senior",
					"skills":     []string{"Go", "Testing"},
				},
				KnowledgeBase: map[string]any{
					"documentation": "Go testing guide",
					"version":       1.0,
				},
				CommandSpecs: []CommandSpec{
					{
						Name:        "WriteTest",
						Description: "Write a unit test",
						Parameters: []CommandParamSpec{
							{
								Name:        "TestName",
								Type:        "string",
								Description: "Name of the test",
							},
							{
								Name:        "Coverage",
								Type:        "float64",
								Description: "Desired test coverage",
							},
						},
					},
				},
				PreviousCommandResult: &CommandResult{
					Success:      true,
					ErrorMessage: "",
					IsBreak:      false,
				},
			},
			wantErr: false,
			checkResult: func(t *testing.T, result string) {
				assert.Contains(t, result, "Developer")

				roleContext := map[string]any{
					"experience": "Senior",
					"skills":     []string{"Go", "Testing"},
				}
				roleContextJSON, _ := json.Marshal(roleContext)
				assert.Contains(t, result, string(roleContextJSON))

				knowledgeBase := map[string]any{
					"documentation": "Go testing guide",
					"version":       1.0,
				}
				knowledgeBaseJSON, _ := json.Marshal(knowledgeBase)
				assert.Contains(t, result, string(knowledgeBaseJSON))

				assert.Contains(t, result, `"name":"WriteTest","description":"Write a unit test"`)
				assert.Contains(t, result, `"name":"TestName","type":"string","description":"Name of the test"`)
				assert.Contains(t, result, `"name":"Coverage","type":"float64","description":"Desired test coverage"`)

				assert.Contains(t, result, "**SUCCESS**: Previous command executed successfully.")
				assert.NotContains(t, result, "The interaction was terminated by the command")
			},
		},
		{
			name: "RequestWithFailedPreviousCommand",
			request: &Request{
				Role: "Tester",
				CommandSpecs: []CommandSpec{
					{
						Name:        "RunTest",
						Description: "Run a test case",
					},
				},
				PreviousCommandResult: &CommandResult{
					Success:      false,
					ErrorMessage: "Test failed",
					IsBreak:      false,
				},
			},
			wantErr: false,
			checkResult: func(t *testing.T, result string) {
				assert.Contains(t, result, "**ERROR**:")
				assert.Contains(t, result, "Test failed")
			},
		},
		{
			name: "RequestWithBreakCommand",
			request: &Request{
				Role: "Breaker",
				CommandSpecs: []CommandSpec{
					{
						Name:        "Break",
						Description: "Break the interaction",
					},
				},
				PreviousCommandResult: &CommandResult{
					Success:      true,
					ErrorMessage: "",
					IsBreak:      true,
				},
			},
			wantErr: false,
			checkResult: func(t *testing.T, result string) {
				assert.Contains(t, result, "**SUCCESS**: Previous command executed successfully.")
				assert.Contains(t, result, "The interaction was terminated by the command")
			},
		},
		{
			name: "RequestWithSpecialCharacters",
			request: &Request{
				Role: "Special\"Role\nWith\\Chars",
				CommandSpecs: []CommandSpec{
					{
						Name:        "Special\"Command",
						Description: "Command with \"quotes\" and \n newlines",
						Parameters: []CommandParamSpec{
							{
								Name:        "Special\"Param",
								Type:        "string",
								Description: "Parameter with \"quotes\" and \n newlines",
							},
						},
					},
				},
			},
			wantErr: false,
			checkResult: func(t *testing.T, result string) {
				assert.Contains(t, result, "Special\"Role\nWith\\Chars")
				assert.Contains(t, result, `"name":"Special\"Command"`)
				assert.Contains(t, result, `"description":"Command with \"quotes\" and \n newlines"`)
				assert.Contains(t, result, `"name":"Special\"Param"`)
				assert.Contains(t, result, `"description":"Parameter with \"quotes\" and \n newlines"`)
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			result, err := renderSystemPrompt(tt.request)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.NotEmpty(t, result)
				if tt.checkResult != nil {
					tt.checkResult(t, result)
				}
			}
		})
	}
}
