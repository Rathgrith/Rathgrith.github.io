# Companion score attack

Open **弾幕に挑戦** in the Live2D window. Choose a pilot, then click one of the three opponent buttons to enter that character's battle. All nine pilot/opponent combinations are available, including mirror matches. **会話へ** restores the existing conversation. The game has its own pixel sprites, so it also runs when the remote Live2D model/CDN is unavailable.

| Pilot | Weapon | Expedition route |
| --- | --- | --- |
| Alice | Dispatch lancer and blade dolls from the wings. Focus recalls them to a close guard. | Thread workshop and midnight puppet theatre |
| Marisa | The central rail pierces aligned targets. Two to six side pods fire off-axis comet rounds independently, even while the main rail charges. Focus narrows their spread. | Mist forest and comet observatory |
| Patchouli | Elemental grimoires spread out and mark separate targets with homing bookmarks. Focus draws them into a circle to extend the chain. | Closed stacks and underground star atlas vault |

## Rules and controls

- The opponent cannot be defeated by damage. Each spell lasts until its scheduled music/time boundary. Its repeatable durability bar clears bullets when emptied, refills over 1.1 seconds, then becomes available again; the card, countdown and clean-survival eligibility continue. Consecutive breaks in one card raise the next durability bar to 2×, 4×, 7× and then 11× its starting value. The next card resets the multiplier. The thin gold time bar and TIME counter are separate from durability. A completed timed spell enters a gentler nonspell until the next phrase; the battle continues indefinitely.
- Each challenge opens with a 2.6-second enemy fly-in, name and Japanese portrait dialogue, followed by 1.5 seconds of preparation. No scoring, firing, supply drops or battle music advance during entry. Pausing preserves the entry position and remaining countdown; retry plays it again.
- At the exact end of each recording, the field clears, score items finish collecting and the boss stays on the field. After 1.8 seconds, the boss’s portrait dialogue asks whether to continue and shows round/total score. Eight idle seconds confirm another round; pointer/key interaction in the panel resets that countdown. Pause/background/minimize freeze it. The next round replays the chosen opponent’s music with cumulative score, power, lives, Bombs and difficulty, beginning with a 1.5-second ready countdown. Native audio looping is disabled.
- Automatic fire; arrows or WASD move, Shift slows movement, X uses a spirit strike (霊撃), and P/Escape pauses. Browser modifier shortcuts are not captured. A touch/mouse drag moves relative to the initial contact without teleporting the player. The on-screen low-speed button toggles precision movement.
- Three lives and two spirit strikes per run. The central 2.2px-radius point is the player's collision box, not the full sprite. A hit grants 2.5 seconds of recovery protection and clears every hostile bullet and laser on the field, with 0.85 seconds of suppression and a spreading pixel ring. A spirit strike clears the field (including new bullets for its first 0.65 seconds), grants the same protection, and displays a 1.6-second character-specific effect: Alice's doll-and-thread circle, Marisa's star-lined magic cannon, or Patchouli’s seven elemental seals, which light in order with the seven damage pulses. Another charge cannot be spent while this effect is active. Resume includes a one-second countdown.
- Red **P** raises power up to 32. Blue **B** and pink hearts refill spirit strikes and lives up to 5 each. Supply drops start after 3–5 seconds and recur every 4.2–7 seconds. A miss costs one power level. The ordinary pickup radius is 36 logical pixels.
- When there is room, two to four escorts sweep in from a side, split between the left and right edges, or enter from above. At rank 1 scouts have 10 HP, wing units have 15 HP and keepers have 30 HP. A muzzle mark telegraphs a locked shot before release. A turquoise scout sends a fast needle and a slower pearl down the marked lane. The plum moth folds two pairs of feathers into parallel files around a seam. It gains a third pair at rank 6. The amber keeper leads its fan with a large pearl and rims it with blades. Its second fan opens the middle. Both wings and keepers can answer before reaching the lower half. Destroying an escort drops a green experience shard. A keeper drops three XP and a P pickup. Each third kill also drops P. Shards drift briefly, then home to the pilot. The game keeps up to 12 loose pickups on screen and combines stacks to make room for guaranteed drops.
- The first three XP unlock a seeded equipment choice. Click **改造を選ぶ** or press **U** to pause and inspect up to three cards. Click a card or press **1–3** to equip it. Escape or **あとで選ぶ** banks the choice. Damage, firing rate, attraction, shard yield, reactor power and recovery can each gain five levels. The choices and build persist across songs in the current run. Retrying starts a new build. AUTO selects from the same available cards. Press U after spending XP to inspect the equipped cards and current effects. Equipment tiers are independent of encounter rank.

