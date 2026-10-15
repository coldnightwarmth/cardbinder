"""Code-native vector companions to the Mi Note studies. Reproducible, no external SVG resources."""
from pathlib import Path
import json,random,math
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/drifmaker/portrait/minote';OUT.mkdir(parents=True,exist_ok=True)
cat=json.loads((ROOT/'scripts/showroom-assets/minote-catalog.json').read_text());rng=random.Random(58149)
def svg(content):return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="0 0 1000 1250">'+content+'</svg>'
def rect(fill,opacity=1):return f'<rect width="1000" height="1250" fill="{fill}" opacity="{opacity}"/>'
def wash(colors):
 s='<defs><filter id="wash"><feTurbulence type="fractalNoise" baseFrequency=".007" numOctaves="3" seed="58"/><feDisplacementMap in="SourceGraphic" scale="85"/></filter><filter id="grain"><feTurbulence baseFrequency=".64" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="multiply"/></filter></defs>'+rect(colors[0])
 for j in range(14):s+=f'<ellipse cx="{rng.randrange(-100,1100)}" cy="{rng.randrange(-100,1350)}" rx="{rng.randrange(160,420)}" ry="{rng.randrange(180,510)}" fill="{colors[1+j%2]}" opacity=".19" filter="url(#wash)"/>'
 return s+'<rect width="1000" height="1250" opacity=".075" filter="url(#grain)"/>'
backs=[]
s=wash(['#e9e1cc','#a5adb2','#d5c6b4']);s+=''.join(f'<path d="M0 {y}H1000" stroke="#8298a1" opacity=".35"/>' for y in range(52,1250,42));s+='<path d="M135 0V1250" stroke="#c88085" opacity=".5"/>';backs.append(s)
backs.append(wash(['#d4e0df','#365477','#6c9396']))
s=wash(['#d2c9b8','#6f7781','#c5ae80']);s+='<path d="M30 1250V380Q40 160 500 20Q960 160 970 380V1250H890V400Q870 250 500 115Q130 250 110 400V1250Z" fill="#626875" opacity=".6"/>';backs.append(s)
s=wash(['#b5bba4','#4b685b','#dad4a8']);s+=''.join(f'<path d="M{x} 1250Q{x-70} 600 {x+20} 0" stroke="#4e5b4c" stroke-width="{w}" opacity=".3" fill="none"/>' for x,w in [(30,45),(130,20),(850,28),(980,55)]);backs.append(s)
backs.append(wash(['#efdbd2','#c36b7c','#e5b194']));backs.append(wash(['#f0d1a2','#b76161','#e6a449']));backs.append(wash(['#b5acc4','#53446f','#8b9aae']));backs.append(wash(['#c3ded2','#347c8a','#b2bc6f']));backs.append(wash(['#d4cfc7','#777a7d','#b8aea1']))
for row,s in zip(cat['background'],backs):(OUT/(row['id']+'.svg')).write_text(svg(s))
# Overlays keep a transparent central face lane, with deliberately restrained alpha.
forms=[]
forms.append(''.join(f'<path d="M0 {y}H1000" stroke="#8e9db2" opacity=".14"/>' for y in range(52,1250,42))+'<path d="M100 0V1250" stroke="#d66b71" opacity=".3"/>')
s=''
for j in range(22):
 x=rng.choice([rng.randrange(30,170),rng.randrange(830,970)]);y=rng.randrange(40,1210);r=rng.randrange(8,24);pts=' '.join(f'{x+math.sin(k*math.pi/5)*r*(1 if k%2==0 else .4):.1f},{y+math.cos(k*math.pi/5)*r*(1 if k%2==0 else .4):.1f}' for k in range(10));s+=f'<polygon points="{pts}" fill="#d4ad57" opacity=".65"/>'
forms.append(s)
forms.append('<defs><radialGradient id="edge"><stop offset=".55" stop-color="#756983" stop-opacity="0"/><stop offset="1" stop-color="#756983" stop-opacity=".45"/></radialGradient></defs>'+rect('url(#edge)'))
s=''
for j in range(90):
 x=rng.choice([rng.randrange(0,160),rng.randrange(840,1000)]);y=rng.randrange(1250);s+=f'<ellipse cx="{x}" cy="{y}" rx="{rng.randrange(1,6)}" ry="{rng.randrange(2,10)}" fill="#a94750" opacity=".48"/>'
forms.append(s)
s=''
for j in range(80):
 x=rng.choice([rng.randrange(0,125),rng.randrange(875,1000)]);y=rng.randrange(1250);s+=f'<path d="M{x} {y}l{rng.randrange(-40,40)} {rng.randrange(15,70)}" stroke="#34363c" opacity=".22" stroke-width="1.2"/>'
forms.append(s)
forms.append(''.join(f'<path d="M{x} {y}l140 -25 15 65 -140 25Z" fill="#eee1af" opacity=".46"/>' for x,y in [(20,45),(820,85),(15,1150),(825,1190)]))
forms.append(''.join(f'<g transform="translate({x} {y}) rotate({a})" fill="none" stroke="#b24255" opacity=".55"><circle r="49" stroke-width="4"/><circle r="39" stroke-width="1.5"/><path d="M-32 0H32M-20 -13H20M-20 13H20" stroke-width="3"/></g>' for x,y,a in [(90,170,-17),(915,1050,21),(850,70,12)]))
forms.append('<path d="M0 0H70L57 80 79 146 54 230 81 310 59 390 72 480 53 570 79 680 55 770 73 860 55 980 80 1100 62 1250H0Z" fill="#eee3c9" opacity=".6"/><path d="M1000 0H950L970 120 944 230 968 360 947 500 967 670 950 820 974 990 947 1100 963 1250H1000Z" fill="#eee3c9" opacity=".6"/>')
s=''
for j in range(65):
 x=rng.randrange(1000);y=rng.choice([rng.randrange(0,140),rng.randrange(1080,1250)]);w=rng.randrange(3,12);s+=f'<path d="M{x} {y}l{w} -2 3 {w} -{w} 3Z" fill="#dcc078" opacity=".7"/>'
forms.append(s)
for row,s in zip(cat['overlay'],forms):(OUT/(row['id']+'.svg')).write_text(svg(s))
