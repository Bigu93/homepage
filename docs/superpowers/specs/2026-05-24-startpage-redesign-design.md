# Startpage Redesign — Design Spec

**Date**: 2026-05-24
**Status**: Approved — ready for implementation plan
**Owner**: Marcin (Bigu93)

## Goals

1. **Refine** the existing dashboard UI (Layout A — sidebar + grid + glass + indigo) using polished typography, spacing, color, and motion.
2. **Add full link CRUD** in-app so links/categories can be added, edited, deleted, and reordered without touching `shortcuts.js`.
3. **Refactor** the monolithic `js/dashboard.js` into focused ES modules.
4. Bring back two features from the original README that the current UI lost: **web search** and **weather**.
5. Ship an in-app **help guide** explaining how to use everything.

## Non-goals (v1)

- Command palette (Cmd+K).
- Cross-device sync.
- RSS, notes, todos, calendar.
- UI for swapping background images.
- Notifications / alarms.
- Test framework — vanilla JS stays vanilla, verification is manual.
- Build tooling — no bundler, no `package.json`, native ES module imports.

## Constraints

- Static site, no server. Hosted via local file or GitHub Pages.
- Single user (Marcin). No multi-tenant, no auth.
- All user data lives in `localStorage`.
- Defaults seeded from `js/shortcuts.js` (still hand-edited as needed).
- Browser support: latest Chrome/Firefox/Edge. No IE, no legacy fallbacks.

## Architecture

### Module layout

Split `js/dashboard.js` into focused ES modules. Each module ≤ ~150 LOC, one responsibility, one public surface.

```
js/
├── main.js              # entry; wires modules, mounts app
├── state.js             # in-memory state store + pub/sub
├── storage.js           # localStorage I/O + schema versioning + migrations
├── data.js              # merge(seed, overlay) → effective categories+links
├── shortcuts.js         # SEED only (existing file, format tweak — see Data model)
├── icons.js             # SVG icon registry (extracted)
├── theme.js             # dark/light toggle + apply
├── clock.js             # greeting + clock tick
├── weather.js           # OpenWeatherMap fetch + cache + render + settings
├── search.js            # smart unified search; engine prefixes; keyboard nav
├── engines.js           # default + custom search engines, URL templates
├── favicons.js          # favicon URL + cache (existing logic moved)
├── help.js              # help panel template + first-run logic
├── render/
│   ├── sidebar.js       # categories nav + pinned favorites group
│   ├── grid.js          # link cards + category sections + empty states
│   └── header.js        # greeting, clock, weather chip, search
└── crud/
    ├── modal.js         # generic modal primitive + toast()
    ├── link-editor.js   # add/edit/delete link form
    ├── category-editor.js  # add/edit/delete category form
    ├── settings.js      # username, theme, engine, weather, import/export, reset
    └── dnd.js           # drag-reorder for links + categories (incl. touch)
```

State module = single source of truth. Render modules subscribe to state changes and re-render scoped DOM. CRUD modules mutate state via `storage.js`, which persists the overlay.

### Data flow

```
shortcuts.js (seed) ──┐
                      ├──▶ data.js merge ──▶ state.js ──▶ render/* ──▶ DOM
overlay (localStorage)┘                          ▲
                                                 │
                          crud/* ── mutate ──────┘
                                                 │
                          settings ── persist ───▶ storage.js
```

## Data model

### Seed (`js/shortcuts.js`)

Items become arrays (not objects) so order is preserved. Each category and link gets a stable `id`.

```js
export default [
  {
    id: "cat-main",
    category: "Main",
    color: "yellow",
    icon: "home",
    items: [
      { id: "lnk-gmail", name: "gmail", url: "https://mail.google.com/mail/u/0/#inbox" },
      // …
    ],
  },
  // …
];
```

If a seed entry is missing an `id`, one is generated deterministically from `slugify(category)` / `slugify(name)` on load and cached so it stays stable across reloads.

