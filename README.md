# Dongheng Lin — Nostalgia 1990s homepage

This branch adapts [academic-homepage's Nostalgia 1990s variant](https://github.com/luost26/academic-homepage-nostalgia-1990s) to the existing personal site. Content, URLs, gallery data, publications, weather and Live2D interactions remain in their original Jekyll files.

- Alice, Marisa and Patchouli use blue-grey, warm-gold and muted-violet night palettes within the classic Windows 95/98 frame. Use the three pixel portraits in the header to select a theme; the choice persists across pages and reloads.
- Marisa and Patchouli use the supplied new portraits. Alice retains the original daytime portrait. The site now defaults to the dark desktop appearance, including before JavaScript runs; the supplied portraits stay the same across the interface change.
- The homepage music player has been removed; the doujin music link remains.
- Gallery thumbnails use a consistent 4:3 crop; the full-size viewer preserves each original aspect ratio.
- Gallery uses the template’s native showcase/archive organization. Notes and Thoughts retain their original source files. Jekyll renders gallery cards from the existing YAML, so images and original-image links also work without JavaScript. The viewer enhances these links with a thumbnail placeholder while full-size files decode, keyboard navigation and focus containment.
- The Live2D companion is a movable PC-98-style conversation window on the right. Wide screens reserve room beside the page; smaller screens start with a collapsed title bar. Drag the title bar or use its arrow keys, double-click / press Home to reset, and use minimize/close. **Options → Show Live2D** reopens it. Half-body framing, three generated scenes and subtle ambient light accompany the original models.
- The interface and body use W95FA, with 18px body text and system fallbacks for Japanese and Chinese. Original pixel character icons and low-contrast ribbon/star/moon night wallpaper change with each palette. Portraits use a closer crop; contact icons share a 16-pixel grid. SVG source artwork is in `assets/images/classic/characters/` and `patterns/`.
- The reading layout uses theme-colored pixel section icons, an education timeline, publication metadata beside unobstructed previews, and a section index that follows the current reading position. Gallery collections include image counts; all previews keep the same crop.
- The conversation system adds 99 original bilingual lines, four per-character affinity tiers (0–24 / 25–49 / 50–74 / 75–100), selectable responses, seven fixed-date holiday groups, time/season/weather context, typewriter text, auto advance, a session backlog and saved preferences. **设置** controls affinity, text speed, Chinese subtitles and ambient light; the weather strip opens the existing live weather module. **原作回想** keeps the 18 original quotations and their sources. Details: [companion system](docs/companion-system.md).
- Retained features include: publication filtering, hover previews, full gallery viewer, weather, runtime, visits and Live2D dialogue.
- Shared chrome is in `_layouts/default.html` and `_includes/masthead.html`. The frontend now has a single modular stylesheet system, with the old template CSS, paper/glass redesign, jQuery plugins and removed player code retired. See [frontend structure and regression checks](docs/frontend-architecture.md).
- Template licensing is retained in `docs/nostalgia-template-LICENSE`; font and icon provenance is alongside those assets and in the page credits.

## Local preview

Use Ruby 2.7.8 and the locked gems, then run `bash run_server.sh`. This script sets the UTF-8 locale required by the existing Sass sources. To build without serving:

```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bundle exec jekyll build
```

The Pages workflow continues to deploy only `main`; pushing this feature branch leaves the live site unchanged. Live2D models, weather data, visitor statistics and gallery originals keep their existing remote sources.
