package server

import (
	"errors"
	"fmt"
	"go/types"
	"io/fs"
	"strings"

	"github.com/goplus/builder/tools/spxls/internal"
	"github.com/goplus/builder/tools/spxls/internal/jsonrpc2"
)

// MessageReplier is an interface for sending messages back to the client.
type MessageReplier interface {
	// ReplyMessage sends a message back to the client.
	//
	// The message can be one of:
	//   - [jsonrpc2.Response]: sent in response to a call.
	//   - [jsonrpc2.Notification]: sent for server-initiated notifications.
	ReplyMessage(m jsonrpc2.Message) error
}

// Server is the core language server implementation that handles LSP messages
type Server struct {
	workspaceRootURI   DocumentURI
	workspaceRootFS    fs.ReadDirFS
	spxResourceRootDir string
	replier            MessageReplier
	importer           types.Importer
}

// New creates a new Server instance.
func New(workspaceRootFS fs.ReadDirFS, replier MessageReplier) *Server {
	return &Server{
		workspaceRootURI: "file:///", // TODO: Allow setting this via the `initialize` request.
		workspaceRootFS:  workspaceRootFS,
		replier:          replier,
		importer:         internal.NewImporter(nil),
	}
}

// HandleMessage handles an incoming LSP message.
func (s *Server) HandleMessage(m jsonrpc2.Message) error {
	switch m := m.(type) {
	case *jsonrpc2.Call:
		return s.handleCall(m)
	case *jsonrpc2.Notification:
		return s.handleNotification(m)
	}
	return fmt.Errorf("unsupported message type: %T", m)
}

// handleCall handles a call message.
func (s *Server) handleCall(c *jsonrpc2.Call) error {
	switch c.Method() {
	case "initialize":
		var params InitializeParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "shutdown":
		s.runWithResponse(c.ID(), func() (any, error) {
			return nil, nil // Protocol conformance only.
		})
	case "textDocument/hover":
		var params HoverParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/inlayHint":
		var params InlayHintParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "inlayHint/resolve":
		var hint InlayHint
		if err := UnmarshalJSON(c.Params(), &hint); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/completion":
		var params CompletionParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "completionItem/resolve":
		var item CompletionItem
		if err := UnmarshalJSON(c.Params(), &item); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/signatureHelp":
		var params SignatureHelpParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/declaration":
		var params DeclarationParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/definition":
		var params DefinitionParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/typeDefinition":
		var params TypeDefinitionParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/implementation":
		var params ImplementationParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/references":
		var params ReferenceParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/documentHighlight":
		var params DocumentHighlightParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/documentLink":
		var params DocumentLinkParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.runWithResponse(c.ID(), func() (any, error) {
			return s.textDocumentDocumentLink(&params)
		})
	case "documentLink/resolve":
		var params DocumentLink
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.runWithResponse(c.ID(), func() (any, error) {
			return s.documentLinkResolve(&params)
		})
	case "textDocument/documentSymbol":
		var params DocumentSymbolParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "workspace/symbol":
		var params WorkspaceSymbolParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "workspaceSymbol/resolve":
		var params WorkspaceSymbol
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/diagnostic":
		var params DocumentDiagnosticParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.runWithResponse(c.ID(), func() (any, error) {
			return s.textDocumentDiagnostic(&params)
		})
	case "workspace/diagnostic":
		var params WorkspaceDiagnosticParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.runWithResponse(c.ID(), func() (any, error) {
			return s.workspaceDiagnostic(&params)
		})
	case "textDocument/codeAction":
		var params CodeActionParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/formatting":
		var params DocumentFormattingParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.runWithResponse(c.ID(), func() (any, error) {
			return s.textDocumentFormatting(&params)
		})
	case "textDocument/rename":
		var params RenameParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "textDocument/semanticTokens/full":
		var params SemanticTokensParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		return errors.New("TODO")
	case "workspace/executeCommand":
		var params ExecuteCommandParams
		if err := UnmarshalJSON(c.Params(), &params); err != nil {
			return s.replyParseError(c.ID(), err)
		}
		s.runWithResponse(c.ID(), func() (any, error) {
			return s.workspaceExecuteCommand(&params)
		})
	default:
		return s.replyMethodNotFound(c.ID(), c.Method())
	}
	return nil
}

