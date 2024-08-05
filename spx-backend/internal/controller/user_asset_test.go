package controller

//func TestAddUserAsset(t *testing.T) {
//	t.Run("SuccessfulAdd", func(t *testing.T) {
//		ctrl := &Controller{db: mockDB}
//		params := &AddUserAssetParams{AssetID: 1}
//		err := ctrl.AddUserAsset(context.Background(), params, Liked)
//		assert.NoError(t, err)
//	})
//
//	t.Run("FailedAdd", func(t *testing.T) {
//		ctrl := &Controller{db: mockDBWithError}
//		params := &AddUserAssetParams{AssetID: 1}
//		err := ctrl.AddUserAsset(context.Background(), params, Liked)
//		assert.Error(t, err)
//	})
//}
//
//func TestListUserAssets(t *testing.T) {
//	t.Run("SuccessfulList", func(t *testing.T) {
//		ctrl := &Controller{db: mockDB}
//		params := &ListAssetsParams{Owner: ptr("user1")}
//		assets, err := ctrl.ListUserAssets(context.Background(), Liked, params)
//		assert.NoError(t, err)
//		assert.NotNil(t, assets)
//	})
//
//	t.Run("EmptyList", func(t *testing.T) {
//		ctrl := &Controller{db: mockDBEmpty}
//		params := &ListAssetsParams{Owner: ptr("user1")}
//		assets, err := ctrl.ListUserAssets(context.Background(), Liked, params)
//		assert.NoError(t, err)
//		assert.Empty(t, assets.Items)
//	})
//
//	t.Run("InvalidOwner", func(t *testing.T) {
//		ctrl := &Controller{db: mockDB}
//		params := &ListAssetsParams{Owner: nil}
//		assets, err := ctrl.ListUserAssets(context.Background(), Liked, params)
//		assert.NoError(t, err)
//		assert.NotNil(t, assets)
//	})
//}
