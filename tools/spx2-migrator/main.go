package main

import (
	"archive/zip"
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/goplus/builder/tools/spx2-migrator/migrator"
)

func main() {
	// Flags
	fs := flag.NewFlagSet(os.Args[0], flag.ExitOnError)
	skipLegacy := fs.Bool("skip-legacy-validate", false, "skip projects that fail legacy validation and write a .skip marker instead")
	skipRemoved := fs.Bool("skip-removed-apis", false, "skip projects that use removed APIs without replacements and write a .skip marker instead")
	skipNoMain := fs.Bool("skip-no-main", false, "skip projects that miss or cannot parse main.spx and write a .skip marker instead")
	skipTarget := fs.Bool("skip-target-validate", false, "skip projects that fail target validation and write a .skip marker instead")
	updateDB := fs.Bool("update-db", false, "update database records with migrated files after successful migration")
	_ = fs.Parse(os.Args[1:])
	if fs.NArg() != 1 {
		printUsageAndExit()
	}

	arg := fs.Arg(0)

	// If arg points to an existing file, treat as a zip; otherwise treat as DSN.
	if fileExists(arg) {
		if err := migrateFromZip(arg, *skipLegacy, *skipRemoved, *skipNoMain, *skipTarget); err != nil {
			os.Exit(1)
		}
		return
	}

	// Treat as DSN
	if err := migrateFromMySQL(arg, *skipLegacy, *skipRemoved, *skipNoMain, *skipTarget, *updateDB); err != nil {
		fmt.Fprintf(os.Stderr, "failed to migrate from mysql dsn: %v\n", err)
		os.Exit(1)
	}
}

func printUsageAndExit() {
	fmt.Fprintf(os.Stderr, "spx 2.0 API migration tool\n")
	fmt.Fprintf(os.Stderr, "Migrates spx projects from %s to %s\n\n", migrator.LegacyVersion, migrator.TargetVersion)
	fmt.Fprintf(os.Stderr, "Usage: %s [flags] <project.zip | mysql_dsn>\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "Flags:\n")
	fmt.Fprintf(os.Stderr, "  -skip-legacy-validate   Skip projects failing legacy validate; write .skip marker\n")
	fmt.Fprintf(os.Stderr, "  -skip-removed-apis      Skip projects using removed APIs; write .skip marker\n")
	fmt.Fprintf(os.Stderr, "  -skip-no-main           Skip projects missing/invalid main.spx; write .skip marker\n")
	fmt.Fprintf(os.Stderr, "  -skip-target-validate   Skip projects failing target validate; write .skip marker\n")
	fmt.Fprintf(os.Stderr, "  -update-db              Update database records with migrated files after successful migration\n")
	fmt.Fprintf(os.Stderr, "Output (zip input): <project>_migrated.zip\n")
	fmt.Fprintf(os.Stderr, "Output (mysql input): ./db_migrated/{project|project_release}_<id>_migrated.zip\n")
	os.Exit(1)
}

type zipContents struct {
	Files map[string][]byte
	Dirs  []string // directory entry names (end with "/") to preserve
}

func migrateFromZip(inputPath string, skipLegacy, skipRemoved, skipNoMain, skipTarget bool) error {
	outputPath := generateOutputPath(inputPath)

	fmt.Printf("spx 2.0 migration tool\n")
	fmt.Printf("Input:  %s\n", inputPath)
	fmt.Printf("Output: %s\n", outputPath)
	fmt.Printf("Migration: %s -> %s\n\n", migrator.LegacyVersion, migrator.TargetVersion)

	fmt.Printf("Starting migration process...\n")
	fmt.Printf("  Extracting project archive...\n")
	contents, err := extractZip(inputPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to extract zip: %v\n", err)
		return err
	}

	m := migrator.New(contents.Files)
	fmt.Printf("  Scanning project resources...\n")
	result, err := m.Migrate()
	if err != nil {
		if skipLegacy && isLegacyValidateError(err) {
			skipPath := replaceExt(outputPath, ".skip")
			writeSkip(skipPath, "legacy-validate-failed", err)
			fmt.Printf("  Skipped due to legacy validate failure. Wrote %s\n", skipPath)
			return nil
		}
		if skipRemoved && errors.Is(err, migrator.ErrRemovedAPIsUsed) {
			skipPath := replaceExt(outputPath, ".skip")
			writeSkip(skipPath, "removed-apis", err)
			fmt.Printf("  Skipped due to removed APIs. Wrote %s\n", skipPath)
			return nil
		}
		if skipNoMain && (isNoMainError(err) || isParseMainError(err)) {
			skipPath := replaceExt(outputPath, ".skip")
			reason := "no-main"
			if isParseMainError(err) {
				reason = "parse-main"
			}
			writeSkip(skipPath, reason, err)
			fmt.Printf("  Skipped due to %s. Wrote %s\n", reason, skipPath)
			return nil
		}
		if skipTarget && isTargetValidateError(err) {
			skipPath := replaceExt(outputPath, ".skip")
			writeSkip(skipPath, "target-validate-failed", err)
			fmt.Printf("  Skipped due to target validate failure. Wrote %s\n", skipPath)
			return nil
		}
		handleMigrateError(err)
		return err
	}

	fmt.Printf("  Writing migrated project archive...\n")
	if err := writeZip(outputPath, result.Files, contents.Dirs); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write output: %v\n", err)
		return err
	}

	// Generate diff file
	diffPath := replaceExt(outputPath, ".diff")
	fmt.Printf("  Generating diff file...\n")
	if err := generateDiff(contents.Files, result.Files, diffPath); err != nil {
		return fmt.Errorf("failed to generate diff file: %w", err)
	}

	printSuccess(result, outputPath, diffPath)
	return nil
}

