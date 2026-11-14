"""Render the acrylic photo keychain as a clean, high-res charm layer that hangs
from the reference ring. Proportions come from Edward's photo of the real thing."""
from PIL import Image, ImageOps, ImageDraw, ImageFilter
import numpy as np
from scipy import ndimage

SS = 3                       # supersample
CAN = 1200 * SS
s = 0.60 * SS                # source px -> canvas px

src = ImageOps.exif_transpose(Image.open('/home/claude/kc/src.jpg')).convert('RGB')
# real-object measurements (source px)
BODY = (390, 865, 957, 1631)      # outer acrylic body
TAB_BASE_W, TAB_TOP_W, TAB_H = 176, 96, 72
HOLE = (686 - 390, 842 - 865)     # hole centre, body-local
HOLE_R = 12
POCKET = (450 - 390, 925 - 865, 897 - 390, 1569 - 865)   # print area, body-local
RADIUS = 46

bw, bh = BODY[2] - BODY[0], BODY[3] - BODY[1]
pad_top = TAB_H + 10
LW, LH = int((bw + 40) * s), int((bh + pad_top + 40) * s)
ox, oy = 20 * s, (pad_top + 20) * s          # body origin inside local image
P = lambda x, y: (ox + x * s, oy + y * s)

# ---- shape mask ----
m = Image.new('L', (LW, LH), 0); d = ImageDraw.Draw(m)
d.rounded_rectangle([*P(0, 0), *P(bw, bh)], radius=RADIUS * s, fill=255)
cx = HOLE[0]
tab = [P(cx - TAB_BASE_W / 2, 30), P(cx - TAB_TOP_W / 2, -TAB_H + 14),
       P(cx - TAB_TOP_W / 2 + 14, -TAB_H), P(cx + TAB_TOP_W / 2 - 14, -TAB_H),
       P(cx + TAB_TOP_W / 2, -TAB_H + 14), P(cx + TAB_BASE_W / 2, 30)]
d.polygon(tab, fill=255)
m = m.filter(ImageFilter.GaussianBlur(1.2 * s / 3)).point(lambda v: 255 if v > 127 else 0)
hx, hy = P(*HOLE); hr = HOLE_R * s
hole = Image.new('L', (LW, LH), 0); ImageDraw.Draw(hole).ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=255)
M = (np.asarray(m) > 0) & ~(np.asarray(hole) > 0)

px = lambda v: v * SS * 0.6 / 0.6          # final-px -> local px (s already includes SS)
dist = ndimage.distance_transform_edt(M) / SS      # distance to edge in final px
yy, xx = np.mgrid[0:LH, 0:LW]

# ---- acrylic slab ----
rgb = np.zeros((LH, LW, 3)); A = np.zeros((LH, LW))
gy = (yy - oy) / (bh * s)
base_a = 0.15 - 0.05 * np.clip(gy, 0, 1)
rgb[:] = (250, 252, 255); A = np.where(M, base_a, 0)

def band(lo, hi, soft=0.6):
    return np.clip((dist - lo) / soft, 0, 1) * np.clip((hi - dist) / soft, 0, 1)

def over(col, alpha):
    global rgb, A
    alpha = np.where(M, alpha, 0)
    rgb = rgb * (A * (1 - alpha))[..., None] / np.maximum(A * (1 - alpha) + alpha, 1e-6)[..., None] + \
          np.array(col)[None, None, :] * (alpha / np.maximum(A * (1 - alpha) + alpha, 1e-6))[..., None]
    A = A * (1 - alpha) + alpha

over((255, 255, 255), band(0.0, 1.3) * 0.95)          # crisp outer rim
over((70, 90, 125), band(1.6, 3.6) * 0.28)            # refraction line just inside
over((255, 255, 255), band(4.0, 7.5, 1.5) * 0.18)     # soft inner bevel light

# diagonal sheen across the slab
diag = ((xx - ox) / (bw * s) + (yy - oy) / (bh * s) * 0.55)
sheen = np.exp(-((diag - 0.42) / 0.10) ** 2) * 0.10 + np.exp(-((diag - 0.62) / 0.03) ** 2) * 0.10
over((255, 255, 255), sheen)

# hole rim
dh = np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2) / SS - HOLE_R * 0.6
over((255, 255, 255), np.clip(1 - np.abs(dh - 0.6) / 1.0, 0, 1) * 0.9)
over((70, 90, 125), np.clip(1 - np.abs(dh - 2.4) / 1.0, 0, 1) * 0.25)