### Overlay (`localStorage` key `startpage_overlay_v1`)

```js
{
  schemaVersion: 1,
  added: {
    categories: [ { id, category, color, icon, items: [...] } ],
    links: { [categoryId]: [ { id, name, url }, ... ] },
  },
  edited: {
    categories: { [id]: { name?, color?, icon? } },
    links:      { [id]: { name?, url?, categoryId? } },
  },
  deleted: {
    categories: [id, ...],
    links:      [id, ...],
  },
  order: {
    categories: [id, id, ...],
    links: { [categoryId]: [id, ...] },
  },
  favorites: [linkId, ...],
  settings: {
    theme: "dark" | "light",
    defaultEngine: "ddg" | "google" | "bing" | "kagi" | string,
    customEngines: [ { key, label, urlTemplate } ],
    weather: { apiKey, lat, lon, label, units: "metric" | "imperial" } | null,
    username: "Marcin",
    helpDismissed: boolean,
  },
}
```

### Merge algorithm (`data.js`)

1. Start with the seed array.
2. Drop categories whose id ∈ `deleted.categories`.
3. Apply `edited.categories` (shallow merge per id).
4. For each category, drop links whose id ∈ `deleted.links`.
5. Apply `edited.links` (including `categoryId` moves between categories).
6. Append `added.categories` and per-category `added.links`.
7. Reorder categories by `order.categories`; ids not present in `order` are appended at the end. Same per-category for links via `order.links[categoryId]`.

This handles the case where you later add a new entry to `shortcuts.js` — it simply appears at the end since its id isn't in `order`.

### Migrations (`storage.js`)

- On load, read `schemaVersion`. If older, run each migration in order until current.
- Initial migration from current code:
  1. Read legacy `favorites` (URL-set) → look up each URL in seed → map to link id → write `overlay.favorites`. Unknown URLs are dropped.
  2. Leave `favicons_cache` untouched (key unchanged).
  3. Delete legacy `favorites` key after success.
- Unknown future `schemaVersion` (overlay newer than app) → confirm dialog "Overlay was created by a newer version. Reset?".

### Export / import

- Export: `JSON.stringify(overlay, null, 2)` → download `startpage-backup-YYYY-MM-DD.json`.
- Import: file picker → `JSON.parse` → schema validation (required keys, value types) → confirm overwrite → replace overlay → reload page.

### Reset to defaults

- Confirm modal: deletes `startpage_overlay_v1.added/edited/deleted/order/favorites` but keeps `settings` (theme, weather, engine, username).
- "Full reset" advanced action also wipes settings.

## Visual refinement (Layout A polish)

Keep current bones (sidebar 240px + main grid + glass + indigo). Tighten everything.

### Typography

- Drop Inter. Ship **Geist Sans** (UI) + **Geist Mono** (clock, weather temp, keyboard hints).
- Scale:
  - Greeting `28px / 700 / -0.025em`
  - Date `13px / 500`
  - Category header `11px / 600 / 0.12em / uppercase`
  - Link title `14px / 500`
  - Clock `14px / 600 / mono`
- Line-height `1.4` base, `1.2` headings.

### Spacing

- Vertical rhythm on 4px grid.
- Header padding `24px` (was 32). Section gap `40px` (was 48). Card padding `14px 16px`.
- Sidebar `240px` (was 260). Nav-item padding `10px 12px` (was 12px 16px).

### Color

- `--bg-app: #020617` (slate-950) — less navy, more pure black-blue.
- Surface tokens through real opacity scale: `--surface-1: rgba(148,163,184,0.04)`, `--surface-2: 0.08`, `--surface-3: 0.12`. Same scale in light theme with inverted base.
- Category dots: `box-shadow: 0 0 8px currentColor / 40` for soft glow.
- Light theme bg: `#fafaf9` (stone-50) instead of cold `#f9fafb`.
- Accent: keep indigo `#6366f1`.

