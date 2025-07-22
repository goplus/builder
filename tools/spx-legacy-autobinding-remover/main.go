package main

import (
	"archive/zip"
	"bytes"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

var (
	outputFile = flag.String("o", "", "Output file path (default: input file with _no_autobinding suffix)")
	inPlace    = flag.Bool("i", false, "Modify the file in-place")
	verbose    = flag.Bool("v", false, "Verbose output")
)

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options] <zip file>\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nThis tool removes legacy auto-binding variable declarations from the first var block in main.spx files of spx projects.\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
	}

	flag.Parse()

	if flag.NArg() != 1 {
		flag.Usage()
		os.Exit(1)
	}

	inputFile := flag.Arg(0)

	// Determine output file.
	outputPath := *outputFile
	if outputPath == "" && !*inPlace {
		ext := filepath.Ext(inputFile)
		base := strings.TrimSuffix(inputFile, ext)
		outputPath = base + "_no_autobinding" + ext
	} else if *inPlace {
		outputPath = inputFile
	}

	// Process the ZIP file.
	if err := processZipFile(inputFile, outputPath); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Successfully processed %s -> %s\n", inputFile, outputPath)
}

func processZipFile(inputPath, outputPath string) error {
	// Read input ZIP.
	data, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("failed to read input file: %w", err)
	}

	// Extract files from ZIP.
	files, err := extractZipToMap(data)
	if err != nil {
		return fmt.Errorf("failed to extract ZIP: %w", err)
	}

	// Process the spx project.
	if err := ProcessSpxProject(files, *verbose); err != nil {
		return err
	}

	// Write output ZIP.
	outputData, err := createZipFromMap(files)
	if err != nil {
		return fmt.Errorf("failed to create output ZIP: %w", err)
	}

	return os.WriteFile(outputPath, outputData, 0644)
}

func extractZipToMap(data []byte) (map[string][]byte, error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, err
	}

	files := make(map[string][]byte)
	for _, file := range r.File {
		rc, err := file.Open()
		if err != nil {
			return nil, err
		}
		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, err
		}
		files[file.Name] = content
	}

	return files, nil
}

func createZipFromMap(files map[string][]byte) ([]byte, error) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	for name, content := range files {
		wf, err := w.Create(name)
		if err != nil {
			return nil, err
		}
		if _, err := wf.Write(content); err != nil {
			return nil, err
		}
	}

	if err := w.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
