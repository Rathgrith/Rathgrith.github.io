# Marisa spell reconstruction notes

These six patterns are reconstructed from *Imperishable Night* gameplay, with
coordinates and travel time adapted to the site's 240 × 360 arena. They do not
claim to reproduce the executable's frame timings or random-number generator.
The boss remains invulnerable under the existing timed score-attack rules.

## Evidence checked

Primary visual reference: Kdog's [Weekly Spell card Showcase: Marisa](https://www.youtube.com/watch?v=bZ3ldffDqvQ).
The recording was opened in a browser and inspected at these sections, including
paused full-game frames, rather than using the video title as evidence:

| Card | Inspected section | Visible structure that the previous version missed |
| --- | --- | --- |
| Milky Way | 2:19–2:27 | Five options around the boss; red/blue middle-star circles and smaller coloured stars arriving from the sides. |
| Asteroid Belt | 2:41–2:44 | Same family as Milky Way, with substantially more foreground radial arms. It is not a second unrelated oblique fan. |
| Stardust Reverie | 2:58–3:12 | Seven differently coloured curl-shaped lanes spanning the field. Options travel through the lower field; the pattern opens into long outward trails. |
| Non-Directional Laser | Around 3:51 | Five moving beam origins, outward coloured lasers, inward rows of large stars, and a separate sparse aimed component. |
| Master Spark | 4:39–4:42 | A very broad aimed Spark with stars spread around the whole boss, including behind the beam. |
| Final Spark | 6:17–6:22 | Dense red/blue spiral arms, a much wider beam, then a repositioning interval. |

The [Japanese stage guide](https://wikiwiki.jp/thk/%E6%B0%B8/4B) was used to
cross-check counts and difficulty variants: Normal Milky Way has nine radial
arms; Hard Asteroid Belt has seventeen; Normal Master Spark uses eleven. Final
Spark's volley is thirty-six successive eight-way shots, with alternating
handedness. This implementation keeps those counts explicitly.

## Per-card implementation checks

- **Stardust:** seven familiar paths use large, slow common circulation plus
  smaller curls. Two sub-beat placement samples preserve curved strings at the
  music scheduler's resolution. Laid stars have a finite hold followed by a
  straight outward release. No bullet has permanent circular velocity. The
  epicyclic path and release duration are authored approximations of the visible
  curls, not measured game-script values.
- **Milky Way:** nine-way red/blue rings use deterministic irregular starting
  angles. Five moving options fire outward fixed three-way streams. Source
  rotation creates the delayed side arrival; stars are not all aimed down.
- **Asteroid Belt:** seventeen-way rings and the same five-option motif provide
  the denser related variant. Later rounds may shorten option-stream gaps but
  do not replace the source geometry with generic aiming fans.
- **Non-Directional:** five circular option paths are shared between the visible
  sprites and laser orbit anchors. Two sub-beat samples produce inward star
  rows that pass through the centre. The boss's aimed three-way stars remain a
  separate, sparse component. Beam activation has a visible warning interval.
- **Master Spark:** eleven-way full circles run during the beam sequence. The
  first Spark points down; subsequent Sparks lock onto the player when charging.
  The broad cone is stationary once charged. The boss stays still while firing.
- **Final Spark:** each attack cycle emits exactly 288 stars, arranged as
  thirty-six eight-way rings, followed by a breathing interval. Red/blue spirals
  alternate handedness between attacks. The wide beam sweeps slightly, and the
  boss changes firing position only in the interval between beams.

## Verification and limits

An independent 60 Hz simulation exercised all six modules for thirty seconds at
rounds 1, 4 and 7, checking every emitted coordinate and velocity for finiteness,
tracking field bounds and the 720-bullet capacity. A separate volley assertion
checks Final Spark's 36 × 8 count. The integrated engine tests and rendered
opening / established-field / later-cycle screenshots cover actual production
movement and collision integration.

Micro-timing is quantized to half-beats, with spatial sub-samples for continuous
star rows. Original arm counts, sources and attack phases take priority over
forcing every card to have the same bullet count. Laser occupancy, cross-stream
motion and slow residual stars matter more than a raw particle-count ranking.