func migrateFromMySQL(dsn string, skipLegacy, skipRemoved, skipNoMain, skipTarget, updateDB bool) error {
	fmt.Printf("spx 2.0 migration tool\n")
	fmt.Printf("Input DSN: %s\n", dsn)
	fmt.Printf("Migration: %s -> %s\n\n", migrator.LegacyVersion, migrator.TargetVersion)
	fmt.Printf("===========================================================\n\n")

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open mysql: %w", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping mysql: %w", err)
	}

	outDir := "db_migrated"
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("failed to create output dir %s: %w", outDir, err)
	}

	// Process both project and project_release tables.
	types := []string{"project", "project_release"}
	total := 0
	skipped := 0
	skippedLegacy := 0
	skippedNoMain := 0
	skippedRemoved := 0
	noAssetsInjected := 0
	skippedTarget := 0
	dbUpdated := 0
	for _, typ := range types {
		rows, err := db.Query("SELECT id, files FROM `" + typ + "`")
		if err != nil {
			return fmt.Errorf("failed to query %s: %w", typ, err)
		}
		for rows.Next() {
			var id int64
			var filesRaw []byte
			if err := rows.Scan(&id, &filesRaw); err != nil {
				rows.Close()
				return fmt.Errorf("failed to scan %s row: %w", typ, err)
			}
			fileMap := map[string]string{}
			if err := json.Unmarshal(filesRaw, &fileMap); err != nil {
				rows.Close()
				return fmt.Errorf("failed to unmarshal files json of %s id=%d: %w", typ, id, err)
			}

			fmt.Printf("[%s:%d] Fetching %d files...\n", typ, id, len(fileMap))
			files, err := fetchFiles(fileMap)
			if err != nil {
				rows.Close()
				return fmt.Errorf("failed to fetch files for %s id=%d: %w", typ, id, err)
			}

			// Ensure assets/ directory presence for scanners expecting it.
			hadNoAssets := false
			if !hasAssetsDir(files) {
				files["assets/.keep"] = []byte{}
				noAssetsInjected++
				hadNoAssets = true
			}

			// Save original project as ZIP file before migration
			originalZipPath := filepath.Join(outDir, fmt.Sprintf("%s_%d_original.zip", typ, id))
			if err := writeZip(originalZipPath, files, nil); err != nil {
				rows.Close()
				return fmt.Errorf("failed to write original zip for %s id=%d: %w", typ, id, err)
			}

			// Migrate
			m := migrator.New(files)
			fmt.Printf("[%s:%d] Migrating...\n", typ, id)
			result, err := m.Migrate()
			if err != nil {
				// Decide skip or fail
				if skipLegacy && isLegacyValidateError(err) {
					outSkip := filepath.Join(outDir, fmt.Sprintf("%s_%d_migrated.skip", typ, id))
					writeSkip(outSkip, "legacy-validate-failed", err)
					fmt.Printf("[%s:%d] Skipped due to legacy validate failure. Wrote %s\n", typ, id, outSkip)
					skipped++
					skippedLegacy++
					continue
				}
				if skipRemoved && errors.Is(err, migrator.ErrRemovedAPIsUsed) {
					outSkip := filepath.Join(outDir, fmt.Sprintf("%s_%d_migrated.skip", typ, id))
					writeSkip(outSkip, "removed-apis", err)
					fmt.Printf("[%s:%d] Skipped due to removed APIs. Wrote %s\n", typ, id, outSkip)
					skipped++
					skippedRemoved++
					continue
				}
				if skipNoMain && (isNoMainError(err) || isParseMainError(err)) {
					outSkip := filepath.Join(outDir, fmt.Sprintf("%s_%d_migrated.skip", typ, id))
					// Include main.spx content if present to aid debugging
					reason := "no-main"
					if isParseMainError(err) {
						reason = "parse-main"
					}
					var extra []byte
					if data, ok := files["main.spx"]; ok {
						extra = append([]byte("\n--- main.spx (raw) ---\n"), data...)
					}
					writeSkipWith(outSkip, reason, err, extra)
					fmt.Printf("[%s:%d] Skipped due to %s. Wrote %s\n", typ, id, reason, outSkip)
					skipped++
					skippedNoMain++
					continue
				}
				if skipTarget && isTargetValidateError(err) {
					outSkip := filepath.Join(outDir, fmt.Sprintf("%s_%d_migrated.skip", typ, id))
					writeSkip(outSkip, "target-validate-failed", err)
					fmt.Printf("[%s:%d] Skipped due to target validate failure. Wrote %s\n", typ, id, outSkip)
					skipped++
					skippedTarget++
					continue
				}
				handleMigrateError(err)
				rows.Close()
				return err
			}

			// If we injected a placeholder, exclude it from final output.
			if hadNoAssets {
				delete(result.Files, "assets/.keep")
			}
			// Write migrated zip
			outPath := filepath.Join(outDir, fmt.Sprintf("%s_%d_migrated.zip", typ, id))
			if err := writeZip(outPath, result.Files, nil); err != nil {
				rows.Close()
				return fmt.Errorf("failed to write output zip for %s id=%d: %w", typ, id, err)
			}

			// Generate diff file for MySQL migration
			diffPath := filepath.Join(outDir, fmt.Sprintf("%s_%d_migrated.diff", typ, id))
			if err := generateDiff(files, result.Files, diffPath); err != nil {
				rows.Close()
				return fmt.Errorf("failed to generate diff file for %s id=%d: %w", typ, id, err)
			}

			printSuccess(result, outPath, diffPath)

			// Update database if requested and migration actually made changes
			if updateDB {
				if hasMigrationChanges(result) {
					fmt.Printf("[%s:%d] Updating database with migrated files...\n", typ, id)

					// Convert migrated files back to JSON format
					updatedJSON, err := encodeFilesToJSON(result.Files, fileMap)
					if err != nil {
						rows.Close()
						return fmt.Errorf("failed to encode migrated files for %s id=%d: %w", typ, id, err)
					}

					// Update database record
					if err := updateProjectFiles(db, typ, id, updatedJSON); err != nil {
						rows.Close()
						return fmt.Errorf("failed to update database for %s id=%d: %w", typ, id, err)
					}

					fmt.Printf("[%s:%d] Database updated successfully\n", typ, id)
					dbUpdated++
				} else {
					fmt.Printf("[%s:%d] No changes detected, skipping database update\n", typ, id)
				}
			}

			total++
		}
		rows.Close()
	}
	fmt.Printf("\nCompleted MySQL migration. %d migrated, %d skipped. Output dir: %s\n", total, skipped, outDir)
	if skipped > 0 {
		fmt.Printf("  - Skipped (legacy-validate): %d\n", skippedLegacy)
		fmt.Printf("  - Skipped (no-main):        %d\n", skippedNoMain)
		fmt.Printf("  - Skipped (removed-apis):   %d\n", skippedRemoved)
		fmt.Printf("  - Skipped (target-validate): %d\n", skippedTarget)
	}
	if noAssetsInjected > 0 {
		fmt.Printf("  - No-assets projects (placeholder injected): %d\n", noAssetsInjected)
	}
	if updateDB && dbUpdated > 0 {
		fmt.Printf("  - Database records updated: %d\n", dbUpdated)
	}
	return nil
}

