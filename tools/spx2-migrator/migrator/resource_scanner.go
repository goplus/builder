package migrator

import (
	"fmt"
	"path/filepath"
	"strings"
)

// resourceSet contains project resource information discovered during scanning.
type resourceSet struct {
	// sounds maps sound names to their existence.
	sounds map[string]bool

	// sprites maps sprite class names to their existence.
	sprites map[string]bool
}

// scanResources scans project files for sound and sprite resources.
//
// It supports only the "assets/" directory structure and returns an error if it cannot be found.
func scanResources(files map[string][]byte) (*resourceSet, error) {
	rs := &resourceSet{
		sounds:  make(map[string]bool),
		sprites: make(map[string]bool),
	}

	// Verify that the assets/ directory exists.
	hasAssets := false
	for path := range files {
		if strings.HasPrefix(path, "assets/") {
			hasAssets = true
			break
		}
	}
	if !hasAssets {
		return nil, fmt.Errorf("unsupported project structure: assets/ directory not found")
	}

	// Scan sound resources from `assets/sounds/*/index.json`.
	for path := range files {
		if strings.HasPrefix(path, "assets/sounds/") && strings.HasSuffix(path, "/index.json") {
			// Extract sound name: `assets/sounds/<soundName>/index.json` -> `soundName`.
			parts := strings.Split(path, "/")
			if len(parts) >= 4 && parts[0] == "assets" && parts[1] == "sounds" {
				soundName := parts[2]
				if soundName != "" {
					rs.sounds[soundName] = true
				}
			}
		}
	}

	// Scan sprite classes from .spx files (excluding main.spx).
	for path := range files {
		if strings.HasSuffix(path, ".spx") && !strings.HasSuffix(path, "/main.spx") && path != "main.spx" {
			spriteName := strings.TrimSuffix(filepath.Base(path), ".spx")
			if spriteName != "" {
				rs.sprites[spriteName] = true
			}
		}
	}

	return rs, nil
}
