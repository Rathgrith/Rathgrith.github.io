# Companion score attack

Open **弾幕に挑戦** in the Live2D window. Choose a pilot, then click one of the three opponent buttons to enter that character's battle. All nine pilot/opponent combinations are available, including mirror matches. **会話へ** restores the existing conversation. The game has its own pixel sprites, so it also runs when the remote Live2D model/CDN is unavailable.

| Character | Pilot variant | Opponent pattern |
| --- | --- | --- |
| Alice | Rear-view flight with a doll spread; dolls tighten when focused | Two doll emitters weave offset cyan/pink rings and aimed fans |
| Marisa | Rear-view broom flight and concentrated parallel light shots | Counter-rotating gold/pink stars and faster aimed star fans |
| Patchouli | Rear-view floating flight and homing elemental shots | Five elemental emitters with alternating curved trajectories |

## Rules and controls

- Enemies have unlimited health. Hits increase score without ending the battle.
- Automatic fire; arrows or WASD move, Shift slows movement, X uses a spirit strike (霊撃), and P/Escape pauses. Browser modifier shortcuts are not captured. A touch/mouse drag moves relative to the initial contact without teleporting the player. The on-screen low-speed button toggles precision movement.
- Three lives and two spirit strikes per run. The central 2.2px-radius point is the player's collision box, not the full sprite. A hit grants 2.5 seconds of recovery protection and clears nearby bullets. A spirit strike clears the field (including new bullets for its first 0.65 seconds), grants the same protection, and displays a 1.6-second character-specific effect: Alice's doll-and-thread circle, Marisa's star-lined magic cannon, or Patchouli's five-element sigils. Another charge cannot be spent while this effect is active. Resume includes a one-second countdown.
- Random supply drops begin after 3–5 seconds, then repeat every 4.2–7 seconds: red **P** raises firepower (60%), blue **B** clears bullets and replenishes one spirit strike (28%), and a pink **heart** adds a life (12%). Items drift down, attract within 36px, and collect within 10px. Firepower caps at 4; lives and strikes cap at 5. Power adds extra shots and damage while keeping each character's shot type. A hit costs one power level, to a minimum of 1. Capped pickups award bonus points. The B pickup also gives a short visible clearing pulse and 1.2 seconds of protection. Offscreen/expired drops are removed; at most 12 exist at once.
- **自動操作** in the lobby, **自動** in battle, or **T** toggles the pilot. It predicts nearby bullet trajectories, chooses between normal/precision movement, collects safe nearby items and uses spirit strikes when boxed in. It uses the same speed, resource and collision rules as manual play. Movement keys or a pointer drag immediately return control to the player. It pauses for the same lifecycle events as manual play and never silently resumes.
- Survival awards 20 points/second, each hit awards 12 × its shot weight, and each grazed bullet awards 80 points once. Clearing bullets with a spirit strike awards two points per bullet. Scores are rounded down for display and records.
- Rank advances every 20 seconds. Main waves begin about every 0.7 seconds, with larger rings and frequent aimed fans; alternating side volleys join after 12 seconds and widen after 45 seconds. Wave size, emission frequency and speed increase continuously. Emission has safe ceilings (720 active enemy bullets, 64 short-lived particles, a 0.16-second minimum wave interval and capped bullet speed) for sustained performance; no boss health or victory cutoff is introduced.
- Each opponent has distinct scrolling scenery: Alice's stitched workshop floor and hanging dolls, Marisa's layered starfield, and Patchouli's bookshelves and floor seals. Scenery accelerates continuously from 16 to 88 pixels/second over two minutes. World-anchored texture variations remain continuous at wrap boundaries. Pausing and the resume countdown freeze both scroll and spell age; reduced motion keeps scenery stationary and removes decorative spell movement while retaining the visible effect.
- Records are stored locally for each pilot/opponent pair in `site-danmaku-records-v1`. Existing manual keys remain compatible; automatic runs use a separate `:auto` suffix. Once auto has been used, the rest of that run remains in the automatic category even after manual takeover. Game over, leaving the battle and page hide retain the best score. Failed/blocked storage uses session memory; there is no server leaderboard or score verification. Each live run receives a fresh random seed; explicit engine seeds reproduce drops in tests.
- Minimizing/closing the companion, tab hiding, losing window focus, leaving the game with keyboard focus, scrolling the canvas mostly out of view, resizing, title-bar dragging and soft navigation pause the run. None silently resume it. Returning to the conversation stops the game loop and resumes the Live2D renderer and typewriter.

