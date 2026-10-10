"""Build rear-view flight poses from editable, integer-grid character layers.
Nine poses × two cloth frames. Head, sleeves, hem, boots and broom have
separate placements, so banking isn't a shear of the entire standing sprite.
"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]/'assets/images/classic/danmaku'
POSES=[('idle',0,0),('n',0,-1),('ne',1,-1),('e',1,0),('se',1,1),('s',0,1),('sw',-1,1),('w',-1,0),('nw',-1,-1)]
PALETTES={
    'alice':('#172238','#eeece2','#557caa','#384760',20,28,35),
    'marisa':('#111523','#ebe3d2','#4a4852','#262735',23,29,35),
    'patchouli':('#261e38','#e5d8e7','#aa8bbd','#433149',25,30,38),
}
def rect(x,y,w,h,color):
    return f'<path fill="{color}" d="M{x} {y}h{w}v{h}h-{w}z"/>'
for char,(ink,sleeve,dress,boot,neck,waist,hem) in PALETTES.items():
    source=(ROOT/(char+'-player.svg')).read_text()
    paths=''.join(re.findall(r'<path[^>]+/>',source))
    defs=[f'<g id="source">{paths}</g>']
    for name,y,h in [('head',0,neck),('body',neck,waist-neck),('skirt',waist,hem-waist)]:
        defs.append(f'<clipPath id="{name}-clip"><path d="M0 {y}h32v{h}H0z"/></clipPath>')
        defs.append(f'<g id="{name}" clip-path="url(#{name}-clip)"><use href="#source"/></g>')
    frames=[]
    for frame in range(2):
        for col,(name,dx,dy) in enumerate(POSES):
            moving=name!='idle'; flutter=(frame*2-1) if moving else 0
            top=3 if dy<0 else 5 if dy>0 else 4
            headx=4+dx*3; bodyx=4+dx; skirtx=4-dx*(2+frame)
            # Separate banking sleeves: the leading arm tucks up, trailing arm opens.
            left=neck+1+dx*3+dy*2; right=neck+1-dx*3+dy*2
            arms=rect(bodyx+1-dx,left,7,4,ink)+rect(bodyx+2-dx,left,5,3,sleeve)
            arms+=rect(bodyx+24-dx,right,7,4,ink)+rect(bodyx+25-dx,right,5,3,sleeve)
            arms+=rect(bodyx+1-dx,left+3,3,2,'#d9b79b')+rect(bodyx+28-dx,right+3,3,2,'#d9b79b')
            # Legs kick independently; southern flight opens the skirt and tucks boots.
            ly=hem+(flutter if dy<0 else -1 if dy>0 else 0)
            ry=hem+(-flutter if dy<0 else -2 if dy>0 else 1)
            feet=rect(skirtx+10-dx,ly,4,3,sleeve)+rect(skirtx+10-dx,ly+2,5,2,boot)
            feet+=rect(skirtx+19-dx,ry,4,3,sleeve)+rect(skirtx+19-dx,ry+2,5,2,boot)
            skirt=f'<use href="#skirt" transform="translate({skirtx} {-1 if dy>0 else 0})"/>'
            if dy>0:
                skirt+=rect(skirtx+3,hem-3,26,2,dress)+rect(skirtx+3,hem-1,26,1,sleeve)
            broom=''
            if char=='marisa':
                bx=skirtx+23-dx*2; by=hem-1+(1 if dy<0 else -2 if dy>0 else 0)
                broom=rect(bx-5,by-4,2,5,'#654d33')+rect(bx-3,by-1,3,2,'#92704c')
                broom+=rect(bx,by,6,4,'#cbb071')+rect(bx+2,by+3,7,2,'#e9cb86')
            layers=feet+arms+skirt+f'<use href="#body" transform="translate({bodyx} 0)"/>'
            layers+=f'<use href="#head" transform="translate({headx} {-1 if dy<0 else 1 if dy>0 else 0})"/>'+broom
            frames.append(f'<g id="{name}-{frame}" transform="translate({col*40} {frame*48+top})">{layers}</g>')
    output='<svg xmlns="http://www.w3.org/2000/svg" width="360" height="96" viewBox="0 0 360 96" shape-rendering="crispEdges">'
    output+=f'<title>{char}: idle and eight rear flight poses, two cloth frames</title><defs>'+''.join(defs)+'</defs>'+''.join(frames)+'</svg>\n'
    (ROOT/(char+'-flight.svg')).write_text(output)
