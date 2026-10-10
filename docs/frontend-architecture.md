# Frontend structure and regression checks

The site has one active visual system: the dark Nostalgia desktop, with Alice, Marisa and Patchouli palettes. It no longer loads Minimal Mistakes layout/reset styles, the earlier paper/glass redesign, the old standalone-gallery rules, jQuery navigation/lightbox plugins, or the old standalone music player. The companion has an opt-in FM receiver with native audio and optional PV sources in one shared catalog.

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
| `classic-bgm.css` | Physical FM controls, optional station/PV window and synced local LRC panel |
| `classic-companion.css` | Floating window, scene, dialogue, panels, loading and viewport behavior |
| `classic-danmaku.css` | Companion arcade lobby, score HUD, playfield and pause/result screens |
| `classic-ornaments.css` | Full-resolution flat squadron insignia in document corners and companion panels |

The native `hidden` attribute wins globally. The active styles do not depend on increasing `html.classic-root body.classic-site` specificity to defeat another template. Site options, companion, previews, modal and loading layers are ordered through theme variables. Each component uses small local layers within its own stacking context.

At 1000px the profile becomes a rail. Below that it sits above the document, and below 600px contacts move under the portrait. Desktop rails share `--classic-rail-width` (270–292px) inside the 1760px frame: the homepage companion sits below the left in-page index, and Gallery's sits below Collections in the right rail. The remaining width goes to the document or photographs. The entire homepage rail uses direction-aware sticky positioning: tall content scrolls into view before bottom-pinning and moves back toward its top when scrolling upward. ResizeObserver recalculates its bounds after Playground changes, while the page grid keeps it above the footer. A gallery rail containing an expanded companion stays in page flow so tall dialogue is accessible; the collection index can stick when the companion is hidden or detached. Compact screens show the companion by default in the bottom dock. Independent compact/desktop visibility preferences survive resize and reload. Publication rows and education use container queries for their available content width.

Gallery cards always crop to 4:3, with five columns at 1280px and above and three/two/one columns on narrower screens. Each page load or soft navigation shuffles photographs within their collections in the browser before initializing the viewer; data files stay in their original order and no randomized order is persisted. Resizing preserves the current order, and the viewer follows the displayed sequence. The viewer and its placeholder always contain the original aspect ratio. The filmstrip eagerly loads its bounded thirteen-image neighborhood. Hover previews use fixed positioning clamped to the viewport, and do not participate in page overflow while hidden.

## Runtime ownership

