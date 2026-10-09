"""Render the fixed dialogue corpus with VOICEVOX CORE 0.17.0, locally.

Only generated MP3s and phoneme timing metadata are published. Models and
runtime stay outside the repository. See docs/companion-voices.md for setup.
"""
import argparse
import hashlib
import io
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

ROOT = Path(__file__).resolve().parents[1]
EXTRACT = r"""
require('./assets/js/data/companion-dialogues.js');
require('./assets/js/data/companion-remarks.js');
const fs=require('node:fs'),vm=require('node:vm');
const loader=fs.readFileSync('assets/js/core/live2d-loader.js','utf8');
const originals=vm.runInNewContext('('+loader.split('var CHARACTER_INTERACTIONS = ')[1].split(';\n  var preferenceStorageKey')[0]+')');
const result={};
for(const id of Object.keys(CompanionStories.characters)) {
 const lines=new Map();
 function collect(v) {
  if(!v||typeof v!=='object')return;
  if(typeof v.text==='string')lines.set(v.text,v);
  Object.values(v).forEach(collect);
 }
 [CompanionStories.characters[id],CompanionRemarks[id],originals[id]].forEach(collect);
 result[id]=[...lines.values()];
}
process.stdout.write(JSON.stringify(result));
"""
PROPER_NAMES = {"魔理沙": "マリサ", "霊夢": "レイム", "咲夜": "サクヤ", "美鈴": "メイリン",
                "紅魔館": "コウマカン", "霖之助": "リンノスケ", "香霖": "コウリン", "小鈴": "コスズ",
                "八卦炉": "ハッケロ", "上海": "シャンハイ", "蓬莱": "ホウライ", "妖魔本": "ヨウマボン"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core', type=Path, required=True)
    parser.add_argument('--node', default='node')
    parser.add_argument('--limit', type=int, help='Render a preview per character, outside the published manifest')
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/audio/voices')
    args = parser.parse_args()
    profiles = json.loads((ROOT / 'scripts/companion-voices.json').read_text())
    corpus = json.loads(subprocess.check_output([args.node, '-e', EXTRACT], cwd=ROOT))
    args.output.mkdir(parents=True, exist_ok=True)
    cache_dir = args.core.parent / 'render-cache'
    cache_dir.mkdir(parents=True, exist_ok=True)
    ort = next((args.core / 'onnxruntime/lib').glob('*onnxruntime*.dylib'))
    synth = Synthesizer(Onnxruntime.load_once(filename=str(ort)),
                        OpenJtalk(args.core / 'dict/open_jtalk_dic_utf_8-1.11'),
                        acceleration_mode='CPU', cpu_num_threads=4)
    for model in sorted({p['model'] for p in profiles.values()}):
        with VoiceModelFile.open(args.core / 'models' / model) as file:
            synth.load_voice_model(file)
    manifest = {'engine': 'VOICEVOX CORE 0.17.0', 'profiles': profiles, 'lines': {}}
    for character, lines in corpus.items():
        profile = profiles[character]
        manifest['lines'][character] = {}
        for index, line in enumerate(lines[:args.limit] if args.limit else lines):
            text = line['text']
            digest = hashlib.sha256(json.dumps([character, text, line.get('expressionMotionId'), profile], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
            filename = f'{character}-{digest}.mp3'
            cache = cache_dir / (filename + '.json')
            if cache.exists() and (args.output / filename).exists():
                metadata = json.loads(cache.read_text())
            else:
                spoken = text
                for name, reading in PROPER_NAMES.items():
                    spoken = spoken.replace(name, reading)
                query = synth.create_audio_query(spoken, profile['speaker'])
                query.speed_scale = profile['speed']
                query.pitch_scale = profile['pitch']
                query.intonation_scale = profile['intonation']
                if line.get('expressionMotionId') in ('02', '07'):
                    query.intonation_scale += .08
                query.pre_phoneme_length = .12
                query.post_phoneme_length = .18
                query.output_sampling_rate = 24000
                cues, t = [], query.pre_phoneme_length / query.speed_scale
                for phrase in query.accent_phrases:
                    for mora in list(phrase.moras) + ([phrase.pause_mora] if phrase.pause_mora else []):
                        # CORE's validated query setters may normalize nested moras to dicts.
                        value = mora if isinstance(mora, dict) else vars(mora)
                        t += (value.get('consonant_length') or 0) / query.speed_scale
                        length = value['vowel_length'] / query.speed_scale
                        vowel = value['vowel'].lower()
                        cues.append([t, length, vowel if vowel in ('a','i','u','e','o','n','cl') else 'rest'])
                        t += length
                wav = synth.synthesis(query, profile['speaker'])
                with wave.open(io.BytesIO(wav)) as audio:
                    duration = audio.getnframes() / audio.getframerate()
                factor = duration / (t + query.post_phoneme_length / query.speed_scale)
                cues = [[round(t*factor,3),round(d*factor,3),v] for t,d,v in cues]
                with tempfile.NamedTemporaryFile(suffix='.wav') as source:
                    source.write(wav); source.flush()
                    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y',
                                    '-i', source.name, '-c:a', 'libmp3lame', '-b:a', '64k', str(args.output / filename)], check=True)
                metadata = {'src': filename, 'duration': round(duration,3), 'cues': cues}
                cache.write_text(json.dumps(metadata, ensure_ascii=False, separators=(',',':')))
            manifest['lines'][character][text] = metadata
            print(f'{character} {index+1}/{len(lines)} {filename}', flush=True)
    (args.output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',',':')))
    print(f'Rendered {sum(len(v) for v in manifest["lines"].values())} voiced lines.')


if __name__ == '__main__':
    main()
