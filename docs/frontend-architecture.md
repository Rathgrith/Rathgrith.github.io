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

At 1000px the profile becomes a rail. Below that it sits above the document, and below 600px contacts move under the portrait. The companion has its own independent breakpoint: screens at least 1280px reserve a right lane when expanded; smaller screens initially show its title bar. Publication rows and education use container queries because their usable width also depends on the companion lane.

Gallery cards always crop to 4:3. The viewer and its placeholder always contain the original aspect ratio. The filmstrip eagerly loads its bounded thirteen-image neighborhood. Hover previews use fixed positioning clamped to the viewport, and do not participate in page overflow while hidden.

## Runtime ownership

- `page-transition.js` replaces `#main`, updates metadata/history and dispatches `site:content-updated`. Page swapping is immediate; the retired paper animation and its artificial wait are removed.
- `classic-navigation.js` updates page tabs and reading/collection indexes.
- `site-options.js` owns the header menu. `live2d-toggle.js` owns the single persisted companion visibility preference.
- `companion-dialogue.js` owns the dialogue state machine and persistent preferences; `companion-dialogues.js` contains writing and pure story selection. See [the companion guide](companion-system.md).
- `live2d-loader.js` owns Cubism/PIXI model lifecycle, half-body framing, motion and window movement. Model requests use a generation token so rapid switches cannot replace the current character with a stale result.
- Weather and the companion live outside `#main`. Soft navigation keeps a single instance of each. Weather refresh/location/cache behavior remains in `components/weather-widget.js`.
- Publications, visitor count, runtime, hover previews and the gallery each keep their own small module. No generic legacy feature loader or jQuery bundle is required.

Auxiliary conversation panels share a bounded grid viewport with the scene. Only the active view scrolls; inactive content is inert. Panel headers remain available in short windows, and opening settings cannot scroll the whole window past its titlebar.

## Running checks

Build Jekyll and serve `_site` first. Tests require Node and an installed Playwright module plus Chrome. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation; otherwise Node resolves the regular `playwright` package. No Node tooling is required for the published site.

```sh
node tests/companion-data.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/site-browser.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-browser.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-resilience.cjs
```

Screenshots go to the system temporary directory by default; set `QA_OUTPUT` to retain them elsewhere. Software Chrome rendering is used for consistent captures on the development Mac.

Validated on 2026-10-08:

- 45 combinations: three themes at 15 widths from 320 to 1920px; no page overflow, square portraits, 28px contained school emblems, single-row navigation, bounded footer.
- Gallery at seven widths, all 110 thumbnail crops, full-size containment, keyboard navigation/focus, browser history, and useful static links with JavaScript disabled.
- Companion at twelve widths plus 600×360 landscape: text and primary action remain visible, window bounds and desktop lane stay correct, short settings panels scroll independently.
- All 99 bilingual lines, four affinity tiers, both response branches, day/night and seven fixed-date holiday groups.
- Saved affinity/subtitles, per-character isolation, typewriter completion, minimized pause, auto stopping for choices, single instances across soft navigation, close/reopen and keyboard movement.
- Simulated model/CDN and weather failure, model retry, rapid character switching, blocked localStorage, reduced motion and the Halloween branch in the UI.
- Browser checks observed no uncaught JavaScript errors or missing local assets. Remote models, weather, visitor count and original photos still depend on their existing providers; failure behavior is tested separately from successful loading.

Manual review includes desktop views of all three characters, tablet/phone profile layouts, gallery cards and viewer, weather, settings, choices and short-window scrolling. These checks document tested coverage rather than a guarantee about every browser or third-party outage.
