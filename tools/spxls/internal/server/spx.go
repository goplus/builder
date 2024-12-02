package server

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
)

// readSpxResourceFile reads and returns the content of a resource file from the spx workspace.
func (s *Server) readSpxResourceFile(subPath string) ([]byte, error) {
	spxResourceRootDir := s.spxResourceRootDir
	if spxResourceRootDir == "" {
		spxResourceRootDir = "assets"
	}
	return fs.ReadFile(s.workspaceRootFS, path.Join(spxResourceRootDir, subPath))
}

// SpxSpriteResource represents a spx sprite resource.
type SpxSpriteResource struct {
	Name             string                       `json:"name"`
	Costumes         []SpxSpriteCostumeResource   `json:"costumes"`
	CostumeIndex     int                          `json:"costumeIndex"`
	FAnimations      map[string]json.RawMessage   `json:"fAnimations"`
	Animations       []SpxSpriteAnimationResource `json:"-"`
	DefaultAnimation string                       `json:"defaultAnimation"`
}

// SpxSpriteCostumeResource represents a spx sprite costume resource.
type SpxSpriteCostumeResource struct {
	Index int    `json:"index"`
	Name  string `json:"name"`
	Path  string `json:"path"`
}

// SpxSpriteAnimationResource represents a spx sprite animation resource.
type SpxSpriteAnimationResource struct {
	Name string `json:"name"`
}

// getSpxSpriteResource gets a spx sprite resource from the workspace.
func (s *Server) getSpxSpriteResource(name string) (*SpxSpriteResource, error) {
	metadata, err := s.readSpxResourceFile(path.Join("sprites", name, "index.json"))
	if err != nil {
		return nil, err
	}

	sprite := SpxSpriteResource{Name: name}
	if err := json.Unmarshal(metadata, &sprite); err != nil {
		return nil, err
	}
	sprite.Animations = make([]SpxSpriteAnimationResource, 0, len(sprite.FAnimations))
	for name := range sprite.FAnimations {
		sprite.Animations = append(sprite.Animations, SpxSpriteAnimationResource{Name: name})
	}
	return &sprite, nil
}

// SpxSoundResource represents a sound resource in spx.
type SpxSoundResource struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// getSpxSoundResource gets a spx sound resource from the workspace.
func (s *Server) getSpxSoundResource(name string) (*SpxSoundResource, error) {
	metadata, err := s.readSpxResourceFile(path.Join("sounds", name, "index.json"))
	if err != nil {
		return nil, err
	}

	sound := SpxSoundResource{Name: name}
	if err := json.Unmarshal(metadata, &sound); err != nil {
		return nil, err
	}
	return &sound, nil
}

// SpxBackdropResource represents a backdrop resource in spx.
type SpxBackdropResource struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// getSpxBackdropResource gets a spx backdrop resource from the workspace.
func (s *Server) getSpxBackdropResource(name string) (*SpxBackdropResource, error) {
	metadata, err := s.readSpxResourceFile("index.json")
	if err != nil {
		return nil, err
	}

	var assets struct {
		Backdrops []SpxBackdropResource `json:"backdrops"`
	}
	if err := json.Unmarshal(metadata, &assets); err != nil {
		return nil, err
	}
	for _, backdrop := range assets.Backdrops {
		if backdrop.Name == name {
			return &backdrop, nil
		}
	}
	return nil, fmt.Errorf("%w: backdrop not found", fs.ErrNotExist)
}

// SpxWidgetResource represents a widget resource in spx.
type SpxWidgetResource struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Label string `json:"label"`
	Val   string `json:"val"`
}

// getSpxWidgetResource gets a spx widget resource from the workspace.
func (s *Server) getSpxWidgetResource(name string) (*SpxWidgetResource, error) {
	metadata, err := s.readSpxResourceFile("index.json")
	if err != nil {
		return nil, err
	}

	var assets struct {
		Zorder []json.RawMessage `json:"zorder"`
	}
	if err := json.Unmarshal(metadata, &assets); err != nil {
		return nil, err
	}
	for _, item := range assets.Zorder {
		var widget SpxWidgetResource
		if err := json.Unmarshal(item, &widget); err == nil && widget.Name == name {
			return &widget, nil
		}
	}
	return nil, fmt.Errorf("%w: widget not found", fs.ErrNotExist)
}
