# Official promotional audio sources

RADIO and PV use one shared 16-item catalog assembled by `companion-radio.js`.
The six audio entries below sit alongside ten requested PV-only favorites. Three
audio entries also have matching official crossfade videos, making thirteen
video sources in total. These six native sources are the circles’ own public
promotional MP3s:
five album crossfade demos and one short song preview. They are not substitutes
labelled as full versions of the requested PV songs. Japanese introductions are
original editorial text, not lyrics or artist endorsements.

The player streams each HTTPS URL from its original host. No audio is downloaded
into this repository, proxied, copied to another host, or extracted from YouTube,
SoundCloud, or Bandcamp. Keep the circle credit, preview/XFD label, and official
release link visible in the player. Do not prefetch the queue before the visitor
starts playback.

## Source and playback verification

Checked on 2026-10-10. Every URL below is explicitly present on the linked
official release page; EastNewSound’s legacy discography URLs now redirect to
its redesigned release pages. Each MP3 returned HTTP 200 and `audio/mpeg` over
HTTPS with valid certificate verification. Chrome’s native `HTMLAudioElement`
loaded metadata and reached `canplay` for all six. Durations are measured from
those audio elements, not inferred from a video or estimated from file size.
EastNewSound playback also advanced normally in a muted browser smoke check.

| Queue ID | Circle / release | Scope | Duration | Official release |
| --- | --- | --- | ---: | --- |
| `tos003-weg-xfd` | 魂音泉 / World’s End Garden (TOS003, 2009) | Album XFD; includes the 人形裁判 arrangement ないものねだり ～Ask for the Moon～ | 331.550583 s | <https://tamaonsen.com/?p=18> |
| `ens0047-xfd` | EastNewSound / Ironic Relation (ENS-0047, 2016) | Album XFD; includes 陰翳観測、密室ノ独, arranged from ラクトガール | 428.486525 s | <https://e-ns.net/discography/ens0047.html> |
| `tos001-lss-preview` | 魂音泉 / 流星少女 ～Little Shooting Star～ (TOS001 track 6, 2009) | Short individual preview; 恋色マスタースパーク arrangement | 84.0512 s | <https://tamaonsen.com/?p=12> |
| `ens0069-xfd` | EastNewSound / Egoistic Flame the Instrumental (ENS-0069, 2019) | Instrumental album XFD; includes 星の器 and U.N.オーエン arrangements | 380.656325 s | <https://e-ns.net/discography/ens0069.html> |
| `tos001-lss-xfd` | 魂音泉 / 東方流星少女 ～Little Shooting Star～ (TOS001, 2009) | Album XFD; includes 上海紅茶館, フラワリングナイト, and 恋色マスタースパーク arrangements | 378.0512 s | <https://tamaonsen.com/?p=12> |
| `ens0078-xfd` | EastNewSound / OVERDOSE (ENS-0078, 2022) | Album XFD; six vocalists, including arrangements of 月時計 and ラストリモート | 334.2888 s | <https://e-ns.net/discography/ens0078.html> |

| Audio URL | HTTP / MIME | Content-Length | Range header |
| --- | --- | ---: | --- |
| <https://tamaonsen.com/mp3/tamaonsen-weg_xfade.mp3> | 200 / audio/mpeg | 7,959,302 | bytes |
| <https://e-ns.net/wp-content/uploads/2026/09/0047-xfd.mp3> | 200 / audio/mpeg | 17,139,461 | none |
| <https://tamaonsen.com/mp3/lss_06.mp3> | 200 / audio/mpeg | 3,364,123 | bytes |
| <https://e-ns.net/wp-content/uploads/2026/09/0069-xfd.mp3> | 200 / audio/mpeg | 15,226,323 | none |
| <https://tamaonsen.com/mp3/lss_xfade.mp3> | 200 / audio/mpeg | 15,124,130 | bytes |
| <https://e-ns.net/wp-content/uploads/2026/09/0078-xfd.mp3> | 200 / audio/mpeg | 13,371,552 | none |

## Paired videos and mode changes

| Audio entry | Official matching XFD video | Video duration |
| --- | --- | ---: |
| World’s End Garden | [kokorobeats / 魂音泉](https://www.youtube.com/watch?v=Ob4suUHQY74) | 338 s |
| 東方流星少女 ～Little Shooting Star～ | [kokorobeats / 魂音泉](https://www.youtube.com/watch?v=Bfb5xYpQras) | 391 s |
| OVERDOSE | [EastNewSound](https://www.youtube.com/watch?v=PiFXNHg8W8s) | 335 s |

The paired source represents the same album preview, while its video wrapper can
have a longer introduction or ending. Switching RADIO/PV preserves the item,
stops the previous source and waits for Play; it does not seek seamlessly between
versions. Local LRC records and timing are kept separately for audio and video.

Ironic Relation, Egoistic Flame the Instrumental and the short individual
流星少女 preview have no verified matching publisher video, so they remain
`RADIOのみ`. The ten original full-song favorites have no registered direct
audio source and remain `PVのみ`. The shared selector shows both labels;
unsupported-mode playback is disabled, and previous/next or automatic queue
advancement skips entries unavailable in the current mode. [Video provenance](RADIO.md).

NetEase’s official external-player preview for miscalc played in one tested
browser session, but a separate public-iframe check did not demonstrate
playback. This does not verify a direct audio URL or stable visitor playback,
and the differing results do not establish that authentication was the cause.
The [platform verification notes](RADIO.md#official-iframe-follow-up) distinguish
the official iframe from native audio and record the remaining limits. No
NetEase source or iframe was added to this six-source audio queue by that audit.

## Rights and source limitations

Public promotional availability is not a blanket redistribution license.
Copyright remains with the original creators; the original Touhou compositions
are by ZUN / 上海アリス幻樂団, with U2 / 黄昏フロンティア also credited on
World’s End Garden. This queue links and streams the published samples
from their existing official URLs and does not distribute local copies.

[魂音泉’s usage guidelines](https://tamaonsen.com/?page_id=1055) broadly allow
personal uses and describe conditions for video/streaming credits and other
uses, while prohibiting unauthorized reuploading or redistribution. The page
does not separately describe third-party webpage audio hotlinking. Its stated
conditions for a different publication medium should not be presented as an
express web-radio license.

[EastNewSound’s release pages](https://e-ns.net/discographies/) publish their
crossfade demos for public listening/download. No separate express web-radio
reuse license was found on the release or About pages. Do not describe these
sources as Creative Commons, royalty-free, or licensed for redistribution.

FELT’s current official domain failed HTTPS hostname validation in this check,
and Shibayan’s older raw preview host exposes the relevant files only over HTTP
with invalid HTTPS certificates. Those sources were not added; certificate
validation was not bypassed. The requested Shibayan songs remain in the optional
PV selection.

If an official URL is withdrawn or becomes unavailable, show the official release
link and continue to the next available preview. Do not replace it with a fan
reupload, a ripped stream, or a repository copy.
