# Companion score attack

Open **弾幕に挑戦** in the Live2D window. Choose a pilot, then click one of the three opponent buttons to enter that character's battle. All nine pilot/opponent combinations are available, including mirror matches. **会話へ** restores the existing conversation. The game has its own pixel sprites, so it also runs when the remote Live2D model/CDN is unavailable.

| Character | Pilot variant | Opponent pattern |
| --- | --- | --- |
| Alice | Rear-view flight with a doll spread; dolls tighten when focused | France → London → Holland → Russia → Shanghai → Tibet |
| Marisa | Rear-view broom flight and concentrated parallel light shots | Stardust Reverie → Milky Way → Asteroid Belt → Non-Directional Laser → Master Spark → Final Spark |
| Patchouli | Rear-view floating flight, straight elemental crystals and weaker/slower seeking subshots | Agni Shine → Princess Undine → Lazy Trilithon → Sylphy Horn → Royal Flare → Philosopher’s Stone |

## Rules and controls

- The opponent cannot be defeated by damage. Each spell lasts until its scheduled music/time boundary. Its repeatable durability bar clears bullets when emptied, refills over 1.1 seconds, then becomes available again; the card, countdown and clean-survival eligibility continue. The thin gold time bar and TIME counter are separate from durability. A completed timed spell enters a gentler nonspell until the next phrase; the battle continues indefinitely.
- Each challenge opens with a 2.6-second enemy fly-in, name and Japanese portrait dialogue, followed by 1.5 seconds of preparation. No scoring, firing, supply drops or battle music advance during entry. Pausing preserves the entry position and remaining countdown; retry plays it again.
- At the exact end of each recording, the field clears, score items finish collecting and the boss stays on the field. After 1.8 seconds, the boss’s portrait dialogue asks whether to continue and shows round/total score. Eight idle seconds confirm another round; pointer/key interaction in the panel resets that countdown. Pause/background/minimize freeze it. The next round replays the chosen opponent’s music with cumulative score, power, lives, Bombs and difficulty, beginning with a 1.5-second ready countdown. Native audio looping is disabled.
- Automatic fire; arrows or WASD move, Shift slows movement, X uses a spirit strike (霊撃), and P/Escape pauses. Browser modifier shortcuts are not captured. A touch/mouse drag moves relative to the initial contact without teleporting the player. The on-screen low-speed button toggles precision movement.
- Three lives and two spirit strikes per run. The central 2.2px-radius point is the player's collision box, not the full sprite. A hit grants 2.5 seconds of recovery protection and clears nearby bullets. A spirit strike clears the field (including new bullets for its first 0.65 seconds), grants the same protection, and displays a 1.6-second character-specific effect: Alice's doll-and-thread circle, Marisa's star-lined magic cannon, or Patchouli's five-element sigils. Another charge cannot be spent while this effect is active. Resume includes a one-second countdown.
- Random supply drops begin after 3–5 seconds, then repeat every 4.2–7 seconds: red **P** raises firepower (60%), blue **B** replenishes one spirit strike (28%), and a pink **heart** adds a life (12%). Items drift down, attract within 36px, and collect within 10px. Firepower caps at 8; lives and strikes cap at 5. Every two levels add a child unit, up to four; focused movement tightens their formation. Alice uses spreading needles/dolls, Marisa uses straight beams/missiles, and Patchouli mixes straight crystals with low-damage seeking elements fired at half the main volley rate. The seeking contribution cannot replace lining up the main shots. A hit costs one power level, to a minimum of 1. Capped pickups award bonus points. The B pickup does not clear bullets, create score items or grant protection. Offscreen/expired drops are removed; at most 12 exist at once.
- **自動操作** in the lobby, **自動** in battle, or **T** toggles the pilot. It predicts nearby bullet trajectories, chooses between normal/precision movement, collects safe nearby items and uses spirit strikes when boxed in. It uses the same speed, resource and collision rules as manual play. Movement keys or a pointer drag immediately return control to the player. It pauses for the same lifecycle events as manual play and never silently resumes.
- Survival awards 20 points/second, each hit awards 12 × its shot weight, and each grazed bullet awards 80 points once. Cancelled bullets become small score items: 10 points each for a durability clear or spell transition and 2 for a spirit strike. They drift briefly, then home to the pilot; the points arrive on collection. Completing a timed spell without a miss or Bomb awards 5,000 points; otherwise it awards 1,000. Durability clears do not end the card or award this completion bonus. A calm musical passage uses the same clean-survival rule. Graze radius is 16 logical pixels (formerly 12), while the central hitbox stays 2.2 pixels. Scores are rounded down for display and records.
- Bullet art includes rice, kunai, scales, paper talismans, butterflies, water bubbles, flames, pellets, crystals and three star sizes. Shapes are assigned per spell/element, with bright centres and dark outlines; their hit radii follow the small visible core. Repeated shapes/colours are cached as local Canvas sprites.
- Patterns follow an offline beat map of each actual dBu recording. Each recording has six encounters, whose boundaries follow sixteen-beat musical phrases; it never resets to the introductory card midway through the song. Volleys retain whole-beat, half-beat and syncopated timing. Sustained quieter bars after 60% of an encounter can open a nonspell early; otherwise its last 24 beats allow a timed clear and an actual playable nonspell. Announcements last 2 seconds with a 0.15-second safety gap. Clears reserve four beats for collection before nonspell firing. Each character has six distinct interludes, with Japanese names and different emitters, trajectories, shapes and rhythms; small nonspell lasers retain warnings. Density and speed progress across the six cards, with bounded repeat-round growth up to the seventh round. Ceilings remain 720 bullets, 12 lasers and 720 score items; excess cancellation value is aggregated without losing points.
- Lasers show a harmless charge line for at least 0.8 seconds before becoming dangerous. Master Spark locks its aim during the charge, and the boss holds position while anchored beams are present. Spark beams widen along their path with identical warning/render/collision geometry. Active Sparks shake the arena by roughly 1–2 logical pixels; Bombs kick by at most 3.2 pixels with seven 0.18-second damage/impact pulses. The time bar, cut-ins and text do not shake; reduced motion disables camera shake. Neither event freezes the music or combat clock. The auto pilot samples its entire reachable route at intervals no longer than 16ms, including ignition, expiry, beam sweeps and orbiting emitters. Score attack looks 1.65s ahead; the two-field game looks 0.95s ahead and recomputes every 60ms while lasers exist. An imminent collision outweighs a possible distant collision. Rendering, collision and avoidance share `laserPose`/`laserGap`.
- Three detailed pixel backgrounds depict Alice’s workshop, Marisa’s Forest of Magic and Patchouli’s library. Feathered overlapping artwork, subdued edge lighting and a faster particle layer provide scrolling depth. Background movement now starts at 88–110 logical pixels/second by character and smoothly responds to recording energy, beats, elapsed combat time and active pressure, capped at 270px/s. This is roughly 3–4× the previous pace, with a combat field passing in about 2–3 seconds. Light runs at 0.45× scene speed; foreground edge streaks run at 1.7× and 2.5×, lengthening with velocity while the central bullet corridor stays clear. Both renderers feather repeated artwork to avoid hard scrolling seams. Declarations ease the pace; intermissions coast to rest without resetting the offset. This uses the silent beat map even with music muted and applies to both score attack and CPU duel. Pausing and the resume countdown freeze scenery, spell age, drops and score collection; reduced motion freezes decorative scrolling and sprite flutter. [Artwork prompts and generator](../assets/images/classic/danmaku/backgrounds/artwork.json).
- Rear-view player atlases have idle plus eight movement directions, each with two cloth/banking frames. Keyboard, relative pointer input and auto movement all select the pose from actual motion, including clamping at the arena boundary. Enemy/front portraits are separate. Head, sleeves, hem, legs and broom use separate integer-grid pose placements rather than a scanline distortion of the whole sprite.
- Records are stored locally for each pilot/opponent pair in `site-danmaku-records-v3`, separate from the previous scoring rules (old records are retained but not mixed). Manual keys use `pilot:opponent`; automatic runs use a separate `:auto` suffix. Once auto has been used, the rest of that run remains in the automatic category even after manual takeover. Game over, leaving the battle and page hide retain the best score. Failed/blocked storage uses session memory; there is no server leaderboard or score verification. Each live run receives a fresh random seed; explicit engine seeds reproduce drops in tests.
- Minimizing/closing the companion, tab hiding, losing window focus, leaving the game with keyboard focus, scrolling the canvas mostly out of view, resizing, title-bar dragging and soft navigation pause the run. None silently resume it. Returning to the conversation stops the game loop and resumes the Live2D renderer and typewriter.