### Cards

- Border-radius `12px` (was 16).
- Remove sheen sweep on hover. Replace with border brighten + 1px icon lift + accent-tinted shadow.
- Favicon container: `32px` rounded square, 1px inner border, 4px padding around 24px favicon. Looks finished even with junk favicons.
- Star button: `opacity:0.3` at rest, `1` on hover/active. No 0→1 jump.

### Sidebar

- Active state: left stripe + bg lift only. No gradient + text-shadow combo.
- Link count next to category name: `Dev · 5` in `--text-dim`.
- New collapsible **Pinned** group at top showing favorited links.

### Animations

- Kill staggered fadeIn cascade.
- Single 200ms fade on view container.
- 150ms crossfade between category switches.
- Card hover 120ms (was 200).
- Theme toggle spin stays.

### Header

- Greeting + date on left.
- Right cluster (desktop, one line): weather chip → clock → search.
- Weather chip drops to row above clock at `< 720px`.
- Search input grows to `480px` on focus (was 500 always).

## Link CRUD UX

### Entry points

- **Add link**: floating `+` FAB bottom-right of grid; same modal also reachable via per-category `+` in section header.
- **Add category**: `+ New category` button at bottom of sidebar nav.
- **Edit link**: hover card → pencil icon appears next to star → modal.
- **Edit category**: hover category header → pencil + trash icons → modal.
- **Delete**: trash button is **inside the edit modal footer** (with confirm). Not on hover card. Avoids fat-finger.

### Link editor modal

Fields: name (required), url (required, must `new URL(...)` parse), category (dropdown), favicon (auto from URL, optional custom URL).

- Auto-fetch favicon preview when URL field changes (debounced 400ms).
- Inline red border + error text on invalid Save.
- `Cmd/Ctrl+Enter` submits. `Esc` cancels.

### Category editor modal

Fields: name, color (swatch picker — the 9 existing colors), icon (grid of icons from `icons.js` registry).

### Settings panel

Gear icon in sidebar footer next to theme toggle. One scrollable panel.

- Username (renames greeting).
- Default web search engine + add/remove custom engines (key, label, URL with `%s`).
- Weather: API key (password input), location (geocode picker), units (°C / °F), Test button.
- Data: Export (JSON download), Import (file picker → validate → confirm overwrite), Reset to defaults, Full reset.

### Drag-to-reorder (`crud/dnd.js`)

- Drag any link card → drop on another card (same or different category) → reorders. Live preview slot.
- Drag category in sidebar → reorders sidebar + grid.
- Drag link onto a sidebar category → moves it to that category.
- Desktop: HTML5 DnD (`dragstart` / `dragover` / `drop`).
- Touch: long-press 350ms triggers drag; otherwise tap = open link. Hand-rolled ~50 LOC, no library.
- Persist to `overlay.order` on drop.

### Empty states

- Category with zero links: "No links yet. [+ Add your first link]" inside the empty grid slot.
- All shortcuts deleted (no categories left): full empty state with "Reset to defaults" CTA.

## Smart search + web search (`search.js`)

Single input in header does double duty.

### Live behavior

- 0 chars: normal full grid view.
- 1+ chars: filter shortcuts by name + URL (case-insensitive). Match score: name-prefix > name-contains > url-contains.
- Top of filtered results: **`↵ Search web for "query"`** action row.

### Keys

| Key | Action |
|---|---|
| `/` | Focus input (when not already in an input) |
| `Enter` | If ≥1 shortcut match, open top match in **new tab**. Else web-search. |
| `Shift+Enter` | Force web-search regardless of matches. |
| `Cmd/Ctrl+Enter` | Open top match in **current tab**. |
| `Esc` | Clear input + blur. |
| `↑` / `↓` | Move selection through filtered shortcuts + web-search row. |
| `?` | Open help panel (when not focused in input). |
| `T` | Toggle theme (when not focused in input). |