| Upgrade | Each tier | Trigger or tier III ability |
| --- | --- | --- |
| 刻印レンズ | +32% base weapon damage | The first hit after a 1.5-second charge hits 65% harder. At III its impact also damages nearby enemies. |
| 早巻きゼンマイ | +22% fire rate | At III a strike can leave an echo at the contact point after 0.16 seconds, with a 1.1-second cooldown. |
| 引力の栞 | +32 pickup radius, +55 attraction speed | At III a 0.9-second full-field pull runs every four seconds. |
| 複写紙 | +1 XP per shard | At III every four shards convert to one power, or 500 score at full power. |
| 過給炉 | Up to four power on equip, +1 per future P | Equipping or collecting P boosts fire rate by 35% for 2 + 0.6 × tier seconds. At III shards also ignite the reactor. |
| 結び直しの符 | A stock, a one-hit barrier and +0.35 s miss protection | At III a clean spell capture can restore the barrier. Breaking it forfeits the current capture. |
- **自動操作** in the lobby, **自動** in battle, or **T** toggles the pilot. It predicts nearby bullet trajectories, chooses between normal/precision movement, collects safe nearby items and uses spirit strikes when boxed in. It uses the same speed, resource and collision rules as manual play. Movement keys or a pointer drag immediately return control to the player. It pauses for the same lifecycle events as manual play and never silently resumes.
- Survival awards 20 points/second, each hit awards 12 × its shot weight, and each grazed bullet awards 80 points once. Cancelled bullets become small score items: 10 points each for a durability clear or spell transition and 2 for a spirit strike. They drift briefly, then home to the pilot; the points arrive on collection. Completing a timed spell without a miss or Bomb awards 5,000 points; otherwise it awards 1,000. Durability clears do not end the card or award this completion bonus. A calm musical passage uses the same clean-survival rule. Graze radius is 16 logical pixels (formerly 12), while the central hitbox stays 2.2 pixels. Scores are rounded down for display and records.
- Bullet art includes rice, kunai, scales, paper talismans, butterflies, water bubbles, flames, pellets, crystals and three star sizes. Shapes are assigned per spell/element, with bright centres and dark outlines; their hit radii follow the small visible core. Repeated shapes/colours are cached as local Canvas sprites.
- Patterns follow an offline beat map of each actual dBu recording. Each recording has six encounters, whose boundaries follow sixteen-beat musical phrases; it never resets to the introductory card midway through the song. Native whole-beat, half-beat and syncopated sequences follow the recording tempo through the rank-adjusted firing clock. Sustained quieter bars after 60% of an encounter can open a nonspell early; otherwise its last 24 beats allow a timed clear and an actual playable nonspell. Announcements last 2 seconds with a 0.15-second safety gap. Clears reserve four beats for collection before nonspell firing. Each character has six distinct interludes, with Japanese names and different emitters, trajectories, shapes and rhythms; small nonspell lasers retain warnings. Characteristic formations and arm counts remain stable, with bounded rank-driven speed, density and cadence growth through rank 25. Ceilings remain 720 bullets, 12 lasers and 720 score items; excess cancellation value is aggregated without losing points.
- Charged beams mark their paths before becoming dangerous. The planner checks moving and rotating beams as well as projectiles when selecting a route.
- Each opponent has two illustrated environments. In score attack the scenery changes after two musical sections. In a duel each field changes every 36 seconds. Atmospheric layers stay near the edges: loose thread and cool haze in the theatre, slanting dust in the observatory, pages and violet mist in the archives. Dense bullet fields dim the effects. Reduced motion holds the scenery still and changes the illustration without a dissolve.
- The rear-view pilot leans and banks with actual movement. Cloth, hair and equipment continue to move between atlas poses. Focus and reduced-motion settings preserve a steady, readable hitbox.
- Records are stored locally for each pilot/opponent pair in `site-danmaku-records-v3`. Existing records are retained. Manual keys use `pilot:opponent`; automatic runs use a separate `:auto` suffix. Once auto has been used, the rest of that run remains in the automatic category even after manual takeover. Game over, leaving the battle and page hide retain the best score. Failed/blocked storage uses session memory; there is no server leaderboard or score verification. Each live run receives a fresh random seed; explicit engine seeds reproduce drops in tests.
- Minimizing/closing the companion, tab hiding, losing window focus, leaving the game with keyboard focus, scrolling the canvas mostly out of view, resizing, title-bar dragging and soft navigation pause the run. None silently resume it. Returning to the conversation stops the game loop and resumes the Live2D renderer and typewriter.

