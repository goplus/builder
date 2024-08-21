package controller

import (
	"context"
	"regexp"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// assetDisplayNameRE is the regular expression for asset display name.
var assetDisplayNameRE = regexp.MustCompile(`^.{1,100}$`)

// ensureAsset ensures the asset exists and the user has access to it.
func (ctrl *Controller) ensureAsset(ctx context.Context, id string, ownedOnly bool) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)

	asset, err := model.AssetByID(ctx, ctrl.db, id)
	if err != nil {
		logger.Printf("failed to get asset: %v", err)
		return nil, err
	}

	if ownedOnly || asset.IsPublic == model.Personal {
		if _, err := EnsureUser(ctx, asset.Owner); err != nil {
			return nil, err
		}
	}

	return asset, nil
}

// GetAsset gets asset by id.
func (ctrl *Controller) GetAsset(ctx context.Context, id string) (*model.Asset, error) {
	return ctrl.ensureAsset(ctx, id, false)
}

// ListAssetsOrderBy is the order by condition for listing assets.
type ListAssetsOrderBy string

var (
	DefaultOrder   ListAssetsOrderBy = "default"
	TimeDesc       ListAssetsOrderBy = "time"
	ClickCountDesc ListAssetsOrderBy = "clickCount"
)

type SearchSuggestionsResult struct {
	Suggestions []string `json:"suggestions"`
}

// ListAssetsParams holds parameters for listing assets.
type ListAssetsParams struct {
	// Keyword is the keyword filter for the display name, applied only if non-empty.
	Keyword string

	// Owner is the owner filter, applied only if non-nil.
	Owner *string

	// Category is the category filter, applied only if non-nil.
	Category *string

	// AccessType is the access type filter, applied only if non-nil.
	AssetType *model.AssetType

	// FilesHash is the files hash filter, applied only if non-nil.
	FilesHash *string

	// IsPublic is the visibility filter, applied only if non-nil.
	IsPublic *model.IsPublic

	// OrderBy is the order by condition.
	OrderBy ListAssetsOrderBy

	// Pagination is the pagination information.
	Pagination model.Pagination
}

// Validate validates the parameters.
func (p *ListAssetsParams) Validate() (ok bool, msg string) {
	return true, ""
}

// ListAssets lists assets.
func (ctrl *Controller) ListAssets(ctx context.Context, params *ListAssetsParams) (*model.ByPage[model.Asset], error) {
	logger := log.GetReqLogger(ctx)

	// Ensure non-owners can only see public assets.
	if user, ok := UserFromContext(ctx); !ok || params.Owner == nil || user.Name != *params.Owner {
		public := model.Public
		params.IsPublic = &public
	}

	var wheres []model.FilterCondition
	if params.Keyword != "" {
		wheres = append(wheres, model.FilterCondition{Column: "display_name", Operation: "LIKE", Value: "%" + params.Keyword + "%"})
	}
	if params.Owner != nil {
		wheres = append(wheres, model.FilterCondition{Column: "owner", Operation: "=", Value: *params.Owner})
	}
	if params.Category != nil {
		for _, category := range StringToStringArray(*params.Category) {
			leafCategories := model.FindLeafCategories(category)
			// If the category is not a leaf category, we need to search for all leaf categories under it.
			for _, leaf := range leafCategories {
				wheres = append(wheres, model.FilterCondition{Column: "category", Operation: "=", Value: leaf})
			}
		}
	}
	if params.AssetType != nil {
		wheres = append(wheres, model.FilterCondition{Column: "asset_type", Operation: "=", Value: *params.AssetType})
	}
	if params.FilesHash != nil {
		wheres = append(wheres, model.FilterCondition{Column: "files_hash", Operation: "=", Value: *params.FilesHash})
	}
	if params.IsPublic != nil {
		wheres = append(wheres, model.FilterCondition{Column: "is_public", Operation: "=", Value: *params.IsPublic})
	}

	var orders []model.OrderByCondition
	switch params.OrderBy {
	case TimeDesc:
		orders = append(orders, model.OrderByCondition{Column: "c_time", Direction: "DESC"})
	case ClickCountDesc:
		orders = append(orders, model.OrderByCondition{Column: "click_count", Direction: "DESC"})
	}

	assets, err := model.ListAssets(ctx, ctrl.db, params.Pagination, wheres, orders)
	if err != nil {
		logger.Printf("failed to list assets : %v", err)
		return nil, err
	}
	return assets, nil
}

// AddAssetParams holds parameters for adding an asset.
type AddAssetParams struct {
	DisplayName string               `json:"displayName"`
	Owner       string               `json:"owner"`
	Category    string               `json:"category"`
	AssetType   model.AssetType      `json:"assetType"`
	Files       model.FileCollection `json:"files"`
	FilesHash   string               `json:"filesHash"`
	Preview     string               `json:"preview"`
	IsPublic    model.IsPublic       `json:"isPublic"`
}

// Validate validates the parameters.
func (p *AddAssetParams) Validate() (ok bool, msg string) {
	if p.DisplayName == "" {
		return false, "missing displayName"
	} else if !assetDisplayNameRE.Match([]byte(p.DisplayName)) {
		return false, "invalid displayName"
	}
	if p.Owner == "" {
		return false, "missing owner"
	}
	if p.Category == "" {
		return false, "missing category"
	}
	switch p.AssetType {
	case model.AssetTypeSprite, model.AssetTypeBackdrop, model.AssetTypeSound:
	default:
		return false, "invalid assetType"
	}
	if p.FilesHash == "" {
		return false, "missing filesHash"
	}
	switch p.IsPublic {
	case model.Personal, model.Public:
	default:
		return false, "invalid isPublic"
	}
	return true, ""
}

