# Recorded character interjections

The Playground uses 18 short recordings, not TTS or cloned voices. **声：入**
enables occasional interjections; volume and credits are in **設定**. New visits
start silent. All 465 written lines use kana-driven mouth animation independently of these
optional recordings. Full-line generated speech, its generator and all 135 MP3s were removed.

| Character | Recorded source | Direction |
| --- | --- | --- |
| Alice | 東北イタコ — 木戸衣吹 | Measured acknowledgements, soft laughter |
| Marisa | あみたろの声素材工房 — あみたろ | Brisk, bright responses |
| Patchouli | 東北きりたん — 茜屋日海夏 | Restrained questions and sighs |

These are existing voice-material recordings used in a fan-work interface, not
performances commissioned for Touhou. Credits never imply the actors voiced
the written dialogue or endorse this site.

Official downloads and terms:

- [東北ずん子・ずんだもんプロジェクト voice material](https://zunko.jp/con_voice.html),
  [creator guidelines](https://zunko.jp/guideline.html).
- [あみたろ recordings](https://amitaro.net/voice/voice_dl/),
  [voice-material terms](https://amitaro.net/voice/voice_rule/).

`assets/audio/reactions/sources.json` records each original WAV path or URL.
Each character has acknowledgement, curiosity, surprise, laughter, sigh and
displeasure clips. Use each recording under its source terms, not the site's
code license. Do not redistribute them as a standalone sound library.

Audio processing removes leading/trailing silence (preserving 30/80 ms),
normalizes to -23 LUFS with a -3 dBTP ceiling, and encodes mono 44.1 kHz/96 kbps
MP3. No pitch shifting, time stretching, AI synthesis or words spliced together.
The resulting clips are approximately 0.2–0.9 seconds each.

`companion-voice-reactions.js` maps explicit dialogue effects to suitable
interjections. Neutral lines mostly remain silent; playback is limited to once
per five seconds per character and never repeats the same clip consecutively.
Enabling the switch previews the current emotional response once. Changing
lines, minimizing, closing, entering the game, leaving the tab or navigating
stops playback. Delayed requests cannot play after opt-out. Audio failures do
not block text, automatic advance or animation. BGM and SE remain independent.
