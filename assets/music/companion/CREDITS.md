# Companion piano BGM

These are unofficial Touhou Project piano arrangements, not recordings from the games.

Original compositions: **ZUN / 上海アリス幻樂団**.
Piano arrangements and source MIDI: **DMBN / [東方ピアノEasyモード](https://easypianoscore.jp/)**.
The in-window player links to 東方ピアノEasyモード and includes the composer and arranger in its credit tooltip.

| Character / output | Original theme | DMBN source (Easy) | Tempo multiplier |
| --- | --- | --- | --- |
| Alice / `alice-piano.mp3` | 人形裁判 ～ 人の形弄びし少女 | [東方妖々夢](https://easypianoscore.jp/sheetList.php?titleid=youmu), [MIDI archive](https://easypianoscore.jp/download.php?ext=zip&inst=&musicLevel=easy&musicName=doll) | 0.78 |
| Marisa / `marisa-piano.mp3` | 恋色マスタースパーク | [東方永夜抄](https://easypianoscore.jp/sheetList.php?titleid=eiya), [MIDI archive](https://easypianoscore.jp/download.php?ext=zip&inst=&musicLevel=easy&musicName=lms) | 0.68 |
| Patchouli / `patchouli-piano.mp3` | ラクトガール ～ 少女密室 | [東方紅魔郷](https://easypianoscore.jp/sheetList.php?titleid=kouma), [MIDI archive](https://easypianoscore.jp/download.php?ext=zip&inst=&musicLevel=easy&musicName=girl) | 0.85 |

The unmodified MIDI files are retained in `source/` with these credits. DMBN's
[usage policy](https://easypianoscore.jp/kenri.html) (dated 2024-08-05, checked
2026-10-09) permits public use, modification and distribution with attribution
to 東方ピアノEasyモード; noncommercial use does not require an application.
Also subject to the [Touhou Project fan-work guidelines](https://touhou-project.news/guideline/).
These works are not covered by the website template's software license.

Rendering changes: softened MIDI velocity (bass slightly quieter), slower tempo,
sampled acoustic piano, a restrained hall reverb and high-frequency shelf,
approximately −21 LUFS with a −3 dBTP ceiling, natural release and short end fade.
No original game audio or commercial arrangement recordings are included.
The macOS-installed Apple piano is used only to render the performance; its
soundbank is not included in this repository.

To reproduce on macOS, install `mido` and `imageio-ffmpeg` in a Python environment
and run `python scripts/render-companion-bgm.py` from the repository root.
Xcode command-line tools are needed only to rebuild the audio. The published
site plays the committed MP3s without runtime synthesis or external music services.
