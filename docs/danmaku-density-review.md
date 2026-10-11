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
| alice / london | 63.0 / 62.0 / 64.0 / 64.4% | 116.4 / 118.5 / 119.2 / 121.4 | 52.7 → 65.7 | 633 |
| alice / holland | 70.0 / 68.1 / 64.2 / 58.6% | 106.2 / 109.5 / 113.8 / 126.0 | 50.8 → 63.0 | 430 |
| alice / russia | 57.5 / 55.4 / 51.9 / 46.8% | 134.8 / 135.4 / 142.3 / 157.1 | 55.9 → 69.3 | 350 |
| alice / shanghai | 71.2 / 70.2 / 73.0 / 74.3% | 93.3 / 95.6 / 93.3 / 98.4 | 43.2 → 52.8 | 587 |
| alice / tibet | 63.4 / 62.1 / 62.9 / 64.3% | 84.1 / 90.6 / 123.9 / 149.8 | 60.1 → 74.5 | 476 |
| marisa / stardust | 73.1 / 71.7 / 71.1 / 67.2% | 80.7 / 82.6 / 83.5 / 88.1 | 23.7 → 27.2 | 563 |
| marisa / milky | 82.0 / 81.3 / 80.2 / 78.3% | 69.3 / 68.1 / 67.3 / 67.5 | 46.0 → 57.0 | 362 |
| marisa / asteroid | 93.2 / 92.8 / 92.7 / 91.7% | 28.9 / 29.8 / 30.2 / 31.8 | 56.4 → 68.4 | 456 |
| marisa / nondirectional | 70.1 / 69.8 / 68.6 / 66.3% | 76.2 / 75.7 / 75.1 / 77.0 | 62.6 → 77.6 | 488 |
| marisa / master | 87.5 / 87.5 / 87.3 / 86.5% | 39.9 / 41.5 / 43.5 / 43.9 | 44.0 → 54.6 | 273 |
| marisa / finalspark | 70.5 / 71.1 / 72.5 / 73.6% | 145.6 / 144.4 / 142.4 / 141.0 | 48.0 → 59.5 | 355 |
| patchouli / agni | 66.8 / 66.2 / 71.6 / 71.3% | 83.4 / 82.7 / 71.9 / 65.2 | 45.7 → 56.5 | 310 |
| patchouli / undine | 64.5 / 64.3 / 63.9 / 62.8% | 87.3 / 84.9 / 79.7 / 74.2 | 42.7 → 51.8 | 235 |
| patchouli / trilithon | 71.5 / 71.1 / 73.6 / 77.7% | 77.9 / 77.5 / 73.8 / 61.3 | 63.0 → 77.9 | 302 |
| patchouli / sylphy | 81.0 / 80.4 / 83.8 / 86.6% | 72.4 / 73.3 / 63.8 / 55.1 | 64.7 → 79.6 | 300 |
| patchouli / flare | 67.8 / 67.3 / 65.9 / 63.9% | 131.9 / 129.3 / 122.6 / 119.7 | 51.1 → 63.3 | 462 |
| patchouli / philosopher | 84.6 / 84.3 / 83.6 / 82.8% | 43.0 / 44.1 / 48.8 / 57.6 | 70.2 → 86.2 | 419 |

The final source-layer revision passes `tests/danmaku-density.cjs` across all
72 card/round combinations. The following comfort-scan extrema were remeasured
over all eighteen cards after the London/Tibet choreography and projectile
lifetime corrections. Physical-hitbox minima are not recomputed in this report;
the separate density regression checks its clearance thresholds on three
lower-field rows. Neither scan proves a connected escape route.

| Round | Largest projectile pool | Smallest mean comfort gap | Largest p90 comfort coverage |
| --- | --- | --- | --- |
| 1 | 544 (london) | 28.9px (asteroid) | 96.4% (asteroid) |
| 2 | 540 (london) | 29.8px (asteroid) | 96.2% (asteroid) |
| 4 | 592 (london) | 30.2px (asteroid) | 96.0% (asteroid) |
| 7 | 633 (london) | 31.8px (asteroid) | 95.2% (asteroid) |

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

The latest independent London/Tibet audit replaces the earlier shared
breathing-ring approximation. London's seven dolls gather and relocate with
Alice across the upper field; their rice circles travel straight. Tibet keeps
six dolls at a fixed radius around a stationary Alice, emitting mildly curved
scales. Both retain the observed green/blue/yellow/cyan family. Their musical
cadences and motion rates are explicitly compact-field adaptations, not
frame-exact original-game constants. London's formation follows the continuous
score clock even during an HP-clear ceasefire, avoiding a jump when firing
resumes. `tests/danmaku-alice-choreography.cjs` verifies these differences,
visible projectile origins, and continuity through a real HP clear.

Shanghai's slow ribbons now remain until they leave the field or an explicit
game event cancels them, rather than disappearing at a twelve-second age limit.
Its corrected peak is 587; Undine's peak also changes from 233 to 235 without
changing its lower-field measurements. The lifetime regression checks focus
switches, long-lived ribbons, recursive splitting and the existing clear events.

All eighteen cards were remeasured over complete tracks at cycles 0, 1, 3 and 6
after these changes. Holland and Russia still summon successive visible dolls
and retire the previous generation, without changing their packet count or
measured density. Their animation clock follows the current musical half-beat
rather than dividing total spell age by a changing beat duration. The emitter
lifecycle regression retains real changing-tempo coverage across all four
rounds. Source-hashed machine reports for this run are saved locally as
`../tmp/canonical-spells-source-audit/choreography-density-cycle-*.json`.

Royal Flare now repeatedly summons three moving red cores. Each generation
lasts fourteen beats and a new generation begins every ten beats, so at most
six cores coexist. Beads travel inward from the visible cores at 1.6 times
their outward expansion speed; this produces crossing arcs instead of the
previous complete rings fired by the boss. Mean lower-field projectile count
is 230.0 / 219.7 / 201.3 / 177.1, and p90 comfort coverage is
74.5 / 73.6 / 72.6 / 71.4%. The revised pattern retains sustained pressure
with larger moving gaps. Its peak pool is 462, below the 720-projectile limit.

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
