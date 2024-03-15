package core

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gocloud.dev/blob"
)

// customFile wraps *bytes.Reader and adds a Close method to satisfy the multipart.File interface.
type customFile struct {
	*bytes.Reader
}

// The Close method is an empty implementation because *bytes.Reader does not need to be closed. This satisfies the requirements of the multipart.File interface.
func (cf customFile) Close() error {
	return nil
}

type MockBucket struct {
	files map[string]bool
}

func NewMockBucket() *MockBucket {
	return &MockBucket{
		files: make(map[string]bool),
	}
}

func (m *MockBucket) NewWriter(ctx context.Context, key string, opts *blob.WriterOptions) (io.WriteCloser, error) {
	m.files[key] = true
	return &MockWriter{}, nil
}

func (m *MockBucket) Delete(ctx context.Context, key string) error {
	if _, exists := m.files[key]; !exists {
		return errors.New("file not found")
	}
	delete(m.files, key)
	return nil
}

func (m *MockBucket) exists(key string) bool {
	_, exists := m.files[key]
	return exists
}

type MockWriter struct {
}

func (w *MockWriter) Write(p []byte) (n int, err error) {
	// Since map value is bool, we ignore the write content.
	return len(p), nil
}

func (w *MockWriter) Close() error {
	// Nothing to do since content is not stored.
	return nil
}

// mockTime is a helper function for mocking the ctime and utime in tests.
func mockTime(t *testing.T) (ctime, utime time.Time) {
	ctime, err := time.Parse("2006-01-02 15:04:05", "2021-03-01 00:00:00")
	if err != nil {
		t.Fatalf("failed to parse ctime: %v", err)
	}
	utime, err = time.Parse("2006-01-02 15:04:05", "2021-03-01 00:00:00")
	if err != nil {
		t.Fatalf("failed to parse utime: %v", err)
	}
	return ctime, utime
}

