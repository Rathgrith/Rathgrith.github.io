# Character squadron insignia

Three original flat high-resolution insignia generated with the built-in imagegen tool. Alice and Marisa retain their 2026-10-10 artwork; Patchouli was redesigned on 2026-10-13. The designs use bold color fields and distinct silhouettes without metallic detail. The full transparent PNGs are used directly, with no pixel conversion. The final prompts and sizing measurements are saved in `prompts.json`.

- `alice.png`: an elongated puppet-and-ribbon heraldic lozenge, blue and ivory with red ties.
- `marisa.png`: a sweeping asymmetric witch hat, broom and star with gold flight trails.
- `patchouli.png`: an open lunar codex with swept page shapes, a compact crescent, and five elemental lozenges on a broken orbital arc. Violet, lavender, ivory and plum. The large enclosing moon and bottom bow from the previous mark are removed.

Each design has its own silhouette and composition. The brief references the individuality of aviation squadron insignia from Ace Combat, without copying an existing squadron's mark. These replace both the old dithered still lifes and the unused pixel-crest draft.

`classic-theme.css` selects the illustration; `classic-ornaments.css` controls its size, placement and restrained contrast. Base image heights are 240px on desktop and 160px on compact screens and companion panels. Patchouli uses a 1.02 optical scale, measured from the real alpha silhouette: at desktop size the visible bounds are approximately 228×218px, versus Marisa's 229×195px and Alice's 169×222px. The painted areas are also compared, so a broad solid crescent cannot appear heavier just because the CSS boxes share a height. The veil covers the complete scaled image. Empty side rails contain no artwork. Decorative backgrounds are disabled for print and forced-color views.