## Battle audio

The mixer beneath the battle title has independent **BGM：切 / SE：切** buttons
and a shared volume fader. Embedded windows start with both switches off. The
standalone `/playground/` page starts with both enabled, as requested, but unlocks
audio only on a real user interaction; the browser autoplay policy is respected.
The conversation radio stays stopped on page entry and requires explicit playback; ordinary page gestures do not start it. Neither battle mixer setting is persisted. Enabling a switch in the lobby arms it for the next
challenge. Radio playback yields before battle starts and resumes only if still
enabled on return; choosing battle as the first interaction does not load radio audio. Background music follows the opponent, independently
of the chosen pilot and the conversation player. The musical-note link credits
the current arrangement; the three user-supplied dBu arrangements are used. [Recording provenance, titles and beat analysis](../assets/music/danmaku/README.md). Playback seeks to the simulation clock on late enable/retry and holds during pause/countdown; small drift is corrected gradually, while larger drift and a continued round seek back into alignment. Silent play uses the same timeline without fetching any audio.

Real engine events trigger seven staccato Bomb-hit pulses, three pilot volley sounds, enemy hits, graze,
power/life/Bomb-stock pickups, damage, three spirit strikes and countdown completion.
Existing effects come from the licensed **Taisei Project** fan game. New spell declarations, laser charge/fire, break/capture and collection cues are locally synthesized arcade sounds. Neither set is extracted official Touhou audio. [Source mapping and license](../assets/audio/danmaku/CREDITS.md).
The optional sound callback cannot change simulation results or stop gameplay
when the audio device fails. Per-cue throttling, 12-voice polyphony and a
compressor bound dense bursts. Muted/loading sounds are discarded, never queued
for later playback. Decode/request failure offers a retry without disabling play.

