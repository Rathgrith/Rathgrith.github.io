# Frontend structure and regression checks

The site has one active visual system: the dark Nostalgia desktop, with Alice, Marisa and Patchouli palettes. It no longer loads Minimal Mistakes layout/reset styles, the earlier paper/glass redesign, the old standalone-gallery rules, jQuery navigation/lightbox plugins, or the old standalone music player. The companion has its own opt-in BGM component.

## Style ownership

`_includes/head.html` lists styles in an explicit order. The files are readable source, not generated override bundles.

| File | Owns |
| --- | --- |
| `icons.scss` | Font Awesome glyphs only; no theme layout imports |
| `classic-theme.css` | Three palettes, wallpaper, typeface and global stacking levels |
| `classic-base.css` | Reset, shared primitives, hidden/accessibility rules and original cursors |
| `classic-site.css` | Frame, header, profile, document typography, education, publications and responsive layout |
| `classic-widgets.css` | Options menu, bounded hover previews and pixel click feedback |
| `classic-loading.css` | Shared pixel prayer animation and bounded homepage entrance |
| `classic-pages.css` | Gallery collections, cards and archive layout |
| `classic-gallery-viewer.css` | Modal, original-image containment, controls and filmstrip |
| `classic-weather.css` | Integrated observation dial; no independent mobile/global hiding rules |
| `classic-bgm.css` | Compact companion audio controls, pixel transport icons and range sliders |
| `classic-companion.css` | Floating window, scene, dialogue, panels, loading and viewport behavior |
| `classic-danmaku.css` | Companion arcade lobby, score HUD, playfield and pause/result screens |
| `classic-ornaments.css` | Static character corner art in documents and companion panels |

The native `hidden` attribute wins globally. The active styles do not depend on increasing `html.classic-root body.classic-site` specificity to defeat another template. Site options, companion, previews, modal and loading layers are ordered through theme variables. Each component uses small local layers within its own stacking context.

At 1000px the profile becomes a rail. Below that it sits above the document, and below 600px contacts move under the portrait. Desktop rails share `--classic-rail-width` (270–292px) inside the 1760px frame: the homepage companion sits below the left in-page index, and Gallery's sits below Collections in the right rail. The remaining width goes to the document or photographs. A gallery rail containing an expanded companion stays in page flow so tall dialogue is accessible; the collection index can stick when the companion is hidden or detached. Compact screens show the companion by default in the bottom dock. Independent compact/desktop visibility preferences survive resize and reload. Publication rows and education use container queries for their available content width.

Gallery cards always crop to 4:3, with five columns at 1280px and above and three/two/one columns on narrower screens. Each page load or soft navigation shuffles photographs within their collections in the browser before initializing the viewer; data files stay in their original order and no randomized order is persisted. Resizing preserves the current order, and the viewer follows the displayed sequence. The viewer and its placeholder always contain the original aspect ratio. The filmstrip eagerly loads its bounded thirteen-image neighborhood. Hover previews use fixed positioning clamped to the viewport, and do not participate in page overflow while hidden.

## Runtime ownership

- `page-transition.js` replaces `#main`, updates metadata/history and dispatches `site:content-updated`. Page swapping is immediate; the retired paper animation and its artificial wait are removed.
- `classic-navigation.js` updates page tabs and reading/collection indexes.
- `site-options.js` owns the header menu. `live2d-toggle.js` owns the single persisted companion visibility preference.
- `companion-dialogue.js` owns the dialogue state machine and persistent preferences; `companion-dialogues.js` contains writing and pure story selection. See [the companion guide](companion-system.md).
- `companion-voice-reactions.js` owns opt-in recorded interjections. Eighteen brief clips use emotion selection, a per-character cooldown and consecutive-repeat avoidance. Mouth articulation remains driven by the kana plan. See [voice sources](companion-voices.md).
- `companion-bgm.js` owns one lazy `HTMLAudioElement`, three local ensemble tracks and a skeuomorphic cassette deck. Refresh always starts muted and paused; only volume is persisted. Character switches fade down/up; the same audio element survives page navigation. Close/minimize, background tabs and the arcade suspend playback. Source credits and the reproducible offline render are in `assets/music/companion/CREDITS.md`.
- `live2d-loader.js` owns Cubism/PIXI model lifecycle, half-body framing, motion and window movement. Model requests use a generation token so rapid switches cannot replace the current character with a stale result. Gaze uses the original page-wide SDK coordinate mapping. Only the dialogue rectangle smoothly returns it to neutral; menu/music controls and the rest of the page keep following. Touch and reduced-motion mode do not track. Playground tracks size, position and maximize/restore state independently; ResizeObserver rerenders the stage and budgets compact height from actual controls.
- `games/danmaku-engine.js`, `danmaku-renderer.js` and `companion-danmaku.js` separately own the arcade simulation, Canvas 2D view and UI/lifecycle. The game uses `danmaku-audio.js` for independent, silent-by-default battle BGM and effect mixing from deterministic event hooks. The mounted game pauses the conversation renderer, music and typewriter; local pixel sprites keep it independent of remote Live2D availability. See [the game guide](danmaku-game.md).
- Before replacing `#main`, page navigation emits `site:before-content-replace`. The companion clears its dragged position and custom size and temporarily reparents to `body`, then moves to the destination page's dock. This retains the same canvas and weather instance. Weather refresh/location/cache behavior remains in `components/weather-widget.js`.
- Publications, runtime, hover previews and the gallery each keep their own small module. Visitor counters and analytics integrations have been removed. No generic legacy feature loader or jQuery bundle is required.

