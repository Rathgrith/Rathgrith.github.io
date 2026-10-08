# Floating conversation companion

The homepage uses a local, scripted visual-novel system. It needs no chat API, API key or backend. The existing Cubism models and Japanese quotations are retained; the new dialogue is original fan writing, not an official script or a reproduction of a game scene.

## Controls

- The window floats at the right, with a reserved desktop lane at 1280px and above. On smaller viewports it initially collapses to a title bar; restore opens the full interface, including on phones.
- Drag the title bar to move; arrow keys move 10px (Shift: 1px). Home or double-click returns it to the right. Close is reversible through Options → Show Live2D.
- Click the dialogue / press Enter or Space while it is focused to complete typing or continue. The primary button does the same. Auto waits for reading time, and never chooses a response for the visitor.
- 话题: today/holiday, research/craft, rest, weather, original-game quotations. 记录 shows the current character's completed lines from this visit (80 entries across characters, bounded in memory).
- 设置: each character has an independent 0–100 affinity slider. Tiers are 初见 (0–24), 相识 (25–49), 信任 (50–74), 知己 (75–100). Branch responses use the tier at the time of the choice, then add 1 or 2 points. Manually edited values affect new topics and subsequent choices.
- Text speed supports slow, standard, fast, instant. Chinese subtitles and scene lighting can be toggled. These preferences and affinity are stored in `site-companion-v1` in localStorage, with in-memory fallbacks if storage is unavailable. Auto mode is deliberately not persisted.
- The bottom weather strip opens the existing weather module, including refresh/location actions, measurements and attribution. Location access occurs only after its explicit location button is pressed. The default is West Midlands. Weather failures do not prevent dialogue.

## Scene and dialogue design

99 original Japanese lines with Chinese translations supplement 18 retained game quotations. Alice focuses on patient craft and restrained hospitality; Marisa on experimentation and spirited curiosity; Patchouli on careful reading and reserved trust. Close affinity conveys familiarity without changing their core personalities.

Fixed-date observances follow the visitor's local calendar: January 1–3, February 14, March 3, July 7, October 31, December 24–25, December 31. New-year greetings take priority over time-of-day; other days use morning/night/seasonal lines. There is no fabricated lunar-calendar date calculation. Weather dialogue uses the existing observed phase; missing observations produce an explicit unknown-weather line.

Character research references (background context, not copied new dialogue):
- [Alice's home and doll workshop](https://thwiki.cc/玛格特洛依德邸)
- [Marisa's official-setting reference index](https://thwiki.cc/雾雨魔理沙/一设资料)
- [Patchouli's profile](https://thwiki.cc/帕秋莉·诺蕾姬)

The three empty-room backgrounds were made with the built-in imagegen tool. [All final prompts](../assets/images/classic/scenes/PROMPTS.md) are stored with the scene PNGs. The close-up preserves the existing Live2D model, motion, expression, blink and breathing logic. Ambient light is a deliberately subtle canvas color adjustment plus a translucent scene light layer, not a physically based relighting claim.

## Code map

- `assets/js/data/companion-dialogues.js`: bilingual writing, tier selection, dates, weather and story construction. Pure selection functions allow deterministic date/tier tests.
- `assets/js/core/companion-dialogue.js`: typing/ready/choice states, text completion, history, settings, auto advancement and panels. No user content is inserted as HTML.
- `assets/js/core/live2d-loader.js`: model loading, cancellation by generation, half-body camera, expressions/poses, typewriter-linked mouth movement, drag/minimize/restore and rendering lifecycle.
- `assets/css/classic-companion.css`: window, scenery, dialogue, controls, responsive lane and independent panel scrolling. `classic-weather.css` owns the integrated dial.
- `assets/js/components/weather-widget.js`: original observation and cache pipeline, reused by the persistent companion instance.

The companion and its single weather instance live outside the replaceable `#main` so soft navigation retains state without duplicate widgets or refresh intervals. Reduced-motion users get instant dialogue, no loading animation, and the existing model animation opt-outs. Model/CDN failures show a retry control while scripted conversations remain available. Hidden/minimized windows pause text/auto progression and the PIXI renderer; no silent automatic dialogue replaces a conversation being read.