// handleNotification handles a notification message.
func (s *Server) handleNotification(n *jsonrpc2.Notification) error {
	switch n.Method() {
	case "initialized":
		var params InitializedParams
		if err := UnmarshalJSON(n.Params(), &params); err != nil {
			return fmt.Errorf("failed to parse initialized params: %w", err)
		}
		return errors.New("TODO")
	case "exit":
		return nil // Protocol conformance only.
	case "textDocument/didOpen":
		var params DidOpenTextDocumentParams
		if err := UnmarshalJSON(n.Params(), &params); err != nil {
			return fmt.Errorf("failed to parse didOpen params: %w", err)
		}
		return errors.New("TODO")
	case "textDocument/didChange":
		var params DidChangeTextDocumentParams
		if err := UnmarshalJSON(n.Params(), &params); err != nil {
			return fmt.Errorf("failed to parse didChange params: %w", err)
		}
		return errors.New("TODO")
	case "textDocument/didSave":
		var params DidSaveTextDocumentParams
		if err := UnmarshalJSON(n.Params(), &params); err != nil {
			return fmt.Errorf("failed to parse didSave params: %w", err)
		}
		return errors.New("TODO")
	case "textDocument/didClose":
		var params DidCloseTextDocumentParams
		if err := UnmarshalJSON(n.Params(), &params); err != nil {
			return fmt.Errorf("failed to parse didClose params: %w", err)
		}
		return errors.New("TODO")
	default:
		return fmt.Errorf("unsupported notification method: %s", n.Method())
	}
	return nil
}

// publishDiagnostics sends diagnostic notifications to the client.
func (s *Server) publishDiagnostics(uri DocumentURI, diagnostics []Diagnostic) error {
	params := &PublishDiagnosticsParams{
		URI:         uri,
		Diagnostics: diagnostics,
	}
	n, err := jsonrpc2.NewNotification("textDocument/publishDiagnostics", params)
	if err != nil {
		return fmt.Errorf("failed to create diagnostic notification: %w", err)
	}
	return s.replier.ReplyMessage(n)
}

// run runs the given function in a goroutine and replies to the client with any
// errors.
func (s *Server) run(id jsonrpc2.ID, fn func() error) {
	go func() {
		if err := fn(); err != nil {
			s.replyError(id, err)
		}
	}()
}

// runWithResponse runs the given function in a goroutine and handles the response.
func (s *Server) runWithResponse(id jsonrpc2.ID, fn func() (any, error)) {
	s.run(id, func() error {
		result, err := fn()
		resp, err := jsonrpc2.NewResponse(id, result, err)
		if err != nil {
			return err
		}
		return s.replier.ReplyMessage(resp)
	})
}

// replyError replies to the client with an error response.
func (s *Server) replyError(id jsonrpc2.ID, err error) error {
	resp, err := jsonrpc2.NewResponse(id, nil, err)
	if err != nil {
		return err
	}
	return s.replier.ReplyMessage(resp)
}

// replyMethodNotFound replies to the client with a method not found error response.
func (s *Server) replyMethodNotFound(id jsonrpc2.ID, method string) error {
	return s.replyError(id, fmt.Errorf("%w: %s", jsonrpc2.ErrMethodNotFound, method))
}

// replyParseError replies to the client with a parse error response.
func (s *Server) replyParseError(id jsonrpc2.ID, err error) error {
	return s.replyError(id, fmt.Errorf("%w: %s", jsonrpc2.ErrParse, err))
}

// fromDocumentURI returns the relative path from a [DocumentURI].
func (s *Server) fromDocumentURI(documentURI DocumentURI) (string, error) {
	uri := string(documentURI)
	rootURI := string(s.workspaceRootURI)
	if !strings.HasPrefix(uri, rootURI) {
		return "", fmt.Errorf("document URI %q does not have workspace root URI %q as prefix", uri, rootURI)
	}
	return strings.TrimPrefix(uri, rootURI), nil
}

// toDocumentURI returns the [DocumentURI] for a relative path.
func (s *Server) toDocumentURI(path string) DocumentURI {
	return DocumentURI(string(s.workspaceRootURI) + path)
}

// spxFiles returns a list of .spx files in the workspace root.
func (s *Server) spxFiles() ([]string, error) {
	entries, err := s.workspaceRootFS.ReadDir(".")
	if err != nil {
		return nil, err
	}
	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(entry.Name(), ".spx") {
			continue
		}
		files = append(files, entry.Name())
	}
	return files, nil
}
