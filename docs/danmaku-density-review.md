# Canonical spell density review

Measured all 18 cards over their complete music tracks at cycles 0, 1, 3 and 6
(rounds 1, 2, 4 and 7), using three fixed aiming positions. Damage clears were
disabled. Every card has 267–471 lower-field samples per round.

`measure-danmaku-density.cjs` measures occupied space with an 8px manoeuvring
margin and a 0.25-second forecast. Its coverage is therefore **not** collision
coverage, a difficulty score, or proof of a continuously reachable route. The
updated density test separately probes real projectile and active-laser
hitboxes on three lower-field rows throughout each card.

## Results

Coverage and gap columns list rounds **1 / 2 / 4 / 7** (cycles 0 / 1 / 3 / 6).
Gap is the mean widest horizontal gap in the comfort-margin scan, in logical
pixels. Speed shows round 1 → round 7 mean lower-field projectile speed in
pixels/second. Pool peak is the maximum observed across all four rounds.

| Card | Coverage, rounds 1 / 2 / 4 / 7 | Gap, rounds 1 / 2 / 4 / 7 | Speed | Pool peak |
| --- | --- | --- | --- | --- |
| alice / france | 67.7 / 66.0 / 67.0 / 73.2% | 210.0 / 216.1 / 213.0 / 183.9 | 56.6 → 70.3 | 551 |
| alice / london | 70.6 / 69.9 / 72.8 / 74.7% | 93.1 / 96.9 / 100.6 / 97.9 | 51.6 → 64.2 | 571 |
| alice / holland | 70.0 / 68.1 / 64.2 / 58.6% | 106.2 / 109.5 / 113.8 / 126.0 | 50.8 → 63.0 | 430 |
| alice / russia | 57.5 / 55.4 / 51.9 / 46.8% | 134.8 / 135.4 / 142.3 / 157.1 | 55.9 → 69.3 | 350 |
| alice / shanghai | 69.8 / 69.3 / 72.9 / 74.3% | 96.5 / 97.5 / 93.7 / 98.4 | 43.8 → 52.8 | 586 |
| alice / tibet | 68.5 / 67.5 / 70.2 / 72.1% | 69.8 / 72.2 / 64.0 / 61.9 | 60.1 → 74.5 | 405 |
| marisa / stardust | 73.1 / 71.7 / 71.1 / 67.2% | 80.7 / 82.6 / 83.5 / 88.1 | 23.7 → 27.2 | 563 |
| marisa / milky | 82.0 / 81.3 / 80.2 / 78.3% | 69.3 / 68.1 / 67.3 / 67.5 | 46.0 → 57.0 | 362 |
| marisa / asteroid | 93.2 / 92.8 / 92.7 / 91.7% | 28.9 / 29.8 / 30.2 / 31.8 | 56.4 → 68.4 | 456 |
| marisa / nondirectional | 70.1 / 69.8 / 68.6 / 66.3% | 76.2 / 75.7 / 75.1 / 77.0 | 62.6 → 77.6 | 488 |
| marisa / master | 87.5 / 87.5 / 87.3 / 86.5% | 39.9 / 41.5 / 43.5 / 43.9 | 44.0 → 54.6 | 273 |
| marisa / finalspark | 70.5 / 71.1 / 72.5 / 73.6% | 145.6 / 144.4 / 142.4 / 141.0 | 48.0 → 59.5 | 355 |
| patchouli / agni | 66.8 / 66.2 / 71.6 / 71.3% | 83.4 / 82.7 / 71.9 / 65.2 | 45.7 → 56.5 | 310 |
| patchouli / undine | 64.5 / 64.3 / 63.9 / 62.8% | 87.3 / 84.9 / 79.7 / 74.2 | 42.7 → 51.8 | 233 |
| patchouli / trilithon | 71.5 / 71.1 / 73.6 / 77.7% | 77.9 / 77.5 / 73.8 / 61.3 | 63.0 → 77.9 | 302 |
| patchouli / sylphy | 81.0 / 80.4 / 83.8 / 86.6% | 72.4 / 73.3 / 63.8 / 55.1 | 64.7 → 79.6 | 300 |
| patchouli / flare | 67.8 / 67.3 / 65.9 / 63.9% | 131.9 / 129.3 / 122.6 / 119.7 | 51.1 → 63.3 | 462 |
| patchouli / philosopher | 84.6 / 84.3 / 83.6 / 82.8% | 43.0 / 44.1 / 48.8 / 57.6 | 70.2 → 86.2 | 419 |

