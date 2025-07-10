package controller

import (
	"context"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestControllerEnsureCourseSeries(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
	require.NoError(t, err)
	generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:     model.Model{ID: 1},
			OwnerID:   mUser.ID,
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		courseSeries, err := ctrl.ensureCourseSeries(ctx, mCourseSeries.ID, false)
		require.NoError(t, err)
		assert.Equal(t, mCourseSeries.ID, courseSeries.ID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseSeriesNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mCourseSeriesID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeriesID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.ensureCourseSeries(ctx, mCourseSeriesID, false)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get course series")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID + 1,
			Title:   "Test Course Series",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mCourseSeries.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mCourseSeries.OwnerID},
				Username: "otheruser",
			})...))

		_, err := ctrl.ensureCourseSeries(ctx, mCourseSeries.ID, true)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCreateCourseSeriesParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{"1", "2", "3"},
			Order:     1,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithEmptyCourseIDs", func(t *testing.T) {
		params := &CreateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{},
			Order:     1,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithNilCourseIDs", func(t *testing.T) {
		params := &CreateCourseSeriesParams{
			Title: "Test Course Series",
			Order: 1,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
		assert.NotNil(t, params.CourseIDs)
		assert.Empty(t, params.CourseIDs)
	})

	t.Run("MissingTitle", func(t *testing.T) {
		params := &CreateCourseSeriesParams{
			Title:     "",
			CourseIDs: []string{"1", "2"},
			Order:     1,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing title", msg)
	})

	t.Run("InvalidTitle", func(t *testing.T) {
		params := &CreateCourseSeriesParams{
			Title:     strings.Repeat("a", 201),
			CourseIDs: []string{"1", "2"},
			Order:     1,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid title", msg)
	})
}

func TestControllerCreateCourseSeries(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
	require.NoError(t, err)
	generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &CreateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{"1", "2", "3"},
			Order:     1,
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.CourseSeries{
				OwnerID:   mUser.ID,
				Title:     params.Title,
				CourseIDs: model.CourseIDCollection(params.CourseIDs),
				Order:     params.Order,
			}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			First(&model.CourseSeries{Model: model.Model{ID: 1}}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(model.CourseSeries{
				Model:     model.Model{ID: 1},
				OwnerID:   mUser.ID,
				Title:     params.Title,
				CourseIDs: model.CourseIDCollection(params.CourseIDs),
				Order:     params.Order,
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		courseSeriesDTO, err := ctrl.CreateCourseSeries(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.Title, courseSeriesDTO.Title)
		assert.Equal(t, params.CourseIDs, courseSeriesDTO.CourseIDs)
		assert.Equal(t, params.Order, courseSeriesDTO.Order)
		assert.Equal(t, mUser.Username, courseSeriesDTO.Owner)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &CreateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     1,
		}

		_, err := ctrl.CreateCourseSeries(context.Background(), params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
	})
}

func TestListCourseSeriesOrderBy(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, ListCourseSeriesOrderByCreatedAt.IsValid())
		assert.True(t, ListCourseSeriesOrderByUpdatedAt.IsValid())
		assert.True(t, ListCourseSeriesOrderByOrder.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, ListCourseSeriesOrderBy("invalid").IsValid())
	})
}

func TestListCourseSeriesParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := NewListCourseSeriesParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidOrderBy", func(t *testing.T) {
		params := NewListCourseSeriesParams()
		params.OrderBy = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid orderBy", msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListCourseSeriesParams()
		params.SortOrder = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sortOrder", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListCourseSeriesParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerListCourseSeries(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
	require.NoError(t, err)
	generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := NewListCourseSeriesParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.CourseSeries{}).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.CourseSeries{}).
			Order("course_series.order asc, course_series.id").
			Offset(params.Pagination.Offset()).
			Limit(params.Pagination.Size).
			Find(&[]model.CourseSeries{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(
				generateCourseSeriesDBRows(
					model.CourseSeries{Model: model.Model{ID: 1}, OwnerID: mUser.ID, Title: "Series 1", Order: 1},
					model.CourseSeries{Model: model.Model{ID: 2}, OwnerID: mUser.ID, Title: "Series 2", Order: 2},
				)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListCourseSeries(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		require.Len(t, result.Data, 2)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithOwnerFilter", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := NewListCourseSeriesParams()
		owner := "testowner"
		params.Owner = &owner

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.CourseSeries{}).
			Joins("JOIN user ON user.id = course_series.owner_id").
			Where("user.username = ?", owner).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.CourseSeries{}).
			Joins("JOIN user ON user.id = course_series.owner_id").
			Where("user.username = ?", owner).
			Order("course_series.order asc, course_series.id").
			Offset(params.Pagination.Offset()).
			Limit(params.Pagination.Size).
			Find(&[]model.CourseSeries{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(
				generateCourseSeriesDBRows(
					model.CourseSeries{Model: model.Model{ID: 1}, OwnerID: mUser.ID, Title: "Series 1", Order: 1},
				)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListCourseSeries(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		require.Len(t, result.Data, 1)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetCourseSeries(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
	require.NoError(t, err)
	generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:     model.Model{ID: 1},
			OwnerID:   mUser.ID,
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		courseSeriesDTO, err := ctrl.GetCourseSeries(ctx, "1")
		require.NoError(t, err)
		assert.Equal(t, "1", courseSeriesDTO.ID)
		assert.Equal(t, mCourseSeries.Title, courseSeriesDTO.Title)
		assert.Equal(t, mUser.Username, courseSeriesDTO.Owner)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseSeriesNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", int64(1)).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetCourseSeries(ctx, "1")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get course series")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidID", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		_, err := ctrl.GetCourseSeries(ctx, "invalid")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid course series id")
	})
}

func TestUpdateCourseSeriesParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"1", "2", "3"},
			Order:     2,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithEmptyCourseIDs", func(t *testing.T) {
		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{},
			Order:     2,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithNilCourseIDs", func(t *testing.T) {
		params := &UpdateCourseSeriesParams{
			Title: "Updated Course Series",
			Order: 2,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
		assert.NotNil(t, params.CourseIDs)
		assert.Empty(t, params.CourseIDs)
	})

	t.Run("MissingTitle", func(t *testing.T) {
		params := &UpdateCourseSeriesParams{
			Title:     "",
			CourseIDs: []string{"1", "2"},
			Order:     2,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing title", msg)
	})

	t.Run("InvalidTitle", func(t *testing.T) {
		params := &UpdateCourseSeriesParams{
			Title:     strings.Repeat("a", 201),
			CourseIDs: []string{"1", "2"},
			Order:     2,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid title", msg)
	})
}

func TestUpdateCourseSeriesParamsDiff(t *testing.T) {
	t.Run("NoChanges", func(t *testing.T) {
		mCourseSeries := &model.CourseSeries{
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}
		params := &UpdateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     1,
		}
		updates := params.Diff(mCourseSeries)
		assert.Empty(t, updates)
	})

	t.Run("TitleChanged", func(t *testing.T) {
		mCourseSeries := &model.CourseSeries{
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}
		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     1,
		}
		updates := params.Diff(mCourseSeries)
		assert.Len(t, updates, 1)
		assert.Equal(t, "Updated Course Series", updates["title"])
	})

	t.Run("CourseIDsChanged", func(t *testing.T) {
		mCourseSeries := &model.CourseSeries{
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}
		params := &UpdateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{"1", "2", "3"},
			Order:     1,
		}
		updates := params.Diff(mCourseSeries)
		assert.Len(t, updates, 1)
		assert.Equal(t, model.CourseIDCollection{"1", "2", "3"}, updates["course_ids"])
	})

	t.Run("OrderChanged", func(t *testing.T) {
		mCourseSeries := &model.CourseSeries{
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}
		params := &UpdateCourseSeriesParams{
			Title:     "Test Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     2,
		}
		updates := params.Diff(mCourseSeries)
		assert.Len(t, updates, 1)
		assert.Equal(t, 2, updates["order"])
	})

	t.Run("AllChanged", func(t *testing.T) {
		mCourseSeries := &model.CourseSeries{
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}
		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"3", "4", "5"},
			Order:     2,
		}
		updates := params.Diff(mCourseSeries)
		assert.Len(t, updates, 3)
		assert.Equal(t, "Updated Course Series", updates["title"])
		assert.Equal(t, model.CourseIDCollection{"3", "4", "5"}, updates["course_ids"])
		assert.Equal(t, 2, updates["order"])
	})
}

