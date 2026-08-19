package tutorial

// Spotlight points the learner at one part of the UI.
type Spotlight struct{}

// SpotlightOptions controls how the spotlight presents its target.
type SpotlightOptions struct {
	// Mask dims everything except the revealed target.
	Mask bool `json:"mask"`
	// Duration is the auto-conceal delay in seconds. 0 keeps the spotlight
	// visible until the learner clicks anywhere.
	Duration float64 `json:"duration"`
}

// courseGuidanceSpotlight is what a Course wants by default: the surroundings
// dimmed, and the highlight held until the learner acts on it.
var courseGuidanceSpotlight = SpotlightOptions{Mask: true, Duration: 0}

type spotlightRevealRequest struct {
	Target  string           `json:"target"`
	Tip     string           `json:"tip"`
	Options SpotlightOptions `json:"options"`
}

// Reveal highlights the UI elements matching target and shows tip beside them.
// It returns once the spotlight is shown rather than waiting for it to be
// dismissed, so it never blocks the Course flow. target is a Radar selector.
func (p *Spotlight) Reveal(target, tip string) {
	p.RevealWith(target, tip, courseGuidanceSpotlight)
}

// RevealWith is Reveal with explicit presentation options.
func (p *Spotlight) RevealWith(target, tip string, options SpotlightOptions) {
	mustCallCapability("spotlight_reveal", spotlightRevealRequest{
		Target:  target,
		Tip:     tip,
		Options: options,
	}, nil)
}
