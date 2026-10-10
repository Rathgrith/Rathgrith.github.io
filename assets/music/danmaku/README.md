# dBu battle recordings

Original compositions: **ZUN / 上海アリス幻樂団**. Arrangements and recordings:
**どぶウサギ / dBu music** ([artist site](https://www.dobuusagi.com/)).

| Opponent | Recording | Local file | Decoded duration |
| --- | --- | --- | --- |
| Alice | 人形裁判 - 人の形弄びし少女 | `alice-dbu.mp3` | 269.792653 s |
| Marisa | 恋色ファイナルマスタースパーク | `marisa-dbu.mp3` | 229.694694 s |
| Patchouli | 少女密室 - the Locked Girl | `patchouli-dbu.mp3` | 254.720000 s |

Imported on 2026-10-10 from the three matching NCM files supplied by the site
owner in their local music library. The embedded media was MP3. Its audio
packets were copied without re-encoding; container metadata and cover art were
removed. Packet hashes were compared before/after the copy. Original library
files were left unchanged. These music recordings do not inherit the website’s
software license. The archived ensemble arrangements have separate
[credits and permissions](../companion/CREDITS.md).

Final-file SHA-256:

```
80113f6048c1e00ca16e4b0cffe4a4cc7c824210aeaf42163d50327d35bd1eed  alice-dbu.mp3
33c80e30f1212dc7feb1f6878279eb55ddbe54593301824621a01e3caad1615b  marisa-dbu.mp3
d8bc51cc6ff26f263af0e0af9ca246d2b29e126cc9c82610393405aacf700b74  patchouli-dbu.mp3
```

## Musical timeline

`assets/js/games/danmaku-score.js` stores estimated onset-aligned beat times
and per-four-beat normalized RMS energy. Nominal tempo guides are 159 / 167 /
150 BPM; the actual arrays retain timing changes instead of assuming an exact,
constant tempo. These are automatically measured musical cues, not an official
note chart or hand-transcribed score. Runtime analysis is unnecessary, so muted
play neither downloads nor decodes music.

Reproduce the analysis in an isolated Python environment with `librosa` and
`numpy`, and FFmpeg available:

```
python scripts/analyze-danmaku-music.py --ffmpeg /path/to/ffmpeg --output /tmp/beatmap.json
```

The script uses mono 22,050 Hz decoded PCM, a 256-sample hop, beat tracking with
tightness 110 and a fixed nominal tempo guide, and RMS normalized by its 85th
percentile. MP3 container duration can include encoder padding; timeline
durations above use decoded PCM. Beats trigger waves and half-beat accents;
six encounters are spaced across each recording at sixteen-beat boundaries.
The last 24 beats of each encounter allow its result and distinct nonspell;
consecutive quieter bars can begin that passage earlier. The mixer follows the fixed-step game clock, including
late enable, pause, resume countdown and looping. Radio/PV music is independent.
