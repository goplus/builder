package core

import (
	"context"
	"database/sql"
	"os"
	"time"

	"gocloud.dev/blob"
)

var (
	ErrNotExist = os.ErrNotExist
)

type Config struct {
	Driver string // database driver. default is `mysql`.
	DSN    string // database data source name
	BlobUS string // blob URL scheme
}

type CloudFile struct {
	ID    string
	Address string
	Ctime time.Time
	Mtime time.Time
}


type Project struct {
	bucket *blob.Bucket
	db     *sql.DB
}

func New(ctx context.Context, conf *Config) (ret *Project, err error) {
	if conf == nil {
		conf = new(Config)
	}
	driver := conf.Driver
	dsn := conf.DSN
	bus := conf.BlobUS
	if driver == "" {
		driver = "mysql"
	}
	if dsn == "" {
		dsn = os.Getenv("GOP_COMMUNITY_DSN")
	}
	if bus == "" {
		bus = os.Getenv("GOP_COMMUNITY_BLOBUS")
	}
	bucket, err := blob.OpenBucket(ctx, bus)
	if err != nil {
		return
	}
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return
	}
	return &Project{bucket, db}, nil
}


// Find file address from db
func (p *Project) FileInfo(ctx context.Context, id string) (*CloudFile,error) {
	if id != "" {
		var address string
		// table need fill
		//TODO
    	query := "SELECT address FROM table WHERE id = ?"
    	err := p.db.QueryRow(query, id).Scan(&address)
    	if err != nil {
        	return nil, err
    	}
		cloudFile := &CloudFile{
			ID: id,
			Address: address,
		}
		return cloudFile,nil
	}
	return nil, ErrNotExist
}