## Battle audio

The mixer beneath the battle title has independent **BGM：切 / SE：切** buttons
and a shared volume fader. Both switches start off on every full page load;
neither setting is persisted. No battle audio request or Web Audio context is
created before an explicit enable action. Enabling a switch in the lobby arms
it for the next challenge. Background music follows the opponent, independently
of the chosen pilot and the conversation player. The musical-note link credits
the current arrangement; the same three local ensemble tracks are reused.

Real engine events trigger three pilot volley sounds, enemy hits, graze,
power/life/clear pickups, damage, three spirit strikes and countdown completion.
Effects come from the licensed **Taisei Project** fan game, not extracted official
Touhou assets. [Source mapping and license](../assets/audio/danmaku/CREDITS.md).
The optional sound callback cannot change simulation results or stop gameplay
when the audio device fails. Per-cue throttling, 12-voice polyphony and a
compressor bound dense bursts. Muted/loading sounds are discarded, never queued
for later playback. Decode/request failure offers a retry without disabling play.

Pausing, hiding/minimizing, navigation and closing stop battle music and voices;
resuming is explicit. On the final life, the damage cue may finish naturally
while BGM stops. Retrying resets the track and clears old effect tails. Returning
to dialogue stops battle audio before its independently enabled player resumes.
The audio instance and decoded soundbank survive soft navigation without new
contexts or duplicate listeners; a full reload starts silent again.

## Implementation

- `assets/js/games/danmaku-engine.js`: deterministic fixed-coordinate simulation, input, shot types, patterns, collisions and scoring. No DOM or renderer dependency; exported for Node tests.
- `assets/js/games/danmaku-renderer.js`: bounded Canvas 2D rendering at 240 × 360, cached local pixel sprites, low-contrast scrolling scenery, character-specific spell effects and readable bullet shapes. Reduced-motion preference disables decorative particles/background motion; essential gameplay movement remains.
- `assets/js/games/danmaku-audio.js`: lazy battle BGM and Web Audio soundbank, independent opt-in switches, local sample mixing, failure/retry and lifecycle.
- `assets/js/games/companion-danmaku.js`: lobby/battle/result screens, 60Hz fixed-step animation, relative pointer controls, lifecycle, records and accessibility status announcements. Only the active game owns an animation frame. Pauses discard accumulated elapsed time.
- `assets/css/classic-danmaku.css`: UI styles isolated inside the existing companion. The field keeps its 2:3 ratio, fits short windows and does not change the site's columns or global palette.
- `assets/images/classic/danmaku/*.svg`: original integer-grid 32 × 40 sprites; `*-player.svg` depicts the back of each pilot in flight, while the opponents retain separate front views. No downloaded sprites or additional runtime library.

The dialogue controller exposes a small game-active state, and the loader stops its own renderer while the game view is open. Story text, expressions, affinity and selection remain separate from arcade state. The mounted view survives the site's soft navigation without duplicate canvases or listeners.

## Verification

`node tests/danmaku-engine.cjs` checks all nine matchups for two simulated minutes, increasing density, bounded entities, power-dependent hits, seeded drop variation, all pickup effects/caps/expiry, automatic avoidance/collection/emergency strike, takeover, recovery protection and paused/countdown state.

`node tests/danmaku-browser.cjs` checks canvas output and keyboard/touch input, all three opponents, pickup HUD updates, automatic/manual switching, separate record persistence, score/results/retry, saved pair records/reload, conversation/render pause and resume, minimize and soft navigation, seven widths (320–1920px), short landscape, and blocked model CDN/storage. It captures test-only engine/renderer references through intercepted script responses; production code exposes no testing backdoor.

`node tests/danmaku-presentation.cjs` compares actual rendered pixels for all three scenes, wrap-boundary continuity, substantial X effects and reduced-motion behavior. `node tests/loading-browser.cjs` checks the shared homepage/companion prayer loaders, bounded waits, delayed assets, mobile sizing, keyboard dismissal, reduced motion, no JavaScript and the CSS fail-safe.

`node tests/danmaku-audio.cjs` checks real music playback and nonzero Web Audio
output, actual event cues, independent switches, three pilots/opponents, volume,
pause/minimize/hidden/final-hit tails, conversation handoff, reload defaults and
five layouts. `node tests/danmaku-audio-resilience.cjs` covers mobile decoding,
independent failed-media retries, blocked storage, muting during decoding and
browsers without Web Audio. Tests instrument genuine browser audio nodes.