Auxiliary conversation panels share a grid cell with the scene; inactive content is inert. Docked windows grow to fit dialogue, choices and panels, avoiding a nested scrollbar within the page. Detached windows use a bounded viewport where only the active view scrolls. Panel headers remain available in short floating windows, and opening settings cannot scroll the whole window past its titlebar. History retains a bounded list; the arcade uses its own height budget.

## Running checks

Build Jekyll and serve `_site` first. Audio seeking checks need a server with HTTP byte-range support (Jekyll/WEBrick and GitHub Pages support this; Python’s basic `http.server` does not). Tests require Node and an installed Playwright module plus Chrome. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation; otherwise Node resolves the regular `playwright` package. No Node tooling is required for the published site.

```sh
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-bgm.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-gaze.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/playground-window.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-voice-reactions.cjs
node tests/companion-data.cjs
node tests/danmaku-engine.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/danmaku-audio.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/danmaku-audio-resilience.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/danmaku-browser.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/danmaku-presentation.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/loading-browser.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/site-browser.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-browser.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-resilience.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-mobile.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-lighting.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-performance.cjs
```

Screenshots go to the system temporary directory by default; set `QA_OUTPUT` to retain them elsewhere. Software Chrome rendering is used for consistent captures on the development Mac.

Validated on 2026-10-08:

- 45 combinations: three themes at 15 widths from 320 to 1920px; no page overflow, square portraits, 28px contained school emblems, single-row navigation, bounded footer.
- Gallery at seven widths, all 110 thumbnail crops, full-size containment, keyboard navigation/focus, browser history, and useful static links with JavaScript disabled.
- Companion at twelve widths plus 600×360 landscape: docked dialogue has no vertical overflow, text and primary action remain visible, dock placement and detached window bounds stay correct, short floating settings panels scroll independently.
- All 99 Japanese everyday lines plus 18 acquaintance remarks, four affinity tiers, both response branches, day/night and seven fixed-date holiday groups.
- Explicit directions on all 135 lines (including 18 existing quotations), all 15 rendered body poses and hand layers, Patchouli's reading angle, sustained facial expressions, and the latest-line motion queue. Desktop index/dock ordering also survives breakpoint changes.
- Saved affinity/text speed, per-character isolation, typewriter completion, minimized pause, auto stopping for choices, single instances across soft navigation, close/reopen and keyboard movement.
- Fresh mobile visits do not load a model; opt-in, page-bottom/index order, separate desktop/mobile visibility, reload and soft-navigation retention are checked.
- Simulated model/CDN and weather failure, model retry, rapid character switching, blocked localStorage, reduced motion and the Halloween branch in the UI.
- Nine endless arcade matchups, three distinct shot types and patterns, growing density, collision/graze/strike rules, actual canvas output, keyboard/touch controls, result/retry/records, short landscape and seven playfield widths. Leaving the game restores the existing conversation.
- Browser checks observed no uncaught JavaScript errors or missing local assets. Remote models, weather and original photos still depend on their existing providers; failure behavior is tested separately from successful loading.

Manual review includes desktop views of all three characters, tablet/phone profile layouts, gallery cards and viewer, weather, settings, choices and short-window scrolling. These checks document tested coverage rather than a guarantee about every browser or third-party outage.
