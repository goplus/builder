package core

import (
	"context"
	"database/sql"
	"fmt"
	"gocloud.dev/blob"
	"io"
	"path/filepath"
	"strconv"
	"time"

	"golang.org/x/crypto/scrypt"
)

// UploadFile Upload file to cloud
func UploadFile(ctx context.Context, bucket Bucket, blobKey string, file io.Reader, originalFilename string) (string, error) {
	// Extract file extension
	ext := filepath.Ext(originalFilename)

	var contentType string
	if ext == ".svg" {
		contentType = "image/svg+xml"
	}
	// Create blob writer with content type
	wOpts := &blob.WriterOptions{
		ContentType: contentType,
	}
	//File name encryption
	blobKey = blobKey + Encrypt(time.Now().String(), originalFilename) + ext

	// create blob writer
	w, err := bucket.NewWriter(ctx, blobKey, wOpts)
	if err != nil {
		fmt.Printf("failed to create blob writer : %v", err)
		return "", err
	}
	defer w.Close()

	// copy to blob writer
	_, err = io.Copy(w, file)
	if err != nil {
		fmt.Printf("failed to copy to blob writer : %v", err)
		return "", err
	}

	// close writer file
	return blobKey, w.Close()
}

func Encrypt(salt, password string) string {
	dk, _ := scrypt.Key([]byte(password), []byte(salt), 32768, 8, 1, 32)
	return fmt.Sprintf("%x", string(dk))
}

func AddAsset(db *sql.DB, c *Asset) (string, error) {
	sqlStr := "insert into asset (name,author_id , address,preview_address,is_public,status,asset_type,category, c_time,u_time) values (?, ?, ?,?,?,?, ?,?,?, ?)"
	res, err := db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, c.PreviewAddress, c.IsPublic, c.Status, c.AssetType, c.Category, time.Now(), time.Now())
	if err != nil {
		fmt.Printf("failed to add Asset : %v", err)
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func UpdateProject(db *sql.DB, c *Project) error {
	stmt, err := db.Prepare("UPDATE project SET version =?, name = ?,address = ? ,u_time = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Version, c.Name, c.Address, time.Now(), c.ID)
	return err
}
func UpdateProjectIsPublic(db *sql.DB, id string, isPublic string) error {
	query := "UPDATE project SET is_public = ? WHERE id = ?"
	_, err := db.Exec(query, isPublic, id)
	if err != nil {
		fmt.Printf("failed to exec update ispublic : %v", err)
		return err
	}
	return nil
}
func AddProject(db *sql.DB, c *Project) (string, error) {
	sqlStr := "insert into project (name,author_id , address,is_public, status,c_time,u_time) values (?, ?,?, ?, ?,?, ?)"
	res, err := db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, c.IsPublic, c.Status, c.Ctime, c.Utime)
	if err != nil {
		fmt.Printf("failed to exec add project : %v", err)
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func DeleteProjectById(db *sql.DB, id string) error {
	query := "UPDATE project SET status = ? WHERE id = ?"
	_, err := db.Exec(query, 0, id)
	if err != nil {
		fmt.Printf("failed to exec delete project id = %v : %v", id, err)
		return err
	}
	return nil
}
func DeleteAssetById(db *sql.DB, id string) error {
	query := "UPDATE asset SET status = ? WHERE id = ?"
	_, err := db.Exec(query, 0, id)
	if err != nil {
		fmt.Printf("failed to exec delete asset id = %v : %v", id, err)
		return err
	}
	return nil
}