// AddAsset adds an asset.
func (ctrl *Controller) AddAsset(ctx context.Context, params *AddAssetParams) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)
	isUserAsset := false
	user, err := EnsureUser(ctx, params.Owner)
	if err != nil {
		return nil, err
	}

	//handle asset category
	if params.Category == "imported" || params.Category == "history" || params.Category == "liked" {
		params.Category = "*"
		isUserAsset = true
	}

	asset, err := model.AddAsset(ctx, ctrl.db, &model.Asset{
		DisplayName: params.DisplayName,
		Owner:       user.Name,
		Category:    params.Category,
		AssetType:   params.AssetType,
		Files:       params.Files,
		FilesHash:   params.FilesHash,
		Preview:     params.Preview,
		IsPublic:    params.IsPublic,
	})
	if err != nil {
		logger.Printf("failed to add asset: %v", err)
		return nil, err
	}
	if isUserAsset {
		err = ctrl.AddUserAsset(ctx, &AddUserAssetParams{
			AssetID: asset.ID,
		}, "imported", user.Name)
		if err != nil {
			logger.Printf("failed to add user asset: %v", err)
			return nil, err
		}
	}
	return asset, nil
}

// UpdateAssetParams holds parameters for updating an asset.
type UpdateAssetParams struct {
	DisplayName string               `json:"displayName"`
	Category    string               `json:"category"`
	AssetType   model.AssetType      `json:"assetType"`
	Files       model.FileCollection `json:"files"`
	FilesHash   string               `json:"filesHash"`
	Preview     string               `json:"preview"`
	IsPublic    model.IsPublic       `json:"isPublic"`
}

// Validate validates the parameters.
func (p *UpdateAssetParams) Validate() (ok bool, msg string) {
	if p.DisplayName == "" {
		return false, "missing displayName"
	} else if !assetDisplayNameRE.Match([]byte(p.DisplayName)) {
		return false, "invalid displayName"
	}
	if p.Category == "" {
		return false, "missing category"
	}
	switch p.AssetType {
	case model.AssetTypeSprite, model.AssetTypeBackdrop, model.AssetTypeSound:
	default:
		return false, "invalid assetType"
	}
	if p.FilesHash == "" {
		return false, "missing filesHash"
	}
	switch p.IsPublic {
	case model.Personal, model.Public:
	default:
		return false, "invalid isPublic"
	}
	return true, ""
}

// UpdateAsset updates an asset.
func (ctrl *Controller) UpdateAsset(ctx context.Context, id string, updates *UpdateAssetParams) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)

	asset, err := ctrl.ensureAsset(ctx, id, true)
	if err != nil {
		return nil, err
	}

	updatedAsset, err := model.UpdateAssetByID(ctx, ctrl.db, asset.ID, &model.Asset{
		DisplayName: updates.DisplayName,
		Category:    updates.Category,
		AssetType:   updates.AssetType,
		Files:       updates.Files,
		FilesHash:   updates.FilesHash,
		Preview:     updates.Preview,
		IsPublic:    updates.IsPublic,
	})
	if err != nil {
		logger.Printf("failed to update asset: %v", err)
		return nil, err
	}
	return updatedAsset, nil
}

// IncreaseAssetClickCount increases the click count of an asset.
func (ctrl *Controller) IncreaseAssetClickCount(ctx context.Context, id string) error {
	logger := log.GetReqLogger(ctx)

	asset, err := ctrl.ensureAsset(ctx, id, false)
	if err != nil {
		return err
	}

	if err := model.IncreaseAssetClickCount(ctx, ctrl.db, asset.ID); err != nil {
		logger.Printf("failed to increase asset click count: %v", err)
		return err
	}
	return nil
}

// DeleteAsset deletes an asset.
func (ctrl *Controller) DeleteAsset(ctx context.Context, id string) error {
	logger := log.GetReqLogger(ctx)

	asset, err := ctrl.ensureAsset(ctx, id, true)
	if err != nil {
		return err
	}

	if err := model.DeleteAssetByID(ctx, ctrl.db, asset.ID); err != nil {
		logger.Printf("failed to delete asset: %v", err)
		return err
	}
	return nil
}

// GetSearchSuggestions returns search suggestions.
func (ctrl *Controller) GetSearchSuggestions(ctx context.Context, keyword string, limit string) (*SearchSuggestionsResult, error) {
	logger := log.GetReqLogger(ctx)
	limitInt, err := strconv.Atoi(limit)
	if err != nil {
		logger.Printf("failed to convert limit to int: %v", err)
		return nil, err
	}
	embedding, err := ctrl.GetEmbedding(ctx,
		&GetEmbeddingParams{
			Prompt:      keyword,
			CallbackUrl: "",
		})
	if err != nil {
		logger.Printf("failed to get embedding: %v", err)
		return nil, err
	}
	suggestions, err := model.SearchByVector(ctx, *ctrl.milvusClient, "asset", embedding.Embedding, limitInt)
	if err != nil {
		logger.Printf("failed to get search suggestions: %v", err)
		return nil, err
	}
	return &SearchSuggestionsResult{
		Suggestions: suggestions,
	}, nil
}
