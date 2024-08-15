package model

import (
	"context"
	"database/sql"
	"github.com/goplus/builder/spx-backend/internal/llm"
	"github.com/goplus/builder/spx-backend/internal/log"
	"time"
)

// LLMChat is the model for every single chat.
type LLMChat struct {
	// ID is the identifier for check chat.
	ID string `db:"id" json:"id"`

	// CurrentChatLength record the current chat length.
	CurrentChatLength int `db:"current_chat_length" json:"current_chat_length"`

	// CTime is the creation time.
	CTime time.Time `db:"c_time" json:"c_time"`

	// Messages is a list contains every message.
	Messages llm.Messages `db:"messages" json:"messages"`

	// Owner is the name of the chat owner.
	Owner string `db:"owner" json:"owner"`

	// Status indicates if the asset is deleted.
	Status Status `db:"status" json:"status"`
}

// TableLLMChat is the table name of [LLMChat] in database.
const TableLLMChat = "llm_chat"

func CheckChatExistByID(ctx context.Context, db *sql.DB, id string) (bool, error) {
	return ExistsByID(ctx, db, TableLLMChat, id)
}

func ChatByID(ctx context.Context, db *sql.DB, id string) (*LLMChat, error) {
	return QueryByID[LLMChat](ctx, db, TableLLMChat, id)
}

func CreateChat(ctx context.Context, db *sql.DB, c *LLMChat) error {
	return CreateWithoutSkip(ctx, db, TableLLMChat, c)
}

func UpdateChatMessageByID(ctx context.Context, db *sql.DB, c *LLMChat) (*LLMChat, error) {
	logger := log.GetReqLogger(ctx)
	if err := UpdateByIDWithoutUTime(ctx, db, TableLLMChat, c.ID, c, "messages", "current_chat_length"); err != nil {
		logger.Printf("UpdateByID failed: %v", err)
		return nil, err
	}
	return ChatByID(ctx, db, c.ID)
}

func DeleteChatByID(ctx context.Context, db *sql.DB, id string) error {
	return UpdateByIDWithoutUTime(ctx, db, TableLLMChat, id, &LLMChat{Status: StatusDeleted}, "status")
}
