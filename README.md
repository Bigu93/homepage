# Startpage

A personal browser start page. Glassmorphic dashboard with full link CRUD, smart search, weather, and a help guide built in. No server, no build step — open `index.html` and go.

![Screenshot](/Screenshot.png)

## Install

### Local file

```bash
git clone https://github.com/Bigu93/homepage.git
```

Set your browser's new-tab / homepage to the path of `index.html` inside the repo.

### GitHub Pages

Fork the repo → Settings → Pages → Deploy from a branch → `main` / root. Use the resulting URL as your new-tab page.

## Use

- **Search** — type to filter your links. Press `Enter` to open the top match in a new tab. `Ctrl+Enter` opens in the current tab. `Shift+Enter` forces a web search.
- **Prefixes** — `g foo`, `d foo`, `y foo`, `gh foo` search Google / DuckDuckGo / YouTube / GitHub respectively. Add more in Settings.
- **Engine chip** — click the chip left of the input to switch the default engine.
- **Add link** — floating `+` bottom-right, or `+` next to a category header.
- **Edit link** — hover the card, click the pencil.
- **Favorite link** — hover the card, click the star.
- **Reorder** — drag cards within or between categories. Drag categories in the sidebar to reorder.
- **Move link** — drag a card onto a sidebar category.
- **Add category** — `+ New category` at the bottom of the sidebar.
- **Settings** — gear icon in sidebar footer. Configure username, default search engine, custom engines, weather (OpenWeatherMap API key + city), and export/import/reset your data.
- **Weather** — top-right chip. Click to configure. Free OpenWeatherMap key needed.
- **Theme** — toggle dark / light in the sidebar footer or press `T`.
- **Help** — press `?` or click the `?` in the sidebar.

## Keyboard

| Key           | Action                   |
| ------------- | ------------------------ |
| `/`           | Focus search             |
| `Esc`         | Clear / close            |
| `↑` / `↓`     | Navigate results         |
| `Enter`       | Open top match (new tab) |
| `Ctrl+Enter`  | Open in current tab      |
| `Shift+Enter` | Force web search         |
| `?`           | Help                     |
| `T`           | Toggle theme             |

## Data

Everything lives in your browser's `localStorage`. Use **Export** in Settings to back up. **Reset** restores defaults from `js/shortcuts.js` (keeps your settings). **Full reset** wipes settings too.

`js/shortcuts.js` is the seed — edit it directly if you want a different default link list. New entries you add via the UI live in the overlay (`localStorage` key `startpage_overlay_v1`) on top of the seed.

## Tech

Vanilla JS (ES modules), HTML, CSS. No bundler, no runtime deps, no test framework. Tested in Chromium + Firefox.

## License

See [LICENSE](LICENSE).
