# Original-game spell reconstruction

All eighteen score-attack cards now have character-specific choreography modules. Source placement, colour sequences, projectile families and movement phases take precedence over the previous shared fan/ring density multipliers. These are reconstructions for the 240×360 music-timed arena, not recovered game scripts or frame-exact ports. The timed invulnerable boss, repeatable durability clear, scoring and nonspell rules remain unchanged.

## Footage and per-card audit

Each character's reference notes distinguish directly viewed gameplay from secondary descriptions, record playback timestamps, and state the remaining approximation:

- [Alice / Perfect Cherry Blossom](danmaku-alice-reference.md): France, London, Holland, Russia, Shanghai and Tibet.
- [Marisa / Imperishable Night](danmaku-marisa-reference.md): Stardust, Milky Way, Asteroid Belt, Non-Directional Laser, Master Spark and Final Spark.
- [Patchouli / Embodiment of Scarlet Devil](danmaku-patchouli-reference.md): Agni Shine, Princess Undine, Lazy Trilithon, Sylphy Horn, Royal Flare and Philosopher's Stone.

No original sprites, audio or game-code assets were extracted from these references. Normal, Hard and Extra variants are identified in the notes rather than mixed under the wrong spell name.

## Corrected structures

| Card | Distinguishing structure |
| --- | --- |
| France | Six dolls; blue seeds fold into white short arcs, then divide into red scales, 1 → 7 → 49. |
| London | Seven close dolls; green/blue rice circles, a pause, then yellow/cyan waves. |
| Holland | Six upper-rank dolls cast successive seven-spoke wheels of compact lilac/cyan six-grain packets. |
| Russia | Upper-rank and flank doll sources, alternating red/blue formations and six-spoke packet wheels. |
| Shanghai | Four dolls cast three-layer gold/ochre ribbons; the boss adds alternating two/four blue rings and nine hollow purple orbs. |
| Tibet | Six close dolls and slightly bending green/blue/yellow/cyan scales. |
| Stardust | Seven moving sources draw broad coloured curls; placed stars eventually leave on straight rays. |
| Milky Way | Five moving options, fixed three-way side streams and nine-way radial red/blue stars. |
| Asteroid Belt | The related seventeen-way foreground variant with stronger side pressure. |
| Non-Directional | Two counter-rotating five-source groups cast outward lasers and inward star rows; separate boss-origin aimed stars. |
| Master Spark | Eleven-way full circles; first beam downward, subsequent beams lock aim on charging. |
| Final Spark | Thirty-six eight-way red/blue spiral volleys, a full-circle aimed wide beam and a relocation interval. |
| Agni Shine | Boss-centred red curved fire rings with two travel speeds. |
| Princess Undine | Three repeated three-way aimed laser pulses and blue small rings, then even ten/two-way water streams during boss movement. |
| Lazy Trilithon | Yellow rocks decelerate, stop and scatter independently; a separate blue aimed penalty fires only at players above the boss. |
| Sylphy Horn | Boss needles spread broadly and bend into a steep down-left drift. The straight, shallower right-edge wind extends to the lower field, with a slower entrance for low sources. |
| Royal Flare | Offset expanding loops of red round beads, visible lobes and crossing seams. |
| Philosopher's Stone | Fixed five-source bank; five rice colours with independent, overlapping movement laws. |

## Integration

`danmaku-patterns.js` owns card metadata, unchanged nonspell logic, local attack-clock normalization and shared projectile motion. The three `danmaku-patterns-{alice,marisa,patchouli}.js` modules own spell formations, boss positions and emissions. Both CommonJS tests and the browser load the same modules.

The first allowed musical firing tick becomes local tick zero. A new phrase therefore cannot begin halfway through a laser or colour sequence. Boss movement interpolates between card-specific and nonspell positions; active boss/orbit beams retain their existing position lock. The renderer, collisions and autoplay use the same moving laser geometry.

Recursive split motion belongs to each child projectile. Clearing a parent removes its future descendants. Earth and metal projectiles have continuous deceleration, a visible rest, then a one-time redirect; stationary rice preserves its last orientation. Broad cupped scales and a dark hollow orb make PCB projectile families legible without enlarging their collision cores.

Projectile redirects can use a shared formation latch: the metal ring samples the player once when it changes direction, and its members then move in parallel without homing. A new ring owns a fresh latch. This sampling instant is an explicit interpretation of the observed formation change, not a recovered original script frame. Optional gradual redirects make the boss's wood needles turn continuously; the independent edge stream remains straight. Recursive splits can offset their direction relative to their parent, allowing France's inward intermediate arcs.

Later rounds retain characteristic arm counts and add bounded cadence/spacing changes. Mean occupancy alone cannot rank a static ring, a streaming pattern and a rotating laser: forcing it to increase at every card was erasing the original patterns. The density audit instead reports lower-field pressure, travelling speed, open corridors and pool headroom separately.

## Verification

- `tests/danmaku-spell-design.cjs`: all eighteen structures, arbitrary music-phase offsets, nested split/cancel lifecycle, fixed arm counts, star release, moving lasers, water sequence, stopped rocks and the five-element bank.
- `tests/danmaku-aiming.cjs`: fixed-versus-aimed layers under moving targets, full-circle Spark luring, water pulse retargeting and movement, conditional upper-field punishment, formation-wide late locking, gradual wind turns, nine lower-right camping probes in rounds 1/7, and actual full-track laser emission counts.
- `tests/danmaku-spell-visuals.cjs`: actual production rendering of every card at 4, 8, 14 and 22 seconds; 72 individual spell frames.
- `tests/danmaku-density.cjs`: complete recordings at three aim positions, rounds 1, 2, 4 and 7; bounded live pools, sustained lower-field pressure and remaining corridors.
- `tests/danmaku-score.cjs`, `danmaku-engine.cjs`, `danmaku-nonspells.cjs` and `danmaku-laser-ai.cjs`: timed phases, pressure clears, pickups, all pilots, pause, interludes and laser routes.
- Browser checks cover real audio-clock synchronization and the shared score/Flower presentation.

Exact original RNG, per-frame acceleration constants and spawn/despawn scripts remain outside this reconstruction. Music quantization, smaller coordinates, score-attack lifecycle and some fitted source paths are explicit adaptations.