## Musical timing

Each expedition spell starts with a ten-second barrier, shown as **結界** above
the field. Shots and spirit strikes still register hits while the barrier holds
the boss at full durability. The countdown uses active battle time. Clearing a
durability bar later in the same spell only triggers its usual recharge.

Each named card changes its figure, firing positions and targeting tactics across three movements. The marks above the field show the current movement. Eight-beat accents introduce rests, answers and quick subdivisions on the original recording's beat map. Muting music keeps the same simulation timing.

Six cards draw a non-damaging figure before its bullets depart on a recorded accent. Alice uses this for Buttonhole and Basting, Marisa for Spectrograph and Shutter, and Patchouli for Erratum and Palimpsest. The other twelve use immediate curves, projectiles, or optical trajectories. Friendly fire, player flight and resource pickups keep their own timing.

## Rank pressure

Every 20 seconds of active play award a rank. Ranks 1 through 25 shorten the interval between subdivisions continuously, reaching 1.28× the opening cadence. Ranks 4, 10, 16 and 22 add grains to fans, stitches or rings. Each card sets its projectile speeds and laser warning duration for the whole run. Scripted empty lanes and movement cues persist at high rank. Music boundaries, declarations and durability clears each keep their own timing. Flower field minions and bosses likewise gain denser salvos as rank rises.

`node tests/danmaku-rank.cjs` replays all eighteen cards at ranks 1 and 25, measures actual shot generation, lower-field pressure and pool headroom, and checks the Flower attack families. `node tests/danmaku-exposure-pressure.cjs` follows actual hitboxes for Marisa's delayed, aimed stars at thirteen stationary positions.

## Battle audio

The mixer beneath the battle title has independent **BGM：切 / SE：切** buttons
and a shared volume fader. Embedded windows start with both switches off. The
standalone `/playground/` page starts with both enabled, as requested, but unlocks
audio only on a real user interaction; the browser autoplay policy is respected.
The conversation radio stays stopped on page entry and requires explicit playback; ordinary page gestures do not start it. Neither battle mixer setting is persisted. Enabling a switch in the lobby arms it for the next
challenge. Radio playback yields before battle starts and resumes only if still
enabled on return; choosing battle as the first interaction does not load radio audio. Background music follows the opponent, independently
of the chosen pilot and the conversation player. The musical-note link credits
the current arrangement; the three user-supplied dBu arrangements are used. [Recording provenance, titles and beat analysis](../assets/music/danmaku/README.md).

Battle music follows the game clock. An unexpected playback pause resumes at the
current cue. If a later streaming request fails, the mixer downloads the full
recording once and resumes from there. A Flower match can play through the end
of the track and into its next loop. Score rounds hold the music during the
intermission and countdown. Small timing differences are corrected gradually
to avoid repeated seeks during slow frames. Silent play uses the same timeline
without fetching any audio.

