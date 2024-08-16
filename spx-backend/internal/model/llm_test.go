package model

import (
	"context"
	"database/sql"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/llm"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
	"time"
)

func TestChatByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		cTime := time.Now()

		mock.ExpectQuery(`SELECT \* FROM llm_chat WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "current_chat_length", "messages", "c_time", "owner", "status"}).
				AddRow("llm-test-1", 5, `[{"role":"user","content":"hi"}]`, cTime, "user1", StatusNormal))

		chat, err := ChatByID(context.Background(), db, "llm-test-1")
		require.NoError(t, err)
		require.NotNil(t, chat)
		assert.Equal(t, "llm-test-1", chat.ID)
		assert.Equal(t, 5, chat.CurrentChatLength)
		assert.Equal(t, cTime, chat.CTime)
		assert.Equal(t, "user1", chat.Owner)
		assert.Equal(t, StatusNormal, chat.Status)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM llm_chat WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))

		chat, err := ChatByID(context.Background(), db, "llm-test-1")
		require.Error(t, err)
		assert.Nil(t, chat)
	})

	t.Run("CheckExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM llm_chat WHERE id = \? AND status != \?`).
			WillReturnRows(mock.NewRows([]string{"count"}).
				AddRow(1))

		flag, err := CheckChatExistByID(context.Background(), db, "llm-test-1")
		require.NoError(t, err)
		assert.True(t, flag)
	})
}

func TestCreateChat(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO llm_chat \(.+\) VALUES \(\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewResult(1, 1))

		chat := &LLMChat{
			ID:                "llm-insert-1",
			CurrentChatLength: 5,
			CTime:             time.Now(),
			Messages:          llm.Messages{{Content: "hi", Role: "user"}},
			Owner:             "user1",
			Status:            0,
		}
		err = CreateChat(context.Background(), db, chat)
		require.NoError(t, err)
	})

	t.Run("InsertError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO llm_chat \(.+\) VALUES \(\?,\?,\?,\?,\?,\?\)`).
			WillReturnError(sql.ErrConnDone)

		chat := &LLMChat{
			ID:                "1",
			CurrentChatLength: 5,
			CTime:             time.Now(),
			Messages:          llm.Messages{{Content: "hi", Role: "user"}},
			Owner:             "user1",
			Status:            0,
		}

		err = CreateChat(context.Background(), db, chat)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestUpdateChatMessageByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE llm_chat SET messages = \?, current_chat_length = \? WHERE id = \?`).
			WithArgs(llm.Messages{{Content: "hi", Role: "user"}}, 6, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM llm_chat WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "current_chat_length", "messages"}).
				AddRow("1", 6, llm.Messages{{Content: "hi", Role: "user"}}))

		updatedChat, err := UpdateChatMessageByID(context.Background(), db, &LLMChat{
			ID:                "1",
			Messages:          llm.Messages{{Content: "hi", Role: "user"}},
			CurrentChatLength: 6,
		})
		require.NoError(t, err)
		require.NotNil(t, updatedChat)
		assert.Equal(t, 6, updatedChat.CurrentChatLength)
		assert.Equal(t, llm.Messages{{Content: "hi", Role: "user"}}, updatedChat.Messages)
	})

	t.Run("UpdateError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE llm_chat SET messages = \?, current_chat_length = \? WHERE id = \?`).
			WithArgs(llm.Messages{{Content: "hi", Role: "user"}}, 6, "1").
			WillReturnError(sql.ErrConnDone)

		updatedChat, err := UpdateChatMessageByID(context.Background(), db, &LLMChat{
			ID:                "1",
			Messages:          llm.Messages{{Content: "hi", Role: "user"}},
			CurrentChatLength: 6,
		})
		require.Error(t, err)
		assert.Nil(t, updatedChat)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestDeleteChatByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE llm_chat SET status = \? WHERE id = \?`).
			WithArgs(StatusDeleted, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))

		err = DeleteChatByID(context.Background(), db, "1")
		require.NoError(t, err)
	})

	t.Run("DeleteError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE llm_chat SET status = \? WHERE id = \?`).
			WithArgs(StatusDeleted, "1").
			WillReturnError(sql.ErrConnDone)

		err = DeleteChatByID(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}
