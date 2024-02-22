package core

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"time"

	"golang.org/x/crypto/scrypt"
)

// UploadFile Upload file to cloud
func UploadFile(ctx context.Context, p *Project, blobKey string, file multipart.File, header *multipart.FileHeader) (string, error) {
	originalFilename := header.Filename

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

func AddProject(p *Project, c *CodeFile) error {
	sqlStr := "insert into codefile (id,name,author_id ,address,is_public,status,c_time,u_time) values (?,?,?,?,?,?,?,?)"
	_, err := p.db.Exec(sqlStr, c.ID, c.Name, c.AuthorId, c.Address, c.IsPublic, c.Status, time.Now(), time.Now())
	if err != nil {
		println(err.Error())
		return err
	}
	return nil
}

func UpdateProject(p *Project, c *CodeFile) error {
	stmt, err := p.db.Prepare("UPDATE codefile SET name = ?, address = ?,version = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Name, c.Address, c.Version, c.ID)
	return err
}
