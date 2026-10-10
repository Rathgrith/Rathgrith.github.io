# Playground battle sound effects

The existing samples listed below are **Taisei Project** fan-game effects; the additional spell cues are locally synthesized. None are extracted from an official Touhou game. Original Touhou Project: ZUN / 上海アリス幻樂団.

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
| Power / extra life / Bomb-stock pickup | `powerup.opus` / `extra_life.opus` / `extra_bomb.opus` |
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
character arrangements in [the dBu recording credits](../../music/danmaku/README.md).
Both battle music and effects are opt-in and start disabled on every page load.

## Original synthesized cues

`spell_alice.wav`, `spell_marisa.wav`, and `spell_patchouli.wav` are distinct chime, electric and organ-style declarations. `laser_charge.wav`, `laser_fire.wav`, `spell_break.wav`, `spell_capture.wav` and `score_collect.wav` supply the warning, firing, transition and collection cues. `bomb_impact.wav` adds a short pitch-falling, gated percussion hit at each Bomb damage pulse. These contain no samples from the original games. Reproduce the deterministic PCM files using `python3 scripts/render-danmaku-cues.py` (Python standard library only). These generated effects follow the repository’s software license, separately from the upstream Taisei samples and the music recordings.
