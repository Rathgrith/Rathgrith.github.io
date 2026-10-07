# Dongheng Lin — Nostalgia 1990s homepage

This branch adapts [academic-homepage's Nostalgia 1990s variant](https://github.com/luost26/academic-homepage-nostalgia-1990s) to the existing personal site. Content, URLs, gallery data, publications, weather and Live2D interactions remain in their original Jekyll files.

- Alice, Marisa and Patchouli use blue-grey, warm-gold and muted-violet night palettes within the classic Windows 95/98 frame. Use the three pixel portraits in the header to select a theme, or **Options → Theme** to cycle them; the choice persists across pages and reloads.
- Marisa and Patchouli use the supplied new portraits. Alice retains the original daytime portrait. The site now defaults to the dark desktop appearance, including before JavaScript runs; the supplied portraits stay the same across the interface change.
- The homepage music player has been removed; the doujin music link remains.
- Gallery thumbnails use a consistent 4:3 crop; the full-size viewer preserves each original aspect ratio.
- Gallery uses the template’s native showcase/archive organization. Notes and Thoughts retain their original source files. Jekyll renders gallery cards from the existing YAML, so images and original-image links also work without JavaScript. The viewer enhances these links with a thumbnail placeholder while full-size files decode, keyboard navigation and focus containment.
- The desktop Live2D companion sits in a small system window, docked in the home sidebar. On intermediate screens it shares a row with the profile, and on Gallery it starts minimized. Use its title bar to drag it out, double-click the title bar (or press Home while it is focused) to dock again, and use its minimize/close controls. **Options → Show Live2D** reopens a closed window. The original Japanese dialogue stays inside the window.
- The interface and body use W95FA, with 18px body text and system fallbacks for Japanese and Chinese. Original pixel character icons and low-contrast ribbon/star/moon night wallpaper change with each palette. Portraits use a closer crop; contact icons share a 16-pixel grid. SVG source artwork is in `assets/images/classic/characters/` and `patterns/`.
- The original feature scripts remain active: publication filtering, hover previews, full gallery viewer, weather, runtime, visits and Live2D dialogue.
- Shared chrome is in `_layouts/default.html` and `_includes/masthead.html`. Upstream base styles are in `assets/css/classic-base.css`; site and widget adaptations are in `classic-site.css`, `classic-widgets.css` and `classic-companion.css`.
- Template licensing is retained in `docs/nostalgia-template-LICENSE`; font and icon provenance is alongside those assets and in the page credits.

## Local preview

Use Ruby 2.7.8 and the locked gems, then run `bash run_server.sh`. This script sets the UTF-8 locale required by the existing Sass sources. To build without serving:

```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bundle exec jekyll build
```

The Pages workflow continues to deploy only `main`; pushing this feature branch leaves the live site unchanged. Live2D models, weather data, visitor statistics and gallery originals keep their existing remote sources.

---

# Rathgrith.github.io

# Rathgrith.github.io
