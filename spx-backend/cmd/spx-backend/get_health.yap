// test health.
//
// Request:
//   GET /health

ctx := &Context

result, err := ctrl.Health(ctx.Context())
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result