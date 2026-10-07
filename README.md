# Dongheng Lin — Nostalgia 1990s homepage

This branch adapts [academic-homepage's Nostalgia 1990s variant](https://github.com/luost26/academic-homepage-nostalgia-1990s) to the existing personal site. Content, URLs, gallery data, publications, music, weather and Live2D interactions remain in their original Jekyll files.

- Alice, Marisa and Patchouli palettes share the classic Windows 95/98 frame. Use **Options → Theme** to cycle them; the choice persists across pages and reloads.
- Marisa and Patchouli use the supplied new portraits. Alice retains the original daytime portrait. Night mode is removed, including for visitors with a saved dark preference.
- Gallery uses the template’s native showcase/archive organization. Notes and Thoughts retain their original source files. Jekyll renders gallery cards from the existing YAML, so images and original-image links also work without JavaScript. The viewer enhances these links with a thumbnail placeholder while full-size files decode, keyboard navigation and focus containment.
- The original feature scripts remain active: publication filtering, hover previews, full gallery viewer, music controls, weather, runtime, visits and Live2D dialogue.
- Shared chrome is in `_layouts/default.html` and `_includes/masthead.html`. Upstream base styles are in `assets/css/classic-base.css`; site and widget adaptations are in `classic-site.css` and `classic-widgets.css`.
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
