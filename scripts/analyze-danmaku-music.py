"""Offline recording-derived musical cues; requires numpy, librosa and FFmpeg."""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import librosa
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ffmpeg', default='ffmpeg')
parser.add_argument('--music', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/music/danmaku')
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
result = {}
with tempfile.TemporaryDirectory(prefix='danmaku-beats-') as directory:
    for character, bpm in [('alice', 159), ('marisa', 167), ('patchouli', 150)]:
        wav = Path(directory) / (character + '.wav')
        subprocess.run([args.ffmpeg, '-v', 'error', '-i', str(args.music / (character + '-dbu.mp3')),
                        '-vn', '-ac', '1', '-ar', '22050', str(wav)], check=True)
        y, sr = librosa.load(wav, sr=22050)
        onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
        _, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=256,
                                           bpm=bpm, tightness=110, trim=False)
        beats = librosa.frames_to_time(frames, sr=sr, hop_length=256)
        envelope = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]
        rms = np.interp(beats, np.arange(len(envelope)) * 256 / sr, envelope)
        rms = np.clip(rms / np.percentile(rms, 85), .12, 1)
        result[character] = dict(bpm=bpm, duration=round(len(y) / sr, 6),
                                 beats=[round(float(t), 4) for t in beats],
                                 energy=[round(float(np.mean(rms[i:i + 4])), 2)
                                         for i in range(0, len(rms), 4)])
        print(character, len(beats), 'beats')
args.output.write_text(json.dumps(result, ensure_ascii=False) + '\n')
