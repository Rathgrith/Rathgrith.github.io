# Alice: PCB source-layer audit

This is a compact reconstruction for the 240 × 360 music-driven time-attack
field. It is not an extraction of PCB scripts or a frame-exact replay. The
second audit below supersedes the earlier document's claims that Dutch Dolls
orbit Alice, Russia consists only of two side trains, and Shanghai has eight
dolls. Those claims came from reading crowded snapshots too loosely.

## Evidence and difficulty boundaries

The following original-game footage was viewed in the browser, following the
colour changes and emitter positions across successive states:

- [MrAmbil: Alice Normal perfect battle](https://www.youtube.com/watch?v=xR7brbFgmr0):
  French Dolls at 0:43 and the following split cycles; Dutch Dolls from
  1:18–1:32; London from 2:20–2:38; Shanghai from 3:09–3:15. The video identifies
  Normal and Marisa B in its description. Its low resolution limits exact
  per-packet counting, but the source arrangements and colours are visible.
- [Ythundyth: Alice Lunatic perfect battle](https://www.youtube.com/watch?v=LYAEp0bMf1Q&t=58s):
  Russia at 0:59–1:03 shows dolls across the upper field **and** down a flank.
  This supports the missing source layer, not copying Lunatic packet density
  into the project's Hard-based Russia. Lunatic Orléans is not French Dolls.
- [Niko6454: Reincarnated Tibetan Dolls](https://www.youtube.com/watch?v=1AKIPqRIFHw):
  Hard card title, opening 0:04, green/blue 0:08, yellow 0:12, and the next
  green/blue cycle 0:18. Six distinct doll centres make the rings; a separate
  boss-origin attack was not observed.
- [PCB stage-three strategy notes](https://wikiwiki.jp/thk/%E5%A6%96/3)
  cross-check the difficulty variants, 49 descendants for French Dolls,
  right-facing Dutch/Russian packet wheels, and the London/Tibet distinction.
  The aimed yellow/cyan guidance is inside the **Lunatic Kyoto** subsection;
  the initial-circle bait advice is adjacent to **Lunatic Hourai**. Neither
  sentence proves that the corresponding Normal/Hard card uses that aiming.
- [Alice spell descriptions](https://thecodex.wiki/Touhou_Project/Alice_Margatroid)
  were used as a secondary cross-check: Normal Shanghai lists four dolls,
  nine bubbles, three trail layers and alternating two/four boss scale layers.
  They are not treated as independent proof of aiming or precise motion.

## One-by-one source and aiming audit

| Existing ID / baseline | Sources and layers now represented                                                                                                                                                                                                            | Aiming decision                                                                                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `france` / Normal      | Six circular dolls launch blue seeds. Each splits to a short **white inward arc**, then to red scale clusters; 7 × 7 descendants remain.                                                                                                      | No new player aim. Three fixed phase variants repeat. `split.angleOffset` expresses the inward turn rather than another complete seven-way seed ring.                                                                                                                                                                   |
| `holland` / Normal     | Six staggered upper-row dolls successively fire seven-spoke rice packets. Cyan/lilac alternate by complete cast. The old continuous orbit was removed.                                                                                        | Each packet wheel remains right-facing. No boss aimed shot was visible in the inspected cast.                                                                                                                                                                                                                           |
| `russia` / Hard-based  | The upper row remains, with a three-doll flank added. Red/blue formations alternate sides. Each doll uses a fixed six-spoke packet wheel.                                                                                                     | No new aim. The missing layer was a row of emitters, not a boss fan. The flank count and timing are compact-field choices; the reference for this layer is Lunatic.                                                                                                                                                     |
| `london` / Normal      | Seven moving dolls, **green → blue → yellow → cyan** rice circles. The old version omitted green.                                                                                                                                             | The late rings retain a shared fixed phase. Kyoto's documented aiming has not been assigned to London without proof. No independent boss stream was observed.                                                                                                                                                           |
| `tibet` / Hard         | Six dolls, green/blue/yellow/cyan curved scale circles. Existing source count and colours were retained.                                                                                                                                      | No extra aimed layer was verified, so no speculative fan was added. Exact late-circle targeting remains uncertain.                                                                                                                                                                                                      |
| `shanghai` / Normal    | **Four dolls** make three-layer yellow/ochre scale ribbons. Alice separately casts alternating **two/four blue scale rings** and **nine purple bubbles**. Doll ribbons briefly curl before travelling out; bubbles have a mild initial curve. | Existing ribbon drift keeps a single player-position snapshot at local tick 0 of each 16-half-beat cycle; both casts reuse it. This is an explicit local adaptation, not a claim that PCB samples at that time. Blue rings/bubbles remain fixed-phase: the inspected footage did not establish their player dependence. |

## Adaptation limits

Upper-row heights are deterministically staggered rather than using the original
spawn RNG. Row/flank formations change once per full cast; source sprites and
projectile origins share the same formation. Dolls are not destructible in this
time-attack mode. Source count reductions, radii, speeds and musical timing are
local choices. France's short white fan and Shanghai's short curl preserve the
observed intermediate shapes but are not exact original trajectories.

In particular, Shanghai's multi-turn source motion and the precise targeting of
late London/Tibet rings still need stronger evidence before they can be called
faithful reproductions. A stationary-player recording alone cannot distinguish
a fixed-angle ring from an aimed ring with a gap on the player axis. No new
claim of universal odd-way aim or even-way avoidance is made by this change.

## Checks after the source-layer changes

The production density harness was run for complete Alice music rounds at
cycles 0, 1, 3 and 6, with the player fixed at each of x=60/120/180. Damage clears
were disabled. Maximum pool occupancy per card across those rounds:

| France | London | Holland | Russia | Shanghai | Tibet |
| -----: | -----: | ------: | -----: | -------: | ----: |
|    551 |    566 |     430 |    350 |      586 |   401 |

All remain below the 720 pool cap. Mean lower-field forecast coverage ranged
from 0.468 to 0.743; the harness retained open horizontal intervals. This is a
pressure/overflow check, not proof that every human route is reachable. An early
Shanghai draft reached the pool cap; reducing grains within each of its three
ribbon layers fixed that without removing any source family.

Recursive splits remain attached to the parent bullet: clearing that parent
cancels all future descendants. Later cycles adjust speed and limited ring
counts without replacing the card's sources with a generic aimed spread.
