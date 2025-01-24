package vfs

import (
	"bytes"
	"io"
	"io/fs"
	"path"
	"testing"
)

func newTestMapFS() (fs.FS, map[string]MapFile) {
	files := map[string]MapFile{
		"foo.txt":                {Content: []byte("foo")},
		"dir/bar.txt":            {Content: []byte("bar")},
		"dir/subdir/another.txt": {Content: []byte("another")},
		"other/file.txt":         {Content: []byte("other")},
	}
	fsys := NewMapFS(func() map[string]MapFile {
		return files
	})
	return fsys, files
}

func TestMapFSOpen(t *testing.T) {
	fsys, files := newTestMapFS()

	t.Run("Normal", func(t *testing.T) {
		f, err := fsys.Open("foo.txt")
		if err != nil {
			t.Fatal(err)
		}
		defer f.Close()

		got, err := io.ReadAll(f)
		if err != nil {
			t.Fatal(err)
		}

		want := files["foo.txt"].Content
		if !bytes.Equal(got, want) {
			t.Errorf("content mismatch: got %q, want %q", got, want)
		}
	})

	t.Run("EmptyPath", func(t *testing.T) {
		_, err := fsys.Open("")
		if err == nil {
			t.Error("expected error for empty path")
		}
		if _, ok := err.(*fs.PathError); !ok {
			t.Errorf("expected *fs.PathError, got %T", err)
		}
	})

	t.Run("NotExist", func(t *testing.T) {
		_, err := fsys.Open("non-existent.txt")
		if err == nil {
			t.Error("expected error for non-existent file")
		}
		if _, ok := err.(*fs.PathError); !ok {
			t.Errorf("expected *fs.PathError, got %T", err)
		}
	})

	t.Run("IsDir", func(t *testing.T) {
		_, err := fsys.Open("dir")
		if err == nil {
			t.Error("expected error when opening directory")
		}
		if _, ok := err.(*fs.PathError); !ok {
			t.Errorf("expected *fs.PathError, got %T", err)
		}
	})
}

func TestMapFSReadDir(t *testing.T) {
	fsys, _ := newTestMapFS()

	t.Run("Root", func(t *testing.T) {
		got, err := fs.ReadDir(fsys, ".")
		if err != nil {
			t.Fatal(err)
		}

		want := map[string]struct{}{
			"foo.txt": {},
			"dir":     {},
			"other":   {},
		}

		if len(got) != len(want) {
			t.Errorf("got %d entries, want %d", len(got), len(want))
		}

		for _, e := range got {
			if _, ok := want[e.Name()]; !ok {
				t.Errorf("unexpected entry: %s", e.Name())
			}
			checkDirEntry(t, e)
		}
	})

	t.Run("Subdir", func(t *testing.T) {
		got, err := fs.ReadDir(fsys, "dir")
		if err != nil {
			t.Fatal(err)
		}

		want := map[string]struct{}{
			"bar.txt": {},
			"subdir":  {},
		}

		if len(got) != len(want) {
			t.Errorf("got %d entries, want %d", len(got), len(want))
		}

		for _, e := range got {
			if _, ok := want[e.Name()]; !ok {
				t.Errorf("unexpected entry: %s", e.Name())
			}
			checkDirEntry(t, e)
		}
	})

	t.Run("EmptyPath", func(t *testing.T) {
		got, err := fs.ReadDir(fsys, "")
		if err != nil {
			t.Fatal(err)
		}
		if len(got) == 0 {
			t.Error("expected non-empty directory")
		}
	})

	t.Run("NotExist", func(t *testing.T) {
		_, err := fs.ReadDir(fsys, "non-existent")
		if err == nil {
			t.Error("expected error for non-existent directory")
		}
		if _, ok := err.(*fs.PathError); !ok {
			t.Errorf("expected *fs.PathError, got %T", err)
		}
	})
}

func TestMapFSFile(t *testing.T) {
	fsys, files := newTestMapFS()

	for path, want := range files {
		t.Run(path, func(t *testing.T) {
			f, err := fsys.Open(path)
			if err != nil {
				t.Fatal(err)
			}
			defer f.Close()

			info, err := f.Stat()
			if err != nil {
				t.Fatal(err)
			}

			if size := info.Size(); size != int64(len(want.Content)) {
				t.Errorf("size mismatch: got %d, want %d", size, len(want.Content))
			}

			got, err := io.ReadAll(f)
			if err != nil {
				t.Fatal(err)
			}

			if !bytes.Equal(got, want.Content) {
				t.Errorf("content mismatch: got %q, want %q", got, want.Content)
			}
		})
	}
}

func TestMapFSWalkDir(t *testing.T) {
	fsys, _ := newTestMapFS()

	t.Run("WalkAll", func(t *testing.T) {
		got := make(map[string]struct{})
		err := fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			got[path] = struct{}{}
			checkDirEntry(t, d)
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}

		want := map[string]struct{}{
			".":                      {},
			"foo.txt":                {},
			"dir":                    {},
			"dir/bar.txt":            {},
			"dir/subdir":             {},
			"dir/subdir/another.txt": {},
			"other":                  {},
			"other/file.txt":         {},
		}

		if len(got) != len(want) {
			t.Errorf("got %d paths, want %d", len(got), len(want))
		}

		for path := range want {
			if _, ok := got[path]; !ok {
				t.Errorf("path not visited: %s", path)
			}
		}
	})

	t.Run("NonExistentRoot", func(t *testing.T) {
		err := fs.WalkDir(fsys, "nonexistent", func(path string, d fs.DirEntry, err error) error {
			return err
		})
		if err == nil {
			t.Error("expected error for non-existent root")
		}
		if _, ok := err.(*fs.PathError); !ok {
			t.Errorf("expected *fs.PathError, got %T", err)
		}
	})
}

func checkDirEntry(t *testing.T, de fs.DirEntry) {
	t.Helper()

	name := de.Name()
	isDir := de.IsDir()
	if name == "." {
		if !isDir {
			t.Errorf("IsDir mismatch for %s: got %v", name, isDir)
		}
	} else if isDir != (path.Ext(name) == "") {
		t.Errorf("IsDir mismatch for %s: got %v", name, isDir)
	}

	info, err := de.Info()
	if err != nil {
		t.Errorf("Info failed for %s: %v", name, err)
		return
	}

	if got := info.Name(); got != name {
		t.Errorf("name mismatch: got %q, want %q", got, name)
	}

	if got := info.IsDir(); got != isDir {
		t.Errorf("IsDir mismatch: got %v, want %v", got, isDir)
	}

	if mode := de.Type(); (mode&fs.ModeDir != 0) != isDir {
		t.Errorf("Type mode mismatch for %s", name)
	}
}
