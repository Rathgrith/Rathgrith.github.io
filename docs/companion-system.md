# Dockable conversation companion

The homepage uses a local, scripted visual-novel system. It needs no chat API, API key or backend. The existing Cubism models and Japanese quotations are retained; the new dialogue is original fan writing, not an official script or a reproduction of a game scene.

## Controls

- At 1000px and above, the homepage window starts below the in-page navigation in the left rail (portrait/profile → navigation → companion). Gallery has a matching right rail below Collections. Both rails use a shared 270–292px width and leave the remaining space to the page content inside the 1760px frame. On the homepage, the entire desktop rail follows scrolling; tall rails reveal their full height before pinning and remain contained above the footer. Cross-page navigation clears a manually dragged position and docks the same window in the destination rail. Pages without a dock fall back to a floating window.
- Below 1000px it opens by default and docks at the page bottom after the in-page index without scrolling away from the page content. The existing index is moved, not duplicated. Desktop and compact-screen visibility have separate saved preferences; an explicitly closed window stays closed on future visits and requests no model.
- Docked conversation windows grow with their dialogue, choices and auxiliary panels; the page handles scrolling. Detached windows remain bounded by the viewport, with internal scrolling when necessary. History retains its own bounded list, and the arcade keeps a separate height budget.
- **Playground** supports lower-right corner resizing with pointer or arrow keys (16px, Shift: 1px) and a maximize/restore title-bar button. Resizing detaches it; Reset and page changes restore the appropriate dock. Wide windows place the scene beside the dialogue, FM receiver and controls. Desktop maximization is centered and capped at 75% of the viewport width and height (small screens use the available viewport). A single zoomed inner surface scales fonts, icons, controls, weather, FM controls, game and pixel effects together. Stage/canvas geometry uses logical coordinates; Live2D increases rendering resolution with the visual scale. The canvas is rerendered without aspect distortion.
- Drag the title bar to move; arrow keys move 10px (Shift: 1px). The title-bar reset button beside Minimize (元の位置へ), Home, double-click or 設定 → 元の位置へ restores the current layout’s dock. Reset keeps the current minimized/expanded state. Close is reversible through Options → Playground を開く. Opening on mobile scrolls to the window.
- Click the dialogue / press Enter or Space while it is focused to complete typing or continue. The primary button does the same. Auto waits for reading time, and never chooses a response for the visitor.
- 話題: today/holiday, research/craft, friends, rest, weather, original-game quotations. 友人のこと opens a character picker, with 別の人 returning to it. 履歴 shows the current character's completed lines from this visit (80 entries across characters, bounded in memory).
- 設定: each character has an independent 0–100 affinity slider. Tiers are 初対面 (0–24), 顔なじみ (25–49), 信頼 (50–74), 内緒話 (75–100). Branch responses use the tier at the time of the choice, then add 1 or 2 points. Manually edited values affect new topics and subsequent choices.
- Text speed supports slow, standard, fast, instant. The entire companion is Japanese-only, including choices, loading/error states and weather controls. No subtitle, source, help or topic metadata is displayed. 環境光 toggles scene lighting; 光の強さ controls it from 0–100% (default 75%). These preferences and affinity are stored in `site-companion-v1` in localStorage, with in-memory fallbacks if storage is unavailable. Auto mode is deliberately not persisted.
- The bottom **非想天則** strip shows temperature and the current weather; expanding it reveals location/time, a compact dial, measurements, pixel refresh/location controls and Open-Meteo attribution. The panel shares the companion's font and all three palettes, with one title bar and natural docked height. Weather-only styles live in `classic-weather.css`. Location access occurs only after its explicit location button is pressed. The default is West Midlands. Weather failures do not prevent dialogue.


## FM radio

The **BGM：** receiver starts silent in RADIO mode. Play/Unmute plays a local MP3 through native HTML audio without opening another window. The title opens the shared 13-song catalog, selected from files supplied by the site owner. Character themes suggest the first item until the visitor chooses a station; that selection survives later character changes.

