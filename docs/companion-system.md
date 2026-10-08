# Dockable conversation companion

The homepage uses a local, scripted visual-novel system. It needs no chat API, API key or backend. The existing Cubism models and Japanese quotations are retained; the new dialogue is original fan writing, not an official script or a reproduction of a game scene.

## Controls

- At 1000px and above, the window starts below the profile in the left rail. The page and profile grow proportionally inside a 1760px frame without reserving a right lane. On pages without a profile, the desktop window floats.
- Below 1000px it is hidden by default and requests no model. When opened, it docks at the page bottom after the in-page index. The existing index is moved, not duplicated. Desktop and compact-screen visibility have separate saved preferences.
- Drag the title bar to move; arrow keys move 10px (Shift: 1px). Home, double-click or 設定 → 元の位置へ restores the current layout’s dock. Close is reversible through Options → Live2D を開く. Opening on mobile scrolls to the window.
- Click the dialogue / press Enter or Space while it is focused to complete typing or continue. The primary button does the same. Auto waits for reading time, and never chooses a response for the visitor.
- 話題: today/holiday, research/craft, friends, rest, weather, original-game quotations. 友人のこと opens a scrollable character picker, with 別の人 returning to it. 履歴 shows the current character's completed lines from this visit (80 entries across characters, bounded in memory).
- 設定: each character has an independent 0–100 affinity slider. Tiers are 初対面 (0–24), 顔なじみ (25–49), 信頼 (50–74), 内緒話 (75–100). Branch responses use the tier at the time of the choice, then add 1 or 2 points. Manually edited values affect new topics and subsequent choices.
- Text speed supports slow, standard, fast, instant. The entire companion is Japanese-only, including choices, loading/error states and weather controls. No subtitle, source, help or topic metadata is displayed. 環境光 toggles scene lighting; 光の強さ controls it from 0–100% (default 75%). These preferences and affinity are stored in `site-companion-v1` in localStorage, with in-memory fallbacks if storage is unavailable. Auto mode is deliberately not persisted.
- The bottom weather strip opens the existing weather module, including refresh/location actions, measurements and attribution. Location access occurs only after its explicit location button is pressed. The default is West Midlands. Weather failures do not prevent dialogue.

## Scene and dialogue design

The dialogue contains 99 Japanese everyday/holiday/affinity lines and 18 unchanged game quotations. The everyday story beats remain, with light edits to 12 lines for character voice. The friends topic has 18 original short remarks (Alice 5, Marisa 8, Patchouli 5) covering 11 characters or groups.

The roster is deliberately small. Shared residence, established visits and working together are the main selection criteria. A fighting-game matchup alone is insufficient evidence of a close friendship; comments about less intimate acquaintances stick to observable habits and abilities. The menu title does not assert that every listed relationship is an intimate friendship.

| Speaker | Retained acquaintances | Selection basis |
| --- | --- | --- |
| Alice | Marisa, Patchouli, Reimu, Sakuya, the Three Fairies of Light | The magician circle and recurring early-game acquaintances; Alice's house visits in *Strange and Bright Nature Deity*. Her Sakuya remark stays with time manipulation and knives. |
| Marisa | Reimu, Alice, Patchouli, Sakuya, Remilia, Rinnosuke, Nitori, Kosuzu | Recurring shrine/forest/mansion interactions; *Curiosities of Lotus Asia*, the Nitori partnership in *Subterranean Animism*, and *Forbidden Scrollery*. |
| Patchouli | Remilia, Sakuya, Meiling, Marisa, Alice | Her mansion household, library visitor and fellow magician. No speculative personal accounts of distant characters. |

Voice guidance: Marisa alternates casual contractions, teasing questions and endings such as ぜ / だぜ / だな / だろ. These are hand-edited where the Japanese grammar supports them, never appended automatically. Alice uses measured feminine endings, rhetorical questions and occasional sharp remarks; Patchouli uses shorter assertions, dry corrections and the familiar レミィ when speaking of Remilia. Preserve variation rather than forcing a catchphrase into every sentence. New remarks remain fan writing; the original-game quotation data is not rewritten.

Dialogue and menus use the locally hosted Japanese Fusion Pixel 12px proportional font, release 2026.09.25. The unmodified font and its upstream licenses are in `assets/fonts/fusion-pixel/`. The academic page still uses W95FA at 17px on desktop.

