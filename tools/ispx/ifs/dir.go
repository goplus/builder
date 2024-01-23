package ifs

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
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
func (d *IndexedDBDir) Open(file string) (ret io.ReadCloser, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("IndexedDBDir.Open %s panic %s", file, r)
		}
	}()

	file = d.assert + "/" + file

	content, err := readFileFromIndexedDB(file)
	if err != nil {
		err = fmt.Errorf("error reading file from IndexedDB: %w", err)
	}
	ret = ioutil.NopCloser(bytes.NewReader(content))
	return
}

// Close closes the directory (in this implementation, this method does nothing)
func (d *IndexedDBDir) Close() error {
	// In actual applications, you may need to perform cleanup operations
	return nil
}
