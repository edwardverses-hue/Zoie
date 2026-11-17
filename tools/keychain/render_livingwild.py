"""Hirono Living Wild - Fight for Joy plush (Pop Mart), drawn much bigger than the other charms (Edward).
Source: Pop Mart's product photo (white-background view with its own black ring), cut out by
flood-filling the plain background. It hangs by its own black ring from the reference split
ring (ref_ring.py), like the real pendant clipped onto a key ring.
python3 render_kodak.py [height_px] [x] [rot]"""
import sys
from PIL import Image
import numpy as np
sys.path.insert(0, '.')
from ref_ring import ring_layer
HT = float(sys.argv[1]) if len(sys.argv) > 1 else 330      # figure height on the 1200 square
X = float(sys.argv[2]) if len(sys.argv) > 2 else 560       # x of the screw eye
ROT = float(sys.argv[3]) if len(sys.argv) > 3 else -6
SS = 2; CAN = 1200 * SS
TOP_Y = 500                                                 # y of the screw eye
src = Image.open('livingwild-cutout.png').convert('RGBA')
k = HT * SS / src.height
fig = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS)
a = np.asarray(fig)[..., 3] > 128
ys, xs = np.nonzero(a); top = ys.min(); eye_x = xs[ys < top + 6].mean()
pad = Image.new('RGBA', (fig.width * 3, fig.height * 3), (0, 0, 0, 0)); ox, oy = fig.width, fig.height
pad.alpha_composite(fig, (ox, oy))
pad = pad.rotate(ROT, resample=Image.BICUBIC, center=(ox + eye_x, oy + top))
out = Image.new('RGBA', (CAN, CAN), (0, 0, 0, 0))
out.alpha_composite(ring_layer((600, 412), (X, TOP_Y + 4), SS, CAN))     # ring first, figure covers its end
out.alpha_composite(pad, (int(X * SS - ox - eye_x), int(TOP_Y * SS - oy - top)))
out.resize((1200, 1200), Image.LANCZOS).save('/tmp/04livingwild.png')
print('ok')
