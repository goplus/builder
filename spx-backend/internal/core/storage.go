package core

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"time"

	"golang.org/x/crypto/scrypt"
)

// UploadFile Upload file to cloud
func UploadFile(ctx context.Context, ctrl *Controller, blobKey string, file io.Reader, originalFilename string) (string, error) {
	// Extract file extension
	ext := filepath.Ext(originalFilename)

	//File name encryption
	blobKey = blobKey + Encrypt(time.Now().String(), originalFilename) + ext

	// create blob writer
	w, err := ctrl.bucket.NewWriter(ctx, blobKey, nil)
	if err != nil {
		return "", err
	}
	defer w.Close()

	// copy to blob writer
	_, err = io.Copy(w, file)
	if err != nil {
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
		println(err.Error())
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func GetAssetAddress(id string, db *sql.DB) string {
	var address string
	query := "SELECT address FROM asset WHERE id = ?"
	err := db.QueryRow(query, id).Scan(&address)
	if err != nil {
		return ""
	}
	return address
}

func UpdateAsset(db *sql.DB, c *Asset) error {
	stmt, err := db.Prepare("UPDATE asset SET name = ?, address = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Name, c.Address, c.ID)
	return err
}

func UpdateProject(db *sql.DB, c *Project) error {
	stmt, err := db.Prepare("UPDATE project SET version =?, name = ?,address = ? ,u_time = ? WHERE id = ?;")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Version, c.Name, c.Address, time.Now(), c.ID)
	return err
}
func UpdateProjectIsPublic(db *sql.DB, id string, isPublic string) error {
	query := "UPDATE project SET is_public = ? WHERE id = ?"
	err := db.QueryRow(query, isPublic, id)
	if err != nil {
		fmt.Println(err)
		return err.Err()
	}
	return nil
}
func AddProject(db *sql.DB, c *Project) (string, error) {
	sqlStr := "insert into project (name,author_id , address,is_public, status,c_time,u_time) values (?, ?,?, ?, ?,?, ?)"
	res, err := db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, c.IsPublic, c.Status, time.Now(), time.Now())
	if err != nil {
		println(err.Error())
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func GetProjectAddress(id string, db *sql.DB) string {
	var address string
	query := "SELECT address FROM project WHERE id = ?"
	err := db.QueryRow(query, id).Scan(&address)
	if err != nil {
		return ""
	}
	return address
}
func GetProjectVersion(id string, db *sql.DB) int {
	var version int
	query := "SELECT version FROM project WHERE id = ?"
	err := db.QueryRow(query, id).Scan(&version)
	if err != nil {
		return -1
	}
	return version
}
func DeleteProjectById(db *sql.DB, id string) error {
	stmt, err := db.Prepare("DELETE FROM project WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	// 执行SQL语句
	_, err = stmt.Exec(id)
	if err != nil {
		return err
	}
	return nil
}