func TestControllerUpdateCourseSeries(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
	require.NoError(t, err)
	generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:     model.Model{ID: 1},
			OwnerID:   mUser.ID,
			Title:     "Test Course Series",
			CourseIDs: model.CourseIDCollection{"1", "2"},
			Order:     1,
		}

		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"1", "2", "3"},
			Order:     2,
		}

		// Mock ensureCourseSeries call
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		// Mock user authorization check
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		// Mock update operation
		dbMock.ExpectBegin()
		dbMock.ExpectExec(regexp.QuoteMeta("UPDATE `course_series` SET `course_ids`=?,`order`=?,`title`=?,`updated_at`=? WHERE `course_series`.`deleted_at` IS NULL AND `id` = ?")).
			WithArgs(sqlmock.AnyArg(), params.Order, params.Title, sqlmock.AnyArg(), mCourseSeries.ID).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		courseSeriesDTO, err := ctrl.UpdateCourseSeries(ctx, "1", params)
		require.NoError(t, err)
		assert.Equal(t, params.Title, courseSeriesDTO.Title)
		assert.Equal(t, params.CourseIDs, courseSeriesDTO.CourseIDs)
		assert.Equal(t, params.Order, courseSeriesDTO.Order)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseSeriesNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     2,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", int64(1)).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.UpdateCourseSeries(ctx, "1", params)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get course series")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID + 1, // Different owner
			Title:   "Test Course Series",
		}

		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     2,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mCourseSeries.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mCourseSeries.OwnerID},
				Username: "otheruser",
			})...))

		_, err := ctrl.UpdateCourseSeries(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidID", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := &UpdateCourseSeriesParams{
			Title:     "Updated Course Series",
			CourseIDs: []string{"1", "2"},
			Order:     2,
		}

		_, err := ctrl.UpdateCourseSeries(ctx, "invalid", params)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid course series id")
	})
}

func TestControllerDeleteCourseSeries(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
	require.NoError(t, err)
	generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID,
			Title:   "Test Course Series",
		}

		// Mock ensureCourseSeries call
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		// Mock user authorization check
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		// Mock delete operation
		dbMock.ExpectBegin()
		dbMock.ExpectExec(regexp.QuoteMeta("UPDATE `course_series` SET `deleted_at`=? WHERE `course_series`.`id` = ? AND `course_series`.`deleted_at` IS NULL")).
			WithArgs(sqlmock.AnyArg(), mCourseSeries.ID).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		err = ctrl.DeleteCourseSeries(ctx, "1")
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseSeriesNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", int64(1)).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		err := ctrl.DeleteCourseSeries(ctx, "1")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get course series")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID + 1, // Different owner
			Title:   "Test Course Series",
		}

		// Mock ensureCourseSeries call
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseSeries.ID).
			First(&model.CourseSeries{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseSeriesDBColumns).AddRows(generateCourseSeriesDBRows(mCourseSeries)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mCourseSeries.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mCourseSeries.OwnerID},
				Username: "otheruser",
			})...))

		err := ctrl.DeleteCourseSeries(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidID", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		err := ctrl.DeleteCourseSeries(ctx, "invalid")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid course series id")
	})
}
