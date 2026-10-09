"""Render the credited Luna Reverie MIDIs as a local General MIDI ensemble.

macOS: pip install mido imageio-ffmpeg; then run this script.
The two source MIDIs are fetched from the arranger's own site and kept only in
this temporary build directory. Kanpyo's Marisa recording is already rendered;
its exact archive member and license are documented in CREDITS.md.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request

import imageio_ffmpeg
import mido

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/music/companion"
SOURCES = {"alice": "tha13", "patchouli": "tha06"}
with tempfile.TemporaryDirectory(prefix="playground-midi-") as directory:
    work = Path(directory)
    renderer = work / "render-midi"
    subprocess.run(["xcrun", "clang", "-fobjc-arc", "-framework", "Foundation", "-framework", "AVFoundation", "-framework", "AudioToolbox", str(ROOT / "scripts/render-companion-midi.m"), "-o", str(renderer)], check=True)
    for character, source in SOURCES.items():
        path = work / (character + ".mid")
        path.write_bytes(urllib.request.urlopen("https://lunareverie.iza-yoi.net/midi-a/" + source + ".mid").read())
        events, elapsed = [], 0
        for message in mido.MidiFile(path):
            elapsed += message.time
            if message.is_meta or message.type == "sysex":
                continue
            # This source uses GS bank selection; use the corresponding GM voice.
            if message.type == "control_change" and message.control in (0, 32):
                continue
            if character == "alice" and message.type == "program_change":
                # A small chamber trio: the original music box, harp and bowed bass.
                message.program = {0: 10, 1: 46, 2: 43}[message.channel]
            events.append(dict(time=elapsed, channel=message.channel, bytes=message.bytes()))
        first = next(e["time"] for e in events if e["bytes"][0] & 0xf0 == 0x90 and e["bytes"][2])
        for event in events:
            event["time"] = max(0, event["time"] - first + .1)
        score, wav = work / "score.json", work / "ensemble.wav"
        score.write_text(json.dumps(events))
        subprocess.run([str(renderer), str(score), str(wav)], check=True)
        subprocess.run([
            imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-v", "warning", "-i", str(wav),
            "-af", "loudnorm=I=-19:TP=-2:LRA=10,afade=t=in:d=0.1,afade=t=out:st=" + str(events[-1]["time"] + 1) + ":d=3",
            "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "160k",
            "-metadata", "artist=ZUN / 巫月和音 (望月幻奏楽団)",
            "-metadata", "comment=Touhou fan arrangement; GM rendering / Alice orchestration adapted for Playground; see CREDITS.md",
            str(ASSETS / (character + "-ensemble.mp3"))
        ], check=True)
        print(character, round(events[-1]["time"] + 4, 1), "seconds", flush=True)
