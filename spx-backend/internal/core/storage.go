package core

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"time"

	"golang.org/x/crypto/scrypt"
)

// UploadFile Upload file to cloud
func UploadFile(ctx context.Context, p *Project, blobKey string, file io.Reader, originalFilename string) (string, error) {
	// Extract file extension
	ext := filepath.Ext(originalFilename)

	//File name encryption
	blobKey = blobKey + Encrypt(time.Now().String(), originalFilename) + ext

	// create blob writer
	w, err := p.bucket.NewWriter(ctx, blobKey, nil)
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

func AddAsset(p *Project, c *Asset) (string, error) {
	sqlStr := "insert into asset (name,author_id , address,is_public,status,asset_type,category, c_time,u_time) values (?, ?, ?,?,?, ?,?,?, ?)"
	res, err := p.db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, c.IsPublic, c.Status, c.AssetType, c.Category, time.Now(), time.Now())
	if err != nil {
		println(err.Error())
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func GetAssetAddress(id string, p *Project) string {
	var address string
	query := "SELECT address FROM asset WHERE id = ?"
	err := p.db.QueryRow(query, id).Scan(&address)
	if err != nil {
		return ""
	}
	return address
}

func UpdateAsset(p *Project, c *Asset) error {
	stmt, err := p.db.Prepare("UPDATE asset SET name = ?, address = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Name, c.Address, c.ID)
	return err
}

func UpdateProject(p *Project, c *CodeFile) error {
	stmt, err := p.db.Prepare("UPDATE codefile SET version =?, name = ?,address = ? ,u_time = ? WHERE id = ?;")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Version, c.Name, c.Address, time.Now(), c.ID)
	return err
}
func UpdateProjectIsPublic(p *Project, id string) error {
	query := "UPDATE codefile SET is_public = CASE WHEN is_public = 1 THEN 0 ELSE 1 END WHERE id = ?"
	err := p.db.QueryRow(query, id)
	if err != nil {
		return err.Err()
	}
	return nil
}
func AddProject(p *Project, c *CodeFile) (string, error) {
	sqlStr := "insert into codefile (name,author_id , address,is_public, status,c_time,u_time) values (?, ?,?, ?, ?,?, ?)"
	res, err := p.db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, 0, "1", time.Now(), time.Now())
	if err != nil {
		println(err.Error())
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func GetProjectAddress(id string, p *Project) string {
	var address string
	query := "SELECT address FROM codefile WHERE id = ?"
	err := p.db.QueryRow(query, id).Scan(&address)
	if err != nil {
		return ""
	}
	return address
}
func GetProjectVersion(id string, p *Project) int {
	var version int
	query := "SELECT version FROM codefile WHERE id = ?"
	err := p.db.QueryRow(query, id).Scan(&version)
	if err != nil {
		return -1
	}
	return version
}
func DeleteProjectById(p *Project, id string) error {
	stmt, err := p.db.Prepare("DELETE FROM codefile WHERE id = ?")
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