Fixed-date observances follow the visitor's local calendar: January 1–3, February 14, March 3, July 7, October 31, December 24–25, December 31. New-year greetings take priority over time-of-day; other days use morning/night/seasonal lines. There is no fabricated lunar-calendar date calculation. Weather dialogue uses the existing observed phase; missing observations produce an explicit unknown-weather line.

Character research references (background context, not copied new dialogue):
- [Alice's home and doll workshop](https://thwiki.cc/玛格特洛依德邸)
- [Marisa's official-setting reference index](https://thwiki.cc/雾雨魔理沙/一设资料)
- [Patchouli's profile](https://thwiki.cc/帕秋莉·诺蕾姬)
- [Alice’s Scarlet Weather Rhapsody dialogue index](https://thwiki.cc/游戏对话:东方绯想天/爱丽丝·玛格特洛依德)
- [Scarlet Weather Rhapsody: Marisa's Japanese dialogue](https://thbwiki.cc/游戏对话:东方绯想天/雾雨魔理沙/中日对照)
- [Scarlet Weather Rhapsody: Patchouli's Japanese dialogue](https://thbwiki.cc/游戏对话:东方绯想天/帕秋莉·诺蕾姬/中日对照)
- [Alice relationship index, including the fairy visits](https://en.touhouwiki.net/wiki/Alice_Margatroid#Relationships)
- [Patchouli relationship index](https://en.touhouwiki.net/wiki/Patchouli_Knowledge#Relationships)
- [Nitori relationship index](https://en.touhouwiki.net/wiki/Nitori_Kawashiro#Relationships)

The remarks are new writing, not copied winning quotes. Metadata and research notes stay here, outside the game UI.

The three empty-room backgrounds were made with the built-in imagegen tool. [All final prompts](../assets/images/classic/scenes/PROMPTS.md) are stored with the scene PNGs. The close-up preserves the existing Live2D model, motion, expression, blink and breathing logic. The background has a 1.25px defocus and three faint blurred light spots, on separate layers behind the sharp model.

Lighting uses a single PIXI fragment-filter pass over the visible model canvas. Alice receives cool window light with a little warm fill; Marisa receives amber lamplight with cool fill; Patchouli receives violet ambient/window light with warm fill. A directional falloff and lower-body shading give the close-up depth. Night and precipitation adjust the light; strength changes the rendered RGB values while retaining the rig's alpha. This is stylized 2D relighting, not geometry/normal-based physical illumination. The background's translucent light layer follows the same strength. Zero strength or disabling 環境光 restores the model's original colors. No additional animation loop or network request is introduced.

## Code map

- `assets/js/data/companion-dialogues.js`: Japanese writing, tier selection, dates, weather and story construction. Pure selection functions allow deterministic date/tier tests.
- `assets/js/data/companion-remarks.js`: per-speaker friend rosters and Japanese remarks.
- `assets/js/core/companion-dialogue.js`: typing/ready/choice states, text completion, history, settings, auto advancement and panels. No user content is inserted as HTML.
- `assets/js/core/companion-lighting.js`: alpha-preserving model light, scene palettes and weather/time response. Fragment precision must match PIXI's high-precision default vertex uniforms to compile on strict WebGL drivers.
- `assets/js/core/live2d-loader.js`: model loading, cancellation by generation, half-body camera, expressions/poses, typewriter-linked mouth movement, drag/minimize/restore and rendering lifecycle.
- `assets/css/classic-companion.css`: window, scenery, dialogue, controls, docking and independent panel scrolling. `classic-weather.css` owns the integrated dial.
- `assets/js/components/weather-widget.js`: original observation and cache pipeline, reused by the persistent companion instance.

The companion normally lives in a dock inside `#main`. Before replacement, `site:before-content-replace` moves the same node to `body`; the post-swap initializer docks it again. The model canvas, dialogue and weather instance survive without duplicate widgets or refresh intervals. Reduced-motion users get instant dialogue, no loading animation, and the existing model animation opt-outs. Model/CDN failures show a retry control while scripted conversations remain available. Hidden/minimized windows pause text/auto progression and the PIXI renderer; no silent automatic dialogue replaces a conversation being read.

Superseded loads destroy the stale rig without destroying URL-cached textures that a newer load of the same character may share. This prevents black silhouettes after reselecting a character during loading. The lighting regression reads actual WebGL pixels for all three rigs at DPR 1 and 2, checks visible color changes, unchanged alpha, zero/off behavior, weather response and saved strength, and catches shader compile errors.
