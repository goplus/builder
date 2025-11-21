package controller

import (
	"context"
	"regexp"
	"strconv"
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

func TestControllerEnsureCourse(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	defer closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseDBColumns, err := modeltest.ExtractDBColumns(db, model.Course{})
	require.NoError(t, err)
	generateCourseDBRows, err := modeltest.NewDBRowsGenerator(db, model.Course{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID,
			Title:      "Test Course",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			Prompt:     "Test prompt",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		course, err := ctrl.ensureCourse(ctx, mCourse.ID, false)
		require.NoError(t, err)
		assert.Equal(t, mCourse.ID, course.ID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mCourseID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.ensureCourse(ctx, mCourseID, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID + 1,
			Title:   "Test Course",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mCourse.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mCourse.OwnerID},
				Username: "otheruser",
			})...))

		_, err := ctrl.ensureCourse(ctx, mCourse.ID, true)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCreateCourseParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateCourseParams{
			Title:      "Test Course",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("MissingTitle", func(t *testing.T) {
		params := &CreateCourseParams{
			Title:      "",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing title", msg)
	})

	t.Run("InvalidTitle", func(t *testing.T) {
		params := &CreateCourseParams{
			Title:      strings.Repeat("a", 201),
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid title", msg)
	})

	t.Run("MissingThumbnail", func(t *testing.T) {
		params := &CreateCourseParams{
			Title:      "Test Course",
			Thumbnail:  "",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing thumbnail", msg)
	})

	t.Run("MissingEntrypoint", func(t *testing.T) {
		params := &CreateCourseParams{
			Title:      "Test Course",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing entrypoint", msg)
	})
}

func TestControllerCreateCourse(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	defer closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseDBColumns, err := modeltest.ExtractDBColumns(db, model.Course{})
	require.NoError(t, err)
	generateCourseDBRows, err := modeltest.NewDBRowsGenerator(db, model.Course{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &CreateCourseParams{
			Title:      "Test Course",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Course{
				OwnerID:    mUser.ID,
				Title:      params.Title,
				Thumbnail:  params.Thumbnail,
				Entrypoint: params.Entrypoint,
				References: params.References,
				Prompt:     params.Prompt,
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
			First(&model.Course{Model: model.Model{ID: 1}}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(model.Course{
				Model:      model.Model{ID: 1},
				OwnerID:    mUser.ID,
				Title:      params.Title,
				Thumbnail:  params.Thumbnail,
				Entrypoint: params.Entrypoint,
				References: params.References,
				Prompt:     params.Prompt,
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		courseDTO, err := ctrl.CreateCourse(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.Title, courseDTO.Title)
		assert.Equal(t, params.Thumbnail, courseDTO.Thumbnail)
		assert.Equal(t, params.Entrypoint, courseDTO.Entrypoint)
		assert.Equal(t, params.References, courseDTO.References)
		assert.Equal(t, params.Prompt, courseDTO.Prompt)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &CreateCourseParams{
			Title:      "Test Course",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Test prompt",
		}

		_, err := ctrl.CreateCourse(context.Background(), params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
	})
}

func TestListCoursesOrderBy(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, ListCoursesOrderByCreatedAt.IsValid())
		assert.True(t, ListCoursesOrderByUpdatedAt.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, ListCoursesOrderBy("invalid").IsValid())
	})
}

func TestListCoursesParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := NewListCoursesParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidOrderBy", func(t *testing.T) {
		params := NewListCoursesParams()
		params.OrderBy = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid orderBy", msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListCoursesParams()
		params.SortOrder = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sortOrder", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListCoursesParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerListCourses(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	defer closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseDBColumns, err := modeltest.ExtractDBColumns(db, model.Course{})
	require.NoError(t, err)
	generateCourseDBRows, err := modeltest.NewDBRowsGenerator(db, model.Course{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := NewListCoursesParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Course{}).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Order("course.created_at asc, course.id").
			Offset(params.Pagination.Offset()).
			Limit(params.Pagination.Size).
			Find(&[]model.Course{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(
				generateCourseDBRows(
					model.Course{Model: model.Model{ID: 1}, OwnerID: mUser.ID, Title: "Course 1"},
					model.Course{Model: model.Model{ID: 2}, OwnerID: mUser.ID, Title: "Course 2"},
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

		result, err := ctrl.ListCourses(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		require.Len(t, result.Data, 2)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("OrderBySequenceInCourseSeries", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourseSeries := model.CourseSeries{
			Model:     model.Model{ID: 100},
			OwnerID:   mUser.ID,
			CourseIDs: model.CourseIDCollection{2, 1},
		}
		courseSeriesIDStr := strconv.FormatInt(mCourseSeries.ID, 10)

		params := NewListCoursesParams()
		params.CourseSeriesID = &courseSeriesIDStr
		params.OrderBy = ListCoursesOrderBySequenceInCourseSeries

		// Mock ensureCourseSeries
		courseSeriesDBColumns, err := modeltest.ExtractDBColumns(db, model.CourseSeries{})
		require.NoError(t, err)
		generateCourseSeriesDBRows, err := modeltest.NewDBRowsGenerator(db, model.CourseSeries{})
		require.NoError(t, err)

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
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{Model: model.Model{ID: mCourseSeries.OwnerID}})...))

		// Mock ListCourses query
		// Note: The query will have WHERE IN (2, 1) and ORDER BY FIELD(course.id, 2, 1) ASC, course.id
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Course{}).
			Where("course.id IN ?", []int64{2, 1}).
			Count(new(int64)).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		// The IN clause args might be order-dependent in sqlmock, or treated as a set.
		// GORM expands IN clause.
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("course.id IN ?", []int64{2, 1}).
			Order("FIELD(course.id, 2,1) asc"). // The constructed string
			Offset(params.Pagination.Offset()).
			Limit(params.Pagination.Size).
			Find(&[]model.Course{}).
			Statement
		// We need to be careful with the expected SQL regex because GORM might add extra spaces or parens.
		// The key part is ORDER BY FIELD(course.id, 2,1)
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(
				generateCourseDBRows(
					model.Course{Model: model.Model{ID: 2}, OwnerID: mUser.ID, Title: "Course 2"},
					model.Course{Model: model.Model{ID: 1}, OwnerID: mUser.ID, Title: "Course 1"},
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

		result, err := ctrl.ListCourses(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		require.Len(t, result.Data, 2)
		assert.Equal(t, "Course 2", result.Data[0].Title)
		assert.Equal(t, "Course 1", result.Data[1].Title)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetCourse(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	defer closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseDBColumns, err := modeltest.ExtractDBColumns(db, model.Course{})
	require.NoError(t, err)
	generateCourseDBRows, err := modeltest.NewDBRowsGenerator(db, model.Course{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID,
			Title:      "Test Course",
			Thumbnail:  "test-thumbnail.png",
			Entrypoint: "main.spx",
			Prompt:     "Test prompt",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		course, err := ctrl.GetCourse(ctx, "1")
		require.NoError(t, err)
		assert.Equal(t, strconv.FormatInt(mCourse.ID, 10), course.ID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mCourseID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetCourse(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestUpdateCourseParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("MissingTitle", func(t *testing.T) {
		params := &UpdateCourseParams{
			Title:      "",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing title", msg)
	})

	t.Run("InvalidTitle", func(t *testing.T) {
		params := &UpdateCourseParams{
			Title:      strings.Repeat("a", 201),
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid title", msg)
	})

	t.Run("MissingThumbnail", func(t *testing.T) {
		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing thumbnail", msg)
	})

	t.Run("MissingEntrypoint", func(t *testing.T) {
		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing entrypoint", msg)
	})
}

func TestUpdateCourseParamsDiff(t *testing.T) {
	t.Run("AllFieldsChanged", func(t *testing.T) {
		mCourse := &model.Course{
			Title:      "Original Course",
			Thumbnail:  "original-thumbnail.png",
			Entrypoint: "original.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Original prompt",
		}

		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{{Type: "project", FullName: "owner/project"}},
			Prompt:     "Updated prompt",
		}

		updates := params.Diff(mCourse)
		assert.Equal(t, 5, len(updates))
		assert.Equal(t, "Updated Course", updates["title"])
		assert.Equal(t, "updated-thumbnail.png", updates["thumbnail"])
		assert.Equal(t, "main.spx", updates["entrypoint"])
		assert.Equal(t, "Updated prompt", updates["prompt"])
	})

	t.Run("NoFieldsChanged", func(t *testing.T) {
		mCourse := &model.Course{
			Title:      "Same Course",
			Thumbnail:  "same-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Same prompt",
		}

		params := &UpdateCourseParams{
			Title:      "Same Course",
			Thumbnail:  "same-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Same prompt",
		}

		updates := params.Diff(mCourse)
		assert.Equal(t, 0, len(updates))
	})
}

func TestReferencesEqual(t *testing.T) {
	t.Run("EqualReferences", func(t *testing.T) {
		ref1 := model.ReferenceCollection{}
		ref2 := model.ReferenceCollection{}
		assert.True(t, referencesEqual(ref1, ref2))
	})

	t.Run("DifferentLength", func(t *testing.T) {
		ref1 := model.ReferenceCollection{{Type: "project", FullName: "owner/project"}}
		ref2 := model.ReferenceCollection{}
		assert.False(t, referencesEqual(ref1, ref2))
	})
}

func TestControllerUpdateCourse(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	defer closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseDBColumns, err := modeltest.ExtractDBColumns(db, model.Course{})
	require.NoError(t, err)
	generateCourseDBRows, err := modeltest.NewDBRowsGenerator(db, model.Course{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID,
			Title:      "Original Course",
			Thumbnail:  "original-thumbnail.png",
			Entrypoint: "original.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Original prompt",
		}

		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMock.ExpectBegin()

		updates := params.Diff(&mCourse)
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&mCourse).
			Omit("Owner").
			Updates(updates).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[len(dbMockArgs)-2] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		courseDTO, err := ctrl.UpdateCourse(ctx, "1", params)
		require.NoError(t, err)
		assert.Equal(t, params.Title, courseDTO.Title)
		assert.Equal(t, params.Thumbnail, courseDTO.Thumbnail)
		assert.Equal(t, params.Entrypoint, courseDTO.Entrypoint)
		assert.Equal(t, params.Prompt, courseDTO.Prompt)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mCourseID int64 = 1

		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.UpdateCourse(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID + 1,
			Title:   "Original Course",
		}

		params := &UpdateCourseParams{
			Title:      "Updated Course",
			Thumbnail:  "updated-thumbnail.png",
			Entrypoint: "main.spx",
			References: model.ReferenceCollection{},
			Prompt:     "Updated prompt",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mCourse.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mCourse.OwnerID},
				Username: "otheruser",
			})...))

		_, err := ctrl.UpdateCourse(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerDeleteCourse(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	defer closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	courseDBColumns, err := modeltest.ExtractDBColumns(db, model.Course{})
	require.NoError(t, err)
	generateCourseDBRows, err := modeltest.NewDBRowsGenerator(db, model.Course{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID,
			Title:   "Course to Delete",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&mCourse).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // DeletedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.DeleteCourse(ctx, "1")
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CourseNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mCourseID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourseID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		err := ctrl.DeleteCourse(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mCourse := model.Course{
			Model:   model.Model{ID: 1},
			OwnerID: mUser.ID + 1,
			Title:   "Course to Delete",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Preload("Owner").
			Where("id = ?", mCourse.ID).
			First(&model.Course{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(courseDBColumns).AddRows(generateCourseDBRows(mCourse)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mCourse.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mCourse.OwnerID},
				Username: "otheruser",
			})...))

		err := ctrl.DeleteCourse(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidID", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		err := ctrl.DeleteCourse(ctx, "invalid")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid course id")
	})
}
