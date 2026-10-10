"""Original synthesized arcade cues; no samples from commercial game recordings."""
from pathlib import Path
import math,random,struct,wave
OUT=Path(__file__).resolve().parents[1]/'assets/audio/danmaku'
RATE=44100
specs={
 'spell_alice':(1.15,[523.25,659.25,783.99],'chime'),
 'spell_marisa':(1.15,[220,329.63,440],'electric'),
 'spell_patchouli':(1.3,[392,466.16,587.33],'organ'),
 'laser_charge':(.85,[180],'rise'),
 'laser_fire':(.65,[64,96],'blast'),
 'spell_break':(.8,[880,1174.66,1567.98],'fall'),
 'spell_capture':(1.15,[523.25,659.25,783.99,1046.5],'success'),
 'score_collect':(.08,[1760],'score'),
 'bomb_impact':(.14,[145],'impact'),
}
for name,(length,notes,kind) in specs.items():
 rng=random.Random(name);samples=[];phase=0;noise=0
 for i in range(int(length*RATE)):
  t=i/RATE;u=t/length;value=0
  noise=noise*.86+rng.uniform(-1,1)*.14
  if kind=='impact':
   phase+=2*math.pi*(54+notes[0]*math.exp(-t*34))/RATE
   punch=math.sin(phase)+.2*math.sin(phase*3)
   crunch=rng.uniform(-1,1)*math.exp(-t*65)
   gate=1 if t<.038 or .049<t<.082 else .16
   env=min(1,t/.002)*math.exp(-t*23)*(1-u)*gate
   value=(punch*.65+crunch*.7)*env
  elif kind in ('rise','blast'):
   f=notes[0]*(1+u*5) if kind=='rise' else notes[0]*(1-u*.7)
   phase+=2*math.pi*f/RATE
   env=(math.sin(math.pi*u)**.7) if kind=='rise' else min(1,t/.01)*(1-u)**2
   value=(math.sin(phase)*.3+math.sin(phase*2.01)*.15+noise*(.7 if kind=='blast' else .3))*env
  else:
   for j,f in enumerate(notes):
    delay=j*(.12 if kind=='success' else .06)
    a=t-delay
    if a<0:continue
    env=min(1,a/.006)*math.exp(-a*(7 if kind=='score' else 3.4))*(1-u)
    phase=2*math.pi*f*a*(1-a*.25 if kind=='fall' else 1)
    tone=math.sin(phase)+.24*math.sin(phase*2)+.11*math.sin(phase*3.002)
    if kind=='electric':tone+=.15*math.sin(phase*5)
    if kind=='organ':tone+=.24*math.sin(phase/2)
    value+=tone*env/len(notes)
   if kind.startswith('spell') or kind in ('chime','electric','organ'):value+=noise*.22*math.sin(math.pi*u)*(1-u)
  samples.append(value)
 peak=max(abs(v) for v in samples) or 1
 with wave.open(str(OUT/(name+'.wav')),'wb') as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE)
  f.writeframes(b''.join(struct.pack('<h',round(v/peak*21000)) for v in samples))