Pausing, hiding/minimizing, navigation and closing stop battle music and voices;
resuming is explicit. On the final life, the damage cue may finish naturally
while BGM stops. Retrying resets the track and clears old effect tails. Returning
to dialogue stops battle audio before its independently enabled player resumes.
The audio instance and decoded soundbank survive soft navigation without new
contexts or duplicate listeners; a full reload restores the defaults for the current page shell.

## Implementation

- `assets/js/games/danmaku-score.js`: recording-derived beat/energy data and pure timeline lookup. `danmaku-patterns.js`: eighteen card motifs, emitter geometry, deterministic split/release/redirect trajectories and nonspell patterns. [Original references and adaptation decisions](danmaku-spells.md).
- `assets/js/games/danmaku-engine.js`: deterministic fixed-coordinate simulation, input, shot types, patterns, collisions and scoring. No DOM or renderer dependency; exported for Node tests.
- `assets/js/games/danmaku-renderer.js`: bounded Canvas 2D rendering at 480 × 720 over a 240 × 360 logical arena, cached local pixel sprites, low-contrast scrolling scenery, character-specific spell effects and readable bullet shapes. Reduced-motion preference disables decorative particles/background motion; essential gameplay movement remains.
- `assets/js/games/danmaku-audio.js`: lazy battle BGM and Web Audio soundbank, independent opt-in switches, local sample mixing, failure/retry and lifecycle.
- `assets/js/games/companion-danmaku.js`: lobby/battle/result screens, 60Hz fixed-step animation, relative pointer controls, lifecycle, records and accessibility status announcements. Only the active game owns an animation frame. Pauses discard accumulated elapsed time.
- `assets/css/classic-danmaku.css`: UI styles isolated inside the existing companion. The field keeps its 2:3 ratio, fits short windows and does not change the site's columns or global palette.
- `assets/images/classic/danmaku/portraits/*-expressions.png`: generated transparent 2×2 bust atlases (neutral, casting, victory, hurt). Enemy entry uses neutral, declarations/Bombs use casting, clean timed results use victory, and misses use hurt. They are rendered only in event cut-ins, not as oversized boss sprites. [Exact prompts and built-in generator mode](../assets/images/classic/danmaku/portraits/artwork.json).
- `assets/js/games/danmaku-boss-sprites.js`: shared atlas loading, 48px runtime cells, four idle and four casting frames, frame selection and staggered child-unit deployment. The three generated source sheets live in `assets/images/classic/danmaku/bosses/`; each is sampled once onto the small runtime atlas, then drawn with nearest-neighbour scaling. The visible body is approximately 30×34 logical pixels. Alice deploys dolls, Marisa magic cores, and Patchouli elemental crystals. Deployment completes before the first dangerous volley. Both battle modes use these sprites; reduced motion keeps a stable pose and immediate deployment. [Generation mode and exact prompts](../assets/images/classic/danmaku/bosses/artwork.json).
- `assets/images/classic/danmaku/*-flight.svg`: player atlases with nine columns and two rows. Rebuild with `python3 scripts/build-danmaku-flight-sprites.py`. The unused front-view boss prototypes have been removed; the small character glyphs remain as loading fallbacks and child units.

