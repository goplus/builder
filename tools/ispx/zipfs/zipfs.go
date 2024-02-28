package zipfs

import (
	"archive/zip"
	"io"
	"io/fs"
	"path"
	"strings"
)

type ZipFs struct {
	fileMap   map[string]*zip.File
	zipReader *zip.Reader
}

func NewFromZipReader(r *zip.Reader) *ZipFs {
	fileMap := make(map[string]*zip.File)
	for _, f := range r.File {
		fileMap[f.Name] = f
	}

	return &ZipFs{
		zipReader: r,
		fileMap:   fileMap,
	}
}

// Implement gop/parser/fsx.FileSystem:
// type FileSystem interface {
// 	ReadDir(dirname string) ([]fs.DirEntry, error)
// 	ReadFile(filename string) ([]byte, error)
// 	Join(elem ...string) string
// }

func (z *ZipFs) Join(elem ...string) string {
	return path.Join(elem...)
}

type zipDirEntry struct {
	file *zip.File
}

func (zde zipDirEntry) Name() string {
	return path.Base(zde.file.Name)
}

func (zde zipDirEntry) IsDir() bool {
	return strings.HasSuffix(zde.file.Name, "/")
}

func (zde zipDirEntry) Type() fs.FileMode {
	if zde.IsDir() {
		return fs.ModeDir
	}
	return 0
}

func (zde zipDirEntry) Info() (fs.FileInfo, error) {
	return zde.file.FileInfo(), nil
}

func (zf *ZipFs) ReadDir(dirname string) ([]fs.DirEntry, error) {
	var dirEntries []fs.DirEntry

	for _, file := range zf.zipReader.File {
		if path.Dir(file.Name) == dirname || (dirname == "." && !strings.Contains(file.Name, "/")) {
			dirEntries = append(dirEntries, zipDirEntry{file: file})
		}
	}

	if len(dirEntries) == 0 {
		return nil, fs.ErrNotExist
	}

	return dirEntries, nil
}

func (z *ZipFs) ReadFile(filename string) ([]byte, error) {
	f, ok := z.fileMap[filename]
	if !ok {
		return nil, fs.ErrNotExist
	}

	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	return io.ReadAll(rc)
}

// Implement spx/fs.Dir:
// type Dir interface {
// 	Open(file string) (io.ReadCloser, error)
// 	Close() error
// }

func (z *ZipFs) Open(file string) (
	io.ReadCloser, error,
) {
	f, ok := z.fileMap[file]
	if !ok {
		return nil, fs.ErrNotExist
	}

	return f.Open()
}

func (z *ZipFs) Close() error {
	return nil
}