A knight’s swing, thrust and shield parry, the rail cannon and side pods, and the grimoires’ paper and seal cues follow the corresponding weapon actions. Contact sounds fire at impact. Each opponent has a separate volley accent. The seven score-mode spirit-strike pulses, graze, pickups and countdown have their own cues.
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

- `assets/js/games/danmaku-score.js`: recording-derived beat/energy data and pure timeline lookup. `danmaku-patterns.js`: metadata, nonspells, local attack clocks and split/release/deceleration/redirect trajectories; three `danmaku-patterns-{alice,marisa,patchouli}.js` modules contain the character-specific source formations and original scores. [Spell catalogue and movement cues](danmaku-spells.md).
- `assets/js/games/danmaku-engine.js`: deterministic fixed-coordinate simulation, input, shot types, patterns, collisions and scoring. No DOM or renderer dependency; exported for Node tests. The shared pilot planner lives in `danmaku-pilot.js`, with score-mode escorts, routes and upgrade choices in `danmaku-run.js` and stage composition in `danmaku-scenery.js`.
- `assets/js/games/danmaku-renderer.js`: bounded Canvas 2D rendering at 480 × 720 over a 240 × 360 logical arena, cached local pixel sprites, low-contrast scrolling scenery, character-specific spell effects and readable bullet shapes. Reduced-motion preference disables decorative particles/background motion; essential gameplay movement remains.
- `assets/js/games/danmaku-audio.js`: lazy battle BGM and Web Audio soundbank, independent opt-in switches, local sample mixing, failure/retry and lifecycle.
- `assets/js/games/companion-danmaku.js`: lobby/battle/result screens, 60Hz fixed-step animation, relative pointer controls, lifecycle, records and accessibility status announcements. Only the active game owns an animation frame. Pauses discard accumulated elapsed time.
- `assets/css/classic-danmaku.css`: UI styles isolated inside the existing companion. The field keeps its 2:3 ratio, fits short windows and does not change the site's columns or global palette.
- `assets/images/classic/danmaku/portraits/*-expressions.png`: generated transparent 2×2 bust atlases (neutral, casting, victory, hurt). Enemy entry uses neutral, declarations/Bombs use casting, clean timed results use victory, and misses use hurt. They are rendered only in event cut-ins, not as oversized boss sprites. [Exact prompts and built-in generator mode](../assets/images/classic/danmaku/portraits/artwork.json).
- `assets/js/games/danmaku-boss-sprites.js`: shared atlas loading, 48px runtime cells, four idle and four casting frames, frame selection and staggered child-unit deployment. The three generated source sheets live in `assets/images/classic/danmaku/bosses/`; each is sampled once onto the small runtime atlas, then drawn with nearest-neighbour scaling. The visible body is approximately 30×34 logical pixels. The child units use separately drawn pixel artwork. Alice’s thread dolls, Marisa’s brass lenses, and Patchouli’s elemental lanterns show preparation, emission and recovery at their actual casting positions. Deployment completes before the first dangerous volley. Both battle modes use these sprites; reduced motion keeps a stable pose and immediate deployment. [Generation mode and exact prompts](../assets/images/classic/danmaku/bosses/artwork.json).
- `assets/images/classic/danmaku/*-flight.svg`: player atlases with nine columns and two rows. Rebuild with `python3 scripts/build-danmaku-flight-sprites.py`. The unused front-view boss prototypes have been removed; the small character glyphs remain as loading fallbacks and child units.

The dialogue controller exposes a small game-active state, and the loader stops its own renderer while the game view is open. Story text, expressions, affinity and selection remain separate from arcade state. The mounted view survives the site's soft navigation without duplicate canvases or listeners.

## Verification

