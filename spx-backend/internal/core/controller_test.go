package core

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"os"
	"strconv"
	"strings"
	"testing"
)

const token = "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImNlcnQtYnVpbHQtaW4iLCJ0eXAiOiJKV1QifQ.eyJvd25lciI6IkdvUGx1cyIsIm5hbWUiOiJ5dWRpbmcteCIsImNyZWF0ZWRUaW1lIjoiMjAyNC0wMi0yMlQwMjoxODoxNloiLCJ1cGRhdGVkVGltZSI6IjIwMjQtMDMtMDdUMTY6MjQ6MDRaIiwiZGVsZXRlZFRpbWUiOiIiLCJpZCI6IjUyOTUxNDQyIiwidHlwZSI6Im5vcm1hbC11c2VyIiwicGFzc3dvcmQiOiIiLCJwYXNzd29yZFNhbHQiOiIiLCJwYXNzd29yZFR5cGUiOiJwbGFpbiIsImRpc3BsYXlOYW1lIjoieXVkaW5nIiwiZmlyc3ROYW1lIjoiIiwibGFzdE5hbWUiOiIiLCJhdmF0YXIiOiJodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvNTI5NTE0NDI_dj00IiwiYXZhdGFyVHlwZSI6IiIsInBlcm1hbmVudEF2YXRhciI6IiIsImVtYWlsIjoiIiwiZW1haWxWZXJpZmllZCI6ZmFsc2UsInBob25lIjoiIiwiY291bnRyeUNvZGUiOiIiLCJyZWdpb24iOiIiLCJsb2NhdGlvbiI6IiIsImFkZHJlc3MiOltdLCJhZmZpbGlhdGlvbiI6IiIsInRpdGxlIjoiIiwiaWRDYXJkVHlwZSI6IiIsImlkQ2FyZCI6IiIsImhvbWVwYWdlIjoiIiwiYmlvIjoiIiwibGFuZ3VhZ2UiOiIiLCJnZW5kZXIiOiIiLCJiaXJ0aGRheSI6IiIsImVkdWNhdGlvbiI6IiIsInNjb3JlIjowLCJrYXJtYSI6MCwicmFua2luZyI6MTYsImlzRGVmYXVsdEF2YXRhciI6ZmFsc2UsImlzT25saW5lIjpmYWxzZSwiaXNBZG1pbiI6ZmFsc2UsImlzRm9yYmlkZGVuIjpmYWxzZSwiaXNEZWxldGVkIjpmYWxzZSwic2lnbnVwQXBwbGljYXRpb24iOiJhcHBsaWNhdGlvbl94OGFldmsiLCJoYXNoIjoiIiwicHJlSGFzaCI6IiIsImFjY2Vzc0tleSI6IiIsImFjY2Vzc1NlY3JldCI6IiIsImdpdGh1YiI6IjUyOTUxNDQyIiwiZ29vZ2xlIjoiIiwicXEiOiIiLCJ3ZWNoYXQiOiIiLCJmYWNlYm9vayI6IiIsImRpbmd0YWxrIjoiIiwid2VpYm8iOiIiLCJnaXRlZSI6IiIsImxpbmtlZGluIjoiIiwid2Vjb20iOiIiLCJsYXJrIjoiIiwiZ2l0bGFiIjoiIiwiY3JlYXRlZElwIjoiIiwibGFzdFNpZ25pblRpbWUiOiIiLCJsYXN0U2lnbmluSXAiOiIiLCJwcmVmZXJyZWRNZmFUeXBlIjoiIiwicmVjb3ZlcnlDb2RlcyI6bnVsbCwidG90cFNlY3JldCI6IiIsIm1mYVBob25lRW5hYmxlZCI6ZmFsc2UsIm1mYUVtYWlsRW5hYmxlZCI6ZmFsc2UsImxkYXAiOiIiLCJwcm9wZXJ0aWVzIjp7Im5vIjoiMTciLCJvYXV0aF9HaXRIdWJfYXZhdGFyVXJsIjoiaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzUyOTUxNDQyP3Y9NCIsIm9hdXRoX0dpdEh1Yl9kaXNwbGF5TmFtZSI6Inl1ZGluZyIsIm9hdXRoX0dpdEh1Yl9pZCI6IjUyOTUxNDQyIiwib2F1dGhfR2l0SHViX3VzZXJuYW1lIjoieXVkaW5nLXgifSwicm9sZXMiOltdLCJwZXJtaXNzaW9ucyI6W10sImdyb3VwcyI6W10sImxhc3RTaWduaW5Xcm9uZ1RpbWUiOiIiLCJzaWduaW5Xcm9uZ1RpbWVzIjowLCJ0b2tlblR5cGUiOiJhY2Nlc3MtdG9rZW4iLCJ0YWciOiIiLCJzY29wZSI6InByb2ZpbGUiLCJpc3MiOiJodHRwczovL2Nhc2Rvb3ItY29tbXVuaXR5LnFpbml1LmlvIiwic3ViIjoiNTI5NTE0NDIiLCJhdWQiOlsiMzg5MzEzZGY1MWZmZDIwOTNiMmYiXSwiZXhwIjoxNzEwNDM3MzgzLCJuYmYiOjE3MDk4MzI1ODMsImlhdCI6MTcwOTgzMjU4MywianRpIjoiYWRtaW4vYWE0OTJhYzYtN2Q0MC00YWMxLTgyZGMtNjI5YzgxZDc4MjQyIn0.bUhwtO_r97ffrAS8QZqzjRwDg29G2baFecRO9gpvpS-mvLmuayyn3bbxg-k8BtgVPh9whNGzcvcsOHtxdacyBTn0JPVJrJRjqt7yscl9nxRDGE1jugaEcQrRc7ns4EvI-petXgfHn_YjNeubA2O8TZLsybpAz04oGofUVjqGDr3ZhmBX8qTSHmNVCrYM-1R8Cn44EiXKBK4x8sNgeuy-KA5mzyc9942YJs0nygFmrPxcNlanqbrEaAxaOuJB4hha0nLoIjcxFWBzuq9C3yVaCWewPDVaVh_Ljb17kTjOYDbK9-dQ2gTY2RewAZ7WSSSssZw9KrwzWKGskRQAKxyXta6FmT77l4NebcJ2Oi50JuMs7gveA0XKvf_WVI1ME0JR0NOHbBZ3hwZCzETLFJanyVXu0GVQ30Qdd_4RlvKCrViRxtgmUKSeaBIb-FXllmA6zviSugFnSuQTal_Z7WB3mVuoU53VrxXfpFuJWYWkl8ANTivg_djShkrLzDlQyhpNoQHGtPUIVvIO6eazhT-wA4b1Kl09PJGtYzMKMc5JUHUaN3O5VOmqm5YDrA2SGkAQhh560IgsDjJXR00xi4KCsPZ35Q-7-8fMrgQVjnJBIXTzc2UHiNmuEV8xGG_Yc8VyDjonAmYwo33Uwk4F9aM-svM8WXK8T_3y-EycCFgSdGM"