**PV** shows the same catalog without contacting YouTube. Each song has a corresponding official music video or official audio upload. Switching modes keeps the selected song, stops the preceding source and waits for another Play. The player keeps its availability fallback for future catalog changes. Pressing Play in PV loads a visible privacy-enhanced YouTube player. Closing the PV window stops it; closing native audio's station window leaves the audio playing. Minimize, closing Playground, a hidden tab or the arcade pauses either mode. Returning resumes only an existing play request; a new visit never starts playback automatically.

Short original Japanese introductions provide station breaks. Manual playback/selection adds quiet, locally synthesized tuning noise that follows mute/volume and stops with playback suspension. It uses no third-party samples. Bundled UTF-8 LRC files load from the same origin for RADIO and follow the actual MP3 clock. An imported LRC overrides the supplied file in that browser. Timing adjustments persist; imported files never leave the browser. Source changes and imports cancel pending lyric requests, which reject external URLs, redirects and files over 200KB.

Audio/PV have separate lyric keys because video introductions, edits and reissues can differ. Bundled lyrics belong to the local recording and are not automatically applied to PV; PV accepts its own LRC and timing adjustment. Mode changes restart rather than claim a time-aligned handoff. Available publisher captions remain part of the optional YouTube player.

See [radio files, credits and version notes](../assets/music/radio/README.md). The arcade keeps its three existing local arrangements and independent music/effect switches; radio selection never changes its soundtrack. [Battle-music credits](../assets/music/companion/CREDITS.md) remain separate.

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

## Dialogue performance

The **弾幕に挑戦** button opens an independent pixel score-attack view in this same window. Its three pilots/opponents, controls, scoring and lifecycle are documented in [the arcade guide](danmaku-game.md). The typewriter and model renderer pause while the arcade is open and resume when returning to conversation.

The companion and homepage share `_includes/prayer-loader.html` and `classic-loading.css`: three local pixel witches, a rotating seal and **少女祈祷中…**. The homepage entrance waits only for its selected portrait and local UI fonts, normally shows for 600ms and exits after at most 1.8 seconds plus its 180ms fade. Input dismisses it immediately without swallowing the event; a six-second CSS fail-safe covers script failure. No-JavaScript pages skip the overlay; reduced motion keeps the artwork still and removes the minimum display time. Remote model/weather loading never holds the homepage entrance open.

All 135 lines have explicit `expressionMotionId`, `poseId` and `effect`: 99 everyday/affinity/holiday lines, 18 acquaintance remarks and 18 existing quotations. Japanese text is unchanged. Directions were assigned after inspecting the three original rigs' eight faces and five body poses. These are rendered with the existing Cannonball models; no replacement model is installed.

Expressions use the rigs' authored presets: 01 neutral, 02 gentle smile, 03 serious/firm, 04 troubled, 05 annoyed, 06 surprised, 07 amused/confident, 08 tired/downcast. Their intensity differs between characters. Faces ease toward their target (180ms time constant, 320ms for the tired face) and remain with the current line through typing, choices and reading; there is no timed reset to an unrelated idle smile. If one preset fails to download, the other faces and the acting layer remain available.

`companion-performance.js` adds small line-entry reactions, speech nods, restrained brow movement, and breathing over the authored pose. Questions receive a short head tilt; emphatic punctuation receives a nod. Marisa has the largest motion and mouth amplitude, Alice is more measured, and Patchouli is slower and quieter. These accents also work when consecutive lines use the same body pose. They do not choose another emotion or replace the existing pose direction.