Selection highlighted with `--accent-primary` left stripe + bg lift.

### Engine switcher

- Small chip left of input (replaces decorative magnifier). Shows current engine favicon + name.
- Click → dropdown: DuckDuckGo (default), Google, Bing, Kagi, custom engines, `+ Add custom`.
- Persisted in `overlay.settings.defaultEngine`.

### Per-query engine override (prefixes)

- `g foo` → Google, `d foo` → DDG, `y foo` → YouTube, `gh foo` → GitHub.
- Defined in `engines.js` as `{ key, label, urlTemplate }`. User can add custom prefixes via settings.
- Prefix detected in real time → engine chip indicates override + action row reads `↵ Search Google for "foo"`.

### URL templates

- DDG: `https://duckduckgo.com/?q=%s`
- Google: `https://www.google.com/search?q=%s`
- Bing: `https://www.bing.com/search?q=%s`
- Kagi: `https://kagi.com/search?q=%s`
- `%s` replaced with `encodeURIComponent(query)`.

### No-results state

`No shortcuts match. Press Enter to search the web.`

## Weather widget (`weather.js`)

### Provider

OpenWeatherMap free tier (60 req/min, requires API key).

### UI

Compact chip in header right cluster.

```
☀  18°  Warsaw
```

- Icon mapped from OWM `weather[0].main` to single glyph set (sun, cloud, rain, snow, fog, thunder).
- Temp rounded, unit from settings.
- City name in `--text-dim`, truncated to 14 chars.
- Hover tooltip: `Feels like 16°, humidity 62%, updated 5m ago`.
- Click chip → opens settings scrolled to Weather.

### Setup state (no API key)

Chip shows `⚙ Set up weather`, dashed border, muted. Click → opens settings weather form.

### Settings form

- API key (password input, link "Get free key →" to OWM signup).
- Location: text input → on blur, geocode via OWM `/geo/1.0/direct` → pick from up to 5 results → store `{lat, lon, label}`.
- Units: °C / °F.
- "Test" button → fetches once, surfaces result or error inline.

### Fetching

- On load if config present and last fetch > 15min ago.
- Cache in `localStorage` key `weather_cache_v1`: `{data, fetchedAt, lat, lon, units}`.
- Refresh on tab focus if cache stale.
- Errors (network, 401, 429) → chip shows `⚠ Weather unavailable`, tooltip with reason. Retry on next focus.

## Help guide (`help.js`)

### Triggers

- `?` key (when not in an input).
- `?` icon in sidebar footer.
- Auto-show on **first run** (overlay absent) with "Don't show on start" → sets `overlay.settings.helpDismissed`.

### Format

Side-sheet from right, `420px` wide, scrollable. Esc or backdrop click closes. Single page, no tabs.

### Content (in order)

1. **Search** — `/` to focus, Enter/Ctrl+Enter/Shift+Enter behavior, prefix examples (`g foo`, `d foo`, `y foo`, `gh foo`), how to change default engine.
2. **Manage links** — `+` button, hover-to-edit, drag-to-reorder, add category, edit/delete category.
3. **Favorites** — click ★ to pin, appear at top of sidebar.
4. **Settings** — username, theme, weather (API key), default engine + custom engines (`%s` placeholder), Export/Import, Reset.
5. **Keyboard shortcuts** — full reference table (same as Search-section table above).
6. **Data lives in your browser** — `localStorage` only, no server, Export to back up.
7. Footer: `[ Got it ]` `[ Don't show on start ]`.

Content lives in `help.js` as one template string. Rendered via `crud/modal.js` modal primitive.

### README

Rewrite [README.md](README.md) to reflect the actual product. Stale CLI/weather/`ls` text from the original startpage is removed. New README mirrors the in-app guide + install/host instructions.

## Edge cases