// customFile wraps *bytes.Reader and adds a Close method to satisfy the multipart.File interface.
type customFile struct {
	*bytes.Reader
}

// The Close method is an empty implementation because *bytes.Reader does not need to be closed. This satisfies the requirements of the multipart.File interface.
func (cf customFile) Close() error {
	return nil
}

func TestProjectInfo(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	pid := "57"
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}
	project, err := ctrl.ProjectInfo(context.Background(), pid, currentUid)
	if err != nil {
		t.Fatalf("failed to get project info: %v", err)
	}
	if project.ID != pid {
		t.Errorf("unexpected project: got %v, want %v", project.ID, pid)
	}
	if project.AuthorId != currentUid {
		t.Errorf("unexpected author: got %v, want %v", project.AuthorId, currentUid)
	}
}

func TestDeleteProject(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}
	pid := "61"
	err = ctrl.DeleteProject(context.Background(), pid, currentUid)
	if err != nil {
		t.Fatalf("failed to delete project: %v", err)
	}
	project, _ := ctrl.ProjectInfo(context.Background(), pid, currentUid)
	if project != nil {
		t.Errorf("failed to delete project: %v", err)
	}
}

func TestSaveProject(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}
	c1 := &Project{
		Name:     "testName",
		AuthorId: currentUid,
	}
	c2 := &Project{
		ID:       "3",
		Name:     "test",
		AuthorId: currentUid,
		Address:  os.Getenv("QINIU_PATH") + "/" + "project/6bd55a2588340135d94a9c780710c15047ee4058801c5611ae95227969061f23",
		Version:  1,
	}

	fileContent := []byte("file content")
	file := customFile{Reader: bytes.NewReader(fileContent)}
	fileHeader := &multipart.FileHeader{
		Filename: "testFile",
		Size:     int64(len(fileContent)),
	}

	savedCodeFile, err := ctrl.SaveProject(context.Background(), c1, file, fileHeader)
	if err != nil {
		t.Fatalf("failed to save all project: %v", err)
	}

	savedCodeFile, err = ctrl.SaveProject(context.Background(), c2, file, fileHeader)
	if err != nil {
		t.Fatalf("failed to save all project: %v", err)
	}

	if savedCodeFile.ID != c2.ID {
		t.Errorf("unexpected id: got %v, want %v", savedCodeFile.ID, c2.ID)
	}
}