// encodeFilesToJSON converts migrated files back to JSON format suitable for database storage.
// It converts .spx files to base64 data URLs and preserves original URLs for other files.
func encodeFilesToJSON(migratedFiles map[string][]byte, originalURLs map[string]string) ([]byte, error) {
	fileMap := make(map[string]string)

	for filename, content := range migratedFiles {
		if strings.HasSuffix(filename, ".spx") {
			// Encode .spx files as base64 data URLs
			encoded := base64.StdEncoding.EncodeToString(content)
			fileMap[filename] = "data:text/plain;base64," + encoded
		} else {
			// For non-.spx files, preserve the original URL if available
			if originalURL, exists := originalURLs[filename]; exists {
				fileMap[filename] = originalURL
			} else {
				// If no original URL, create a data URL (shouldn't normally happen)
				encoded := base64.StdEncoding.EncodeToString(content)
				fileMap[filename] = "data:application/octet-stream;base64," + encoded
			}
		}
	}

	return json.Marshal(fileMap)
}

// hasMigrationChanges checks if any actual migration operations were performed
// based on the counters in MigrationResult.
func hasMigrationChanges(result *migrator.MigrationResult) bool {
	totalChanges := result.SoundCallsConverted +
		result.AutoBindingsRemoved +
		result.CostumeAPIsConverted +
		result.EffectAPIsConverted +
		result.BackdropAPIsConverted +
		result.LayerAPIsConverted +
		result.BroadcastAPIsConverted +
		result.TouchStartAPIsConverted +
		result.MovementAPIsConverted
	return totalChanges > 0
}