The typewriter and mouth share the actual line's Japanese reading. `companion-readings.js` contains all 135 lines as original-text/kana pairs, generated offline with [PyKakasi](https://pykakasi.readthedocs.io/en/latest/api.html) and reviewed with explicit vocabulary/proper-name corrections. `scripts/generate-companion-readings.py` rebuilds this table using `pykakasi==2.3.0` and Node on PATH. Reading loads no pronunciation dictionary or synthesized speech. Optional recorded interjections load only after opt-in, play briefly at the beginning of selected lines, and never replace the text-driven mouth plan. See [voice sources](companion-voices.md) for credits and playback behavior. `companion-speech.js` expands the kana into A/I/U/E/O, nasal and geminate mouth targets, handles contracted/long vowels, and aligns the morae back to the displayed characters. Kanji with several morae receive correspondingly longer display intervals; punctuation closes the mouth. Unknown future kanji safely stay closed until their reading is added.

The three rigs expose jaw opening, mouth form and width rather than five dedicated vowel drawings. The acting layer approximates these vowel shapes through those parameters, blending with the directed emotion and smoothly closing at pauses. A single blink controller avoids the former double update during idle poses, keeps authored eyelid shapes intact, and occasionally schedules a second blink. All timing follows the model clock so hidden/paused renderers cannot fast-forward gestures. Reduced motion preserves the directed static face and body pose without these decorative movements. Additive offsets are applied after the pose overlay and never written into its saved baseline.

Short emotional accents use the rigs' native cheek, eye-highlight-shake and (for Marisa's grin) tooth parameters. Nine original pixel effects complement these parameters; the rigs have no separate built-in symbol layers. Stars bloom in sequence, exclamation marks pop with brief rays, shaded sweat droplets form/fall/splash, anger marks pulse and scatter, and small breath clouds drift apart. Musical notes rise in staggered arcs, question marks bob, blush strokes appear in sequence, and a shaded lightbulb pops into view for an idea. Each has an entrance, settling phase and ordered pixel dissolve, runs at 24fps for at most 2.15 seconds, and never intercepts input. The 64px raster has opaque, shaded pixel edges, nearest-neighbor display and a position snapped to whole viewport pixels; no CSS filters or opacity blur is applied. The same Playground scale enlarges the effect alongside the text, controls and scene. The renderer shares the paused model clock, cleans up its canvas/resize observer on character replacement, and is disabled for reduced motion.

Effects are directed per line, independently of the face preset. Both smile presets previously implied stars, which made everyday friendly speech look identical. Now only 8 of 135 lines use `sparkle`; 56 use `none`, with the remaining accents chosen for the scene. Missing/unsupported effects also remain quiet, never falling back to stars. For example, Marisa's evasive reply about returning Patchouli's books uses `sweat` despite her amused face, while Patchouli's complaint uses `anger`. Ordinary smiles keep the facial acting without an icon. Native extra blush follows `blush`; animated eye highlights follow `sparkle`, `idea` or `surprise` rather than every smile.

| Pose | Alice | Marisa | Patchouli |
| --- | --- | --- | --- |
| 1 | Hand at chest | Hands on hips | Holding book to chest |
| 2 | Hand near cheek, other at hip | One hand on hip | Both hands on book |
| 3 | Arms lowered | Relaxed lowered arm | Open palm while explaining |
| 4 | Hand at chin | Touching hat brim | Book raised, looking down to read |
| 5 | Open palm, presenting | Both palms open/shrug | Book against cheek/chest, head tilted |

Alice uses restrained invitations and a thinking pose for craft; Marisa uses her hat gesture for confident greetings and open palms for jokes; Patchouli uses her book and a small teaching gesture. For example, Patchouli's complaint about Marisa uses 05/2, while her Sakuya remark uses 02/2. No random reaction or keyword inference overrides a line's direction.

Body transitions use the rig's authored `from+to` motion and wait for Cubism's `motionFinish` event before holding the destination pose; a wall-clock timer must not cut off a paused or slow animation. Hand-layer curves follow the model's playback clock. Authored body parameters are captured after the motion update, before SDK focus/breath/physics offsets, and use the same bounded gaze during both movement and rest (head X/Y: 8°/5°, body X: 2°). This prevents the head from snapping when it hands off to a held pose. Fast next/topic clicks retain only the latest requested pose after the current transition, while the face changes immediately. Patchouli's former idle-only gate is removed. Reduced-motion preferences keep the authored face and pose but apply them without animated transitions. Character changes invalidate pending motion callbacks; hiding preserves the pending completion, and resizing/navigation keep the current performance. `tests/companion-performance.cjs` records rendered head angles across motion completion for all three rigs and exercises pause/resume alongside the directed faces, poses and rapid-click queue.