Difficulty is calibrated from the simulated lower arena, not card names or the number of bullets near the boss. `scripts/measure-danmaku-density.cjs` runs full recordings at three fixed aim positions, holding durability high so a pressure clear cannot conceal an over-dense pattern. It samples live bullets, laser coverage, bullet speed and open horizontal gaps. Its coverage grid includes the pilot hitbox, an 8px manoeuvring margin and a 0.25-second trajectory forecast; these percentages are a comparison metric, not the literal fraction of lethal pixels. Manual movement, grazing, Bombs and earned durability clears still affect practical difficulty.

Generate the current coverage figures with the measurement script rather than maintaining a second copy of tuning numbers here. Actual speed and formations differ by card; coverage includes lasers, so a laser card need not contain more individual bullets. `node tests/danmaku-density.cjs` checks sustained pressure, available corridors and entity ceilings over complete recordings in rounds 1, 2, 4 and 7. Mean coverage is not forced to rise from card to card: the original formations control different parts of the field. See the [spell catalogue](danmaku-spells.md) for their movement cues.

`node tests/danmaku-nonspells.cjs` checks all eighteen distinct emission signatures and the actual complete-recording transitions: every card gets a playable interlude, a Japanese name, bounded hazards and safe laser charge time. `node tests/danmaku-round-browser.cjs` checks the boss's continuation dialogue at desktop, narrow portrait and short landscape widths, with manual/idle continuation, retained score/power and no boss exit/re-entry.

`node tests/danmaku-engine.cjs` checks all nine matchups for two simulated minutes, increasing density, bounded entities, power-dependent hits, seeded drop variation, all pickup effects/caps/expiry, automatic avoidance/collection/emergency strike, takeover, recovery protection and paused/countdown state.

`node tests/danmaku-browser.cjs` checks canvas output and keyboard/touch input, all three opponents, pickup HUD updates, automatic/manual switching, separate record persistence, score/results/retry, saved pair records/reload, conversation/render pause and resume, minimize and soft navigation, seven widths (320–1920px), short landscape, and blocked model CDN/storage. It captures test-only engine/renderer references through intercepted script responses; production code exposes no testing backdoor.

`node tests/danmaku-presentation.cjs` compares actual rendered pixels for all three scenes, wrap-boundary continuity, substantial X effects and reduced-motion behavior. `node tests/loading-browser.cjs` checks the shared homepage/companion prayer loaders, bounded waits, delayed assets, mobile sizing, keyboard dismissal, reduced motion, no JavaScript and the CSS fail-safe.

`node tests/danmaku-audio.cjs` checks real music playback and nonzero Web Audio
output, actual event cues, independent switches, three pilots/opponents, volume,
pause/minimize/hidden/final-hit tails, conversation handoff, reload defaults and
five layouts. `node tests/danmaku-audio-resilience.cjs` also checks mobile
decoding, media retries, blocked storage, muting during decoding, browsers
without Web Audio, mid-battle interruptions, natural track endings and slow
frames. `node tests/danmaku-bgm-network.cjs` serves real recordings from a
local HTTP server that fails later byte-range requests. It checks the audio
signal after recovery, retry, cancellation and reuse of the downloaded track.

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
- Fairy squads arrive in different lanes. The crowned leader alternates a white flower with a fast central pearl and an open corolla. All of its petals can be cancelled and returned. Killing a fairy detonates nearby
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
- A summoned boss arrives with two satellites. The first volley recruits a third. Alice and Marisa complete their companies on the second volley, with five puppets or four brass lenses. Patchouli recruits five lanterns on the second volley and all seven on the third, including the Sun and Moon. Pairs alternate before the full company fires. Alice leaves a gate, Marisa warns a beam at the previously sampled position, and Patchouli brackets the aisle with two ink colours. Each new satellite flies into a vacant orbit.
- Every third volley marks the pilot’s position for half a second. Alice sends three needle bursts through the mark, Marisa fires two offset star exposures, and Patchouli follows a solar seal with two lunar fans. A slower, seeded tail follows each burst. On the fifth volley, two satellites project four radial strings. Their marked openings reach the same depth together, giving the pilot room to cross a string and double back. A local C2 or C3 covering the mark interrupts the burst.
- Alice sends doll crossfire; Marisa sends stars and warned vertical lasers;
  Patchouli sends seven-element fans. White returns and card attacks have a
  visible incoming delay. Bosses enter before firing and expire or can be shot
  down. Cancellation particles collect toward their own pilot.
