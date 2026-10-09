"""Rebuild the credited DMBN piano arrangements on macOS.

Requires Python mido + imageio-ffmpeg, Xcode command-line tools and Apple's
installed CoreAudio piano. The soundbank is never copied into the website.
"""
import json
from pathlib import Path
import subprocess
import tempfile

import imageio_ffmpeg
import mido

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/music/companion"
SPEED = {"alice": .78, "marisa": .68, "patchouli": .85}

with tempfile.TemporaryDirectory(prefix="companion-piano-") as directory:
    work = Path(directory)
    renderer = work / "render-piano"
    subprocess.run(["xcrun", "clang", "-fobjc-arc", "-framework", "Foundation", "-framework", "AVFoundation", "-framework", "AudioToolbox", str(ROOT / "scripts/render-companion-piano.m"), "-o", str(renderer)], check=True)
    for character, speed in SPEED.items():
        midi = mido.MidiFile(ASSETS / "source" / (character + ".mid"))
        events, elapsed = [], 0
        for message in midi:
            elapsed += message.time / speed
            if message.type in ("note_on", "note_off"):
                velocity = message.velocity if message.type == "note_on" else 0
                if velocity:
                    # Keep the score's dynamics; soften the hammer attack and bass.
                    velocity = max(28, min(76, round(velocity * .65)))
                    if message.note < 60:
                        velocity = max(24, velocity - 5)
                events.append(dict(time=elapsed, note=message.note, velocity=velocity))
        # Scores may have an empty count-in. Keep a small, intentional lead-in.
        start = next(event["time"] for event in events if event["velocity"])
        for event in events:
            event["time"] = max(0, event["time"] - start + .12)
        score, wav = work / "score.json", work / "piano.wav"
        score.write_text(json.dumps(events))
        subprocess.run([str(renderer), str(score), str(wav)], check=True)
        subprocess.run([
            imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-v", "warning", "-i", str(wav),
            "-af", "loudnorm=I=-21:TP=-3:LRA=9,afade=t=in:d=0.15,afade=t=out:st=" + str(events[-1]["time"] + 1) + ":d=4",
            "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "128k",
            "-metadata", "artist=ZUN / DMBN (東方ピアノEasyモード)",
            "-metadata", "comment=Unofficial Touhou piano arrangement; see CREDITS.md",
            str(ASSETS / (character + "-piano.mp3"))
        ], check=True)
        print(character, round(events[-1]["time"] + 5, 1), "seconds", flush=True)
