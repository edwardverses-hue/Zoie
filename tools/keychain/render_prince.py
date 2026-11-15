"""Hirono x Le Petit Prince - The Little Prince (Pop Mart blind box figure) as a charm.
Source: Pop Mart's product photo, background removed (rembg isnet). Hung like a DIY
figure charm: the reference split ring (ref_ring.py) from the padlock ring to a screw
eye at the top of his hair.   python3 render_prince.py [height_px] [x] [rot]"""
import sys
from PIL import Image
import numpy as np
sys.path.insert(0, '.')
from ref_ring import ring_layer
HT = float(sys.argv[1]) if len(sys.argv) > 1 else 300      # figure height on the 1200 square
X = float(sys.argv[2]) if len(sys.argv) > 2 else 560       # x of the screw eye
ROT = float(sys.argv[3]) if len(sys.argv) > 3 else -6
SS = 2; CAN = 1200 * SS
TOP_Y = 500                                                 # y of the screw eye
src = Image.open('prince-cutout.png').convert('RGBA')
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
out.resize((1200, 1200), Image.LANCZOS).save('/home/claude/hirono/04prince.png')
print('ok')