# ---- photo in its pocket ----
pl, pt, pr, pb = POCKET
photo = src.crop((BODY[0] + pl + 4, BODY[1] + pt + 4, BODY[0] + pr - 4, BODY[1] + pb - 4))
fw, fh = int((pr - pl) * s), int((pb - pt) * s)
photo = photo.resize((fw, fh), Image.LANCZOS)
ph = np.asarray(photo).astype(float)
x0, y0 = int(P(pl, pt)[0]), int(P(pl, pt)[1])
# glass over the print: faint sheen + soft inner shadow at the pocket edge
fy, fx = np.mgrid[0:fh, 0:fw]
edge = np.minimum.reduce([fx, fy, fw - 1 - fx, fh - 1 - fy]) / SS
ph = ph * (0.86 + 0.14 * np.clip(edge / 6, 0, 1))[..., None]
fd = (fx / fw + fy / fh * 0.55)
glare = (np.exp(-((fd - 0.42) / 0.10) ** 2) * 0.08 + np.exp(-((fd - 0.62) / 0.03) ** 2) * 0.07)[..., None]
ph = ph * (1 - glare) + 255 * glare
reg_rgb = rgb[y0:y0 + fh, x0:x0 + fw]; reg_a = A[y0:y0 + fh, x0:x0 + fw]
reg_rgb[:] = ph * 1.0
reg_a[:] = 1.0
# pocket edge line (where the print sits in the slab)
over((255, 255, 255), np.where((xx >= x0 - 3 * SS) & (xx < x0 + fw + 3 * SS) & (yy >= y0 - 3 * SS) & (yy < y0 + fh + 3 * SS) &
                               ~((xx >= x0) & (xx < x0 + fw) & (yy >= y0) & (yy < y0 + fh)), 0.35, 0))

charm = Image.fromarray(np.dstack([rgb, A * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

# ---- place it on the shared square, hanging from the reference ring ----
RING_PT = (611, 414)          # where the reference wires leave the ring (final px)
HOLE_AT = (612, 568)          # where this charm's hole sits (final px)
ROT = -2.0                     # degrees, small natural tilt
canvas = Image.new('RGBA', (CAN, CAN), (0, 0, 0, 0))
rot = charm.rotate(ROT, resample=Image.BICUBIC, expand=True, center=(hx, hy))
# rotate() with expand moves the centre; recompute where the hole ended up
cxr, cyr = rot.size[0] / 2, rot.size[1] / 2
vx, vy = hx - charm.size[0] / 2, hy - charm.size[1] / 2
t = np.deg2rad(ROT)
hxr = cxr + vx * np.cos(t) + vy * np.sin(t); hyr = cyr - vx * np.sin(t) + vy * np.cos(t)
canvas.alpha_composite(rot, (int(HOLE_AT[0] * SS - hxr), int(HOLE_AT[1] * SS - hyr)))

# ---- the wire link from the ring into the hole (drawn like the reference wires) ----
wire = np.zeros((CAN, CAN, 4))
x1, y1 = RING_PT[0] * SS, RING_PT[1] * SS
x2, y2 = HOLE_AT[0] * SS, (HOLE_AT[1] + 4) * SS
W2 = 3.0 * SS                       # half-width
lo_x, hi_x = int(min(x1, x2) - 20 * SS), int(max(x1, x2) + 20 * SS)
lo_y, hi_y = int(y1 - 20 * SS), int(y2 + 20 * SS)
gy2, gx2 = np.mgrid[lo_y:hi_y, lo_x:hi_x]
dx, dy = x2 - x1, y2 - y1; L2 = dx * dx + dy * dy
tt = np.clip(((gx2 - x1) * dx + (gy2 - y1) * dy) / L2, 0, 1)
qx, qy = x1 + tt * dx, y1 + tt * dy
nx, ny = -dy / np.sqrt(L2), dx / np.sqrt(L2)
off = ((gx2 - qx) * nx + (gy2 - qy) * ny) / W2          # -1..1 across the wire
r = np.sqrt((gx2 - qx) ** 2 + (gy2 - qy) ** 2) / W2
alpha = np.clip((1 - r) * W2 / SS * 1.2, 0, 1)
shade = 200 - 120 * np.abs(off) ** 1.5 + 55 * np.exp(-((off + 0.35) / 0.18) ** 2)   # metal: dark edges, bright streak
col = np.stack([shade * 0.98, shade, shade * 1.03], -1).clip(0, 255)
wire[lo_y:hi_y, lo_x:hi_x, :3] = col
wire[lo_y:hi_y, lo_x:hi_x, 3] = alpha * 255
wire_im = Image.fromarray(wire.astype(np.uint8), 'RGBA')
# wire goes behind the slab but shows through the hole
out = Image.new('RGBA', (CAN, CAN), (0, 0, 0, 0))
out.alpha_composite(wire_im); out.alpha_composite(canvas)
# hole: let the wire show at full strength inside the hole circle
holemask = Image.new('L', (CAN, CAN), 0)
ImageDraw.Draw(holemask).ellipse([(HOLE_AT[0] - HOLE_R * 0.6) * SS, (HOLE_AT[1] - HOLE_R * 0.6) * SS,
                                  (HOLE_AT[0] + HOLE_R * 0.6) * SS, (HOLE_AT[1] + HOLE_R * 0.6) * SS], fill=255)
out.paste(wire_im, (0, 0), Image.composite(wire_im.split()[3], Image.new('L', (CAN, CAN), 0), holemask))

final = out.resize((1200, 1200), Image.LANCZOS)
final.save('06photo.png')
print('ok', final.getbbox())