func TestProjectInfo(t *testing.T) {
	//Create a simulated database connection
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	// Create a controller instance and use the simulated database connection
	ctrl := &Controller{db: db}
	os.Setenv("QINIU_PATH", "https://qiniu.com")

	// Set the expected database queries and the results returned
	ctime, utime := mockTime(t)
	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "address", "is_public", "status", "version", "c_time", "u_time"}).
		AddRow("1", "testProject", "testUser", "testAddress", 1, 1, 1, ctime, utime)
	mockSQL.ExpectQuery("^SELECT \\* FROM project WHERE id = \\? AND status != \\?").WithArgs("1", 0).WillReturnRows(rows)

	// Call the ProjectInfo method
	project, err := ctrl.ProjectInfo(context.Background(), "1", "testUser")
	if err != nil {
		t.Fatalf("failed to get project info: %v", err)
	}

	// Verify the returned results
	if project.ID != "1" {
		t.Errorf("unexpected id: got %v, want %v", project.ID, "1")
	}
	if project.AuthorId != "testUser" {
		t.Errorf("unexpected author: got %v, want %v", project.AuthorId, "testUser")
	}

	// Make sure that all expected database queries have been made
	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestDeleteProject(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	ctime, utime := mockTime(t)

	mockSQL.ExpectQuery("^SELECT \\* FROM project WHERE id = \\? AND status != \\?$").
		WithArgs("1", 0).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "author_id", "address", "is_public", "status", "version", "c_time", "u_time"}).
			AddRow("1", "testProject", "testUser", "testAddress", 1, 1, 1, ctime, utime))

	mockSQL.ExpectExec("^UPDATE project SET status = \\? WHERE id = \\?$").
		WithArgs(0, "1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err = ctrl.DeleteProject(context.Background(), "1", "testUser")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestSaveProject(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	mockBucket := NewMockBucket()
	ctrl := &Controller{
		db:     db,
		bucket: mockBucket,
	}
	os.Setenv("QINIU_PATH", "https://qiniu.com")
	os.Setenv("PROJECT_PATH", "project/")

	fileContent := []byte("file content")
	file := customFile{Reader: bytes.NewReader(fileContent)}
	fileHeader := &multipart.FileHeader{
		Filename: "testFile.png",
		Size:     int64(len(fileContent)),
	}

	t.Run("create new project", func(t *testing.T) {
		project := &Project{
			Name:     "testProject",
			AuthorId: "testUser",
		}

		mockSQL.ExpectExec("^insert into project \\(name,author_id , address,is_public, status,c_time,u_time\\) values \\(\\?, \\?,\\?, \\?, \\?,\\?, \\?\\)$").
			WithArgs(project.Name, project.AuthorId, sqlmock.AnyArg(), 0, 1, sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(1, 1))

		project, err = ctrl.SaveProject(context.Background(), project, file, fileHeader)
		if err != nil {
			t.Fatalf("failed to save project: %v", err)
		}

		if err := mockSQL.ExpectationsWereMet(); err != nil {
			t.Errorf("there were unfulfilled expectations: %v", err)
		}
		exists := mockBucket.exists(strings.TrimPrefix(project.Address, os.Getenv("QINIU_PATH")+"/"))
		if !exists {
			t.Error("file upload failed")
		}
	})

	t.Run("update existing project", func(t *testing.T) {
		p1 := &Project{
			ID:       "1",
			Name:     "testProject",
			AuthorId: "testUser",
			Address:  "project/5a08ffe2dd57b84f371d9a9031f1ff.zip",
		}
		_, _ = mockBucket.NewWriter(context.Background(), p1.Address, nil)
		mockSQL.ExpectQuery("^SELECT \\* FROM project WHERE id = \\? AND status != \\?$").
			WithArgs(p1.ID, 0).
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "author_id", "address", "is_public", "status", "version", "c_time", "u_time"}).
				AddRow(p1.ID, p1.Name, p1.AuthorId, p1.Address, 1, 1, 1, time.Now(), time.Now()))

		// First, expect a call to Prepare with the specific SQL query.
		mockSQL.ExpectPrepare("^UPDATE project SET version =\\?, name = \\?,address = \\? ,u_time = \\? WHERE id = \\?$")

		// Then, after preparing, expect an Exec call with specific arguments and results.
		mockSQL.ExpectExec("^UPDATE project SET version =\\?, name = \\?,address = \\? ,u_time = \\? WHERE id = \\?$").
			WithArgs(2, p1.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), p1.ID).
			WillReturnResult(sqlmock.NewResult(1, 1))

		p2, err := ctrl.SaveProject(context.Background(), p1, file, fileHeader)
		if err != nil {
			t.Fatalf("failed to save project: %v", err)
		}

		if err := mockSQL.ExpectationsWereMet(); err != nil {
			t.Errorf("there were unfulfilled expectations: %v", err)
		}
		exists := mockBucket.exists(p1.Address)
		if exists {
			t.Error("file delete failed")
		}
		exists = mockBucket.exists(strings.TrimPrefix(p2.Address, os.Getenv("QINIU_PATH")+"/"))
		if !exists {
			t.Error("file upload failed")
		}
	})
}

func TestCodeFmt(t *testing.T) {
	ctrl := &Controller{}
	testCases := []struct {
		name      string
		body      string
		fixImport string
		wantErr   bool
	}{
		{
			name:      "Valid Go Code",
			body:      "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, world!\")\n}\n",
			fixImport: "true",
			wantErr:   false,
		},
		{
			name:      "Invalid Go Code",
			body:      "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, world!\"\n}\n",
			fixImport: "true",
			wantErr:   true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res := ctrl.CodeFmt(context.Background(), tc.body, tc.fixImport)
			if (res.Error.Msg != "") != tc.wantErr {
				t.Errorf("CodeFmt() error = %v, wantErr %v", res.Error.Msg, tc.wantErr)
			}
		})
	}
}

