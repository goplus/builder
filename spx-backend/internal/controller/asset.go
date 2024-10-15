package controller

import (
	"context"
	"fmt"
	"maps"
	"regexp"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// AssetDTO is the DTO for assets.
type AssetDTO struct {
	ModelDTO

	Owner       string               `json:"owner"`
	DisplayName string               `json:"displayName"`
	Type        string               `json:"type"`
	Category    string               `json:"category"`
	Files       model.FileCollection `json:"files"`
	FilesHash   string               `json:"filesHash"`
	Visibility  string               `json:"visibility"`
}

// toAssetDTO converts the model asset to its DTO.
func toAssetDTO(mAsset model.Asset) AssetDTO {
	return AssetDTO{
		ModelDTO:    toModelDTO(mAsset.Model),
		Owner:       mAsset.Owner.Username,
		DisplayName: mAsset.DisplayName,
		Type:        mAsset.Type.String(),
		Category:    mAsset.Category,
		Files:       mAsset.Files,
		FilesHash:   mAsset.FilesHash,
		Visibility:  mAsset.Visibility.String(),
	}
}

// assetDisplayNameRE is the regular expression for asset display name.
var assetDisplayNameRE = regexp.MustCompile(`^.{1,100}$`)

// ensureAsset ensures the asset exists and the user has access to it.
func (ctrl *Controller) ensureAsset(ctx context.Context, id int64, ownedOnly bool) (*model.Asset, error) {
	var mAsset model.Asset
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Where("id = ?", id).
		First(&mAsset).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get asset: %w", err)
	}

	if ownedOnly || mAsset.Visibility == model.VisibilityPrivate {
		if _, err := ensureUser(ctx, mAsset.OwnerID); err != nil {
			return nil, err
		}
	}

	return &mAsset, nil
}

// CreateAssetParams holds parameters for creating an asset.
type CreateAssetParams struct {
	DisplayName string               `json:"displayName"`
	Type        string               `json:"type"`
	Category    string               `json:"category"`
	Files       model.FileCollection `json:"files"`
	FilesHash   string               `json:"filesHash"`
	Preview     string               `json:"preview"`
	Visibility  string               `json:"visibility"`
}

// Validate validates the parameters.
func (p *CreateAssetParams) Validate() (ok bool, msg string) {
	if p.DisplayName == "" {
		return false, "missing displayName"
	} else if !assetDisplayNameRE.Match([]byte(p.DisplayName)) {
		return false, "invalid displayName"
	}
	if model.ParseAssetType(p.Type).String() != p.Type {
		return false, "invalid type"
	}
	if p.Category == "" {
		return false, "missing category"
	}
	if p.FilesHash == "" {
		return false, "missing filesHash"
	}
	if model.ParseVisibility(p.Visibility).String() != p.Visibility {
		return false, "invalid visibility"
	}
	return true, ""
}

// CreateAsset creates an asset.
func (ctrl *Controller) CreateAsset(ctx context.Context, params *CreateAssetParams) (*AssetDTO, error) {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return nil, ErrUnauthorized
	}

	mAsset := model.Asset{
		OwnerID:     mUser.ID,
		DisplayName: params.DisplayName,
		Type:        model.ParseAssetType(params.Type),
		Category:    params.Category,
		Files:       params.Files,
		FilesHash:   params.FilesHash,
		Visibility:  model.ParseVisibility(params.Visibility),
	}
	if err := ctrl.db.WithContext(ctx).Create(&mAsset).Error; err != nil {
		return nil, fmt.Errorf("failed to create asset: %w", err)
	}
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		First(&mAsset).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get asset: %w", err)
	}
	assetDTO := toAssetDTO(mAsset)
	return &assetDTO, nil
}

// ListAssetsOrderBy is the order by condition for listing assets.
type ListAssetsOrderBy string

const (
	ListAssetsOrderByCreatedAt ListAssetsOrderBy = "createdAt"
	ListAssetsOrderByUpdatedAt ListAssetsOrderBy = "updatedAt"
)

// IsValid reports whether the order by condition is valid.
func (ob ListAssetsOrderBy) IsValid() bool {
	switch ob {
	case ListAssetsOrderByCreatedAt, ListAssetsOrderByUpdatedAt:
		return true
	}
	return false
}

// ListAssetsParams holds parameters for listing assets.
type ListAssetsParams struct {
	// Keyword filters assets by display name pattern.
	//
	// Applied only if non-nil.
	Keyword *string

	// Owner filters assets by owner's username.
	//
	// Applied only if non-nil.
	Owner *string

	// Type filters assets by type.
	//
	// Applied only if non-nil.
	Type *string

	// Category filters assets by category.
	//
	// Applied only if non-nil.
	Category *string

	// FilesHash filters assets by files hash.
	//
	// Applied only if non-nil.
	FilesHash *string

	// Visibility filters assets by visibility.
	//
	// Applied only if non-nil.
	Visibility *string

	// OrderBy indicates the field by which to order the results.
	OrderBy ListAssetsOrderBy

	// SortOrder indicates the order in which to sort the results.
	SortOrder SortOrder

	// Pagination is the pagination information.
	Pagination Pagination
}

