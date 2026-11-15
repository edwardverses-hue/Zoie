"""Render the Suki S2000 enamel keychain as a charm layer on the shared 1200 square.
Source: the real product photo (eBay listing 365040348020). The car hangs from its
tail eyelet, rotated so its centre of mass sits below the eyelet, on a metal link
from the padlock ring (same construction as the photo charm)."""
import sys
from PIL import Image
import numpy as np

PIV_AT = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (520, 560)
ROT = float(sys.argv[3]) if len(sys.argv) > 3 else 82      # 90 = plumb; lower leans outward (left)
RING_PT = (604, 414)
SS = 2; CAN = 1200 * SS; S = (float(sys.argv[4]) if len(sys.argv) > 4 else 0.54) * SS

car = Image.open('car_local.png').convert('RGBA')
px, py, _ = [float(v) for v in open('piv.txt').read().split()]
car = car.resize((int(car.width * S), int(car.height * S)), Image.LANCZOS); px *= S; py *= S
w, h = car.size
big = Image.new('RGBA', (w * 3, h * 3 + w * 2), (0, 0, 0, 0)); ox, oy = w, w
big.alpha_composite(car, (ox, oy))
rot = big.rotate(ROT, resample=Image.BICUBIC, center=(ox + px, oy + py))
body = Image.new('RGBA', (CAN, CAN), (0, 0, 0, 0))
body.alpha_composite(rot, (int(PIV_AT[0] * SS - (ox + px)), int(PIV_AT[1] * SS - (oy + py))))

def metal_line(x1, y1, x2, y2, half=3.0):
    W2 = half * SS
    lo_x, hi_x = int(min(x1, x2) - 20 * SS), int(max(x1, x2) + 20 * SS)
    lo_y, hi_y = int(min(y1, y2) - 20 * SS), int(max(y1, y2) + 20 * SS)
    gy, gx = np.mgrid[lo_y:hi_y, lo_x:hi_x]
    dx, dy = x2 - x1, y2 - y1; L2 = dx * dx + dy * dy
    t = np.clip(((gx - x1) * dx + (gy - y1) * dy) / L2, 0, 1); qx, qy = x1 + t * dx, y1 + t * dy
    nx, ny = -dy / np.sqrt(L2), dx / np.sqrt(L2)
    off = ((gx - qx) * nx + (gy - qy) * ny) / W2; r = np.sqrt((gx - qx) ** 2 + (gy - qy) ** 2) / W2
    a = np.clip((1 - r) * W2 / SS * 1.2, 0, 1)
    shade = 200 - 120 * np.abs(off) ** 1.5 + 55 * np.exp(-((off + 0.35) / 0.18) ** 2)
    out = np.zeros((CAN, CAN, 4))
    out[lo_y:hi_y, lo_x:hi_x, :3] = np.stack([shade * .98, shade, shade * 1.03], -1).clip(0, 255)
    out[lo_y:hi_y, lo_x:hi_x, 3] = a * 255
    return Image.fromarray(out.astype(np.uint8))

def metal_ring(cx, cy, R, half=2.4):
    out = np.zeros((CAN, CAN, 4)); m = int(R + 8 * SS)
    gy, gx = np.mgrid[int(cy - m):int(cy + m), int(cx - m):int(cx + m)]
    d = np.abs(np.sqrt((gx - cx) ** 2 + (gy - cy) ** 2) - R) / (half * SS)
    a = np.clip((1 - d) * 3, 0, 1); sh = 215 - 125 * np.clip(d, 0, 1) ** 1.5
    out[gy, gx, :3] = np.stack([sh * .98, sh, sh * 1.03], -1).clip(0, 255); out[gy, gx, 3] = a * 255
    return Image.fromarray(out.astype(np.uint8))

R = 10 * SS
ringc = (PIV_AT[0] * SS, PIV_AT[1] * SS - R * 0.6)
out = Image.new('RGBA', (CAN, CAN), (0, 0, 0, 0))
out.alpha_composite(metal_line(RING_PT[0] * SS, RING_PT[1] * SS, ringc[0], ringc[1] - R))
out.alpha_composite(body)
out.alpha_composite(metal_ring(*ringc, R))
out.resize((1200, 1200), Image.LANCZOS).save('01suki.png')

order = ['05illustration', '04photoworks', '03editorial', '02branding', '06photo', 'SUKI', '00padlock']
bg = Image.open('/home/claude/zoie/assets/bg-tile.jpg').convert('RGBA').crop((0, 0, 1200, 1024)).resize((1200, 1200))
for n in order:
    bg.alpha_composite(Image.open('01suki.png' if n == 'SUKI' else f'/home/claude/ref/{n}.png').convert('RGBA'))
bg.crop((240, 80, 960, 1190)).convert('RGB').resize((432, 666)).save('comp.png')
print('ok')
