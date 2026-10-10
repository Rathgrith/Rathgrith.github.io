# Previous ensemble BGM

Original Touhou Project themes: **ZUN / 上海アリス幻樂団**.
These three fan arrangements are retained as archived assets and test fixtures. The current battle soundtrack uses [the separately credited dBu recordings](../danmaku/README.md). These are not original game recordings and are independent of the radio queue.

The FM receiver has a separate 13-song local library paired with official
YouTube videos. See [radio provenance and version notes](../radio/README.md).
The radio's tuning noise is synthesized locally with Web Audio. The permissions
for the three battle arrangements below do not apply to the separate radio library.

| Character / output | Arrangement | Source and instrumentation |
| --- | --- | --- |
| Alice / `alice-ensemble.mp3` | **端国の唄**, based on 不思議の国のアリス | **巫月和音 / 望月幻奏楽団 (Luna Reverie)** — [catalog](https://lunareverie.iza-yoi.net/midi.html), [MIDI](https://lunareverie.iza-yoi.net/midi-a/tha13.mid). Original three-part arrangement, voiced here as music box, harp and bowed bass instead of music box and piano. |
| Marisa / `marisa-ensemble.mp3` | **恋色マスタースパーク** (2005, SD-80 DEMO) | **干瓢碁 / Kanpyohgo**, [Kanpyo’s MIDI](https://kpmidi.net/). Full arrangement rendered by the author using the Roland SD-80, rather than a new piano reduction. |
| Patchouli / `patchouli-ensemble.mp3` | **幽室魔術師**, based on ラクトガール ～ 少女密室 | **巫月和音 / 望月幻奏楽団 (Luna Reverie)** — [catalog](https://lunareverie.iza-yoi.net/midi.html), [MIDI](https://lunareverie.iza-yoi.net/midi-a/tha06.mid). Strings, piano, acoustic bass, trumpet, tubular bell and percussion, preserving all seven MIDI channels. |

## Permission and changes

Checked 2026-10-09. Luna Reverie's catalog permits its MIDI arrangements in
freely published, all-ages Touhou-related works without individual contact,
and asks for attribution. They accompany this free Touhou danmakū fan game. Source MIDIs remain at the arranger's own site rather than
being redistributed here. Alice's instrumentation is adapted as noted above;
Patchouli retains the original GM programs. Original timing, velocities,
controllers and pitch bend are retained. GS bank selection is mapped to GM.

Kanpyo's site's **Notes / ダウンロード可能なコンテンツのライセンス** section
licenses downloadable music under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The Marisa recording comes from the author's linked
[Legacy Musics archive](https://drive.google.com/file/d/0B9EWVKzlJdqEaDZKSGhROGQ2ZnM/view?resourcekey=0-b49CC-9LSQP2AjaQ2FbvWw),
member `東方シリーズその他/kanpyo_2005_koiiro.mp3`.
It is transcoded to 160 kbps MP3 and normalized to approximately −19 LUFS,
with a −2 dBTP ceiling. The melody, tempo and arrangement are unchanged.

Luna Reverie's MIDI performances are rendered with the installed macOS
General MIDI bank at their original tempo, normalized to the same level, with
a short release tail and fade. The soundbank is not redistributed.
These music works are not covered by the website template's software license;
Touhou derivatives also follow the [fan-work guidelines](https://touhou-project.news/guideline/).

## Reproduction

On macOS, install `mido` and `imageio-ffmpeg` into a Python environment and run
`python scripts/render-companion-bgm.py`. This downloads and renders Alice
and Patchouli in a temporary directory, retaining multitimbral MIDI events.
Xcode command-line tools are required for the offline renderer. Marisa is the
author's existing SD-80 recording; extract the member above and normalize with
FFmpeg: `-af loudnorm=I=-19:TP=-2:LRA=10 -ar 44100 -codec:a libmp3lame -b:a 160k`.
These archived MP3 renders need no runtime MIDI soundbank or third-party player. Battle BGM and sound effects have separate switches,
both off by default; their assets load only after the corresponding opt-in.
Radio station changes do not alter these files or the opponent-based selection.