func TestAsset(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	os.Setenv("QINIU_PATH", "https://qiniu.com")
	ctime, utime := mockTime(t)
	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "category", "is_public", "address", "preview_address", "asset_type", "click_count", "status", "c_time", "u_time"}).
		AddRow("1", "testAsset", "testUser", "Fantasy", 1, `{"test": "111.png"}`, "testPreviewAddress", 0, 0, 1, ctime, utime)
	mockSQL.ExpectQuery("^SELECT \\* FROM asset WHERE id = \\? AND status != \\?").WithArgs("1", 0).WillReturnRows(rows)

	asset, err := ctrl.Asset(context.Background(), "1", "testUser")
	if err != nil {
		t.Fatalf("failed to get asset: %v", err)
	}
	if asset.ID != "1" {
		t.Errorf("unexpected id: got %v, want %v", asset.ID, "1")
	}
	if asset.AuthorId != "testUser" {
		t.Errorf("unexpected author: got %v, want %v", asset.AuthorId, "testUser")
	}
	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestAssetList(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	os.Setenv("QINIU_PATH", "https://qiniu.com")
	ctime, utime := mockTime(t)

	countRows := sqlmock.NewRows([]string{"count"}).AddRow(2) // Assuming 2 assets are returned
	mockSQL.ExpectQuery("^SELECT COUNT\\(\\*\\) FROM asset WHERE asset_type = \\? AND author_id = \\? AND is_public = \\? AND category = \\? AND status != \\?").
		WithArgs("111", "testUser", "1", "Fantasy", 0).WillReturnRows(countRows)

	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "category", "is_public", "address", "preview_address", "asset_type", "click_count", "status", "c_time", "u_time"}).
		AddRow("1", "testAsset", "testUser", "Fantasy", "1", `{"test": "111.png"}`, "testPreviewAddress", "111", 0, 1, ctime, utime).
		AddRow("2", "testAsset2", "testUser", "Fantasy", "1", `{"test": "222.png"}`, "testPreviewAddress", "111", 0, 1, ctime, utime)
	mockSQL.ExpectQuery("^SELECT \\* FROM asset WHERE asset_type = \\? AND author_id = \\? AND is_public = \\? AND category = \\? AND status != \\? LIMIT \\?, \\?").
		WithArgs("111", "testUser", "1", "Fantasy", 0, 0, 10).WillReturnRows(rows)

	assets, err := ctrl.AssetList(context.Background(), "1", "10", "111", "Fantasy", "", "", "testUser", "1")
	if err != nil {
		t.Fatalf("failed to get asset list: %v", err)
	}
	if len(assets.Data) == 0 {
		t.Errorf("unexpected empty asset list")
	}
	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestIncrementAssetClickCount(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	assetID := "1"
	mockSQL.ExpectExec("UPDATE asset SET click_count = click_count \\+ 1 WHERE id = ?").
		WithArgs(assetID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err = ctrl.IncrementAssetClickCount(context.Background(), assetID)
	if err != nil {
		t.Fatalf("failed to increment asset click count: %v", err)
	}
	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestModifyAssetAddress(t *testing.T) {
	controller := Controller{}
	os.Setenv("QINIU_PATH", "https://qiniu.com")

	var tests = []struct {
		name     string
		input    string
		expected string
		isError  bool
	}{
		{"Empty json", "{}", "{}", false},
		{"Single property", `{"prop":"prop_val"}`, `{"prop":"https://qiniu.com/prop_val"}`, false},
		{"Multiple properties", `{"prop":"prop_val", "prop2":"prop_val2"}`, `{"prop":"https://qiniu.com/prop_val","prop2":"https://qiniu.com/prop_val2"}`, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := controller.ModifyAssetAddress(tt.input)

			if tt.isError {
				if err == nil {
					t.Errorf("ModifyAssetAddress(%s): expected error, actual nil", tt.input)
					return
				}
			} else {
				if err != nil {
					t.Errorf("ModifyAssetAddress(%s): unexpected error: %s", tt.input, err.Error())
					return
				}

				var actualMap map[string]string
				err = json.Unmarshal([]byte(actual), &actualMap)
				if err != nil {
					t.Errorf("json.Unmarshal(): unexpected error: %s", err.Error())
					return
				}

				var expectedMap map[string]string
				err = json.Unmarshal([]byte(tt.expected), &expectedMap)
				if err != nil {
					t.Errorf("json.Unmarshal(): unexpected error: %s", err.Error())
					return
				}

				if len(actualMap) != len(expectedMap) {
					t.Errorf("ModifyAssetAddress(%s): expected %s, actual %s", tt.input, tt.expected, actual)
					return
				}

				for k, v := range actualMap {
					if v != expectedMap[k] {
						t.Errorf("ModifyAssetAddress(%s): expected %s, actual %s", tt.input, tt.expected, actual)
						return
					}
				}
			}
		})
	}
}

func TestProjectList(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	os.Setenv("QINIU_PATH", "https://qiniu.com")

	pageIndex := "1"
	pageSize := "10"
	isPublic := "1"
	authorId := "testUser"

	ctime, utime := mockTime(t)
	countRows := sqlmock.NewRows([]string{"count"}).AddRow(2) // Assuming 2 projects are returned
	mockSQL.ExpectQuery("^SELECT COUNT\\(\\*\\) FROM project WHERE author_id = \\? AND is_public = \\? AND status != \\?$").
		WithArgs(authorId, isPublic, 0).WillReturnRows(countRows)

	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "address", "is_public", "status", "version", "c_time", "u_time"}).
		AddRow("1", "testProject", "testUser", "testAddress", 1, 1, 1, ctime, utime).
		AddRow("2", "testProject2", "testUser", "testAddress2", 1, 1, 1, ctime, utime)
	mockSQL.ExpectQuery("^SELECT \\* FROM project WHERE author_id = \\? AND is_public = \\? AND status != \\? LIMIT \\?, \\?$").
		WithArgs(authorId, isPublic, 0, 0, 10).WillReturnRows(rows)

	projects, err := ctrl.ProjectList(context.Background(), pageIndex, pageSize, isPublic, authorId)
	if err != nil {
		t.Fatalf("failed to get project list: %v", err)
	}

	if len(projects.Data) == 0 {
		t.Errorf("unexpected empty project list")
	}

	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestUpdatePublic(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	ctime, utime := mockTime(t)

	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "address", "is_public", "status", "version", "c_time", "u_time"}).
		AddRow("1", "testProject", "testUser", "testAddress", 0, 1, 1, ctime, utime) // Assuming the current state before update
	mockSQL.ExpectQuery("^SELECT \\* FROM project WHERE id = \\? AND status != \\?$").
		WithArgs("1", 0).
		WillReturnRows(rows)

	mockSQL.ExpectExec("^UPDATE project SET is_public = \\? WHERE id = \\?$").
		WithArgs("1", "1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err = ctrl.UpdatePublic(context.Background(), "1", "1", "testUser")
	if err != nil {
		t.Fatalf("failed to update public: %v", err)
	}

	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestSearchAsset(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	os.Setenv("QINIU_PATH", "https://qiniu.com")
	mockSQL.ExpectQuery("^SELECT COUNT\\(\\*\\) FROM \\(SELECT \\* FROM asset WHERE name LIKE \\? AND asset_type = \\? AND status = 1 AND \\(is_public = 1 OR author_id = \\?\\)\\) AS count_table$").
		WithArgs("%test%", "0", "testUser").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "category", "is_public", "address", "preview_address", "asset_type", "click_count", "status", "c_time", "u_time"}).
		AddRow("1", "testAsset", "testUser", "testCategory", 1, `{"test": "111.png"}`, "testPreviewAddress", "0", 0, 1, time.Now(), time.Now())
	mockSQL.ExpectQuery("^SELECT \\* FROM asset WHERE name LIKE \\? AND asset_type = \\? AND status = 1 AND \\(is_public = 1 OR author_id = \\?\\) LIMIT \\? OFFSET \\?$").
		WithArgs("%test%", "0", "testUser", 10, 0).
		WillReturnRows(rows)

	_, err = ctrl.SearchAsset(context.Background(), "test", "1", "10", "0", "testUser")
	if err != nil {
		t.Fatalf("failed to search asset: %v", err)
	}
	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}

