package tutorial

// Spotlight draws the learner's attention to one place in the UI.
//
// The key difference from presentation like ShowMessage: a spotlight does not
// block the Course flow. It returns once the highlight is shown, without
// waiting for it to go away. The two shapes the product doc describes, one
// waiting for acknowledgement and one advancing on its own, are exactly the
// blocking dialog/video on one side and the non-blocking spotlight on the
// other.
type Spotlight struct {
	courseProgram *courseProgram
}

// SpotlightOptions controls how the highlight is presented.
type SpotlightOptions struct {
	// Mask dims everything outside the target to focus attention.
	Mask bool `json:"mask"`
	// Duration is the auto-conceal delay in seconds; 0 keeps the spotlight
	// visible until the learner clicks anywhere.
	//
	// Using a duration rather than a boolean persist was settled in review:
	// one field expresses both whether it auto-conceals and after how long,
	// and Go's zero value happens to be exactly the default a Course wants.
	Duration float64 `json:"duration"`
}

// courseGuidanceSpotlight is the default presentation for Course guidance: dim
// the surroundings and stay until the learner acts. Not auto-concealing by
// default is deliberate, because a highlight in a Course usually points the
// way ("click the run button here"), and vanishing before the learner notices
// would waste the hint.
var courseGuidanceSpotlight = SpotlightOptions{Mask: true, Duration: 0}

type spotlightRevealRequest struct {
	Target  string           `json:"target"`
	Tip     string           `json:"tip"`
	Options SpotlightOptions `json:"options"`
}

// Reveal highlights the UI elements target matches and shows tip beside them.
//
// target is a Radar selector — of the form "Code editor > Code text editor",
// built from node names annotated in builder's editor UI code and kept as
// stable as possible — not a Radar node ID, which is generated afresh on every
// mount and which Course code written in advance cannot know. The selector
// syntax is defined by the Radar module; this side only passes it through.
//
// A selector matching several elements highlights them together as one group,
// for instance every overload of an API name.
//
// Failure comes in two levels. A malformed selector fails the capability and
// therefore panics, so the author finds out during Preview. A well-formed
// selector that currently matches nothing — the API was filtered out by
// filterAPIs, or the element is not mounted yet — is not an error: the host
// retries briefly, then skips the highlight and logs a warning, since that is
// most likely a transient state and blowing up a whole Course over one
// highlight is not worth it.
func (p *Spotlight) Reveal(target, tip string) {
	p.RevealWith(target, tip, courseGuidanceSpotlight)
}

// RevealWith is Reveal with the presentation options given explicitly.
//
// Note that the author-side defaults are materialized at this layer: in the
// host contract options is a fully specified value, so the host never needs to
// know what a Course's guidance defaults are.
func (p *Spotlight) RevealWith(target, tip string, options SpotlightOptions) {
	p.courseProgram.mustCallCapability("spotlight_reveal", spotlightRevealRequest{
		Target:  target,
		Tip:     tip,
		Options: options,
	}, nil)
}
