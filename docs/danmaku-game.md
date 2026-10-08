# Companion score attack

Open **弾幕に挑戦** in the Live2D window. Choose a pilot, then click one of the three opponent buttons to enter that character's battle. All nine pilot/opponent combinations are available, including mirror matches. **会話へ** restores the existing conversation. The game has its own pixel sprites, so it also runs when the remote Live2D model/CDN is unavailable.

| Character | Pilot variant | Opponent pattern |
| --- | --- | --- |
| Alice | Four-way doll spread; dolls tighten when focused | Two doll emitters weave offset cyan/pink rings and aimed fans |
| Marisa | Fast movement and concentrated parallel light shots | Counter-rotating gold/pink stars and faster aimed star fans |
| Patchouli | Slower movement and two homing elemental shots | Five elemental emitters with alternating curved trajectories |

## Rules and controls

- Enemies have unlimited health. Hits increase score without ending the battle.
- Automatic fire; arrows or WASD move, Shift slows movement, X uses a spirit strike (霊撃), and P/Escape pauses. Browser modifier shortcuts are not captured. A touch/mouse drag moves relative to the initial contact without teleporting the player. The on-screen low-speed button toggles precision movement.
- Three lives and two spirit strikes per run. The central 2.2px-radius point is the player's collision box, not the full sprite. A hit grants 2.5 seconds of recovery protection and clears nearby bullets. A spirit strike clears the field and grants the same protection. Resume includes a one-second countdown.
- Survival awards 20 points/second, each hit awards 12 × its shot weight, and each grazed bullet awards 80 points once. Clearing bullets with a spirit strike awards two points per bullet. Scores are rounded down for display and records.
- Rank advances every 20 seconds. Wave size, emission frequency and speed increase continuously over time. Emission has safe ceilings (560 active enemy bullets, 64 short-lived particles, capped speed and wave frequency) for sustained performance; no boss health or victory cutoff is introduced.
- Records are stored locally for each pilot/opponent pair in `site-danmaku-records-v1`. Game over, leaving the battle and page hide retain the best score. Failed/blocked storage uses session memory; there is no server leaderboard or score verification.
- Minimizing/closing the companion, tab hiding, losing window focus, leaving the game with keyboard focus, scrolling the canvas mostly out of view, resizing, title-bar dragging and soft navigation pause the run. None silently resume it. Returning to the conversation stops the game loop and resumes the Live2D renderer and typewriter.

## Implementation

- `assets/js/games/danmaku-engine.js`: deterministic fixed-coordinate simulation, input, shot types, patterns, collisions and scoring. No DOM or renderer dependency; exported for Node tests.
- `assets/js/games/danmaku-renderer.js`: bounded Canvas 2D rendering at 240 × 360, cached local pixel sprites, character colors, dim perspective grid and readable bullet shapes. Reduced-motion preference disables decorative particles/background motion; essential gameplay movement remains.
- `assets/js/games/companion-danmaku.js`: lobby/battle/result screens, 60Hz fixed-step animation, relative pointer controls, lifecycle, records and accessibility status announcements. Only the active game owns an animation frame. Pauses discard accumulated elapsed time.
- `assets/css/classic-danmaku.css`: UI styles isolated inside the existing companion. The field keeps its 2:3 ratio, fits short windows and does not change the site's columns or global palette.
- `assets/images/classic/danmaku/*.svg`: original integer-grid 32 × 40 full-body sprites, extending the site's pixel icon style. No downloaded sprites or additional runtime library.

The dialogue controller exposes a small game-active state, and the loader stops its own renderer while the game view is open. Story text, expressions, affinity and selection remain separate from arcade state. The mounted view survives the site's soft navigation without duplicate canvases or listeners.

## Verification

`node tests/danmaku-engine.cjs` checks all nine matchups for two simulated minutes, increasing density, bounded entity counts, the three shot types, hits/grazes, recovery protection, spirit strikes, pause, normalized movement and playfield bounds.

`node tests/danmaku-browser.cjs` checks actual canvas output and keyboard/touch input, all three opponents, score/results/retry, saved pair records/reload, conversation/render pause and resume, minimize and soft navigation, seven widths (320–1920px), short landscape, and blocked model CDN/storage. It captures test-only engine/renderer references through intercepted script responses; production code exposes no testing backdoor.
