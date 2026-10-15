# Dongheng Lin — Nostalgia 1990s homepage

A Jekyll academic homepage with a dark Windows 95/98 frame, three Touhou character palettes, a photography Gallery and a shared PC-98-style Playground. Adapted from [academic-homepage / Nostalgia 1990s](https://github.com/luost26/academic-homepage-nostalgia-1990s).

[Homepage](https://rathgrith.github.io/) · [Gallery](https://rathgrith.github.io/gallery/) · [Playground](https://rathgrith.github.io/playground/) · [中文说明](docs/README-zh.md)

## Local preview

Use Ruby 2.7.8 and the locked gems. `bash scripts/setup_debug_env.sh` installs the local development dependencies when needed; `bash run_server.sh` starts the Jekyll preview at `http://127.0.0.1:4000`. To build without serving:

```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bundle exec jekyll build
```

The public site needs no Node runtime. Node and Playwright/Chrome are used for regression checks, documented in [frontend architecture](docs/frontend-architecture.md#running-checks). Audio seeking tests require a server with byte-range support, such as Jekyll/WEBrick.

## Customize or reuse

Start with `_config.yml` for identity, the default palette, the title-bar label and optional homepage loader, MathJax and uptime footer. `_data/navigation.yml` owns the header and section index; `_data/characters.yml` owns profile portraits, header icons and Live2D models. `_data/frontend.yml` declares ordered assets for the website and standalone app, so dependencies are not duplicated across layouts.

| Content | Location |
| --- | --- |
| Biography, education, publications and homepage sections | `_pages/about.md` |
| Gallery grouping and captions | `_data/gallery_groups.yml`, `_data/gallery_captions.yml` |
| Colors, fonts and wallpaper | `assets/css/classic-theme.css` |
| Shared shell and component markup | `_layouts/`, `_includes/` |
| Conversations and radio catalog | `assets/js/data/` |
| UI behavior and window lifecycle | `assets/js/core/` |
| Local arcade simulation and presentation | `assets/js/games/` |

Read [template customization](docs/template-customization.md) for the settings, project-subpath deployment, gallery hosting, extension boundaries and media notices. The isolated `tests/template-config.cjs` exercises a customized `/portfolio` deployment without overwriting the regular preview. Notes and Thoughts retain their source files; the primary navigation focuses on the homepage, Gallery and Playground.

## Current experience

- Alice, Marisa and Patchouli share the dark desktop style with blue-grey, warm-gold and violet palettes. User-supplied portraits have themed frames; small pixel icons and full-resolution squadron insignia remain distinct assets. Local W95FA and Fusion Pixel fonts keep the interface consistent. Palette choice persists across pages.
- The profile rail follows desktop scrolling, with the companion below its section index. Publication previews and metadata adapt to narrow widths. Gallery has five columns on wide screens, consistent 4:3 thumbnails, fresh per-collection shuffling and a keyboard-accessible viewer that preserves original proportions. Static cards also work without JavaScript.
- Playground docks, drags, resizes, minimizes and resets, with a maximum floating size of roughly 75% of the viewport. Dialogue and choices scroll within a fixed reading area without changing model framing. Mobile starts enabled below the page index, with separate saved visibility preferences. The standalone app uses a large scene, fixed conversation desk and separate radio panel.
- Japanese dialogue includes affinity tiers, branches, known friends, holidays and weather/time variants. Explicit expressions and poses use the original three Live2D models; mouth motion follows reviewed kana. Optional recorded interjections start off on each visit. [Companion system](docs/companion-system.md) · [voice credits](docs/companion-voices.md).
- The physical FM receiver is opt-in everywhere. Eight local recordings use a character-independent shuffled rotation, tuning noise through loading/seeking, a fade into random interior passages, real spectrum analysis and synchronized LRC where available. Matching PV links load YouTube only after explicit playback. [Radio library](assets/music/radio/README.md).
- Music-synchronized score attack and a Flower-style CPU duel share three pilots, distinct shots, animated sprites, rank progression, spell/nonspell phases, Bombs, supplies and automatic play. Battle audio is independent of radio and defaults enabled only on the standalone route. [Game guide](docs/danmaku-game.md) · [battle music credits](assets/music/danmaku/README.md).
- **非想天則** combines a local dot-matrix map, observation marker, 24-hour forecast and Touhou-inspired weather symbols. The compact calendar shows Gregorian, Japanese old-calendar and Gensokyo dates in the visitor's local time. [Calendar conventions](docs/weather-calendar.md).

There is no visitor tracking or analytics. Remote models, weather and gallery originals retain their configured providers, with fallback UI for unavailable services. The frontend uses one modular style system; retired theme bundles, jQuery plugins and the earlier standalone player are not loaded. [Component ownership and checks](docs/frontend-architecture.md).

## Release and credits

The Pages workflow deploys `main`: open a reviewed pull request, merge, check the resulting workflow and verify all three routes. Development scripts, tests and docs are excluded from the published site.

The original layout license is retained in `docs/nostalgia-template-LICENSE`. Font/icon notices and media provenance remain beside the corresponding assets and in the page credits. The template license does not cover third-party music, voice recordings, character art, models or personal photographs; replace those appropriately when reusing the site.