- `page-transition.js` replaces `#main`, updates metadata/history and dispatches `site:content-updated`. Page swapping is immediate; the retired paper animation and its artificial wait are removed.
- `classic-navigation.js` updates page tabs and reading/collection indexes, and measures the desktop homepage rail for its direction-aware sticky position. Compact placement is unchanged.
- `site-options.js` owns the header menu. `live2d-toggle.js` owns the single persisted companion visibility preference.
- `companion-dialogue.js` owns the dialogue state machine and persistent preferences; `companion-dialogues.js` contains writing and pure story selection. See [the companion guide](companion-system.md).
- `companion-voice-reactions.js` owns opt-in recorded interjections. Eighteen brief clips use emotion selection, a per-character cooldown and consecutive-repeat avoidance. Mouth articulation remains driven by the kana plan. See [voice sources](companion-voices.md).
- `companion-bgm.js` owns the opt-in FM receiver and the shared 13-song catalog in `data/companion-radio.js`. Every entry pairs a site-hosted MP3 and LRC with an official YouTube video. Paths resolve against the Jekyll-provided `data-audio-base`, so the library supports a configured base URL. `core/companion-radio-audio.js` adapts native HTML audio. No media source loads until Play/Unmute, and starting audio does not open another window. Character defaults suggest an opening item; the listener's selection survives character and page changes.
- RADIO/PV mode changes keep the same catalog entry, stop the previous source and wait for another Play. Entries lacking that mode display `PVのみ` or `RADIOのみ` with playback disabled; previous/next and automatic advancement skip unsupported entries. The optional PV mode uses each entry’s `videoId`. Only an explicit Play then loads the YouTube API and privacy-enhanced iframe; the video stays visible in its nonmodal window at a minimum 200×200 pixels. Closing that window stops and destroys the PV player. Closing the station window during native audio leaves playback running. Minimize, hidden tabs and the arcade pause either provider; no play intent persists across visits. Errors keep the official source link available. Optional `listen` metadata adds click-only NetEase, Apple Music or publisher-distribution links; no platform page/API or audio is fetched automatically, and a catalog link does not enable native playback.
- Original Japanese station introductions separate tracks. Brief, low-volume tuning noise is synthesized locally with Web Audio after a playback/selection action, obeys mute and volume, and is cancelled on pause, hiding, mode changes or game entry. It downloads no sound sample and is independent of battle sound effects.
- `companion-radio-lyrics.js` accepts a bundled same-origin LRC URL and optional local UTF-8 imports, following the selected provider's clock with half-second timing adjustment. Imports override the bundled source in that browser. Bundled text is not copied into localStorage; only its timing offset is retained. Requests enforce a 200KB limit, reject cross-origin URLs and redirects, and abort on track/source changes, manual imports and destruction. Generation checks prevent stale responses or open file pickers from replacing another song's lyrics. Audio and PV have separate LRC keys; bundled lyrics apply only to the local recording. Imported lyrics are limited to 200KB per file and 100KB total persistent storage. See `assets/music/radio/README.md`.
- The `CompanionBGM.getTrack` interface still returns the same three local ensemble MP3s exclusively for `danmaku-audio.js`; radio song selection never changes battle music. Offline render credits remain in `assets/music/companion/CREDITS.md`.
- `live2d-loader.js` owns Cubism/PIXI model lifecycle, half-body framing, motion and window movement. Model requests use a generation token so rapid switches cannot replace the current character with a stale result. Gaze uses the original page-wide SDK coordinate mapping. Only the dialogue rectangle smoothly returns it to neutral; menu/music controls and the rest of the page keep following. Touch and reduced-motion mode do not track. Playground tracks size, position and maximize/restore state independently; ResizeObserver rerenders the stage and budgets compact height from actual controls.
- `games/danmaku-engine.js`, `danmaku-renderer.js` and `companion-danmaku.js` separately own the arcade simulation, Canvas 2D view and UI/lifecycle. The game uses `danmaku-audio.js` for independent, silent-by-default battle BGM and effect mixing from deterministic event hooks. The mounted game pauses the conversation renderer, music and typewriter; local pixel sprites keep it independent of remote Live2D availability. See [the game guide](danmaku-game.md).
- Before replacing `#main`, page navigation emits `site:before-content-replace`. The companion clears its dragged position and custom size and temporarily reparents to `body`, then moves to the destination page's dock. This retains the same canvas and weather instance. Weather refresh/location/cache behavior remains in `components/weather-widget.js`.
- Publications, runtime, hover previews and the gallery each keep their own small module. Visitor counters and analytics integrations have been removed. No generic legacy feature loader or jQuery bundle is required.

Auxiliary conversation panels share a grid cell with the scene; inactive content is inert. Docked windows grow to fit dialogue, choices and panels, avoiding a nested scrollbar within the page. Detached windows use a bounded viewport where only the active view scrolls. Panel headers remain available in short floating windows, and opening settings cannot scroll the whole window past its titlebar. History retains a bounded list; the arcade uses its own height budget.

The wide Playground grid sizes its dialogue row from the full reading and all choices, including the three suggestions shown after an ordinary conversation. Its shared scale reserves a 600px logical height before enlarging the UI. Long text and wrapping options increase that row's minimum size; short windows scroll the main view as a whole, so choices cannot overlap the footer or be clipped into a separate list scrollbar. `tests/playground-dialogue-layout.cjs` checks these boundaries during branch transitions, character changes, maximization and resizing across the compact/wide breakpoint.

## Running checks

