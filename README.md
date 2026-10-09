# Dongheng Lin — Nostalgia 1990s homepage

This branch adapts [academic-homepage's Nostalgia 1990s variant](https://github.com/luost26/academic-homepage-nostalgia-1990s) to the existing personal site. Content, URLs, gallery data, publications, weather and Live2D interactions remain in their original Jekyll files.

- Alice, Marisa and Patchouli use blue-grey, warm-gold and muted-violet night palettes within the classic Windows 95/98 frame. Use the three pixel portraits in the header to select a theme; the choice persists across pages and reloads.
- All three characters use portraits supplied by the site owner, including the updated Alice illustration. Each frame has original pixel ornaments: Alice's ribbon and doll, Marisa's star and witch hat, and Patchouli's crescent and grimoire. Frames follow the selected palette and use smaller ornaments on mobile.
- A compact PC-98 **BGM：** player lives inside the Live2D window. It starts silent on every visit and loads audio only after Play/Unmute. Each character has a softer piano rendition of their own theme; playback, mute, seeking and volume stay with the same companion across pages. Minimize, close, a hidden tab or the arcade suspends playback. [Music credits and reproduction](assets/music/companion/CREDITS.md).
- Gallery thumbnails use a consistent 4:3 crop; the full-size viewer preserves each original aspect ratio.
- Gallery uses the template’s native showcase/archive organization. Notes and Thoughts retain their original source files. Jekyll renders gallery cards from the existing YAML, so images and original-image links also work without JavaScript. The viewer enhances these links with a thumbnail placeholder while full-size files decode, keyboard navigation and focus containment.
- The PC-98-style Live2D window docks below the in-page navigation in the profile rail on desktop and can be dragged, minimized or closed. Use the pixel reset button beside Minimize, double-click the title bar, press Home, or use 設定 → 元の位置へ to restore the current layout’s dock. Mobile/tablet starts enabled at the page bottom below the section index; **Options → Live2D を開く** restores it after closing. Desktop and mobile visibility preferences are independent. Half-body framing, three softly defocused scenes and subtle ambient light accompany the original models.
- The interface and body use W95FA, with 17px desktop body text. Japanese dialogue and menus use locally hosted Fusion Pixel (SIL OFL). Original pixel character icons and low-contrast ribbon/star/moon night wallpaper change with each palette. Portraits use a closer crop; contact icons share a 16-pixel grid. SVG source artwork is in `assets/images/classic/characters/` and `patterns/`.
- All 135 companion lines have explicit facial expressions and body poses using the original three models, including Patchouli's book gestures. Expressions persist through reading, and rapid dialogue changes retain the latest requested pose.
- **弾幕に挑戦** opens a pixel score-attack game inside the companion. Alice, Marisa and Patchouli each have a distinct pilot shot type and enemy pattern; all nine matchups have separate local records. Infinite-health opponents increase bullet density over time. Keyboard/touch movement, auto-fire, graze scoring, three lives, two spirit strikes, pause and retry are included. [Game rules and implementation](docs/danmaku-game.md).
- The reading layout uses theme-colored pixel section icons, an education timeline, publication metadata beside unobstructed previews, and a section index that follows the current reading position. Gallery collections include image counts; all previews keep the same crop.
- The Japanese-only companion has 99 everyday/holiday lines with light character-voice edits and 18 unchanged original game quotations. **友人のこと** contains 18 short remarks about a focused circle of 11 characters/groups (Alice 5, Marisa 8, Patchouli 5), selected for established interactions. Four affinity tiers, branching replies, seven holiday groups, weather/time context, typewriter text, auto advance and history remain. **設定** controls affinity, text speed and ambient light, including a 0–100% strength slider for scene-colored model lighting; source/subtitle/help metadata has been removed from the interface. Details: [companion system](docs/companion-system.md).
- Retained features include: publication filtering, hover previews, full gallery viewer, weather, runtime, visits and Live2D dialogue.
- Shared chrome is in `_layouts/default.html` and `_includes/masthead.html`. The frontend now has a single modular stylesheet system, with the old template CSS, paper/glass redesign, jQuery plugins and old standalone player code retired. See [frontend structure and regression checks](docs/frontend-architecture.md).
- Template licensing is retained in `docs/nostalgia-template-LICENSE`; font and icon provenance is alongside those assets and in the page credits.

## Local preview

Use Ruby 2.7.8 and the locked gems, then run `bash run_server.sh`. This script sets the UTF-8 locale required by the existing Sass sources. To build without serving:

```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bundle exec jekyll build
```

The Pages workflow continues to deploy only `main`; pushing this feature branch leaves the live site unchanged. Live2D models, weather data, visitor statistics and gallery originals keep their existing remote sources.
