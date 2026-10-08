# Character corner illustrations

Original transparent PNG illustrations generated with the built-in `image_gen`
tool on 2026-10-08. Full production prompts are in `prompts.json`.

- `alice.png`: ribbon, doll and sewing accessories, in steel blue and dusty rose.
- `marisa.png`: witch hat, broom, mini-hakkero and potions, in muted gold.
- `patchouli.png`: grimoires, crescent and crystals, in faded violet.

The artwork contains its own transparent pixel-dither edges. Theme variables in
`classic-theme.css` select the image; `classic-ornaments.css` owns placement and
contrast. Documents receive a quiet corner watermark. Companion panels and the
lower homepage rail use `../patterns/dither-corner.svg`, a monochrome Bayer mask,
instead of illustrations. Compact documents use a smaller, fainter image.
All art is noninteractive and static, and is disabled in print/forced-color views.
There is no runtime drawing, animation, added DOM, or extra loading gate.
