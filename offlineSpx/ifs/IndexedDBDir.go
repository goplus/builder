package ifs

import (
	"bytes"
	"errors"
	"io"
	"io/ioutil"
	"log"
)

// IndexedDBDir is the implementation of a fs.Dir
type IndexedDBDir struct {
	assert string
}

func NewIndexedDBDir(assert string) *IndexedDBDir {
	return &IndexedDBDir{
		assert: assert,
	}
}

// Open opens a file
func (d *IndexedDBDir) Open(file string) (io.ReadCloser, error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("IndexedDBDir.Open %s panic %s\n", file, r)
		}
	}()

	file = d.assert + "/" + file

	content, err := ReadFileFromIndexedDB(file)
	if err != nil {
		return nil, errors.New("file not found")
	}
	return ioutil.NopCloser(bytes.NewReader(content)), nil
}

// Close closes the directory (in this implementation, this method does nothing)
func (d *IndexedDBDir) Close() error {
	// In actual applications, you may need to perform cleanup operations
	return nil
}