// updateProjectFiles updates the database record with migrated files.
func updateProjectFiles(db *sql.DB, typ string, id int64, filesJSON []byte) error {
	query := "UPDATE `" + typ + "` SET files = ? WHERE id = ?"
	_, err := db.Exec(query, filesJSON, id)
	if err != nil {
		return fmt.Errorf("failed to update %s id=%d: %w", typ, id, err)
	}
	return nil
}

func handleMigrateError(err error) {
	if errors.Is(err, migrator.ErrAlreadyCompatible) {
		fmt.Printf("    Project is already compatible, no migration needed\n")
		fmt.Printf("\nProject is already compatible with the latest spx version!\n")
		fmt.Printf("No migration needed.\n")
		return
	}
	if errors.Is(err, migrator.ErrRemovedAPIsUsed) {
		fmt.Fprintf(os.Stderr, "migration aborted: detected removed APIs with no replacements\n")
		fmt.Fprintf(os.Stderr, "please remove or refactor these usages before migrating\n\n")
		fmt.Fprintf(os.Stderr, "%v\n", err)
		return
	}
	fmt.Fprintf(os.Stderr, "failed to migrate: %v\n", err)
}

func printSuccess(result *migrator.MigrationResult, outputPath string, diffPath string) {
	fmt.Printf("\nMigration completed successfully!\n")
	fmt.Printf("  Migrated from: %s\n", migrator.LegacyVersion)
	fmt.Printf("  Migrated to: %s\n", migrator.TargetVersion)
	fmt.Printf("  Sound calls converted: %d\n", result.SoundCallsConverted)
	fmt.Printf("  Auto-bindings removed: %d\n", result.AutoBindingsRemoved)
	fmt.Printf("  Output file: %s\n", outputPath)
	fmt.Printf("  Diff file: %s\n\n", diffPath)
	fmt.Printf("===========================================================\n\n")
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !st.IsDir()
}

