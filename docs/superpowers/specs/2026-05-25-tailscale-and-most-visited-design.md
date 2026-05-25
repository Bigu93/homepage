# Tailscale Status + Most-Visited — Design Spec

Date: 2026-05-25
Status: Approved

## Goal

Add two low-cost, useful features to the startpage:

1. **Tailscale status chip** — at-a-glance indicator of whether the local Tailscale daemon is running.
2. **Most-visited auto-section** — surface the user's frequently used shortcuts at the top of the sidebar without manual pinning.

Both must fit existing patterns (no build, no deps, no tests, localStorage overlay only).

## Feature 1 — Tailscale Status Chip

### UX

- New chip in the header right cluster, placed immediately left of the weather chip.
- Visual: rounded pill matching `.weather-chip` shape. Contains a colored status dot + label `Tailscale`.
- States:
  - `unknown` — gray dot, label `Tailscale`, shown until first probe resolves
  - `on` — emerald dot, label `Tailscale`, `title` attr = `Up — checked HH:MM:SS`
  - `off` — rose dot, label `Tailscale`, `title` attr = `Down — checked HH:MM:SS`
  - `checking` — pulsing gray dot, transient
- Click action: force immediate re-probe (no navigation). Disabled while a probe is in flight.

### Detection

Browser-only probe of Tailscale's MagicDNS resolver:

```js
await fetch("http://100.100.100.100/", {
  mode: "no-cors",
  signal: AbortSignal.timeout(1500),
});
```

- Resolves (opaque response) → `on`.
- Rejects (timeout, network error, blocked) → `off`.

Auto-probe every 30s via `setInterval`. Probes deduplicate: if one is in flight, click is a no-op.

### Module: `js/tailscale.js`

Exports:
- `initTailscale()` — wire chip, kick off first probe, start interval.

Internal:
- `probe()` returns `"on" | "off"`.
- `paint(state)` updates dot class + title.

### Edge cases

- Private browsing / strict CSP: probe always fails → reports `off`. No crash.
- MagicDNS reachable but device not logged into a tailnet: still reports `on` (the daemon is up — good enough for the user's needs; admin console click is not in this feature).
- AbortSignal.timeout unsupported: fall back to manual `AbortController` + `setTimeout`.

## Feature 2 — Most-Visited Auto-Section

### UX

- New sidebar group `Frequent`, rendered **above** the existing pinned group.
- Shows up to 6 links sorted by click count (desc), ties broken by name asc.
- Hidden when no link has count ≥ 2 (avoids noise on fresh installs).
- Same visual shape as pinned group: small favicon + name row, clickable.
- Settings panel gains a `Clear usage stats` button that zeros all counts.

### Data

Overlay schema bumps from `v1` → `v2`. New field:

```js
overlay.clickCounts = { [linkId]: number };
```

Migration on load: if `schemaVersion < 2`, set `clickCounts = {}` and bump version.

### Click tracking

- Every click on a card (grid) or pinned/frequent entry (sidebar) calls `recordClick(linkId)` from `js/stats.js`.
- `recordClick` increments the count, caps at 9999 per link, saves overlay (debounced 500ms to avoid write storm on rapid navigation).

### Module: `js/stats.js`

Exports:
- `initStats(overlay)` — store reference, set up debounced save.
- `recordClick(linkId)` — increment count.
- `topLinks(merged, n = 6)` — return up to `n` link objects from `merged` whose count ≥ 2, sorted by count desc then name asc.
- `clearStats()` — wipe `clickCounts` and save.

### Rendering

`js/render/sidebar.js` gains a `renderFrequent(merged)` step that runs before the pinned group. If `topLinks` returns empty, the group element is not appended.

## Files

### New
- `js/tailscale.js`
- `js/stats.js`

### Changed
- `index.html` — add `<button id="tailscale-chip" class="tailscale-chip">…</button>` before `#weather-chip`.
- `js/main.js` — import + call `initTailscale()` and `initStats(overlay)`.
- `js/storage.js` — bump `SCHEMA_VERSION` to 2; add migration `v1 → v2` initializing `clickCounts: {}`.
- `js/render/grid.js` — wire `recordClick(link.id)` on card click.
- `js/render/sidebar.js` — wire `recordClick` on pinned/frequent click; render Frequent group above pinned.
- `js/crud/settings.js` — add `Clear usage stats` button with confirm dialog.
- `styles/main.css` — `.tailscale-chip` (reuse weather-chip rules), `.status-dot` (8px circle, color modifiers), `.nav-frequent` (reuse `.nav-pinned`).

## Non-goals

- Tailscale peer list, exit-node, tailnet name (would need local API bridge — out of scope).
- Recency-weighted ranking (raw counts are sufficient at this scale).
- Per-link click history or graphs.
- Click tracking for external (non-link) UI elements.

## Testing

None — project policy. Manual smoke checks:

1. Toggle tailscaled on/off; chip flips within 30s, click forces immediate update.
2. Click a card twice; Frequent group appears with that link.
3. Clear stats; Frequent group disappears.
4. Load page with `schemaVersion: 1` overlay; verify migration adds empty `clickCounts` without data loss.
