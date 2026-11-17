# Computes keychain.js POSE: hover angles from each charm's opaque pixels around the ring point.
from PIL import Image; import numpy as np, math
BOX={'01suki.webp':[31.083,33.917,20.667,41.167],'06photo.webp':[34.083,34.167,30.417,53.667],'03gwen.webp':[51.667,33.833,30.833,61.083],'04livingwild.webp':[51.25,32.417,31.25,51.0]}
ext={}
for f,(l,t,w,h) in BOX.items():
  im=np.array(Image.open('keychain/'+f).convert('RGBA'))[:,:,3]; H,W=im.shape
  ys,xs=np.nonzero(im>40); X=l+(xs+.5)/W*w; Y=t+(ys+.5)/H*h
  dx=X-50; dy=Y-40; r=np.hypot(dx,dy); th=np.degrees(np.arctan2(dx,dy)); m=r>18
  ext[f]=(np.percentile(th[m],.5),np.percentile(th[m],99.5),math.degrees(math.atan2(dx[m].mean(),dy[m].mean())))
names=list(BOX); G=8; MIN=10; CAP=40; STEP=7
for h,hn in enumerate(names):
  lo,hi,c=ext[hn]; ah={0:8,3:-8}.get(h,c*0.6);   # end charms swing out a little, middle ones toward plumb
  L=lo-ah; R=hi-ah; a=[0]*4; a[h]=ah
  prev=None
  for j in range(h-1,-1,-1):
    jl,jh,jc=ext[names[j]]; need=max(jh-L+G,MIN)
    cap=CAP+STEP*(h-1-j); aj=min(need,cap)
    if prev is not None: aj=max(aj, min(prev+STEP, cap))   # farther out swings at least as far
    a[j]=aj; prev=aj
  prev=None
  for j in range(h+1,4):
    jl,jh,jc=ext[names[j]]; need=min(jl-R-G,-MIN)
    cap=-(CAP+STEP*(j-h-1)); aj=max(need,cap)
    if prev is not None: aj=min(aj, max(prev-STEP, cap))
    a[j]=aj; prev=aj
  print('    [' + ', '.join('%6.1f'%v for v in a) + '],')
