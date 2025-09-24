// Record traffic access for existing traffic source.
//
// Request:
//   POST /analytics/traffic-source/#id/access

ctx := &Context

if err := ctrl.RecordTrafficAccess(ctx.Context(), ${id}); err!= nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""