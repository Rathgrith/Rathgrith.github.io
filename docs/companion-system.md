# Dockable conversation companion

The homepage uses a local, scripted visual-novel system. It needs no chat API, API key or backend. The existing Cubism models and Japanese quotations are retained; the new dialogue is original fan writing, not an official script or a reproduction of a game scene.

## Controls

- At 1000px and above, the window starts below the profile in the left rail. The page and profile grow proportionally inside a 1760px frame without reserving a right lane. On pages without a profile, the desktop window floats.
- Below 1000px it is hidden by default and requests no model. When opened, it docks at the page bottom after the in-page index. The existing index is moved, not duplicated. Desktop and compact-screen visibility have separate saved preferences.
- Drag the title bar to move; arrow keys move 10px (Shift: 1px). Home, double-click or 設定 → 元の位置へ restores the current layout’s dock. Close is reversible through Options → Live2D を開く. Opening on mobile scrolls to the window.
- Click the dialogue / press Enter or Space while it is focused to complete typing or continue. The primary button does the same. Auto waits for reading time, and never chooses a response for the visitor.
- 話題: today/holiday, research/craft, friends, rest, weather, original-game quotations. 友人のこと opens a scrollable character picker, with 別の人 returning to it. 履歴 shows the current character's completed lines from this visit (80 entries across characters, bounded in memory).
- 設定: each character has an independent 0–100 affinity slider. Tiers are 初対面 (0–24), 顔なじみ (25–49), 信頼 (50–74), 内緒話 (75–100). Branch responses use the tier at the time of the choice, then add 1 or 2 points. Manually edited values affect new topics and subsequent choices.
- Text speed supports slow, standard, fast, instant. The entire companion is Japanese-only, including choices, loading/error states and weather controls. No subtitle, source, help or topic metadata is displayed. Scene lighting can be toggled. These preferences and affinity are stored in `site-companion-v1` in localStorage, with in-memory fallbacks if storage is unavailable. Auto mode is deliberately not persisted.
- The bottom weather strip opens the existing weather module, including refresh/location actions, measurements and attribution. Location access occurs only after its explicit location button is pressed. The default is West Midlands. Weather failures do not prevent dialogue.

## Scene and dialogue design

The dialogue contains 99 Japanese everyday/holiday/affinity lines and 18 existing game quotations. The dedicated friends topic adds 83 original short remarks (Alice 20, Marisa 43, Patchouli 20) covering 46 characters or groups. These are observations about personalities, magic and interactions.

Dialogue and menus use the locally hosted Japanese Fusion Pixel 12px proportional font, release 2026.09.25. The unmodified font and its upstream licenses are in `assets/fonts/fusion-pixel/`. The academic page still uses W95FA at 17px on desktop.

Fixed-date observances follow the visitor's local calendar: January 1–3, February 14, March 3, July 7, October 31, December 24–25, December 31. New-year greetings take priority over time-of-day; other days use morning/night/seasonal lines. There is no fabricated lunar-calendar date calculation. Weather dialogue uses the existing observed phase; missing observations produce an explicit unknown-weather line.

Character research references (background context, not copied new dialogue):
- [Alice's home and doll workshop](https://thwiki.cc/玛格特洛依德邸)
- [Marisa's official-setting reference index](https://thwiki.cc/雾雨魔理沙/一设资料)
- [Patchouli's profile](https://thwiki.cc/帕秋莉·诺蕾姬)
- [Alice’s Scarlet Weather Rhapsody dialogue index](https://thwiki.cc/游戏对话:东方绯想天/爱丽丝·玛格特洛依德)

The remarks are new writing, not copied winning quotes. Metadata and research notes stay here, outside the game UI.

The three empty-room backgrounds were made with the built-in imagegen tool. [All final prompts](../assets/images/classic/scenes/PROMPTS.md) are stored with the scene PNGs. The close-up preserves the existing Live2D model, motion, expression, blink and breathing logic. The background has a 1.25px defocus and three faint blurred light spots, on separate layers behind the sharp model. Ambient light uses a subtle canvas color adjustment plus a translucent scene light layer.

## Code map

- `assets/js/data/companion-dialogues.js`: restored Japanese writing, tier selection, dates, weather and story construction. Pure selection functions allow deterministic date/tier tests.
- `assets/js/data/companion-remarks.js`: per-speaker friend rosters and Japanese remarks.
- `assets/js/core/companion-dialogue.js`: typing/ready/choice states, text completion, history, settings, auto advancement and panels. No user content is inserted as HTML.
- `assets/js/core/live2d-loader.js`: model loading, cancellation by generation, half-body camera, expressions/poses, typewriter-linked mouth movement, drag/minimize/restore and rendering lifecycle.
- `assets/css/classic-companion.css`: window, scenery, dialogue, controls, docking and independent panel scrolling. `classic-weather.css` owns the integrated dial.
- `assets/js/components/weather-widget.js`: original observation and cache pipeline, reused by the persistent companion instance.

The companion normally lives in a dock inside `#main`. Before replacement, `site:before-content-replace` moves the same node to `body`; the post-swap initializer docks it again. The model canvas, dialogue and weather instance survive without duplicate widgets or refresh intervals. Reduced-motion users get instant dialogue, no loading animation, and the existing model animation opt-outs. Model/CDN failures show a retry control while scripted conversations remain available. Hidden/minimized windows pause text/auto progression and the PIXI renderer; no silent automatic dialogue replaces a conversation being read.