func hasAssetsDir(files map[string][]byte) bool {
	for name := range files {
		if strings.HasPrefix(name, "assets/") {
			return true
		}
	}
	return false
}

func replaceExt(path, newExt string) string {
	ext := filepath.Ext(path)
	if ext == "" {
		return path + newExt
	}
	return strings.TrimSuffix(path, ext) + newExt
}

func writeSkip(path, reason string, err error) {
	msg := fmt.Sprintf("reason=%s\nerror=%v\n", reason, err)
	_ = os.WriteFile(path, []byte(msg), 0o644)
}

func isLegacyValidateError(err error) bool {
	// Best effort classification via error message prefix inserted by migrator
	s := err.Error()
	return strings.Contains(s, "failed to validate with legacy spx version")
}

func isNoMainError(err error) bool {
	s := err.Error()
	return strings.Contains(s, "main.spx not found") || strings.Contains(s, "failed to remove auto-binding declarations") && strings.Contains(s, "main.spx not found")
}

func isParseMainError(err error) bool {
	s := err.Error()
	return strings.Contains(s, "failed to parse main.spx")
}

func isTargetValidateError(err error) bool {
	s := err.Error()
	return strings.Contains(s, "failed to validate migrated project")
}

func writeSkipWith(path, reason string, err error, extra []byte) {
	msg := fmt.Sprintf("reason=%s\nerror=%v\n", reason, err)
	if len(extra) > 0 {
		msgBytes := []byte(msg)
		msgBytes = append(msgBytes, extra...)
		_ = os.WriteFile(path, msgBytes, 0o644)
		return
	}
	_ = os.WriteFile(path, []byte(msg), 0o644)
}

// fetchFiles downloads all files from the URL map and returns a name->content map.
func fetchFiles(urls map[string]string) (map[string][]byte, error) {
	out := make(map[string][]byte, len(urls))
	for name, u := range urls {
		// data: URLs → decode and use content.
		if strings.HasPrefix(u, "data:") {
			data, err := decodeDataURL(u)
			if err != nil {
				return nil, fmt.Errorf("decode data url for %s: %w", name, err)
			}
			out[name] = data
			continue
		}

		// http/https/kodo and others → do NOT fetch; create empty file.
		// Note: migration relies on .spx sources being available. In our data model
		// code files are stored as data: URLs; assets use kodo/http(s).
		out[name] = []byte{}
	}
	return out, nil
}

// decodeDataURL decodes a data: URL per RFC 2397.
func decodeDataURL(u string) ([]byte, error) {
	// data:[<mediatype>][;base64],<data>
	// We only care about whether it is base64-encoded.
	if !strings.HasPrefix(u, "data:") {
		return nil, fmt.Errorf("not a data url")
	}
	comma := strings.IndexByte(u, ',')
	if comma < 0 {
		return nil, fmt.Errorf("invalid data url: missing comma")
	}
	meta := u[len("data:"):comma]
	payload := u[comma+1:]
	if strings.Contains(meta, ";base64") {
		// Raw base64 without URL-encoding.
		return base64.StdEncoding.DecodeString(payload)
	}
	// URL-escaped payload (percent-encoded)
	s, err := url.QueryUnescape(payload)
	if err != nil {
		return nil, fmt.Errorf("unescape data: %w", err)
	}
	return []byte(s), nil
}

// generateOutputPath generates the output file path.
func generateOutputPath(inputPath string) string {
	ext := filepath.Ext(inputPath)
	base := strings.TrimSuffix(inputPath, ext)
	return base + "_migrated" + ext
}

