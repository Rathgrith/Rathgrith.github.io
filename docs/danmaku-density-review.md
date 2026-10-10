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

Values show round 1 → round 7. Gap is the mean widest horizontal gap in the
comfort-margin scan, in logical pixels. Speed is mean lower-field projectile
speed in pixels/second. Pool peak is the maximum observed across all four rounds.

| Card | Coverage | Gap | Speed | Pool peak |
| --- | --- | --- | --- | --- |
| alice / france | 62.4 → 73.1% | 135.9 → 117.8 | 56.6 → 70.2 | 538 |
| alice / london | 70.7 → 73.9% | 90.5 → 101.5 | 51.6 → 64.2 | 566 |
| alice / holland | 67.4 → 58.6% | 86.7 → 102.0 | 50.8 → 62.9 | 445 |
| alice / russia | 54.0 → 46.5% | 96.6 → 103.0 | 55.9 → 69.3 | 344 |
| alice / shanghai | 85.4 → 87.1% | 58.0 → 57.4 | 43.4 → 52.6 | 517 |
| alice / tibet | 67.7 → 71.6% | 68.4 → 60.5 | 60.1 → 74.5 | 401 |
| marisa / stardust | 73.1 → 67.2% | 80.7 → 88.1 | 23.7 → 27.2 | 563 |
| marisa / milky | 82.0 → 78.3% | 69.3 → 67.5 | 46.0 → 57.0 | 362 |
| marisa / asteroid | 93.2 → 91.7% | 28.9 → 31.8 | 56.4 → 68.4 | 456 |
| marisa / nondirectional | 56.0 → 52.3% | 94.3 → 98.9 | 60.8 → 75.4 | 259 |
| marisa / master | 87.5 → 86.5% | 39.9 → 43.9 | 44.0 → 54.6 | 273 |
| marisa / finalspark | 70.5 → 73.6% | 145.6 → 141.0 | 48.0 → 59.5 | 355 |
| patchouli / agni | 66.8 → 71.3% | 83.4 → 65.2 | 45.7 → 56.5 | 310 |
| patchouli / undine | ≈64 → 63% | ≈81 → 70 | ≈41 → 49 | <280 |
| patchouli / trilithon | 65.0 → 71.3% | 86.2 → 72.1 | 62.9 → 77.8 | 312 |
| patchouli / sylphy | 68.2 → 71.7% | 158.2 → 152.1 | 68.4 → 84.8 | 285 |
| patchouli / flare | 78.7 → 73.5% | 66.4 → 76.0 | 77.4 → 95.9 | 290 |
| patchouli / philosopher | 84.6 → 82.8% | 43.0 → 57.6 | 70.2 → 86.2 | 419 |

No sampled round reached the 720-projectile limit. The tightest comfort scan is
Asteroid Belt: first-round p90 coverage 96.4%, with a mean largest gap of 28.9px.
That is a reason to inspect its real paths and laser-free gaps closely, not to
make every later card exceed 96.4%. Master Spark also scores highly because its
large beam occupies a broad continuous area.

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