Build Jekyll and serve `_site` first. Audio seeking checks need a server with HTTP byte-range support (Jekyll/WEBrick and GitHub Pages support this; Python’s basic `http.server` does not). Tests require Node and an installed Playwright module plus Chrome. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation; otherwise Node resolves the regular `playwright` package. No Node tooling is required for the published site.

```sh
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-bgm.cjs
PREVIEW_URL=http://127.0.0.1:4100/ node tests/companion-radio-audio.cjs
node tests/companion-radio-lyrics.cjs
node tests/companion-radio-lyrics-browser.cjs
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

Radio update validated on 2026-10-10: the native-audio suite uses real HTML audio with a local MP3 fixture; the PV suite uses a documented YouTube API double. Both cover playback, mode changes, mute, errors, LRC, lifecycle and 320/375/768/1440px layouts. The isolated lyric browser suite covers bundled/imported-source races, cancellation, persistence and response limits. A separate live smoke loaded all 13 supplied LRCs, played and sought within the three default local MP3s, and played the corresponding official FELT upload. All audio files passed complete decoding and unchanged-audio-packet checks. The earlier full 45-theme/width homepage check, eight gallery widths and eight Playground resize layouts remain documented below.

Validated on 2026-10-08:

- 45 combinations: three themes at 15 widths from 320 to 1920px; no page overflow, square portraits, 28px contained school emblems, single-row navigation, bounded footer.
- Gallery at seven widths, all 110 thumbnail crops, full-size containment, keyboard navigation/focus, browser history, and useful static links with JavaScript disabled.
- Companion at twelve widths plus 600×360 landscape: docked dialogue has no vertical overflow, text and primary action remain visible, dock placement and detached window bounds stay correct, short floating settings panels scroll independently.
- All 228 Japanese everyday lines plus 102 acquaintance remarks, four affinity tiers, both response branches, day/night and seven fixed-date holiday groups; complete shuffle cycles, no adjacent repeats across cycles, independent contexts, and reachability of every added variant.
- Explicit per-line directions (including 18 existing quotations), all 15 rendered body poses and hand layers, Patchouli's reading angle, sustained facial expressions, and the latest-line motion queue. Desktop index/dock ordering also survives breakpoint changes.
- Saved affinity/text speed, per-character isolation, typewriter completion, minimized pause, auto stopping for choices, single instances across soft navigation, close/reopen and keyboard movement.
- Fresh mobile visits show the companion by default; page-bottom/index order, separately saved desktop/mobile visibility, explicit closing, reload and soft-navigation retention are checked.
- Simulated model/CDN and weather failure, model retry, rapid character switching, blocked localStorage, reduced motion and the Halloween branch in the UI.
- Nine endless arcade matchups, three distinct shot types and patterns, growing density, collision/graze/strike rules, actual canvas output, keyboard/touch controls, result/retry/records, short landscape and seven playfield widths. Leaving the game restores the existing conversation.
- Browser checks observed no uncaught JavaScript errors or missing local assets. Remote models, weather and original photos still depend on their existing providers; failure behavior is tested separately from successful loading.

Manual review includes desktop views of all three characters, tablet/phone profile layouts, gallery cards and viewer, weather, settings, choices and short-window scrolling. These checks document tested coverage rather than a guarantee about every browser or third-party outage.

### Branching conversation checks

`tests/companion-branches.cjs` checks tree destinations, reachability, both question levels, affinity conclusions and kana coverage. `tests/companion-branches-browser.cjs` follows every authored path through the real UI and checks return controls, friend follow-ups, preserved context across menus, keyboard/auto behavior, stale-button cancellation and compact layouts.

`tests/companion-acting.cjs` checks facial persistence, emotional eyelids, speech articulation and paused/reduced-motion behavior. `tests/companion-expressions.cjs` captures all eight faces on each actual rig, checks parameter bounds and neutral restoration, and verifies that a closed consonant overrides the surprised resting mouth. Its screenshots provide a contact sheet for visual review at the docked scale.
