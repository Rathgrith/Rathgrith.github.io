# Playground Japanese voices

All 135 fixed lines have locally generated Japanese speech, including affinity
responses, holidays, acquaintance remarks and the existing quotations. Visitors
enable **声：入** in the dialogue box; **↻** replays the current line. Volume and
voice credits are in **設定**. Voice, conversation BGM, battle BGM and SE remain
independent and off by default on a new page load. No API key, public synthesis
service or visitor-side model download is required.

## Voice casting

These are synthetic performances using the following authorized voice banks,
not recordings of an official Touhou cast. The casting is our interpretation of
the characters. Profiles are editable in `scripts/companion-voices.json`.

| Character | Bank / voice provider | Direction |
| --- | --- | --- |
| Alice | VOICEVOX:四国めたん / 田中小雪 | Clear and self-possessed; restrained intonation, near-natural speed |
| Marisa | VOICEVOX:春日部つむぎ / 春日部つくし | Bright and direct; slightly faster and more animated, gently lowered pitch |
| Patchouli | VOICEVOX:東北きりたん / 茜屋日海夏 | Reserved delivery; slower and lower, reduced intonation |

Happy lines receive a small extra intonation adjustment. Proper-name overrides
cover Marisa, Reimu, Sakuya, Meiling, Rinnosuke, Kosuzu and relevant place/item
names. The original displayed dialogue remains unchanged.

Alternatives considered:

- [VOICEPEAK](https://www.ah-soft.com/press/voice/20250529.html): 夏色花梨 (高木美佑) and 花隈千冬 (奥野香耶) provide expressive character voices, but require purchased voice products. 花隈千冬 is a possible paid alternative for Patchouli. [桜乃そら](https://www.ah-soft.com/voice/sora/) uses 井上喜久子's softer, mature voice.
- [CeVIO AI](https://www.ah-soft.com/cevio/): licensed actor-based talk banks with emotion controls, requiring the talk editor and voice bank. Avoid confusing talk products with singing-only libraries.
- [AivisSpeech](https://aivis-project.com/): local synthesis with additional downloadable models and a VOICEVOX-compatible API. Model-specific provenance/terms still need checking.
- [VOICEVOX](https://voicevox.hiroshiba.jp/): selected for its authorized free banks, local batch API and phoneme timings; suitable for this static Pages site.

Voice-bank descriptions: [四国めたん](https://voicevox.hiroshiba.jp/product/shikoku_metan/), [春日部つむぎ](https://voicevox.hiroshiba.jp/product/kasukabe_tsumugi/), [東北きりたん](https://voicevox.hiroshiba.jp/product/tohoku_kiritan/). Provider credits: [ずんずんPJ](https://www.zunko.jp/). License details are in [the audio credits](../assets/audio/voices/CREDITS.md).

## Rebuild

Requires Python 3.10+, Node and the official VOICEVOX CORE 0.17.0 Python wheel
for the host architecture, plus `imageio-ffmpeg==0.6.0`. Keep the environment,
Open JTalk dictionary, ONNX Runtime and `.vvm` files outside the repository.

1. Install the appropriate wheel from [CORE 0.17.0](https://github.com/VOICEVOX/voicevox_core/releases/tag/0.17.0) in a virtual environment, and install `imageio-ffmpeg`.
2. Use the release's official downloader for the CPU ONNX runtime and Open JTalk dictionary. Review its terms. Download `0.vvm` and `21.vvm` from [VVM 0.17.0](https://github.com/VOICEVOX/voicevox_vvm/releases/tag/0.17.0) into `CORE/models/`.
3. Run `python scripts/generate-companion-voices.py --core /path/to/CORE --node /path/to/node`.
4. Build Jekyll and run `node tests/companion-voice.cjs` with the local preview serving the result.

Generation caches live beside the local CORE directory, never in the site.
Files are content-addressed by character, text, expression and profile. A
`--limit 1 --output /temporary/preview` run creates short casting previews;
never publish a partial preview manifest. MP3 output is mono, 24 kHz, 64 kbps.
The full voice pack is about 6 MB; only the current line is requested on demand.

## Playback and animation

`companion-voice.js` loads its manifest and first audio only after explicit
opt-in. An epoch cancels delayed/stale work. Load errors and timeouts expose
retry without blocking text. Replaying replaces the previous utterance;
character changes, hiding, minimizing, navigation and entering the arcade stop
it. Restoring a window does not unexpectedly replay an old line. Auto advance
waits for voice playback to finish.

The manifest includes the synthesizer's vowel timing, adjusted for speech
speed and the output duration. `HTMLAudioElement.currentTime` drives the
existing A/I/U/E/O/N/closure mouth targets; the visual typewriter cannot race
the voice driver. Silent reading still uses the reviewed kana plan. Reduced
motion retains audio while suppressing facial animation as before.

Conversation BGM ducks to 30% of its selected volume while a voice is playing,
then returns smoothly. This never enables music the visitor left off.
