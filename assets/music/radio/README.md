# Radio library

The site owner supplied these 13 recordings and their accompanying UTF-8 LRC
files from a local music library on 2026-10-10. All RADIO audio is served from
this directory. YouTube is used only for the optional visible video player;
none of these audio files was downloaded from YouTube.

Six sources were NCM files, unpacked locally with an audited implementation of
the NCM container algorithm also used by the requested
[conversion site](https://ncm.worthsee.com/). The
[MIT-licensed pyNCMDUMP implementation](https://github.com/allenfrostline/pyNCMDUMP)
was used as a reference. Conversion code and original downloads are not shipped
with the website. All outputs are MP3, with original compressed audio packets
preserved: only download metadata and embedded artwork were removed. The original
files were left unchanged. Full decoding and audio-packet checks verified the
converted files.

Music and lyrics retain the rights of their respective creators and publishers;
the website template's software license does not apply to these recordings or
lyrics. Original Touhou compositions are by ZUN / 上海アリス幻樂団.

| Song | Recording credit | Local audio | Official video |
| --- | --- | --- | --- |
| 斑にマーガレット | 東方LostWord feat. konoco × 森羅万象 | [madara-ni-margaret.mp3](madara-ni-margaret.mp3) · 4:01 | [YouTube](https://www.youtube.com/watch?v=AhA--es6CLg) |
| 月齢11.3のキャンドルマジック | ShibayanRecords / 3L | [candle-magic.mp3](candle-magic.mp3) · 6:32 | [YouTube](https://www.youtube.com/watch?v=A9mdo3IaSts) |
| Liminality | FELT / Vivienne | [liminality.mp3](liminality.mp3) · 7:54 | [YouTube](https://www.youtube.com/watch?v=_uCAljvjSTo) |
| Fall in the Dark | ShibayanRecords / yana | [fall-in-the-dark.mp3](fall-in-the-dark.mp3) · 9:22 | [YouTube](https://www.youtube.com/watch?v=0WHPeP4-SXM) |
| インスタントブルー | 森羅万象 / あよ | [instant-blue.mp3](instant-blue.mp3) · 5:07 | [YouTube](https://www.youtube.com/watch?v=sxsxtfBBed8) |
| Opposite World | 幽閉サテライト / senya | [opposite-world.mp3](opposite-world.mp3) · 4:42 | [YouTube](https://www.youtube.com/watch?v=1_OhQpWwKhY) |
| miscalc | minimum electric design / mineko | [miscalc.mp3](miscalc.mp3) · 4:27 | [YouTube](https://www.youtube.com/watch?v=JaNFhtDhEfE) |
| 物凄い狂っとるフランちゃんが物凄いうた | Halozy / ななひら | [flan-song.mp3](flan-song.mp3) · 4:35 | [YouTube](https://www.youtube.com/watch?v=Ji5YExbaf1Y) |
| Goodbye | FELT / Vivienne | [goodbye.mp3](goodbye.mp3) · 6:05 | [YouTube](https://www.youtube.com/watch?v=Eo1VH5AaiY4) |
| Yearning | FELT / Vivienne | [yearning.mp3](yearning.mp3) · 5:12 | [YouTube](https://www.youtube.com/watch?v=4nClCNqMpzA) |
| Can't look away | FELT / Vivienne | [cant-look-away.mp3](cant-look-away.mp3) · 6:10 | [YouTube](https://www.youtube.com/watch?v=xodQ-iwwv_E) |
| 眠らない夜に見る夢 | minimum electric design / mineko | [nemuranai-yoru.mp3](nemuranai-yoru.mp3) · 5:56 | [YouTube](https://www.youtube.com/watch?v=8A8uQamWmZQ) |
| アクアテラリウム feat.あよ | 森羅万象 / あよ | [aquaterrarium.mp3](aquaterrarium.mp3) · 4:59 | [YouTube](https://www.youtube.com/watch?v=SNdkkArFFs0) |

## Video and timing differences

- FELT's Liminality, Goodbye, Yearning and Can't look away use its official
  **Audio Archives** uploads. These are official audio videos, not animated MVs.
- アクアテラリウム uses **あよ**, matching the supplied recording. The local file
  is from the 2017 C93 bonus CD; the official Topic upload is a 2019 compilation
  reissue. It is not the earlier めらみぽっぷ vocal version. See the
  [original release](https://shinrabansho-music.com/season4you/) and
  [compilation](https://shinrabansho-music.com/Another_Sensation/).
- 眠らない夜に見る夢 is the local 2012 *focus and defocus* recording, paired with
  the official 2015 *TRAIL II* reissue upload. Identical mastering is not assumed.
- The local インスタントブルー is approximately 5:07; the official MV is longer.
  斑にマーガレット likewise has a longer MV presentation. Fall in the Dark and
  the Halozy recording can differ slightly in container/video timing.
- Local files exclude the similarly named Fall in the Dark remix and miscalc
  off-vocal version.

Each MP3 has a same-name `.lrc` supplied with that recording. RADIO loads it
automatically from the same origin. User imports take priority and remain in the
visitor's browser. Timing adjustments persist independently for each recording.
PV has its own lyric key and optional LRC import: a song match does not establish
an identical timeline, so the local recording's lyrics are not blindly applied
to video edits or reissues.

The former crossfade/preview queue has been removed. RADIO and PV now share the
same 13 tracks, with both sources present for each entry. The receiver stays
silent on a fresh visit and does not fetch MP3 data or contact YouTube before
explicit playback. Battle music is independent; the current dBu recording [provenance and beat analysis](../danmaku/README.md) are separate.
