"""Ghost-Spider (Spider-Gwen) LEGO key chain 854292 as a charm on the shared 1200 square.
Source: LEGO's own product photo (lego.com, transparent PNG). LEGO's large split
ring is dropped; her real chain hangs from a small jump ring on the padlock's ring,
like the other charms.  Run from tools/keychain:  python3 render_gwen.py [scale]"""
import sys
from PIL import Image
import numpy as np
sys.path.insert(0, '.')

SCALE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
ROT = float(sys.argv[2]) if len(sys.argv) > 2 else 0     # + swings her to the right (counter-clockwise image rotation)
SS = 2; CAN = 1200 * SS

src = Image.open('ghost-spider-854292.png').convert('RGBA')
a = np.asarray(src)[..., 3] > 40
# first row below LEGO's big split ring where only the chain remains
widths = [(y, np.ptp(np.nonzero(a[y])[0])) for y in range(300, 700) if a[y].any()]
top = next(y for y, w in widths if w < 90) + 6
body = src.crop((0, top, src.width, src.height))
ys, xs = np.nonzero(np.asarray(body)[..., 3] > 40)
chain_x = np.nonzero(np.asarray(body)[..., 3][4] > 40)[0].mean()       # centre of the top chain link
body = body.crop((xs.min(), 0, xs.max() + 1, ys.max() + 1)); chain_x -= xs.min()
k = SCALE * SS
body = body.resize((round(body.width * k), round(body.height * k)), Image.LANCZOS)

def metal(cx, cy, R, half=2.4):
    out = np.zeros((CAN, CAN, 4)); m = int(R + 8 * SS)
    gy, gx = np.mgrid[int(cy - m):int(cy + m), int(cx - m):int(cx + m)]
    d = np.abs(np.sqrt((gx - cx) ** 2 + (gy - cy) ** 2) - R) / (half * SS)
    al = np.clip((1 - d) * 3, 0, 1); sh = 215 - 125 * np.clip(d, 0, 1) ** 1.5
    out[gy, gx, :3] = np.stack([sh * .98, sh, sh * 1.03], -1).clip(0, 255); out[gy, gx, 3] = al * 255
    return Image.fromarray(out.astype(np.uint8))

# the reference's own split ring (see ref_ring.py) from the padlock ring, through
# the top link of her real LEGO chain
from ref_ring import ring_layer
RING_TOP = (628, 412)
LINK = (640, 500)                                                        # top of her chain (1200 px)
out = Image.new('RGBA', (CAN, CAN), (0, 0, 0, 0))
px, py = chain_x * k, 0
pad = Image.new('RGBA', (body.width * 3, body.height * 2 + body.width * 2), (0, 0, 0, 0)); ox, oy = body.width, body.width
pad.alpha_composite(body, (ox, oy))
pad = pad.rotate(ROT, resample=Image.BICUBIC, center=(ox + px, oy + py))
out.alpha_composite(pad, (int(LINK[0] * SS - ox - px), int(LINK[1] * SS - oy)))
out.alpha_composite(ring_layer(RING_TOP, (LINK[0], LINK[1] + 8), SS, CAN))   # ring passes through the top link, in front
out.resize((1200, 1200), Image.LANCZOS).save('/home/claude/gwen/03gwen.png')
print('ok', 'chain starts at source row', top)