All three active portraits in `images/avatars/` are supplied by the site owner. The Alice portrait was replaced with the supplied illustration on 2026-10-08; the earlier generated version is retained in Git history. Original pixel ribbon/doll, star/hat and crescent/book portrait ornaments live in `_includes/avatar-ornaments.html`; `classic-site.css` owns their responsive frames and switches them with the character palette. The portrait stays square with a closer crop, while the ornaments are decorative and excluded from the accessibility tree. Separate flat, full-resolution squadron insignia decorate document corners and companion panels: Alice’s puppet lozenge, Marisa’s sweeping hat/broom, and Patchouli’s circular crescent/grimoire. These PNGs are not pixelated; empty side rails remain clear. [Insignia provenance](../assets/images/classic/corners/README.md).

## Code map

- `assets/js/data/companion-dialogues.js`: Japanese writing, tier selection, dates, weather and story construction. Pure selection functions allow deterministic date/tier tests.
- `assets/js/data/companion-remarks.js`: per-speaker friend rosters and Japanese remarks.
- `assets/js/data/companion-readings.js` and `assets/js/core/companion-speech.js`: offline kana readings and text-aligned mora/viseme timing.
- `assets/js/core/companion-voice-reactions.js`: opt-in recorded interjections, emotion selection, cooldowns and lifecycle cancellation.
- `assets/js/core/companion-bgm.js`: FM controls, one catalog with source availability, station introductions, procedural tuning sound and playback lifecycle. `companion-radio-audio.js` adapts native HTML audio; `companion-radio-lyrics.js` handles bundled and imported per-track LRC. `assets/js/data/companion-radio.js` is the single audio/video catalog.
- `assets/js/core/companion-dialogue.js`: typing/ready/choice states, text completion, history, settings, auto advancement and panels. No user content is inserted as HTML.
- `assets/js/core/companion-lighting.js`: alpha-preserving model light, scene palettes and weather/time response. Fragment precision must match PIXI's high-precision default vertex uniforms to compile on strict WebGL drivers.
- `assets/js/core/live2d-loader.js`: model loading, cancellation by generation, half-body camera, authored face/pose data, drag/minimize/restore and rendering lifecycle.
- `assets/js/core/companion-performance.js`: one model-frame listener for facial easing, blinking, text-paced articulation, character-specific small gestures and breathing; restores SDK state and removes its listener when replaced.
- `assets/js/core/companion-reactions.js`: finite 24fps pixel effects, shaded raster drawing, frame sequencing, pixel dissolve and viewport alignment; no independent animation loop.
- `assets/css/classic-companion.css`: window, scenery, dialogue, controls, natural docked height and bounded floating panels. `classic-weather.css` owns the integrated dial.
- `assets/js/components/weather-widget.js`: original observation and cache pipeline, reused by the persistent companion instance.

The companion normally lives in a dock inside `#main`. Before replacement, `site:before-content-replace` moves the same node to `body`; the post-swap initializer docks it again. The model canvas, dialogue and weather instance survive without duplicate widgets or refresh intervals. Reduced-motion users get instant dialogue, no loading animation, and the existing model animation opt-outs. Model/CDN failures show a retry control while scripted conversations remain available. Hidden/minimized windows pause text/auto progression and the PIXI renderer; no silent automatic dialogue replaces a conversation being read.

Superseded loads destroy the stale rig without destroying URL-cached textures that a newer load of the same character may share. This prevents black silhouettes after reselecting a character during loading. The lighting regression reads actual WebGL pixels for all three rigs at DPR 1 and 2, checks visible color changes, unchanged alpha, zero/off behavior, weather response and saved strength, and catches shader compile errors.