The dialogue controller exposes a small game-active state, and the loader stops its own renderer while the game view is open. Story text, expressions, affinity and selection remain separate from arcade state. The mounted view survives the site's soft navigation without duplicate canvases or listeners.

## Verification

Difficulty is calibrated from the simulated lower arena, not card names or the number of bullets near the boss. `scripts/measure-danmaku-density.cjs` runs full recordings at three fixed aim positions, holding durability high so a pressure clear cannot conceal an over-dense pattern. It samples live bullets, laser coverage, bullet speed and open horizontal gaps. Its coverage grid includes the pilot hitbox, an 8px manoeuvring margin and a 0.25-second trajectory forecast; these percentages are a comparison metric, not the literal fraction of lethal pixels. Manual movement, grazing, Bombs and earned durability clears still affect practical difficulty.

Generate the current coverage figures with the measurement script rather than maintaining a second copy of tuning numbers here. Actual speed and formations differ by card; coverage includes lasers, so a laser card need not contain more individual bullets. `node tests/danmaku-density.cjs` checks the full simulated progression in rounds 1, 2, 4 and 7, plus entity ceilings. These tunes restore pressure after the earlier overly sparse opening, while slowing repeat-round acceleration so faster bullets do not simply leave the arena too quickly.

`node tests/danmaku-nonspells.cjs` checks all eighteen distinct emission signatures and the actual complete-recording transitions: every card gets a playable interlude, a Japanese name, bounded hazards and safe laser charge time. `node tests/danmaku-round-browser.cjs` checks the boss's continuation dialogue at desktop, narrow portrait and short landscape widths, with manual/idle continuation, retained score/power and no boss exit/re-entry.

