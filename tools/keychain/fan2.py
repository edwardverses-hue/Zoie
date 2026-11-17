# Keychain geometry + hover poses (keychain.js RING / PIVOT / POSE).
# Main ring measured on 00padlock.webp (192x438 px placed at 42.333,1.917 16x36.5 %, 12 px per %):
# outer x 21..172 / inner 37..156 at y 342-354, bottom 424 -> centre (96.5,348.5) px,
# wire mid radius 67.5 px. Each charm turns about the ring's centre, so its loop slides round
# the wire and keeps exactly the same hold on it in every pose (it can never leave the ring).
from PIL import Image; import numpy as np, math
BOX={'01suki.webp':[31.083,33.917,20.667,41.167],'06photo.webp':[34.083,34.167,30.417,53.667],
     '03gwen.webp':[51.667,33.833,30.833,61.083],'04livingwild.webp':[51.25,32.417,31.25,51.0]}
CX,CY=42.333+96.5/192*16, 1.917+348.5/438*36.5; RM=67.5/12
names=list(BOX); S=4   # px per % for the overlap raster (400x400)
piv={}; masks={}; cent={}
for n,(l,t,w,h) in BOX.items():
  im=np.array(Image.open('keychain/'+n).convert('RGBA')); H,W=im.shape[:2]; a=im[:,:,3]
  ys,xs=np.nonzero(a>100); X=l+(xs+.5)/W*w; Y=t+(ys+.5)/H*h
  dx=X-CX; dy=Y-CY; r=np.hypot(dx,dy); th=np.degrees(np.arctan2(dx,dy))
  band=(r>4.9)&(r<6.4); phi=math.radians(th[band].mean())
  px,py=CX,CY; piv[n]=(px,py,math.degrees(phi))   # rotate about the ring centre: the loop slides round the wire
  body=np.hypot(X-CX,Y-CY)>9          # body = away from the ring, where loops/chains all meet
  cent[n]=math.degrees(math.atan2((X[body]-px).mean(),(Y[body]-py).mean()))
  m=Image.new('L',(100*S,100*S),0)
  sm=Image.fromarray(((a>100)*255).astype('uint8')).resize((round(w*S),round(h*S)))
  m.paste(sm,(round(l*S),round(t*S)))
  masks[n]=m
yy,xx=np.mgrid[0:100*S,0:100*S]
far=(np.hypot(xx/S-CX,yy/S-CY)>9)
def pose(n,alpha):   # CSS rotate(alpha deg) clockwise about the pivot
  px,py,_=piv[n]
  return np.array(masks[n].rotate(-alpha,center=(px*S,py*S),resample=Image.NEAREST))>0
def overlap(a,b): return int((a&b&far).sum())
CAP=50; MIN=10
POSE=[]
for h,hn in enumerate(names):
  ah={0:8,3:-8}.get(h, cent[hn]*0.6)
  hm=pose(hn,ah); a=[0]*4; a[h]=ah
  for side,rng in ((1,range(h-1,-1,-1)),(-1,range(h+1,4))):
    prev=None
    for j in rng:
      n=names[j]; lo=MIN if prev is None else max(MIN,abs(prev))
      best=None
      for s in np.arange(lo,CAP+0.01,1.0):
        if overlap(pose(n,side*s),hm)==0: best=s; break
      if best is None: best=CAP if prev is None else min(CAP+7,abs(prev)+5)
      a[j]=side*best; prev=a[j]
  POSE.append(a)
  ov=[overlap(pose(names[j],a[j]),hm) for j in range(4) if j!=h]
  print(hn,'pose',[round(x,1) for x in a],'overlap with hovered',ov)
print('RING',round(CX,3),round(CY,3),round(RM,3))
for n in names: print(n,'pivot %.3f %.3f phi %.1f  body centroid angle %.1f'%(piv[n][0],piv[n][1],piv[n][2],cent[n]))
