# Patchouli: source inspection and reconstruction

The six spell IDs retain the original **EoSD Normal base-name versions** (Agni Shine, Princess Undine, Sylphy Horn, Lazy Trilithon) and the **Extra** versions (Royal Flare, Philosopher's Stone). They deliberately do not borrow the Hard/Lunatic upgrade attacks under the base names. Timing and counts are rescaled for the site's 240×360 field and music clock; these are visual/mechanical reconstructions, not recovered ECL scripts or frame-identical ports.

## Primary visual references inspected

[Weekly Spell card Showcase: Patchouli Knowledge — Kdog](https://www.youtube.com/watch?v=Do4j4z-fnvI)

| Card                | Playback samples inspected | Observable structure implemented                                                                                                                                                                                                                                   |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agni Shine          | 0:25, 0:30                 | Fire leaves the boss in irregular curved circles, with two speeds crossing through one another. All flames are red. Removed the invented pair of flank emitters and aimed fan.                                                                                     |
| Princess Undine     | 0:40, 0:45–0:50            | Opening three thin aimed lasers coexist with small blue radial waves above the boss. The later attack is repeated lines of larger bright blue orbs mixed with a slower triple stream. Added an explicit opening / water-stream / pause cycle.                      |
| Sylphy Horn         | 1:00, 1:05, 1:10           | Pale green rice appears around the boss and along the right boundary. Two down-left directions cross at different slopes. Removed symmetric left/right fans and triangular scales.                                                                                 |
| Lazy Trilithon      | 1:15, 1:20, 1:25           | Small yellow round rocks spread, lose speed, pause, then choose a fresh direction. Replaced the invented three columns of paper bullets that changed at a common horizontal line.                                                                                  |
| Royal Flare         | 6:29, 6:34, 6:39           | Red round beads form offset expanding loops whose intersections make narrow seams around large open lobes. The first field and later overlaps differ without aiming at the player. Reconstructed the loop geometry instead of equal-speed concentric circles.      |
| Philosopher's Stone | 6:49, 6:54                 | Five stationary spell sources deploy around the boss in a broad bank: blue far left, yellow left, red low centre, green right, pale metal far right. All elements use rice bullets. Their independent patterns overlap, rather than one element replacing another. |

[ZPS EoSD Extra Reimu B recording](https://www.youtube.com/watch?v=PNU2EpXtjis) was also inspected at 1:57 (Royal Flare), 2:02 (clear / transition), and 2:07 (five-colour rice field). This is an independent visual cross-check. The previously noted 1:28 timestamp is too early for these Extra cards in this recording.

The Bilibili all-card collection BV1MSWwzcEmN was found but failed playback; it is **not** counted as inspected visual evidence.

## Mechanics cross-checks and implementation limits

The [Stage 4 strategy descriptions](https://wikiwiki.jp/thk/紅/4) corroborate bent fire trajectories, down-left wind pressure and delayed earth redirection. The [Extra descriptions](https://wikiwiki.jp/thk/紅/EX) distinguish the five rice behaviours: fast aimed blue; yellow random redirection; red double radial waves; green redirection toward lower left; pale metal translating an intact formation toward the player.

The footage establishes the shapes and sources; it does not expose exact ECL frame timings, original random seeds, acceleration constants or hitbox sizes. Those values are calibrated for this game's smaller field. Royal Flare's offset loops use a translated velocity-circle construction; this reproduces the observed loop-and-pocket structure but is not a claim about ZUN's original algorithm. Stone motion decelerates continuously, pauses, then redirects. Deterministic pseudo-random samples keep repeated test runs reproducible without making every wave identical.

The time-attack boss, durability clears and music-driven spell boundaries remain site-specific. A spell begins its internal sequence at tick zero. Later challenge rounds add only a few projectiles to existing formations and increase the shared speed, keeping the original shapes readable.

## Royal Flare production-renderer check

The two full 28-point loops are emitted every four half-beat ticks. The moving centre travels faster than the ring expands, keeping the lower-field loops legible instead of spreading their beads into an indistinct cloud. Existing round orb sprites replace the tiny square pellet sprite for these red beads. Both changes were checked against the production renderer at 4, 8, 14 and 22 seconds of the actual DBU-scored spell phrase, in challenge rounds 1 and 7. The mature field shows several offset loops and their intersections, with visible pockets between them. Peak active bullet counts over those samples were 290 and 274 respectively, below the 720-object pool; the later round moves faster rather than accumulating a larger backlog. No browser errors occurred.