func TestCodeFmt(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create controller: %v", err)
	}

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
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

	assetID := "6"
	asset, err := ctrl.Asset(context.Background(), assetID, currentUid)
	if err != nil {
		t.Fatalf("failed to get asset: %v", err)
	}

	if asset.ID != assetID {
		t.Errorf("unexpected id: got %v, want %v", asset.ID, assetID)
	}
	if asset.AuthorId != currentUid {
		t.Errorf("unexpected author: got %v, want %v", asset.AuthorId, currentUid)
	}
	if asset.IsPublic != 1 {
		t.Errorf("unexpected public: got %v, want %v", asset.IsPublic, 1)
	}
}

func TestAssetList(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

	pageIndex := "1"
	pageSize := "10"
	assetType := "0"
	category := "Fantasy"
	isOrderByTime := "true"
	isOrderByHot := "true"
	isPublic := "1"

	assets, err := ctrl.AssetList(context.Background(), pageIndex, pageSize, assetType, category, isOrderByTime, isOrderByHot, currentUid, isPublic)
	if err != nil {
		t.Fatalf("failed to get public asset list: %v", err)
	}

	if len(assets.Data) == 0 {
		t.Errorf("unexpected empty asset list")
	}
}

func TestIncrementAssetClickCount(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	assetID := "3"
	err = ctrl.IncrementAssetClickCount(context.Background(), assetID)
	if err != nil {
		t.Fatalf("failed to increment asset click count: %v", err)
	}
}

func TestModifyAssetAddress(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create controller: %v", err)
	}

	testCases := []struct {
		name    string
		address string
		wantErr bool
	}{
		{
			name:    "Valid Address",
			address: `{"image": "image.png"}`,
			wantErr: false,
		},
		{
			name:    "Invalid Address",
			address: `"image": "invalid.png"`,
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ctrl.ModifyAssetAddress(tc.address)
			if (err != nil) != tc.wantErr {
				t.Errorf("ModifyAssetAddress() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}

func TestProjectList(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

	pageIndex := "1"
	pageSize := "10"
	isPublic := "1"
	projects, err := ctrl.ProjectList(context.Background(), pageIndex, pageSize, isPublic, currentUid)
	if err != nil {
		t.Fatalf("failed to get public project list: %v", err)
	}

	if len(projects.Data) == 0 {
		t.Errorf("unexpected empty project list")
	}
}

func TestUpdatePublic(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

	id := "54"
	isPublic := 1
	err = ctrl.UpdatePublic(context.Background(), id, strconv.Itoa(isPublic), currentUid)
	if err != nil {
		t.Fatalf("failed to update public: %v", err)
	}
	project, _ := ctrl.ProjectInfo(context.Background(), id, currentUid)
	if project.IsPublic != isPublic {
		t.Error("failed to update public")
	}
}

func TestSearchAsset(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

	search := "run"
	pageIndex := "1"
	pageSize := "10"
	assetType := "0"

	assets, err := ctrl.SearchAsset(context.Background(), search, pageIndex, pageSize, assetType, currentUid)
	if err != nil {
		t.Fatalf("failed to search asset: %v", err)
	}

	if len(assets.Data) == 0 {
		t.Errorf("unexpected empty asset list")
	}
}

func TestImagesToGif(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create controller: %v", err)
	}

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

	if gifPath == "" {
		t.Errorf("gifPath should not be empty")
	}
}

func TestUploadAsset(t *testing.T) {
	ctrl, err := New(context.Background(), &Config{})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	CasdoorConfigInit()
	trueToken := strings.TrimPrefix(token, "Bearer ")
	currentUid, err := ctrl.GetUser(trueToken)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}

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

	name := "testAsset"
	previewAddress := "https://example.com/preview.png"
	tag := "testTag"
	publishState := "1"
	assetType := "2"

	err = ctrl.UploadAsset(context.Background(), name, files, previewAddress, currentUid, tag, publishState, assetType)
	if err != nil {
		t.Fatalf("failed to upload asset: %v", err)
	}
}
