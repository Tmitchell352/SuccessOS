// Ad configuration. Per docs/DYNASTY_HANDOFF.md Section 12: "Ads ... are
// legitimate considerations only once this is a genuinely independent app
// with its own backend ... not applicable to anything running inside
// Claude.ai, per Anthropic's ad-free commitment for Claude products." This
// repo is that independent app (its own Express backend, its own Supabase
// project), so the restriction that applied to the original Claude.ai
// artifact doesn't apply here - but the commitment is about where Claude
// products render, not about this codebase, so if this app is ever
// embedded back into a Claude.ai/Claude Code surface, ads must stay off
// there regardless of these env vars.
//
// Off by default. Turning ads on for real requires the site owner's own
// Google AdSense account and ad unit - there's no way to fabricate a
// working ad integration without real publisher credentials, and it would
// be wrong to try (a fake ad slot is either empty or, worse, deceptive).
// What's here is the real, standard AdSense embed pattern (see AdSlot.tsx),
// gated so it does nothing until those values are supplied.

export const adsEnabled = import.meta.env.VITE_ADS_ENABLED === "true";
export const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || null;
export const adsenseSlotId = import.meta.env.VITE_ADSENSE_SLOT_ID || null;
export const adsConfigured = adsEnabled && Boolean(adsenseClientId) && Boolean(adsenseSlotId);
