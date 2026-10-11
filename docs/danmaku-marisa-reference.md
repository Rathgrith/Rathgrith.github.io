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
| Non-Directional Laser | 3:45–3:54, including paused frame advances | Normal's HUD reads `+10(10)`. Two groups of five familiars cross, with outward coloured lasers and inward middle-star rows. A separate smaller, multicoloured star component is visible around the boss. |
| Master Spark | 4:39–4:42 | A very broad aimed Spark with stars spread around the whole boss, including behind the beam. |
| Final Spark | 6:12–6:22 | Dense red/blue spiral arms, a much wider beam, then a repositioning interval. The Normal clip includes a beam directed toward the upper-left, so restricting aim to the lower field was incorrect. |

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
- **Non-Directional:** two counter-rotating groups of five option paths are
  shared between the visible sprites, laser anchors and inward star rows. The
  groups charge in alternation; no more than ten lasers occupy the twelve-slot
  pool. Each group keeps its actual beam expiry time, including the 0.25-second
  fade: if the recording speeds up, its next charge waits for that expiry rather
  than trusting a six-beat duration estimated from the previous tempo. The
  source count corrects the earlier five-source interpretation, which
  mistook overlapping glows for single sources. Boss-origin aimed stars lock
  when emitted and now cycle through colours instead of remaining pink. Their
  exact original way count and frame cadence could not be resolved reliably;
  the retained sparse three-way burst is an adaptation, not an ECL-derived fact.
- **Master Spark:** eleven-way full circles run during the beam sequence. The
  first Spark points down; subsequent Sparks lock onto the player when charging.
  The broad cone is stationary once charged. The boss stays still while firing.
- **Final Spark:** each attack cycle emits exactly 288 stars, arranged as
  thirty-six eight-way rings, followed by a breathing interval. Red/blue spirals
  alternate handedness between attacks. The wide beam sweeps slightly, and the
  boss changes firing position only in the interval between beams. The charge
  locks toward the player's full-circle position, including above the boss;
  it does not track the player after the lock.

## Secondary-source audit

This audit separates confirmed omissions from changes that would merely make
the cards busier. The original-video HUD and moving frames take priority over
the earlier implementation notes. The linked author's replay/script folder was
also checked but returns 404; no original ECL script has been obtained.

| Site ID | Difficulty basis | Source / aim decision |
| --- | --- | --- |
| `stardust` | Normal | Seven travelling familiar sources. The observed coloured trails and the guide do not establish an additional boss-origin aimed layer; none added. |
| `milky` | Normal | Five familiar three-way streams plus boss nine-way circles. Both layers already exist. The familiar streams are fixed relative to their sources; no invented player targeting. |
| `asteroid` | Hard | Five familiar three-way streams plus boss seventeen-way circles. Both already exist; the radial starting angle varies rather than aiming the entire foreground fan at the player. |
| `nondirectional` | Normal | Corrected the missing counter-rotating five-source group. Kept the independent boss-origin aimed layer and corrected its colours. Source rotation rates and music-grid cadence remain authored approximations. |
| `master` | Normal | Eleven-way boss circles plus the aimed Spark are the two evidenced layers. First beam remains downward; later beams lock at charge onset. No evidence for an extra aimed small-star fan, so none added. |
| `finalspark` | Normal | Thirty-six eight-way bursts plus aimed Spark, followed by movement. Removed the downward-only aim clamp. No additional familiar or independent aimed-star layer established. |

For Non-Directional specifically, the recording's large translucent star rows
and smaller bright stars can overlap at the boss. The smaller layer's exact
shot count should be checked against a recovered game script before claiming
frame-accurate reconstruction; increasing that count speculatively would not
resolve the uncertainty.

## Verification and limits

An independent 60 Hz simulation exercised all six modules for thirty seconds at
rounds 1, 4 and 7, checking every emitted coordinate and velocity for finiteness,
tracking field bounds and the 720-bullet capacity. A separate volley assertion
checks Final Spark's 36 × 8 count. The integrated engine tests and rendered
opening / established-field / later-cycle screenshots cover actual production
movement and collision integration.

After the secondary-source correction, an additional sixty-second emitter
simulation at 100, 130, 160, 200 and 240 BPM checks the complete laser lifetime,
including the engine's 0.25-second fade: Non-Directional peaks at ten beams at
each tempo. All six opening cycles emit finite coordinates, Final Spark still
emits 288 stars, and an above-boss target produces an upward locked beam.
The production music-map regression (`tests/danmaku-aiming.cjs`) additionally
checks every laser request through all three complete recordings. Per-group
expiry tracking fixes the six Non-Directional beams previously lost at the
recording's changing beat intervals; the complete regression now passes.

Micro-timing is quantized to half-beats, with spatial sub-samples for continuous
star rows. Original arm counts, sources and attack phases take priority over
forcing every card to have the same bullet count. Laser occupancy, cross-stream
motion and slow residual stars matter more than a raw particle-count ranking.
