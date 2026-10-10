# Alice: PCB spell reference and implementation

These are compact reconstructions of the original PCB patterns for the existing
240 × 360 time-attack field, not frame-exact replays. Their identities come from
the doll formations, projectile families, colour sequence and firing grammar;
music alignment and the challenge's timed phases remain local adaptations.

## Footage inspected

- [MrAmbil, PCB Alice Normal perfect battle](https://www.youtube.com/watch?v=xR7brbFgmr0):
  French Dolls at 0:43 and 0:48; Dutch Dolls at 1:26 and 1:31; London around
  2:31–2:36; Shanghai around 3:14–3:18. Frames were viewed directly in the
  browser player, including successive states, rather than inferred from titles.
- [Ythundyth, PCB Alice Lunatic perfect battle](https://www.youtube.com/watch?v=LYAEp0bMf1Q):
  Russian Dolls around 1:02. The Lunatic split card is **Orléans**, so its green
  125-descendant pattern is deliberately not used for French Dolls.
- [Niko6454, Reincarnated Tibetan Dolls](https://www.youtube.com/watch?v=1AKIPqRIFHw):
  opening at 0:02, green/blue scales around 0:08, yellow/cyan around 0:13.
- [PCB stage-three strategy reference](https://wikiwiki.jp/thk/%E5%A6%96/3):
  cross-check of difficulty variants and the French 49-descendant split.

## Card-by-card comparison

| Card | Visible reference features | Replacement in this project |
| --- | --- | --- |
| French Dolls | Six dolls encircle Alice; blue seeds give way to separated red scale clusters. | Six circular sources; two successive seven-way splits, producing 49 red scales per surviving seed. Three initial phases repeat. No aimed five-way fan. |
| Foggy London Dolls | Compact seven-doll circle; blue rice rings followed by yellow and cyan rings. | Individual complete rings from seven moving sources. The late pair shares a phase; explicit pauses divide the colour sequence. |
| Red-Haired Dutch Dolls | Short lilac/cyan oval packets form distinct spokes rather than solid walls. | Fixed seven-direction wheels; every spoke consists of six grains. Successive moving dolls cast each wheel, leaving broad angular gaps. |
| Chalk-White Russian Dolls | Red and blue packet families enter from opposite sides. | Mirrored red/blue doll trains, six-direction packet wheels and alternating emitters. Direction is fixed rather than continually aimed at the player. |
| Magically Luminous Shanghai Dolls | Gold/ochre linked scales, blue scale layers and conspicuous dark-centred purple orbs. | Eight dolls build drifting polygon necklaces; Alice adds blue scale rings and eight large visual orbs with small collision cores. No laser substitution. |
| Reincarnated Tibetan Dolls | Six close dolls; green, blue, yellow and cyan scale waves bend slightly. | Six circular sources; separated colour phases and a short, decaying curve. The circles expand and leave the field rather than endlessly orbiting. |

## Local adaptation boundaries

Doll orbit radii, speeds, packet timing and count reductions are designed for the
smaller field. Dutch doll motion uses a continuous six-doll orbit; the exact
original spawn/despawn cadence was not reconstructed. Russian trains use a
bounded repeating descent. Shanghai's connected shape is built from velocity
segments, not extracted game scripts. These differences should remain explicit
when assessing visual similarity.

Later-round tuning preserves spoke count, colour families and source placement.
It adjusts speed and small ring-count increments; it must not replace formations
with generic aimed spreads. French splitting is recursive: deleting a parent
also deletes every future descendant, so a bomb or spell clear cannot cause an
invisible delayed burst.

A direct 30-second simulation at a 0.38-second beat with normal round scaling
kept all six formations below the 720-projectile pool limit (peak 562). Final
engine-level images, music timing and difficulty checks are maintained in the
shared spell tests.