func TestImagesToGif(t *testing.T) {
	mockBucket := NewMockBucket()
	ctrl := &Controller{
		bucket: mockBucket,
	}
	os.Setenv("QINIU_PATH", "https://qiniu.com")
	os.Setenv("GIF_PATH", "gif/")

	// Define a minimal valid PNG image data
	pngData := []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
		0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
		0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
	}

	// Create a temporary file
	tmpfile, err := os.CreateTemp("", "testImage-*.png")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name()) // Clean up the temporary file

	// Write the minimal PNG data to the temporary file
	if _, err := tmpfile.Write(pngData); err != nil {
		t.Fatal(err)
	}
	if err := tmpfile.Close(); err != nil {
		t.Fatal(err)
	}

	// Reopen the temporary file to construct a *multipart.FileHeader
	f, err := os.Open(tmpfile.Name())
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		t.Fatal(err)
	}

	// Use mime/multipart to create a multipart.FileHeader
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	part, err := w.CreateFormFile("file", fi.Name())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.Copy(part, f); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	// Simulate obtaining *multipart.FileHeader from a Request
	fr := bytes.NewReader(b.Bytes())
	mr, err := multipart.NewReader(fr, w.Boundary()).ReadForm(32 << 20) // 32MB max memory
	if err != nil {
		t.Fatal(err)
	}
	fileHeader := mr.File["file"][0]
	files := []*multipart.FileHeader{fileHeader}

	// Call the method under test
	gifPath, err := ctrl.ImagesToGif(context.Background(), files)
	if err != nil {
		t.Fatalf("failed to create GIF: %v", err)
	}

	exists := mockBucket.exists(strings.TrimPrefix(gifPath, os.Getenv("QINIU_PATH")+"/"))
	if !exists {
		t.Error("file upload failed")
	}
}