// extractZip extracts a ZIP file and returns files and directory entries to preserve.
func extractZip(inputPath string) (*zipContents, error) {
	data, err := os.ReadFile(inputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read input file: %w", err)
	}

	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("failed to open zip: %w", err)
	}

	files := make(map[string][]byte)
	dirs := make([]string, 0)
	seenDir := make(map[string]bool)
	for _, file := range r.File {
		name := file.Name
		if strings.HasSuffix(name, "/") || file.FileInfo().IsDir() {
			if !seenDir[name] {
				dirs = append(dirs, name)
				seenDir[name] = true
			}
			continue
		}

		rc, err := file.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open file %s: %w", name, err)
		}

		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to read file %s: %w", name, err)
		}

		files[name] = content
	}

	return &zipContents{Files: files, Dirs: dirs}, nil
}

// writeZip writes the given files and directory entries to a new ZIP file.
func writeZip(outputPath string, files map[string][]byte, dirs []string) error {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	// Preserve directory entries if provided
	for _, d := range dirs {
		if !strings.HasSuffix(d, "/") {
			d = d + "/"
		}
		if _, err := w.CreateHeader(&zip.FileHeader{Name: d, Method: zip.Store}); err != nil {
			return fmt.Errorf("failed to create dir %s in zip: %w", d, err)
		}
	}

	for name, content := range files {
		wf, err := w.Create(name)
		if err != nil {
			return fmt.Errorf("failed to create file %s in zip: %w", name, err)
		}
		if _, err := wf.Write(content); err != nil {
			return fmt.Errorf("failed to write file %s to zip: %w", name, err)
		}
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("failed to close zip writer: %w", err)
	}

	return os.WriteFile(outputPath, buf.Bytes(), 0o644)
}

// generateDiff creates a unified diff between original and migrated project contents
// Focuses on .spx files since those are the only files modified by the migrator
func generateDiff(originalFiles map[string][]byte, migratedFiles map[string][]byte, diffOutputPath string) error {
	// Create temporary directories
	tempDir, err := os.MkdirTemp("", "spx-migration-diff-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	originalDir := filepath.Join(tempDir, "original")
	migratedDir := filepath.Join(tempDir, "migrated")

	// Create directories
	if err := os.MkdirAll(originalDir, 0o755); err != nil {
		return fmt.Errorf("failed to create original dir: %w", err)
	}
	if err := os.MkdirAll(migratedDir, 0o755); err != nil {
		return fmt.Errorf("failed to create migrated dir: %w", err)
	}

	// Filter to only include .spx files (since migrator only modifies these)
	spxFiles := make(map[string][]byte)
	for path, content := range originalFiles {
		if strings.HasSuffix(path, ".spx") {
			spxFiles[path] = content
		}
	}

	// Write original .spx files
	for path, content := range spxFiles {
		fullPath := filepath.Join(originalDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
			return fmt.Errorf("failed to create dir for %s: %w", path, err)
		}
		if err := os.WriteFile(fullPath, content, 0o644); err != nil {
			return fmt.Errorf("failed to write original file %s: %w", path, err)
		}
	}

	// Write migrated .spx files
	for path, content := range migratedFiles {
		if strings.HasSuffix(path, ".spx") {
			fullPath := filepath.Join(migratedDir, path)
			if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
				return fmt.Errorf("failed to create dir for %s: %w", path, err)
			}
			if err := os.WriteFile(fullPath, content, 0o644); err != nil {
				return fmt.Errorf("failed to write migrated file %s: %w", path, err)
			}
		}
	}

	// Run diff command on the directories
	cmd := exec.Command("diff", "-ru", originalDir, migratedDir)
	output, err := cmd.Output()
	// diff returns:
	// - exit code 0: no differences
	// - exit code 1: differences found (expected case)
	// - exit code 2+: error occurred
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			// Exit code 1 means differences found, which is what we expect
			if exitError.ExitCode() > 1 {
				return fmt.Errorf("diff command failed with exit code %d: %w", exitError.ExitCode(), err)
			}
		} else {
			return fmt.Errorf("failed to run diff command: %w", err)
		}
	}

	// Write diff output to file
	if err := os.WriteFile(diffOutputPath, output, 0o644); err != nil {
		return fmt.Errorf("failed to write diff file: %w", err)
	}

	return nil
}
