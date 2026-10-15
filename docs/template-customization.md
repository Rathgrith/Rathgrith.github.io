# Reusing the classic template

The academic content, visual theme and Playground runtime are separate. You can change profile information and navigation without editing JavaScript, and change component styling without changing dialogue or game rules. The defaults reproduce the current homepage.

## Start with site information

Edit `_config.yml`:

```yaml
title: "Your Name"
description: "A short description for search and link previews."
url: "https://your-name.github.io"
baseurl: "" # Use "/portfolio" for https://your-name.github.io/portfolio/.
repository: "your-name/your-name.github.io"
author:
  name: "Your Name"
  role: "Research · Engineering"
  location: "Your location"
  email: "you@example.org"
  github: "your-name"
  googlescholar: "https://scholar.google.com/citations?user=YOUR_ID"
classic:
  default_character: alice
  window_label: "Personal homepage"
  home_loading: true
  math: true
  runtime: true
```

Jekyll merges custom configuration files, so a local override can contain only the keys you want to change. Restart `jekyll serve` after configuration changes. `default_character` accepts `alice`, `marisa` or `patchouli`; an invalid value falls back to Alice, and a visitor's saved selection takes precedence.

`home_loading: false` removes both the homepage loading screen and its script. `math: false` omits MathJax. `runtime: false` omits the uptime footer and its timer. These are independent of Playground, which keeps its own character-loading state. Existing pages can opt out of the homepage loader with `disable_home_loading: true`, or hide the embedded companion with `disable_live2d: true` in front matter. The standalone Playground is a separate full-page app.

`site_started_at` controls the uptime date; remove or replace the original author's date and commit when reusing the site. Optional contact fields remain in the author profile include for compatibility; empty entries produce no link.

## Content and artwork

| Change | File |
| --- | --- |
| Biography, education, publications and other homepage sections | `_pages/about.md` |
| Header tabs and in-page index | `_data/navigation.yml` (`header` and `main`) |
| Header character icons, profile portraits, Live2D model URLs | `_data/characters.yml` |
| Gallery collections and captions | `_data/gallery_groups.yml`, `_data/gallery_captions.yml` |
| Gallery introduction and page structure | `assets/gallery.html` |
| Theme colors, wallpaper and fonts | `assets/css/classic-theme.css` |
| Component styles and responsive behavior | See [style ownership](frontend-architecture.md#style-ownership) |
| Dialogue topics, branches, friend remarks and readings | `assets/js/data/companion-*.js` (see [companion guide](companion-system.md)) |
| Radio catalog, LRC metadata and cue points | `assets/js/data/companion-radio.js` |
| Battle music timing and spell phases | `assets/js/games/danmaku-score.js` (see [game guide](danmaku-game.md)) |

Header items accept `title`, `url`, optional `icon` (a filename in `assets/images/classic/icons/16/`), optional `page` for current-page highlighting, and `full_navigation: true` when crossing into another page shell. Keep Playground's full-navigation flag. The section index uses the `main` entries with `/#section-id` URLs; those IDs must exist in the homepage content.

The three character IDs are also used by palettes, conversations, save data, scene art and games. Replacing an existing portrait or model URL is configurable; adding a fourth character requires those corresponding modules and art. Models need the existing Cubism expression/pose conventions. Header icons and profile portraits are separate from battle sprites and conversation-menu artwork, which retain their own small pixel assets.

## Gallery storage

Thumbnails are local files in `images/gallery/thumbnails/`. Every card crops its thumbnail to 4:3; the viewer displays the original without cropping. The browser shuffles each collection on every visit without changing YAML order.

Set `gallery.originals_url` to the folder containing your full-size images, ending with `/`. Both the static fallback links and the JavaScript viewer use this setting. The current site points to its raw GitHub originals so the published site stays small. For an external host, use an HTTPS URL. To publish originals locally, use `/images/gallery/originals/` and remove `images/gallery/originals` from `_config.yml`'s `exclude` list. Test an original-image link as well as its thumbnail.

## Project-subpath hosting

Shared template links, script/style URLs, portraits, the manifest and canonical URLs use Jekyll's `relative_url` / `absolute_url` filters. Dynamic companion icons, battle sprites and battle MP3s use the mount path supplied to `site-assets.js`. Font and scene CSS URLs are relative to their stylesheet. There is no need to set an HTML `<base>` element.

Use the same pattern when adding content:

```liquid
<img src="{{ '/images/example.png' | relative_url }}" alt="Example">
<a href="{{ '/gallery/' | relative_url }}">Gallery</a>
```

New runtime code can use `SiteAssets.url('/assets/images/example.png')`. It prefixes the local deployment path, leaves external/protocol-relative URLs untouched and avoids adding the same prefix twice. Public third-party model/weather URLs remain external. Keep the `url` configuration as the origin and `baseurl` as the project path; do not repeat the path in both.

## Loading and lifecycle boundaries

`_data/frontend.yml` is the ordered asset manifest for the two page shells. `_includes/asset-scripts.html` renders script tags and local asset-base attributes, while `_includes/frontend-context.html` resolves shared configuration and the cache version once. The standalone shell omits the homepage/gallery styles and navigation scripts. Preserve dependency order when adding modules; the manifest is deliberately a plain list, not a bundler or automatic dependency resolver.

Homepage/Gallery navigation retains the singleton Playground and swaps only `#main`. Initialize page-owned UI on `site:content-updated`, release listeners or overlays on `site:before-content-replace`, and never duplicate the companion or its audio contexts. Full navigation is required for a different page shell. Motion tokens live in `classic-theme.css`; shared transitions live in `classic-motion.css`, loaded last in both shells. Honor `prefers-reduced-motion`, avoid animating text/canvas scale and reserve layout space before media decode.

## Verification and publication

Build before opening the preview. Run the responsive and interaction checks documented in [frontend architecture](frontend-architecture.md#running-checks). `node tests/template-config.cjs` creates an isolated Jekyll build using a different author/title, `/portfolio` mount path, another default character, disabled optional features and a custom gallery host. It checks the rendered site, navigation, manifest and dynamic game assets, then removes its temporary output. It needs the repository's Ruby/Bundler toolchain and Playwright/Chrome, but does not modify `_site`.

The Pages workflow deploys `main`. Review changes on a branch, merge the pull request, then verify the Pages run and all three public routes. Radio is opt-in on all routes; standalone battle music defaults on independently. Optional weather/model providers must fail without disabling reading, radio controls or local games.

The layout license does not grant rights to every bundled photograph, character illustration, model, music recording or voice clip. Replace personal/media assets with your own or appropriately licensed files when making another public site, and preserve applicable font/icon/template notices. See each media folder's credits and the page's artwork credits.
