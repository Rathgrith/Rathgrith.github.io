# Spell motifs and adaptation

These are compact adaptations of Touhou patterns for a 240×360, music-timed score attack, not frame-exact game reproductions. Timing follows the supplied dBu recordings; the timed invulnerable boss, repeatable durability clear, scoring and nonspell transitions stay intact.

## Reference material

Original-game recordings inspected for silhouette, spacing and source placement:

- ZPS, [Perfect Cherry Blossom Lunatic](https://www.youtube.com/watch?v=T7XRsckGaPM), Alice around 09:30–10:15.
- ZPS, [Imperishable Night Lunatic, Border Team](https://www.youtube.com/watch?v=nNkkkvm0XXE), Marisa around 15:30 onward.
- ZPS, [Embodiment of Scarlet Devil Extra](https://www.youtube.com/watch?v=PNU2EpXtjis), Patchouli around 01:28–02:08.

Pattern identities and difficulty variants were cross-checked against the Japanese community strategy descriptions for [PCB stage 3](https://wikiwiki.jp/thk/%E5%A6%96/3), [IN stage 4B](https://wikiwiki.jp/thk/%E6%B0%B8/4B), [EoSD stage 4](https://wikiwiki.jp/thk/%E7%B4%85/4) and [EoSD Extra](https://wikiwiki.jp/thk/%E7%B4%85/EX). No video, sprite or game-code assets were extracted from those sources.

## Distinct mechanics

| Character / card | Implemented motif and main difference |
| --- | --- |
| Alice / France | Four dolls send blue parent scales that divide in flight into five-way daughter fans. |
| London | Six distributed dolls release separate concentric rice wreaths. |
| Holland | A right-bank procession sends bundled scale petals with an oscillating aim. |
| Russia | Opposite banks alternate red and blue clusters with a counter-volley. |
| Shanghai | Yellow scale necklaces: angle and speed vary together to form linked moving loops. No fighting-game-style laser. |
| Tibet | Six orbiting dolls cast counter-curving scale sheets over a much wider formation. |
| Marisa / Stardust | Five moving familiars lay coloured stars briefly, then release them outward; no permanent circular orbit. |
| Milky Way | Sparse fixed three-way side currents and slower medium-star rings. |
| Asteroid Belt | Layered crossing star belts, more simultaneous side emitters and a denser central volley. This harder related motif now follows Milky Way. |
| Non-Directional | Four orbiting familiars emit outward beams and inward star columns, overlaid with aimed boss stars. The laser origin follows its familiar in render, collision and AI prediction. |
| Master Spark | Downward opening beam, then locked aim, wide cone and slow eleven-way star curtains. |
| Final Spark | Longer, broader sweeping cones and faster layered large-star curtains, separated by recovery intervals. |
| Patchouli / Agni | Opposed wavering flame ribbons, leaving shifting lateral channels. |
| Undine | Aimed thin lasers, large blue bubbles and slow water pellets. |
| Trilithon | Gold/earth columns change direction in the lower arena. |
| Sylphy | Staggered oblique green sheets from opposite sides. |
| Royal Flare | Regular counter-curving red/orange lattices with stable gaps, rather than random circular gaps. |
| Philosopher’s Stone | Fire: two radial shells; water: fast aimed fans; wood: scatter then diagonal drift; metal: delayed divergent turn; earth: ring then collective locked-direction turn. |

The closely related Normal/Hard variants retain their shared identity, but formations, side pressure and timing differ. Projectile quantities are reduced to fit the smaller arena. The daughter count of France is deliberately much smaller than the original. Later rounds increase bounded pressure without adding infinite homing or untelegraphed lasers.

## Checks

`danmaku-spell-design.cjs` covers splitting and cancellation, necklaces, two-sided dolls, laid-star release, familiar laser origins, water bubbles/lasers, lower-field earth turns and distinct elemental motion laws. Split children enter the next simulation step; cancelling a parent removes its pending split. `danmaku-laser-ai.cjs` checks complete routes, delayed ignition, expiry, sweeps, expanding cones and orbiting origins in addition to all three pilot variants.

`danmaku-spell-visuals.cjs` renders all eighteen production patterns at 7, 11 and 16 seconds after their musical phrase starts. Full-track density measurements at three aim positions supplement these screenshots. Coverage includes an enlarged movement margin, so it is a relative pressure measure, not a percentage of lethal pixels or a complete model of human difficulty.

Validation on 2026-10-10: all eighteen cards rendered at three elapsed times; full-track pressure remained ascending within every character at rounds 1, 2, 4 and 7, with no pool saturation. The mechanics, score/timing, nonspell and laser-AI suites passed, as did all nine automatic two-field matchups and both renderers. Difficulty coverage uses three aim positions and at least 200 samples per card.
