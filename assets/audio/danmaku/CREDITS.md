# Playground battle sound effects

These are **Taisei Project** fan-game effects, not sounds extracted from an
official Touhou game. Original Touhou Project: ZUN / 上海アリス幻樂団.

Source: [taisei-project/taisei](https://github.com/taisei-project/taisei), pinned at
[`f4d3342226e915f369db8680688723adb18e4efa`](https://github.com/taisei-project/taisei/tree/f4d3342226e915f369db8680688723adb18e4efa/resources/00-taisei.pkgdir/sfx).
The included [TAISEI-LICENSE.txt](TAISEI-LICENSE.txt) is the upstream copying
notice, including the MIT terms and copyright notices for Lukas Weber and
Andrei Alexeyev. The soundtrack and portrait exceptions in that notice do not
apply to these sound effects.

| Game event | Upstream file (in `resources/00-taisei.pkgdir/sfx/`) |
| --- | --- |
| Alice / Marisa / Patchouli player volley | `shot1.opus` / `shot2.opus` / `shot3.opus` |
| Enemy hit | `hit.opus` |
| Graze | `graze.opus` |
| Power / extra life / bullet-clear pickup | `powerup.opus` / `extra_life.opus` / `extra_bomb.opus` |
| Player hit, including the final life | `death.opus` |
| Alice / Marisa / Patchouli spirit strike | `bomb_youmu_a.opus` / `bomb_marisa_a.opus` / `bomb_reimu_a.opus` |
| Countdown completion | `timeout2.opus` |

Mappings adapt Taisei effects to this fan game's mechanics; they do not claim
that the same character uses each effect in the official series. The sounds
are decoded to 44.1 kHz, mono, 16-bit PCM WAV for browser Web Audio compatibility,
without changing their pitch or timing. Playback volume is mixed in code with
per-event cooldowns, bounded polyphony and a compressor. Original Opus files
can be downloaded from the pinned path and converted with FFmpeg:
`ffmpeg -i input.opus -ar 44100 -ac 1 -c:a pcm_s16le output.wav`.

Official [Touhou fan-work guidelines](https://touhou-project.news/guideline/)
exclude directly republishing original game materials. These licensed fan-game
sounds provide the corresponding event cues instead. Music reuses the credited
character arrangements in [the BGM credits](../../music/companion/CREDITS.md).
Both battle music and effects are opt-in and start disabled on every page load.
