// Get Douyin H5 share configuration.
//
// Request:
//   GET /douyin/h5-config

ctx := &Context

result, err := ctrl.GetDouyinH5Config(ctx.Context())
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result