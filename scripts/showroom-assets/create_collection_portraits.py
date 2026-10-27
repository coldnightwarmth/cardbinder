"""Original procedural portrait art. No collection artwork is used as a texture."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,math,json
R=Path(__file__).resolve().parents[2];out=R/'assets/drifmaker/portrait/collection-wave';out.mkdir(parents=True,exist_ok=True)
W,H=1000,1250;y,x=np.mgrid[0:H,0:W];u=x/W;v=y/H;rng=np.random.default_rng(4701)
colors=[((38,54,103),(158,161,199)),((232,115,97),(239,201,136)),((218,211,188),(67,75,75)),((63,27,59),(138,65,104)),((30,133,153),(133,225,202)),((31,55,99),(141,163,193)),((80,83,91),(170,161,141)),((160,132,145),(244,219,214)),((72,40,121),(223,86,143)),((65,117,105),(188,193,143)),((15,27,49),(71,88,112)),((147,128,188),(236,215,227))]
for i,(a,b) in enumerate(colors):
 noise=rng.normal(0,1,(H,W));coarse=np.array(Image.fromarray(rng.integers(0,255,(50,40),dtype='uint8')).resize((W,H),Image.Resampling.BICUBIC))/255
 f=.30+.65*v
 if i==0:f=np.array(Image.fromarray(rng.integers(0,255,(40,32),dtype='uint8')).resize((W,H),Image.Resampling.NEAREST))/255
 if i==1:f=v+.12*np.sin(u*9+v*22)
 if i==2:f=((x//110+y//110)%2)*.70+noise*.035
 if i==3:f=.35+.28*np.sin(u*12+np.sin(v*9))+.18*coarse
 if i==4:f=(np.sin(u*28+np.sin(v*15)*2)*np.sin(v*31+np.cos(u*19))+.9)/2
 if i==5:f=.35+.38*coarse+.07*np.sin((x+y)*1.1)
 if i==6:f=.34+.42*coarse+.09*noise
 if i==7:f=.50+.35*np.sin(u*12+v*8+np.sin(v*8))
 if i==8:f=np.mod(v*5+np.sin(u*11)*.3+coarse*.3,1)
 if i==9:f=.5+.23*np.sin(u*35)*np.sin(v*35)+.12*coarse
 if i==10:f=.65*np.exp(-((u-.5)**2+(v-.35)**2)*3)+.1*coarse
 if i==11:f=np.array(Image.fromarray((np.array(Image.fromarray(rng.integers(0,255,(15,12),dtype='uint8')).resize((40,50),Image.Resampling.BICUBIC))>130).astype('uint8')*255).resize((W,H),Image.Resampling.NEAREST))/255*.65+.17
 f=np.clip(f,0,1);rgb=np.array(a)[None,None,:]*(1-f[:,:,None])+np.array(b)[None,None,:]*f[:,:,None]+noise[:,:,None]*(9 if i in [1,2,3,5,6,8,10] else 3)
 im=Image.fromarray(np.uint8(np.clip(rgb,0,255)),'RGB').convert('RGBA');d=ImageDraw.Draw(im)
 if i==1:
  d.ellipse((660,160,830,330),fill=(255,218,156,255))
  for k in range(18):yy=760+k*24;d.line((0,yy,W,yy+int(18*math.sin(k))),fill=(94,116,143,90),width=3)
 if i==6:
  for k in range(25):xx=int(rng.integers(W));yy=int(rng.integers(H));d.rectangle((xx,yy,xx+int(rng.integers(40,170)),yy+int(rng.integers(30,100))),outline=(191,176,152,255),width=2)
 if i==9:
  for xx in range(0,W,180):
   for yy in range(0,H,180):d.ellipse((xx+20,yy+35,xx+130,yy+145),outline=(213,199,140,255),width=8);d.arc((xx+45,yy+10,xx+155,yy+120),10,280,fill=(47,97,91,255),width=9)
 # Noise is baked into the bitmap; no runtime SVG filters or external requests.
 im.save(out/f'cxbg{i+1:02}.png',optimize=True)
for i in range(12):
 im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
 if i==0:
  for k in range(90):
   xx=int(rng.integers(W));yy=int(rng.integers(H));
   if 180<xx<820 and 170<yy<1110:continue
   c=[(129,229,236,230),(230,154,210,225),(240,232,194,220)][k%3];rr=int(rng.integers(5,15));d.rectangle((xx-rr,yy-rr,xx+rr,yy+rr),fill=c)
 elif i in [1,6,7,9]:
  edge=np.clip(np.maximum(abs(u-.5)*2,abs(v-.5)*2),0,1);alpha=np.clip((edge**5)*(115 if i==9 else 65)+rng.random((H,W))*12,0,150)
  if i==7:alpha=np.clip((edge**8)*rng.random((H,W))*180,0,170)
  col=(27,16,39) if i==9 else (240,228,209) if i==7 else (13,19,28)
  rgba=np.zeros((H,W,4),dtype='uint8');rgba[:,:,:3]=col;rgba[:,:,3]=alpha.astype('uint8');im=Image.fromarray(rgba,'RGBA');d=ImageDraw.Draw(im)
  for k in range(130):xx=int(rng.integers(W));yy=int(rng.integers(H));d.ellipse((xx,yy,xx+2,yy+2),fill=(248,232,216,80))
  if i==6:
   for yy in range(0,H,5):d.line((0,yy,W,yy),fill=(0,8,20,15),width=1)
 elif i==2:
  for side in [-1,1]:
   edgepts=[((0 if side<0 else W),0)]+[((int(rng.integers(12,48)) if side<0 else W-int(rng.integers(12,48))),yy) for yy in range(0,H+25,25)]+[((0 if side<0 else W),H)];d.polygon(edgepts,fill=(232,222,199,245))
 elif i==3:
  for sx in [0,1]:
   for sy in [0,1]:
    xx=25 if sx==0 else 975;yy=25 if sy==0 else 1225;dx=1 if sx==0 else -1;dy=1 if sy==0 else -1
    d.line((xx+dx*120,yy,xx,yy,xx,yy+dy*120),fill=(214,228,227,235),width=13);d.ellipse((xx-10,yy-10,xx+10,yy+10),fill=(240,195,85,255))
 elif i==4:
  for k in range(48):a=k*math.tau/48;xx=500+470*math.cos(a);yy=625+590*math.sin(a);d.ellipse((xx-13,yy-13,xx+13,yy+13),fill=(244,224,215,230));d.ellipse((xx-6,yy-8,xx+1,yy-1),fill=(255,255,255,230))
 elif i==5:
  for xx in range(0,W,25):
   for yy in [0,25,H-50,H-25]:d.rectangle((xx,yy,xx+25,yy+25),fill=(240,235,218,210) if (xx//25+yy//25)%2 else (18,21,30,210))
 elif i==8:
  for k in range(100):
   xx=int(rng.integers(W));yy=int(rng.integers(H));
   if 200<xx<800 and 160<yy<1090:continue
   c=tuple(int(150+100*math.sin(k*.3+a)**2) for a in [0,2,4])+(int(rng.integers(70,160)),);rr=int(rng.integers(12,45));d.polygon([(xx-rr,yy),(xx,yy-rr),(xx+rr,yy),(xx,yy+rr)],fill=c)
 elif i==10:
  for k in range(60):
   xx=int(rng.choice([rng.integers(0,120),rng.integers(880,1000)]));yy=int(rng.integers(H));rr=int(rng.integers(6,22));d.polygon([(xx-rr,yy-10),(xx+rr,yy-3),(xx+rr-7,yy+20),(xx-rr-7,yy+13)],fill=(236,221,184,215))
 else:
  d.rectangle((9,9,991,1241),outline=(27,24,35,220),width=16)
  for yy in range(32,H-32,53):
   for xx in [14,968]:d.rounded_rectangle((xx,yy,xx+18,yy+26),radius=3,fill=(226,214,183,220))
 im.save(out/f'cxov{i+1:02}.png',optimize=True)
# Small review sheet, original generated assets only.
sheet=Image.new('RGB',(1200,600),(235,232,226))
for i,p in enumerate(sorted(out.glob('cxbg*.png'))):sheet.paste(Image.open(p).convert('RGB').resize((150,188)),((i%6)*200,(i//6)*250))
sheet.save(out/'background-review.jpg',quality=90)
print('Generated 12 backgrounds and 12 transparent overlays')