// NewListAssetsParams creates a new ListAssetsParams.
func NewListAssetsParams() *ListAssetsParams {
	return &ListAssetsParams{
		OrderBy:    ListAssetsOrderByCreatedAt,
		SortOrder:  SortOrderDesc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the parameters.
func (p *ListAssetsParams) Validate() (ok bool, msg string) {
	if p.Type != nil && model.ParseAssetType(*p.Type).String() != *p.Type {
		return false, "invalid type"
	}
	if p.Visibility != nil && model.ParseVisibility(*p.Visibility).String() != *p.Visibility {
		return false, "invalid visibility"
	}
	if !p.OrderBy.IsValid() {
		return false, "invalid orderBy"
	}
	if !p.SortOrder.IsValid() {
		return false, "invalid sortOrder"
	}
	if !p.Pagination.IsValid() {
		return false, "invalid pagination"
	}
	return true, ""
}

// ListAssets lists assets.
func (ctrl *Controller) ListAssets(ctx context.Context, params *ListAssetsParams) (*ByPage[AssetDTO], error) {
	// Ensure non-owners can only see public assets.
	if mUser, ok := UserFromContext(ctx); !ok || params.Owner == nil || *params.Owner != mUser.Username {
		public := model.VisibilityPublic.String()
		params.Visibility = &public
	}

	query := ctrl.db.WithContext(ctx).Model(&model.Asset{})
	if params.Keyword != nil {
		query = query.Where("asset.display_name LIKE ?", "%"+*params.Keyword+"%")
	}
	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = asset.owner_id").Where("user.username = ?", *params.Owner)
	}
	if params.Type != nil {
		query = query.Where("asset.type = ?", model.ParseAssetType(*params.Type))
	}
	if params.Category != nil {
		query = query.Where("asset.category = ?", *params.Category)
	}
	if params.FilesHash != nil {
		query = query.Where("asset.files_hash = ?", *params.FilesHash)
	}
	if params.Visibility != nil {
		query = query.Where("asset.visibility = ?", model.ParseVisibility(*params.Visibility))
	}
	switch params.OrderBy {
	case ListAssetsOrderByCreatedAt:
		query = query.Order(fmt.Sprintf("asset.created_at %s", params.SortOrder))
	case ListAssetsOrderByUpdatedAt:
		query = query.Order(fmt.Sprintf("asset.updated_at %s", params.SortOrder))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count assets: %w", err)
	}

	var mAssets []model.Asset
	if err := query.
		Preload("Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mAssets).
		Error; err != nil {
		return nil, fmt.Errorf("failed to list assets: %w", err)
	}
	assetDTOs := make([]AssetDTO, len(mAssets))
	for i, mAsset := range mAssets {
		assetDTOs[i] = toAssetDTO(mAsset)
	}
	return &ByPage[AssetDTO]{
		Total: total,
		Data:  assetDTOs,
	}, nil
}

// GetAsset gets asset by id.
func (ctrl *Controller) GetAsset(ctx context.Context, id string) (*AssetDTO, error) {
	mAssetID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid asset id: %w", err)
	}
	mAsset, err := ctrl.ensureAsset(ctx, mAssetID, false)
	if err != nil {
		return nil, err
	}
	assetDTO := toAssetDTO(*mAsset)
	return &assetDTO, nil
}

// UpdateAssetParams holds parameters for updating an asset.
type UpdateAssetParams struct {
	DisplayName string               `json:"displayName"`
	Type        string               `json:"type"`
	Category    string               `json:"category"`
	Files       model.FileCollection `json:"files"`
	FilesHash   string               `json:"filesHash"`
	Visibility  string               `json:"visibility"`
}

// Validate validates the parameters.
func (p *UpdateAssetParams) Validate() (ok bool, msg string) {
	if p.DisplayName == "" {
		return false, "missing displayName"
	} else if !assetDisplayNameRE.Match([]byte(p.DisplayName)) {
		return false, "invalid displayName"
	}
	if model.ParseAssetType(p.Type).String() != p.Type {
		return false, "invalid type"
	}
	if p.Category == "" {
		return false, "missing category"
	}
	if p.FilesHash == "" {
		return false, "missing filesHash"
	}
	if model.ParseVisibility(p.Visibility).String() != p.Visibility {
		return false, "invalid visibility"
	}
	return true, ""
}

// UpdateAsset updates an asset.
func (ctrl *Controller) UpdateAsset(ctx context.Context, id string, params *UpdateAssetParams) (*AssetDTO, error) {
	mAssetID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid asset id: %w", err)
	}
	mAsset, err := ctrl.ensureAsset(ctx, mAssetID, true)
	if err != nil {
		return nil, err
	}
	updates := map[string]any{}
	if params.DisplayName != mAsset.DisplayName {
		updates["display_name"] = params.DisplayName
	}
	if params.Type != mAsset.Type.String() {
		updates["type"] = model.ParseAssetType(params.Type)
	}
	if params.Category != mAsset.Category {
		updates["category"] = params.Category
	}
	if !maps.Equal(params.Files, mAsset.Files) {
		updates["files"] = params.Files
	}
	if params.FilesHash != mAsset.FilesHash {
		updates["files_hash"] = params.FilesHash
	}
	if params.Visibility != mAsset.Visibility.String() {
		updates["visibility"] = model.ParseVisibility(params.Visibility)
	}
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Model(mAsset).Omit("Owner").Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update asset: %w", err)
		}
	}
	assetDTO := toAssetDTO(*mAsset)
	return &assetDTO, nil
}

// DeleteAsset deletes an asset.
func (ctrl *Controller) DeleteAsset(ctx context.Context, id string) error {
	mAssetID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid asset id: %w", err)
	}
	mAsset, err := ctrl.ensureAsset(ctx, mAssetID, true)
	if err != nil {
		return err
	}
	if err := ctrl.db.WithContext(ctx).Delete(mAsset).Error; err != nil {
		return fmt.Errorf("failed to delete asset: %w", err)
	}
	return nil
}