- **Duplicate ids in seed** → `data.js` dedups, logs warning, keeps first.
- **Schema version mismatch** → migrations run in order; unknown future version → confirm-and-reset dialog.
- **Malformed import JSON** → reject before applying; error shows offending field path.
- **Renamed/removed seed link user had favorited** → orphan favorite silently dropped on merge.
- **localStorage full / disabled** (private mode) → catch `QuotaExceededError` / SecurityError, toast `Changes won't persist (storage blocked)`; app continues in-memory.
- **Broken favicon** → `<img onerror>` swaps to first-letter circle tinted by category color.
- **Empty category** → empty-state slot with "+ Add link".
- **Very long link name** → ellipsis at card width; full name as `title` attr.
- **Touch DnD** → long-press 350ms triggers drag; tap = open link.
- **Drag link onto sidebar category** → moves link to that category.
- **Weather city ambiguous** → geocode picker forces choice; never auto-pick.
- **`?` / `T` while editing in modal/input** → does nothing (focus check).

## Errors

- All `fetch` calls wrapped, log to `console.warn` with module tag (`[weather]`, `[favicon]`).
- User-visible errors only via `toast(msg, kind)` (from `crud/modal.js`) or inline form errors.
- Never `alert()`.
- No telemetry, no remote logging.

## Rollout

- Single branch, single PR.
- No feature flags (one user, local app).
- Migration runs on first load of new code (see Data model → Migrations).
- Old `index.html` and `js/dashboard.js` replaced atomically; static site has no partial-deploy risk.
- Rollback = `git revert`. Overlay schema additions are additive — old code ignores unknown keys it doesn't read.

## Manual verification checklist

After implementation, walk through:

- [ ] Fresh browser (no localStorage) → app renders seed from `shortcuts.js`, help auto-shows.
- [ ] Add link → appears in correct category, persists across reload.
- [ ] Edit link name + URL + category move → persists, moves between categories.
- [ ] Delete link → gone, persists, doesn't reappear from seed.
- [ ] Re-add a link with same name → gets new id, both coexist.
- [ ] Add category → appears in sidebar + grid, persists.
- [ ] Edit category color + icon → reflected in sidebar + dot.
- [ ] Delete category → removed; its links also gone; persists.
- [ ] Drag link to another category → moves + persists.
- [ ] Drag category in sidebar → reorders sidebar + grid + persists.
- [ ] Star a link → appears in sidebar pinned group + persists.
- [ ] Search `gmail` → filters to Gmail card; Enter opens it.
- [ ] Search `xyznomatch` → "No shortcuts match"; Enter searches web.
- [ ] Prefix `g react hooks` → engine chip switches to Google, Enter opens Google.
- [ ] Switch default engine to Kagi via chip → persists.
- [ ] Add custom engine `gh` mapping to `https://github.com/search?q=%s` → `gh foo` works.
- [ ] Toggle theme → light theme correct, persists.
- [ ] Set weather (API key + city) → chip shows current temp; refresh on tab focus.
- [ ] Wrong weather API key → chip shows error, settings Test surfaces 401.
- [ ] Help panel via `?` key, sidebar `?` icon, and first-run all work.
- [ ] Export → downloads JSON; Import same file → no diff; Import malformed JSON → rejected.
- [ ] Reset → overlay cleared, defaults restored, settings preserved.
- [ ] Full reset → settings also cleared.
- [ ] Private window (storage blocked) → app still works, toast surfaced, changes not persisted.
- [ ] Mobile (<720px) → sidebar collapses, weather drops to its own row, DnD via long-press works.
- [ ] All keyboard shortcuts (`/`, Esc, ↑↓, Enter, Ctrl+Enter, Shift+Enter, `?`, `T`) work as documented.

## Open questions for implementation plan

(Resolved during planning, not before.)

- Exact font loading strategy for Geist (self-host vs Google Fonts vs `npm`-free CDN).
- Icon grid in category editor — show all icons or paginate?
- Whether to debounce `state` subscribers for high-frequency updates (search typing) or batch via `requestAnimationFrame`.