- Flower rank increases every 18 seconds plus one step per completed round,
  capped at 16 pressure steps. Fairy squads grow from five to eight members,
  wave intervals shrink from 3.4 to 1.5 seconds, and fairy/spirit firing
  cooldowns are divided by `1 + rankStep * 0.025`. Every four steps adds a
  grain to Alice's and Patchouli's existing fans (same angular span), or two
  stars to Marisa's ring. Boss firing keeps its 1.9-to-0.94-second bounded
  cadence. These increases use the same rules on both fields.
- Both AI pilots use the same shooting, meter and collision simulation as a
  human. Player AUTO searches future routes through moving bullets and beams. The CPU retains its original reaction timing. Both can aim at minions, activate spirits, bank for C2/C3/C4 or quick-cast in danger.
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

## Spell choreography

Each opponent has six original cards. Alice conducts a sewing theatre, Marisa tests the optics of stolen stars, and Patchouli edits a living manuscript. Each card has a named, gentler interlude. Their placements, timing, intended routes and focused regressions are described in the [spell catalogue](danmaku-spells.md).

The boss and its visible familiars are the origins of enemy attacks. Lasers show their firing line before they become damaging. Bullet conversion flashes, score items, the timed capture bonus and the character's portrait accompany a successful spell break.

## Pilot weapons and revival

Alice fields two to six armed dolls. The lancer physically thrusts through its route and the greatsword sweeps an arc at the end of a short sortie. Alice's distance from the target at contact sets damage. The multiplier grows smoothly from ×1 at 200 pixels to ×1.4 at 116 and ×1.8 within 32. At point-blank range the taut paired threads and rose-edged blades mark the bonus. Outside normal dispatch range, one lance knight follows a moving foe at 150 pixels per second before locking a final thrust. A second lancer becomes available at P10. Scouts leave at least 0.65 seconds apart, return physically at 200 pixels per second and recover for 0.85 seconds. Focus immediately recalls the wings into a near guard. Knights make short counters, and a braced shield can intercept one light projectile at its location every two seconds across the formation. Hard bullets and lasers pass through. Marisa’s narrow rail hits every enemy in its column immediately. Focus stores light for up to 0.68 seconds at base tempo. A full charge fires automatically and releasing focus discharges a partial charge. The two side pods at base power alternate real projectiles from the outer hardpoints during that charge. Up to six pods join the formation. Patchouli’s bookmarks steer toward a target and jump to nearby enemies on impact. Each jump reaches a different target and deals less damage. Focus increases jump range. In both modes, the open pod formation mixes sun, crescent and bolt silhouettes as pods come online. Focus converges the rounds into narrow bolts. Patchouli’s seven grimoires cast in order alongside the pilot’s paper bookmark. Fire, Water, Wood, Metal and Earth send a flame, droplet, leaf, blade and stone. Sun and Moon add a gold solar seal and a silver crescent at P20 and P25 in Score, or spell levels 8 and 10 in Flower. The books share one firing clock. Her original spirit strike 七曜符「天球暦の綴じ目」 lights the seven seals in succession. Alice’s melee arcs, thrusts and physical shield remain attached to her dolls.

On a miss, every enemy bullet, active laser and warning laser disappears across the affected field. New fire pauses for 0.85 seconds while a seal expands from the impact. Reduced motion uses a stationary seal. Flower duels also erase attacks queued against the hit pilot. The opposing field keeps playing. The pilot receives 2.5 seconds of protection and each guard upgrade extends this by 0.35 seconds in Score Attack.

The firing range in `tests/danmaku-score.cjs` checks rail penetration, partial focus discharge, distinct melee hit geometry, a missed charge and a limited shield parry, bookmark chains and the shot budget at power 32. The player-sprite browser check covers continuous flutter, all eight flight directions, stable collision anchors and reduced motion.
