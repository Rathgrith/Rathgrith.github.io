# Nonspell difficulty tuning — 2026-10-11

Only the `enemySpell.nonspell` branch was tuned. Named spells, shared difficulty scaling, collision radii, and laser warning durations are unchanged. Existing one-time aiming remains one-time aiming; no continuous homing was added.

## Measurement

`tests/danmaku-nonspells.cjs` plays each complete recording at cycles 0 and 6, with stationary invulnerable players at x=60, 120 and 180 (y=312), no bombs, and no damage clears. The lower field is x=0–240, y=155–350. Samples every 0.2 seconds include the entire nonspell interval and its normal start-up wait. Before values were captured before tuning. Final values were rerun against the full current engine.

“Coverage” includes a 10.2px margin around enemy bullet radii and a 0.2s travel forecast; it measures movement pressure, not collision area. Actual hitboxes are checked independently at y=216/264/312. The reported minimum gap is the smallest, across all samples, of the widest available horizontal opening on those three rows; it is not a proof that every possible player trajectory is safe.

## Per-pattern comparison

Each cell gives cycle **0 / 6**. Population is the mean number of live bullets in the lower field. Peak is the larger whole-arena bullet count across both cycles and all three aim positions.

| Nonspell after card | Lower population before → after (0 / 6) | Population increase | Coverage increase | Peak | Minimum sampled actual gap | Change                                                                                                   |
| ------------------- | --------------------------------------- | ------------------- | ----------------- | ---: | -------------------------: | -------------------------------------------------------------------------------------------------------- |
| france              | 13.7 → 16.5 / 19.9 → 23.9               | +20% / +20%         | +10% / +12%       |  121 |                       84px | Alternating paired kunai fans; an off-beat response comes from the other pair.                           |
| london              | 6.9 → 8.6 / 8.9 → 10.6                  | +24% / +19%         | +24% / +19%       |  107 |                      160px | Roaming butterfly rings keep their cadence, with three more spokes.                                      |
| holland             | 7.0 → 9.3 / 8.7 → 10.8                  | +34% / +25%         | +28% / +28%       |  112 |                      228px | Three rotating petals keep their timing, with four grains per petal instead of three.                    |
| russia              | 27.2 → 36.7 / 33.0 → 42.8               | +35% / +30%         | +21% / +22%       |  155 |                       68px | Six-column formation keeps its missing column; one extra curtain arrives between regular volleys.        |
| shanghai            | 8.0 → 10.8 / 9.3 → 13.4                 | +35% / +44%         | +23% / +25%       |   59 |                       96px | Doll laser cadence stays unchanged; stronger amulet volleys gain an off-beat reply.                      |
| tibet               | 22.3 → 30.8 / 25.3 → 34.2               | +38% / +35%         | +23% / +15%       |  117 |                      116px | Alternating curved butterfly fans gain grains; restrained spread keeps those shots in the arena.         |
| stardust            | 9.1 → 12.2 / 12.4 → 15.7                | +34% / +27%         | +37% / +37%       |  100 |                      116px | Three star arms keep their oscillation, with a fourth grain per arm.                                     |
| milky               | 8.5 → 11.0 / 12.2 → 14.7                | +29% / +20%         | +25% / +19%       |   94 |                      152px | Both crossing streams and the separate quick aimed star burst gain one grain.                            |
| asteroid            | 4.7 → 6.2 / 6.2 → 8.0                   | +30% / +30%         | +29% / +29%       |   93 |                      180px | Offset alternating star rings gain a smaller intervening echo ring.                                      |
| nondirectional      | 3.4 → 4.6 / 4.2 → 5.5                   | +35% / +31%         | +21% / +18%       |   68 |                      132px | Paired charged lasers retain timing; the intervening star ring gains six spokes.                         |
| master              | 18.7 → 23.5 / 22.5 → 27.4               | +26% / +22%         | +17% / +11%       |   98 |                      108px | Aimed large stars and alternating small-star side fans both gain grains.                                 |
| finalspark          | 39.6 → 52.0 / 49.4 → 58.8               | +32% / +19%         | +11% / +4%        |  215 |                       52px | Mirrored curved streams use restrained spread, 6% faster travel, and occasional central small stars.     |
| agni                | 9.1 → 11.0 / 10.7 → 14.1                | +22% / +31%         | +16% / +21%       |   75 |                      148px | Three alternating flame origins gain an off-beat burst and a stronger accented volley.                   |
| undine              | 9.5 → 11.7 / 11.2 → 14.1                | +24% / +26%         | +26% / +19%       |  117 |                      132px | Alternating water rings gain three spokes; the separate rice burst gains one grain.                      |
| trilithon           | 14.4 → 17.3 / 13.7 → 16.6               | +20% / +21%         | +20% / +20%       |   81 |                      108px | The missing-column route remains; alternating two/three-row stone groups have more longitudinal spacing. |
| sylphy              | 21.3 → 28.0 / 26.2 → 33.3               | +32% / +27%         | +20% / +13%       |  103 |                      108px | Alternating left/right curling leaf fans gain two grains.                                                |
| flare               | 8.3 → 10.8 / 9.3 → 11.7                 | +31% / +26%         | +30% / +23%       |  105 |                      204px | Moving-gap flame rings gain six spokes without closing their designated gap.                             |
| philosopher         | 6.2 → 7.8 / 6.7 → 8.4                   | +26% / +25%         | +24% / +23%       |   46 |                      188px | The five-element cycle gains a response from another element, with a small directional offset.           |

Across the eighteen patterns, mean per-pattern lower-field population rises **29.1% / 26.5%**, and forecast coverage rises **22.6% / 19.9%**. Peak occupancy is **215/720**, and the lowest sampled actual clear fraction is **68.4%**.

The gains are deliberately not identical. Shanghai starts with few amulets and also pressures through separately timed lasers, so its late-round bullet population rises more than its coverage. Final Spark was already the densest interlude; tighter streams and the 6% speed increase increase demands without expanding its already broad hazard area into a wall. Its late-round comfort-coverage p90 is 96.7%, while actual collision gaps remain available.

## Iteration and validation

An initial count increase sent too many extra Tibet/Final Spark grains sideways before they reached the lower field. Their fan spreads were reduced; the original curved directions remain. The first Asteroid echo was too strong, so only the echo ring uses fewer spokes. Philosopher’s echo switches to another elemental origin to avoid merely stacking the same trajectory.

The regression measures all eighteen interludes in both cycles and asserts distinct emission signatures, full playable durations, finite trajectories, warning times of at least 0.8 seconds, increased lower-field population, whole-arena peak below 360, and separately sampled actual collision gaps. The baseline floor intentionally allows geometry-specific variation rather than requiring a fixed percentage of area coverage.

Passed: `tests/danmaku-nonspells.cjs`, `tests/danmaku-engine.cjs`, and `tests/danmaku-score.cjs`.