`node tests/danmaku-engine.cjs` checks all nine matchups for two simulated minutes, increasing density, bounded entities, power-dependent hits, seeded drop variation, all pickup effects/caps/expiry, automatic avoidance/collection/emergency strike, takeover, recovery protection and paused/countdown state.

`node tests/danmaku-browser.cjs` checks canvas output and keyboard/touch input, all three opponents, pickup HUD updates, automatic/manual switching, separate record persistence, score/results/retry, saved pair records/reload, conversation/render pause and resume, minimize and soft navigation, seven widths (320–1920px), short landscape, and blocked model CDN/storage. It captures test-only engine/renderer references through intercepted script responses; production code exposes no testing backdoor.

`node tests/danmaku-presentation.cjs` compares actual rendered pixels for all three scenes, wrap-boundary continuity, substantial X effects and reduced-motion behavior. `node tests/loading-browser.cjs` checks the shared homepage/companion prayer loaders, bounded waits, delayed assets, mobile sizing, keyboard dismissal, reduced motion, no JavaScript and the CSS fail-safe.

`node tests/danmaku-audio.cjs` checks real music playback and nonzero Web Audio
output, actual event cues, independent switches, three pilots/opponents, volume,
pause/minimize/hidden/final-hit tails, conversation handoff, reload defaults and
five layouts. `node tests/danmaku-audio-resilience.cjs` covers mobile decoding,
independent failed-media retries, blocked storage, muting during decoding and
browsers without Web Audio. Tests instrument genuine browser audio nodes.

## Flower duel

