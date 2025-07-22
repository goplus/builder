package migrator

import (
	"errors"
	"fmt"
	"maps"

	xgotoken "github.com/goplus/xgo/token"
)

const (
	// LegacyVersion is the legacy spx version to migrate from.
	LegacyVersion = "v2.0.0-pre.5"

	// TargetVersion is the target spx version to migrate to.
	TargetVersion = "v2.0.0-pre.9"
)

// ErrAlreadyCompatible indicates that the project is already compatible with the target version.
var ErrAlreadyCompatible = errors.New("project already compatible")

// Migrator handles the migration process.
type Migrator struct {
	files     map[string][]byte
	resources *resourceSet
	fset      *xgotoken.FileSet
}

// New creates a new [Migrator] with the given files.
func New(files map[string][]byte) *Migrator {
	return &Migrator{
		files: maps.Clone(files),
		fset:  xgotoken.NewFileSet(),
	}
}

// MigrationResult contains the result of the migration.
type MigrationResult struct {
	// Files contains the migrated files.
	Files map[string][]byte

	// SoundCallsConverted is the number of sound calls converted.
	SoundCallsConverted int

	// AutoBindingsRemoved is the number of auto-binding declarations removed.
	AutoBindingsRemoved int

	// CostumeAPIsConverted is the number of costume API calls converted.
	CostumeAPIsConverted int

	// EffectAPIsConverted is the number of effect API calls converted.
	EffectAPIsConverted int

	// BackdropAPIsConverted is the number of backdrop API calls converted.
	BackdropAPIsConverted int

	// LayerAPIsConverted is the number of layer API calls converted.
	LayerAPIsConverted int

	// BroadcastAPIsConverted is the number of broadcast API calls converted.
	BroadcastAPIsConverted int

	// TouchStartAPIsConverted is the number of onTouchStart API calls converted.
	TouchStartAPIsConverted int

	// MovementAPIsConverted is the number of movement API calls converted.
	MovementAPIsConverted int

	// AnimationAPIsConverted is the number of animation API calls converted.
	AnimationAPIsConverted int
}

// Migrate performs the complete migration process.
func (m *Migrator) Migrate() (*MigrationResult, error) {
	// Step 1: Scan resources
	resources, err := scanResources(m.files)
	if err != nil {
		return nil, fmt.Errorf("failed to scan resources: %w", err)
	}
	m.resources = resources

	// Step 2: Validate with legacy version to ensure project is migratable
	if err := validate(m.files, LegacyVersion); err != nil {
		return nil, fmt.Errorf("failed to validate with legacy spx version: %w", err)
	}

	// Step 3: Detect usages of removed APIs (no replacements). Abort early if found.
	if usages, _ := m.scanRemovedAPIs(); len(usages) > 0 {
		return nil, &RemovedAPIsError{Usages: usages}
	}

	// Step 4: Convert sound calls
	soundConverted, err := m.convertSoundCalls()
	if err != nil {
		return nil, fmt.Errorf("failed to convert sound calls: %w", err)
	}

	// Step 5: Remove auto-binding declarations
	bindingsRemoved, err := m.removeAutoBindings()
	if err != nil {
		return nil, fmt.Errorf("failed to remove auto-binding declarations: %w", err)
	}

	// Step 6: Convert costume APIs
	costumeConverted, err := m.convertCostumeAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert costume APIs: %w", err)
	}

	// Step 7: Convert effect APIs
	effectConverted, err := m.convertEffectAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert effect APIs: %w", err)
	}

	// Step 8: Convert backdrop APIs
	backdropConverted, err := m.convertBackdropAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert backdrop APIs: %w", err)
	}

	// Step 9: Convert layer APIs
	layerConverted, err := m.convertLayerAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert layer APIs: %w", err)
	}

	// Step 10: Convert broadcast APIs
	broadcastConverted, err := m.convertBroadcastAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert broadcast APIs: %w", err)
	}

	// Step 11: Convert onTouchStart APIs
	touchStartConverted, err := m.convertTouchStartAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert onTouchStart APIs: %w", err)
	}

	// Step 12: Convert movement APIs
	movementConverted, err := m.convertMovementAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert movement APIs: %w", err)
	}

	// Step 13: Convert animation APIs
	animationConverted, err := m.convertAnimationAPIs()
	if err != nil {
		return nil, fmt.Errorf("failed to convert animation APIs: %w", err)
	}

	// Step 14: Validate with target version to ensure project is migrated successfully
	if err := validate(m.files, TargetVersion); err != nil {
		return nil, fmt.Errorf("failed to validate migrated project: %w", err)
	}

	// Return migration result with modified files
	return &MigrationResult{
		Files:                   maps.Clone(m.files),
		SoundCallsConverted:     soundConverted,
		AutoBindingsRemoved:     bindingsRemoved,
		CostumeAPIsConverted:    costumeConverted,
		EffectAPIsConverted:     effectConverted,
		BackdropAPIsConverted:   backdropConverted,
		LayerAPIsConverted:      layerConverted,
		BroadcastAPIsConverted:  broadcastConverted,
		TouchStartAPIsConverted: touchStartConverted,
		MovementAPIsConverted:   movementConverted,
		AnimationAPIsConverted:  animationConverted,
	}, nil
}
