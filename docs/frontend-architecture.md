# Frontend structure and regression checks

The site has one active visual system: the dark Nostalgia desktop, with Alice, Marisa and Patchouli palettes. It no longer loads Minimal Mistakes layout/reset styles, the earlier paper/glass redesign, the old standalone-gallery rules, jQuery navigation/lightbox plugins, or the removed music player.

## Style ownership

`_includes/head.html` lists styles in an explicit order. The files are readable source, not generated override bundles.

| File | Owns |
| --- | --- |
| `icons.scss` | Font Awesome glyphs only; no theme layout imports |
| `classic-theme.css` | Three palettes, wallpaper, typeface and global stacking levels |
| `classic-base.css` | Reset, shared primitives, hidden/accessibility rules and original cursors |
| `classic-site.css` | Frame, header, profile, document typography, education, publications and responsive layout |
| `classic-widgets.css` | Options menu, bounded hover previews, pixel click feedback and loading screen |
| `classic-pages.css` | Gallery collections, cards and archive layout |
| `classic-gallery-viewer.css` | Modal, original-image containment, controls and filmstrip |
| `classic-weather.css` | Integrated observation dial; no independent mobile/global hiding rules |
| `classic-companion.css` | Floating window, scene, dialogue, panels, loading and viewport behavior |

The native `hidden` attribute wins globally. The active styles do not depend on increasing `html.classic-root body.classic-site` specificity to defeat another template. Site options, companion, previews, modal and loading layers are ordered through theme variables. Each component uses small local layers within its own stacking context.

At 1000px the profile becomes a rail. Below that it sits above the document, and below 600px contacts move under the portrait. At the same breakpoint the companion docks under the in-page navigation in the profile rail; the desktop uses proportional columns and a 1760px frame, with no right lane. Compact screens hide the companion by default; opening it reveals a bottom dock after the in-page index. Independent compact/desktop visibility preferences survive resize and reload. Publication rows and education use container queries for their available content width.

Gallery cards always crop to 4:3. The viewer and its placeholder always contain the original aspect ratio. The filmstrip eagerly loads its bounded thirteen-image neighborhood. Hover previews use fixed positioning clamped to the viewport, and do not participate in page overflow while hidden.

## Runtime ownership

- `page-transition.js` replaces `#main`, updates metadata/history and dispatches `site:content-updated`. Page swapping is immediate; the retired paper animation and its artificial wait are removed.
- `classic-navigation.js` updates page tabs and reading/collection indexes.
- `site-options.js` owns the header menu. `live2d-toggle.js` owns the single persisted companion visibility preference.
- `companion-dialogue.js` owns the dialogue state machine and persistent preferences; `companion-dialogues.js` contains writing and pure story selection. See [the companion guide](companion-system.md).
- `live2d-loader.js` owns Cubism/PIXI model lifecycle, half-body framing, motion and window movement. Model requests use a generation token so rapid switches cannot replace the current character with a stale result.
- Before replacing `#main`, page navigation emits `site:before-content-replace`. The companion temporarily reparents to `body`, then moves to the new dock. This retains the same canvas and weather instance. Weather refresh/location/cache behavior remains in `components/weather-widget.js`.
- Publications, visitor count, runtime, hover previews and the gallery each keep their own small module. No generic legacy feature loader or jQuery bundle is required.

Auxiliary conversation panels share a bounded grid viewport with the scene. Only the active view scrolls; inactive content is inert. Panel headers remain available in short windows, and opening settings cannot scroll the whole window past its titlebar.

## Running checks

Build Jekyll and serve `_site` first. Tests require Node and an installed Playwright module plus Chrome. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation; otherwise Node resolves the regular `playwright` package. No Node tooling is required for the published site.

```sh
node tests/companion-data.cjs
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
- Companion at twelve widths plus 600×360 landscape: text and primary action remain visible, dock placement and detached window bounds stay correct, short settings panels scroll independently.
- All 99 Japanese everyday lines plus 18 acquaintance remarks, four affinity tiers, both response branches, day/night and seven fixed-date holiday groups.
- Explicit directions on all 135 lines (including 18 existing quotations), all 15 rendered body poses and hand layers, Patchouli's reading angle, sustained facial expressions, and the latest-line motion queue. Desktop index/dock ordering also survives breakpoint changes.
- Saved affinity/text speed, per-character isolation, typewriter completion, minimized pause, auto stopping for choices, single instances across soft navigation, close/reopen and keyboard movement.
- Fresh mobile visits do not load a model; opt-in, page-bottom/index order, separate desktop/mobile visibility, reload and soft-navigation retention are checked.
- Simulated model/CDN and weather failure, model retry, rapid character switching, blocked localStorage, reduced motion and the Halloween branch in the UI.
- Browser checks observed no uncaught JavaScript errors or missing local assets. Remote models, weather, visitor count and original photos still depend on their existing providers; failure behavior is tested separately from successful loading.

Manual review includes desktop views of all three characters, tablet/phone profile layouts, gallery cards and viewer, weather, settings, choices and short-window scrolling. These checks document tested coverage rather than a guarantee about every browser or third-party outage.
