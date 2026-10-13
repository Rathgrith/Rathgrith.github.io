# Radio library

The site owner supplied the local recordings in this directory. The playlist was
revised on 2026-10-13: six selections remain from the 2026-10-10 import and two
instrumental recordings were added. All RADIO audio is served locally; YouTube
is used only for optional, visible video playback. None of these audio files was
downloaded from YouTube.

The earlier NCM imports used an audited implementation of the container algorithm
also used by the requested [conversion site](https://ncm.worthsee.com/), with the
[MIT-licensed pyNCMDUMP implementation](https://github.com/allenfrostline/pyNCMDUMP)
as a reference. The two new MP3s were remuxed with `-c:a copy` to omit download
metadata and embedded artwork. Their original compressed audio packets were
preserved, verified by matching audio-packet SHA-256 hashes and complete decoding.
The six retained MP3s were not rewritten. Original files in the owner's music
library remain unchanged; only the seven removed selections' website copies and
their LRC files were removed.

Music and lyrics retain the rights of their respective creators and publishers;
the website template's software license does not apply to these recordings or
lyrics. Original Touhou compositions are by ZUN / 上海アリス幻樂団.

| Song                                   | Recording credit                     | Local audio                                                 | Optional video                                                            |
| -------------------------------------- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| 斑にマーガレット                       | 東方LostWord feat. konoco × 森羅万象 | [madara-ni-margaret.mp3](madara-ni-margaret.mp3) · 4:01.920 | [Official MV](https://www.youtube.com/watch?v=AhA--es6CLg)                |
| Fall in the Dark                       | ShibayanRecords / yana               | [fall-in-the-dark.mp3](fall-in-the-dark.mp3) · 9:22.991     | [Official upload](https://www.youtube.com/watch?v=0WHPeP4-SXM)            |
| インスタントブルー                     | 森羅万象 / あよ                      | [instant-blue.mp3](instant-blue.mp3) · 5:07.722             | [Official MV](https://www.youtube.com/watch?v=sxsxtfBBed8)                |
| Opposite World                         | 幽閉サテライト / senya               | [opposite-world.mp3](opposite-world.mp3) · 4:42.331         | [Official upload](https://www.youtube.com/watch?v=1_OhQpWwKhY)            |
| miscalc                                | minimum electric design / mineko     | [miscalc.mp3](miscalc.mp3) · 4:27.050                       | [Official upload](https://www.youtube.com/watch?v=JaNFhtDhEfE)            |
| 物凄い狂っとるフランちゃんが物凄いうた | Halozy / ななひら                    | [flan-song.mp3](flan-song.mp3) · 4:35.592                   | [Official upload](https://www.youtube.com/watch?v=Ji5YExbaf1Y)            |
| 紅楼 ～ Eastern Dream                  | Demetori                             | [eastern-dream.mp3](eastern-dream.mp3) · 10:55.256          | [belaired — fan upload](https://www.youtube.com/watch?v=t3sm6RcBpXU)      |
| Moriya set 00 ReEdit ～ 封印されし神々 | 凛 / クロネコラウンジ                | [moriya-sealed-gods.mp3](moriya-sealed-gods.mp3) · 1:24.793 | [Tortol Senpai — fan upload](https://www.youtube.com/watch?v=2ADDKbXrDBo) |

## New recording provenance

- `Demetori - 红楼 ~ Eastern Dream.mp3`: title/artist tags identify Demetori,
  album **如臨深遠 ～雨縒煙柳～**, track 8, 44.1 kHz / 320 kbps. The
  [artist's album catalog](https://demetori.xii.jp/products.html) distinguishes
  this electric arrangement from track 9, **Acoustic Demo**. The matched YouTube
  page was checked directly on 2026-10-13: title, album description and 10:55
  duration agree. It is a fan upload, not an official MV.
- `凛 - Moriya set ReEdit 00 . 封印されし神々.mp3`: the owner's exact requested
  filename, album tag **House set of Mountain of Faith ReEdit**, track 1,
  44.1 kHz / 320 kbps. The [creator's BOOTH release](https://booth.pm/en/items/1671071)
  lists this ReEdit as track 1. The matching YouTube page, checked directly on
  2026-10-13, credits 凛 and the Yasaka ReEdit set and plays for 1:25. It explicitly
  identifies itself as a third-party upload.
- The similar local filename `凛 - Moriya set 00 ReEdit ～ 封印されし神々.mp3`
  was **not used**. It is 3:21.221 and tagged **House set of "Mountain of Faith"**,
  year 2009, so its name alone is misleading. No lyrics from that other file
  were copied.

| Added file             | SHA-256 of shipped MP3                                             | SHA-256 of compressed audio packets (matches original)             |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| eastern-dream.mp3      | `cb2b2f9eacd5082ade5d71f02b806e9ed41636607592d1a5d0da98b85f930748` | `e5c0c473f4b9e5d3e21c43a6a8d8fa9fbda7b524eb93068f12477d04660a0062` |
| moriya-sealed-gods.mp3 | `28ba3e09b9db3edb7611ae8dd186344d76e8c6978a983a64e85b66832003dde4` | `7860c54aef23b93e7514d4771d47bc30fab09d415ebd0293cd52f3b92389ce78` |

## Entry cues

Each catalog entry exposes `duration` (seconds measured from the shipped MP3),
`cueStarts` (candidate entry seconds) and `cueMethod: "energy-transition-v1"`.
These are **heuristic energetic entry candidates**, not verified chorus labels,
beat-grid positions or exact compositional climax markers. They apply only to
the local recording; no `videoCueStarts` are asserted for differently edited
videos.

Analysis decoded a temporary mono 8 kHz float stream without changing the MP3.
It measured RMS in 0.25-second windows and compared the mean dB level over the
next 12 seconds with the preceding 6 seconds. Candidate times lie between
`max(12, min(30, duration × 0.16))` and `min(duration × 0.8, duration − 24)`.
Windows below the recording's median level minus 1 dB are excluded. Ranking is
`nextMean + 0.8 × clamp(rise, −2, 8) − 0.2 × nextStandardDeviation`; candidates
are separated by at least 24 seconds. Up to three positive rises of at least
0.5 dB are retained. Moriya has one suitable rise. This avoids silent intros,
fade-outs and isolated loud transients while leaving substantial music to play.

| Recording                              | Candidate entry seconds (ranked) | Strongest candidate: next 12 s mean / rise |
| -------------------------------------- | -------------------------------- | ------------------------------------------ |
| 斑にマーガレット                       | 189.50, 125.75, 51.75            | −7.22 dB / +4.84 dB                        |
| Fall in the Dark                       | 370.75, 111.50, 291.50           | −8.11 dB / +2.89 dB                        |
| インスタントブルー                     | 89.75, 197.75, 60.00             | −6.82 dB / +8.47 dB                        |
| Opposite World                         | 152.25, 35.00, 127.00            | −6.69 dB / +3.49 dB                        |
| miscalc                                | 85.25, 49.25, 205.00             | −6.61 dB / +1.59 dB                        |
| 物凄い狂っとるフランちゃんが物凄いうた | 50.25, 218.00, 102.25            | −5.84 dB / +2.20 dB                        |
| 紅楼 ～ Eastern Dream                  | 283.25, 413.75, 471.50           | −8.02 dB / +4.56 dB                        |
| Moriya set 00 ReEdit ～ 封印されし神々 | 21.00                            | −8.49 dB / +3.31 dB                        |

## Lyrics and video timing

Six vocal recordings retain their owner-supplied UTF-8 `.lrc` files. The two
instrumentals have `instrumental: true` and an empty `lyrics` URL; they do not
request a nonexistent LRC. Browser-local lyric imports still take priority.

The local インスタントブルー and 斑にマーガレット recordings have longer MV
presentations. Fall in the Dark and the Halozy recording also differ slightly
in container/video timing. PV uses its own lyric key and optional LRC import:
the local recording's lyrics and cue times must not be copied blindly to it.
The local files exclude the Fall in the Dark remix and miscalc off-vocal version.

RADIO and PV share these eight selections. The receiver starts silent and only
loads audio/video after playback is requested. Battle music remains independent;
its [dBu provenance and beat analysis](../danmaku/README.md) are separate.
