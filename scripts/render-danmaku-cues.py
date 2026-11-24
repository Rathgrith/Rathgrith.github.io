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
 'blade_swing':(.155,[1650],'swing'),
 'lance_thrust':(.10,[1100],'thrust'),
 'haft_impact':(.14,[111,237,834],'knock'),
 'shield_parry':(.24,[83,181,419,1361],'buckler'),
 'rail_shot':(.12,[320],'coil'),
 'rail_charged':(.27,[213],'overload'),
 'pod_shot':(.095,[880],'pod'),
 'page_turn':(.16,[763],'paper'),
 'seal_release':(.15,[1250],'seal'),
 'needle_cast':(.13,[421,903],'pin'),
 'prism_cast':(.17,[1140],'lens'),
 'folio_cast':(.20,[527],'folio'),
 'hit_alice':(.095,[1340,2170],'blade'),
 'hit_marisa':(.105,[165],'rail'),
 'hit_patchouli':(.13,[810,1215],'rune'),
 'foe_break':(.22,[190],'fracture'),
 'armor_break':(.32,[320],'fracture'),
 'boss_break':(.53,[140],'fracture'),
 'upgrade':(.51,[523.25,783.99,1046.5],'equip'),
 'bomb_impact':(.14,[145],'impact'),
}
for name,(length,notes,kind) in specs.items():
 rng=random.Random(name);samples=[];phase=0;noise=0
 bright_band=0;low_band=0
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
  elif kind in ('swing','thrust','knock','buckler','coil','overload','pod','paper','seal','pin','lens','folio','blade'):
   # A moving noise band gives air, paper and edge friction different textures.
   grit=rng.uniform(-1,1)
   edge=math.sin(math.pi*u)
   bright_band+=(.22+.39*edge)*(grit-bright_band)
   low_band+=(.014+.09*edge)*(grit-low_band)
   air=bright_band-low_band
   onset=min(1,t/.002)
   if kind in ('swing','thrust'):
    arc=math.sin(math.pi*u**(.83 if kind=='swing' else .58))
    phase+=2*math.pi*notes[0]*(1.3-.82*u)/RATE
    value=(air*(.75 if kind=='swing' else .47)+noise*.55+.07*math.sin(phase))*arc**2
   elif kind=='blade':
    # Short metal contact with a scraped edge and a damped, inharmonic ring.
    scrape=air*(math.exp(-t*71)+.32*math.exp(-((t-.017)/.007)**2))
    ring=sum(math.sin(2*math.pi*f*t)*math.exp(-t*(40+14*j)) for j,f in enumerate(notes))
    value=onset*(1.65*scrape+.21*ring+.28*math.sin(2*math.pi*196*t)*math.exp(-t*57))
   elif kind in ('knock','buckler','pin'):
    modes=sum(math.sin(2*math.pi*f*t)*math.exp(-u*(4.7+j)) / (1+j*.6) for j,f in enumerate(notes))
    contact=air*(math.exp(-t*92)+.38*math.exp(-((t-.013)/.004)**2))
    value=onset*(modes*.60+contact*.85)
   elif kind in ('coil','overload','pod','lens'):
    charge=kind=='overload'
    fall=math.exp(-u*(4 if charge else 6))
    phase+=2*math.pi*notes[0]*(.34+(2.8 if charge else 1.6)*fall)/RATE
    spark=math.sin(phase+.68*math.sin(phase*2.4))+(.34 if charge else .18)*math.sin(phase*3)
    value=onset*(spark*.6*math.exp(-u*4.2)+air*math.exp(-u*12)*(.7 if charge else .33))
   else:
    # The leaves brush in quick succession. The seal opens to a clear pitched overtone.
    leaves=math.exp(-((u-.19)/.14)**2)+.56*math.exp(-((u-.49)/.13)**2)
    f=notes[0];a=max(0,t-.022)
    chime=math.sin(2*math.pi*f*a)+.38*math.sin(2*math.pi*(1.5*f)*a)
    value=air*leaves*(1.1 if kind=='paper' else .56)+chime*min(1,a/.008)*math.exp(-a*29)*(.17 if kind=='paper' else .39)
   value*=min(1,(length-t)/.012)
  elif kind in ('rail','rune','fracture','equip'):
   attack=min(1,t/.002)
   if kind=='rail':
    phase+=2*math.pi*(62+notes[0]*math.exp(-t*62))/RATE
    value=(math.sin(phase)*.7+noise*.65)*math.exp(-t*34)*attack
   elif kind=='rune':
    ring=sum(math.sin(2*math.pi*f*t+1.2*math.exp(-t*50)*math.sin(2*math.pi*385*t)) for f in notes)
    value=ring*.38*math.exp(-t*32)*attack
   elif kind=='fracture':
    # Chips split in two transients before the falling low resonance decays.
    chip=math.exp(-t*50)+(.65*math.exp(-(t-.046)*70) if t>.046 else 0)
    phase+=2*math.pi*(40+notes[0]*math.exp(-u*9))/RATE
    value=(math.sin(phase)*math.exp(-u*5)*.55+noise*chip*2)*attack
   else:
    for j,f in enumerate(notes):
     a=t-j*.066
     if a>0:
      value+=(math.sin(2*math.pi*f*a)+.2*math.sin(4*math.pi*f*a))*min(1,a/.005)*math.exp(-a*13)
   value*=min(1,(length-t)/.012)
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