The final source-layer revision passes `tests/danmaku-density.cjs` across all
72 card/round combinations. The following minima cover all eighteen cards in
each round. A physical gap is the widest clear run found across the three test
rows at a sample, then minimized over samples; it is not a guaranteed connected
escape route. Physical clear space is measured independently across those rows.

| Round | Largest projectile pool | Smallest mean comfort gap | Largest p90 comfort coverage | Smallest physical gap | Lowest physical clear space |
| --- | --- | --- | --- | --- | --- |
| 1 | 541 (france) | 28.9px (asteroid) | 96.4% (asteroid) | 52px | 25.1% |
| 2 | 513 (france) | 29.8px (asteroid) | 96.2% (asteroid) | 44px | 26.3% |
| 4 | 563 (stardust) | 30.2px (asteroid) | 96.0% (asteroid) | 44px | 25.1% |
| 7 | 586 (shanghai) | 31.8px (asteroid) | 95.2% (asteroid) | 52px | 26.9% |

No sampled round reaches the 720-projectile limit. Asteroid Belt remains the
tightest comfort scan: round 1 p90 coverage is 96.4%, with a mean largest gap of
28.9px. Master Spark also scores highly because its large beam occupies a broad
continuous area. These measurements call for visual and movement checks, not
for increasing every later card to the same occupancy.

The updated results include Non-Directional's two crossing source groups,
France's reversed white branches, Shanghai's separate doll/boss bullet layers,
and the revised wood and water layers. Undine now has exact measured values
instead of the previous approximate row. The separate full-track aiming test
also verifies that the changing music tempo does not drop laser requests at
the engine's pool cap.

After extending Sylphy's right-edge entries over the lower field and adding the
slow entrance for low spawns, Patchouli's complete track was remeasured at all
four cycles. Only the affected Sylphy row and its physical-hitbox probes were
replaced; it still meets the same density, speed, clearance and pool criteria.
Its mean comfort gap is now 72.4 / 73.3 / 63.8 / 55.1px, while its smallest
physical-gap probe is 64px. The separate stationary-target regression covers
the formerly safe lower-right corner.

The source-lifecycle revision was remeasured over complete tracks at all four
cycles. London and Tibet now expand and contract their existing doll rings;
their updated rows above include that moving source geometry. Holland and
Russia summon successive visible dolls and retire the previous generation,
without changing their packet count or measured density. Their animation
clock follows the current musical half-beat rather than dividing total spell
age by a changing beat duration.

Royal Flare now repeatedly summons three moving red cores. Each generation
lasts fourteen beats and a new generation begins every ten beats, so at most
six cores coexist. Beads travel inward from the visible cores at 1.6 times
their outward expansion speed; this produces crossing arcs instead of the
previous complete rings fired by the boss. Mean lower-field projectile count
is 230.0 / 219.7 / 201.3 / 177.1, and p90 comfort coverage is
74.5 / 73.6 / 72.6 / 71.4%. The revised pattern retains sustained pressure
with larger moving gaps. Its peak pool is 462, below the 720-projectile limit.
The all-card physical-clearance and extremum summary above remains unchanged.

## Regression rules

The test requires sustained lower-field pressure for each individual card,
visible manoeuvring gaps, no observed pool saturation, bounded mean travel speed,
and later-round speed within 1.35× its opening value. The physical-hitbox probe
checks that sampled lower-field slices are not sealed collision walls. This is
a useful coarse guard; manual movement and autoplay tests still cover reachable
paths and moving laser avoidance.

Strictly increasing average coverage across six different cards was removed.
A timed laser corridor, a packet wheel, a recursive split and an expanding ring
require different movements. Faster bullets also spend less time on screen and
can reduce average coverage while allowing less reaction time. Forcing every
card above the previous mean would replace those identities with similar walls.