The arcade lobby also offers **花映塚式対戦**, a separate two-field CPU duel.
The existing three witches and artwork are reused in a compact adaptation;
Alice and Patchouli are custom participants, not claims about the original
Flower View roster. Rules were checked against the publisher's
[official Flower View manual on Steam](https://store.steampowered.com/app/1420810/?l=japanese).

- Both pilots start each round with five health and two of four meter segments.
  First to two round wins wins the match. Damage is one health with 2.5 seconds
  of recovery. A four-minute round uses remaining health; ties replay without
  awarding a win. Scores accumulate across rounds. The next-round dialogue
  allows manual continuation or auto-confirms after eight idle seconds.
- Fairy squads arrive in different lanes. Killing a fairy detonates nearby
  fairies, cancels white bullets and sends return bullets to the opponent.
  Repeated returns become hard coloured bullets; these resist small explosions.
  Spirits are tougher until activated by the low-speed absorption field.
  Chain kills send spirits and character-specific EX attacks.
- Shooting is automatic. Hold/release **Z** or the **溜め** button to charge:
  C1 fires a free local attack; C2/C3 clear nearby hazards and send a card;
  C4 clears the field and sends a shootable boss phantom. Levels 2/3/4 require
  2/3/4 meter segments and spend 1/2/3. **X**, **B** or **ボム** immediately
  casts the available highest level and consumes all meter. No card is available
  below two segments. Sending a boss reverses an incoming boss, with at most
  one boss phantom active/pending across both fields.
- Alice sends doll crossfire; Marisa sends stars and warned vertical lasers;
  Patchouli sends five-element fans. White returns and card attacks have a
  visible incoming delay. Bosses enter before firing and expire or can be shot
  down. Cancellation particles collect toward their own pilot.
- Both AI pilots use the same shooting, meter and collision simulation as a
  human. Decisions occur every 160–220ms and use short trajectory forecasts;
  they aim at minions, activate spirits, bank for C2/C3/C4 or quick-cast in danger.
  They receive no artificial damage, invulnerability or free bombs. **T** enables
  automatic self-play; movement, dragging or manual charge takes control back.
  Assisted records are permanently tagged for that match and stored separately
  from manual scores and the original score-attack mode.
- Wide windows show equal fields. Narrow windows keep the player field larger
  and the CPU field in a live side preview. On short landscape screens, duplicate
  HUD rows give way to the combat field. Only the left field accepts drag input.
  Pause, minimization, hidden tabs, leaving the arcade and lost focus stop play
  and audio. Charge is cancelled safely on these paths. Music and effects reuse
  the opt-in mixer and start disabled on page load.

Simulation: `assets/js/games/danmaku-flower.js`; split-field renderer:
`assets/js/games/danmaku-flower-renderer.js`. The existing arcade controller
owns both modes' input, lifecycle, score storage and audio so mode changes do
not add another animation loop or mixer. Entity budgets are 420 bullets,
48 minions, 96 shots and 48 pending packets per field.

`node tests/danmaku-flower.cjs` covers deterministic replays, chain reactions,
white/hard cancellation, meter costs, real incoming attacks, spirits, reversal,
simultaneous hits, two-win matches, pause/charge safety and all nine automated
matchups. `node tests/danmaku-flower-browser.cjs` exercises real keyboard and
pointer charge, quick casting, takeover, opt-in music, responsive fit and
minimum playable canvas height, round continuation and renderer restoration
when switching between both modes at five viewport sizes.

## Spell references and scope

These are compact score-attack adaptations of recognizable original motifs, not frame-for-frame reproductions of the original fights. Names and motifs were checked against the [PCB spell list](https://thwiki.cc/东方妖妖梦/符卡), [IN spell list](https://thwiki.cc/东方永夜抄/符卡), and [spell-card catalog](https://thwiki.cc/符卡列表). Bullet timings are rearranged to the supplied recordings and the narrow Playground arena. Spell entries and bombs use a portrait cut-in and magic-circle treatment; Breaks briefly flash each bullet at its own location, then turn it into a small white/gold score item that homes to the pilot. Small point labels linger at the old bullet positions; the capture bonus floats above the field without an opaque panel. There is no full-screen cancellation ring. Misses, rank increases and supplies have their own brief text notices. Effects respect reduced-motion preferences.

`node tests/danmaku-score.cjs` covers the measured timelines, all eighteen phases, bounded entities, real laser warnings/collisions, timed completion/nonspell transitions, repeatable durability clears, P1/P4/P8 aimed/homing damage balance, enemy entry/pause and tapered laser collision, homing cancellation score, eight-direction motion and expanded graze without a larger hitbox.

The cancellation and bonus timing were visually reviewed against [Touhou 7 Alice Lunatic gameplay](https://www.youtube.com/watch?v=LYAEp0bMf1Q) at 44.0–46.0 seconds and [Touhou 8 Last Word gameplay](https://www.youtube.com/watch?v=AOnfnNYkSlY). The implementation borrows the sequence and visual hierarchy rather than copying game artwork or recordings.

`node tests/danmaku-score-browser.cjs` renders all eighteen actual spells and eighteen distinct nonspells, checks nine distinct rear-flight poses per pilot, and verifies real audio-clock alignment through late enable, pause/countdown, track-end rest, cumulative continuation and re-enable.

Marisa motifs were also visually compared with [Weekly Spell Card Showcase: Marisa](https://www.youtube.com/watch?v=bZ3ldffDqvQ): Stardust Reverie at 181/186s, Milky Way at 145s, Asteroid Belt at 161s, Non-Directional Laser at 231s, Master Spark at 277s and Final Spark at 377s. Adaptations use moving familiars that lay and release stars, distinct radial and crossing laser arrangements, and widening Spark beams; the current per-card motifs are documented in [the spell guide](danmaku-spells.md). Enemy stars have 9 / 10.8 / 13px visual diameters with dark outlines and light centres, preserving the existing smaller collision cores. The smaller arena, music-driven cadence and progressive density remain deliberate adaptations.

Stardust’s five moving familiars briefly lay coloured stars before releasing them outward. After release each star keeps a straight trajectory, preventing the old permanent orbit near the boss. Regression coverage follows projectiles across frames and verifies that the main lanes reach the lower arena without pool saturation. Any remaining stray bullet expires after 12 seconds.