func TestUploadAsset(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()
	mockBucket := NewMockBucket()
	ctrl := &Controller{
		db:     db,
		bucket: mockBucket,
	}
	os.Setenv("SPRITE_PATH", "sprite/")
	os.Setenv("BACKGROUND_PATH", "background/")
	os.Setenv("SOUNDS_PATH", "sounds/")

	// Create a temporary file
	tmpfile, err := os.CreateTemp("", "testFile-*.png")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name()) // Clean up the temporary file

	// Write test data to the temporary file
	fileContent := []byte("file content")
	if _, err := tmpfile.Write(fileContent); err != nil {
		t.Fatal(err)
	}
	if err := tmpfile.Close(); err != nil {
		t.Fatal(err)
	}

	// Reopen the temporary file to construct a *multipart.FileHeader
	f, err := os.Open(tmpfile.Name())
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		t.Fatal(err)
	}

	// Use mime/multipart to create a multipart.FileHeader
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	part, err := w.CreateFormFile("file", fi.Name())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.Copy(part, f); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	// Simulate obtaining *multipart.FileHeader from a Request
	fr := bytes.NewReader(b.Bytes())
	mr, err := multipart.NewReader(fr, w.Boundary()).ReadForm(32 << 20) // 32MB max memory
	if err != nil {
		t.Fatal(err)
	}
	fileHeader := mr.File["file"][0]
	files := []*multipart.FileHeader{fileHeader}

	mockSQL.ExpectExec("^insert into asset \\(name,author_id , address,preview_address,is_public,status,asset_type,category, c_time,u_time\\) values \\(\\?, \\?, \\?,\\?,\\?,\\?, \\?,\\?,\\?, \\?\\)$").
		WithArgs("test", "testUser", sqlmock.AnyArg(), "previewAddress", 1, 1, "0", "tag", sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err = ctrl.UploadAsset(context.Background(), "test", files, "previewAddress", "testUser", "tag", "1", "0")
	if err != nil {
		t.Fatalf("failed to upload asset: %v", err)
	}

	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
	if len(mockBucket.files) == 0 {
		t.Errorf("file upload failed")
	}

}

func TestDeleteAsset(t *testing.T) {
	db, mockSQL, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	ctrl := &Controller{db: db}
	ctime, utime := mockTime(t)

	rows := sqlmock.NewRows([]string{"id", "name", "author_id", "category", "is_public", "address", "preview_address", "asset_type", "click_count", "status", "c_time", "u_time"}).
		AddRow("1", "testAsset", "testUser", "testCategory", 1, `{"test": "111.png"}`, "testPreviewAddress", "0", 0, 1, ctime, utime)
	mockSQL.ExpectQuery("^SELECT \\* FROM asset WHERE id = \\? AND status != \\?$").
		WithArgs("1", 0).
		WillReturnRows(rows)

	mockSQL.ExpectExec("^UPDATE asset SET status = \\? WHERE id = \\?$").
		WithArgs(0, "1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err = ctrl.DeleteAsset(context.Background(), "1", "testUser")
	if err != nil {
		t.Fatalf("failed to delete asset: %v", err)
	}

	if err := mockSQL.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %v", err)
	}
}
