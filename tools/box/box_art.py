"""Box art for the blind box (box.js), in the layout of a real Hirono single box
(Hirono x Le Petit Prince, measured from Pop Mart's own product render + retail photos):
  cream paper with faint grey crumple, 6.5 : 10 faces.
  front  : wordmark at 13% height (27% wide), script title at 22% (63% wide),
           one pencil-sketch figure 29%-86%, little drawings around it,
           hand-lettered credit line at 91% (68% wide)
  sides  : a grid of small pencil sketches with tiny captions + a small-print block
  back   : 4-col grid + small print + barcode
  top    : black label
None of Pop Mart's art or logos: the sketches are made from Edward's own photos.
Run: python3 tools/box/box_art.py   (needs rembg; writes assets/box/*.webp)
"""
import os, sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from rembg import remove, new_session

HERE = os.path.dirname(__file__); ROOT = os.path.join(HERE, "..", "..")
OUT = os.path.join(ROOT, "assets", "box"); os.makedirs(OUT, exist_ok=True)
CACHE = "/tmp/box_sketch_cache"; os.makedirs(CACHE, exist_ok=True)
F_SCRIPT = os.path.join(HERE, "mansalva.ttf"); F_MARK = os.path.join(HERE, "gochi-hand.ttf"); F_SC = os.path.join(HERE, "patrick-hand-sc.ttf")
INK = (58, 55, 52)
FW, FH = 1300, 2000          # one face, 6.5 x 10 cm at 200 px/cm
rng = random.Random(7)

# ------------------------------------------------------------------ paper
def paper(w, h, seed):
    r = random.Random(seed)
    base = np.zeros((h, w, 3), float); base[:] = (242, 239, 230)
    # mottling
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(26):
        cx, cy, rad = r.uniform(0, w), r.uniform(0, h), r.uniform(150, 600)
        a = r.uniform(-5, 4)
        base += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * rad ** 2))[..., None]
    base += np.random.default_rng(seed).normal(0, 3.2, (h, w))[..., None]       # grain
    im = Image.fromarray(np.clip(base, 0, 255).astype("uint8"))
    # faint grey crumple creases (the real box has them printed all over)
    cr = Image.new("L", (w, h), 0); d = ImageDraw.Draw(cr)
    for _ in range(int(w * h / 26000)):
        x, y = r.uniform(0, w), r.uniform(0, h); a = r.uniform(0, math.pi)
        pts = [(x, y)]
        for _ in range(r.randint(2, 5)):
            a += r.uniform(-0.9, 0.9); l = r.uniform(30, 140)
            x += math.cos(a) * l; y += math.sin(a) * l; pts.append((x, y))
        d.line(pts, fill=r.randint(18, 46), width=r.choice([1, 1, 2]))
    cr = cr.filter(ImageFilter.GaussianBlur(0.9))
    grey = Image.new("RGB", (w, h), (150, 146, 140))
    im = Image.composite(grey, im, cr)
    return im.convert("RGBA")

# ------------------------------------------------------------------ pencil sketch of a photo
_sess = None
def xdog(g, s, k=1.6, p=22, eps=-0.015, phi=12):
    a = np.asarray(g.filter(ImageFilter.GaussianBlur(s)), float) / 255
    b = np.asarray(g.filter(ImageFilter.GaussianBlur(s * k)), float) / 255
    dd = (1 + p) * a - p * b
    return np.where(dd >= eps, 1.0, 1 + np.tanh(phi * (dd - eps)))

def sketch(n, H=1400, shade_k=0.32):
    key = f"{CACHE}/{n}_{H}.png"
    if os.path.exists(key): return Image.open(key)
    global _sess
    if _sess is None: _sess = new_session("u2net_human_seg")
    src = os.path.join(ROOT, "photos", "full", f"{n}.webp")
    if not os.path.exists(src): src = os.path.join(ROOT, "photos", "thumb", f"{n}.webp")   # clips: their still
    im = Image.open(src).convert("RGB")
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    m = np.asarray(remove(im, session=_sess).split()[-1], float) / 255
    g = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=1)
    lines = xdog(g, max(0.8, H / 1200))
    inv = ImageOps.invert(g).filter(ImageFilter.GaussianBlur(H / 100))
    G, I = np.asarray(g, float), np.asarray(inv, float)
    dodge = np.clip(G * 255 / (255 - I + 1e-3), 0, 255) / 255
    v = np.minimum(lines, 1 - (1 - dodge) * shade_k)
    M = Image.fromarray((m * 255).astype("uint8"))
    edge = np.asarray(M.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(H / 1600)), float) / 255
    v = np.minimum(v, 1 - np.clip(edge * 2.2, 0, 0.8))
    a = np.clip((1 - v) * m * 1.1, 0, 1)
    rgba = np.zeros((*a.shape, 4), "uint8"); rgba[..., :3] = INK; rgba[..., 3] = (a * 255).astype("uint8")
    o = Image.fromarray(rgba); o = o.crop(o.getbbox()); o.save(key)
    return o

# ------------------------------------------------------------------ little hand drawings
def pencil_line(d, pts, w=4, col=INK + (210,)):
    for j in range(2):                      # gone over twice, slightly off
        q = [(x + rng.uniform(-1.2, 1.2), y + rng.uniform(-1.2, 1.2)) for x, y in pts]
        d.line(q, fill=col[:3] + (int(col[3] * (1 if j == 0 else 0.55)),), width=w if j == 0 else max(1, w - 1), joint="curve")

def heart(d, cx, cy, s, rot=0):
    pts = []
    for i in range(41):
        t = i / 40 * 2 * math.pi
        x = 16 * math.sin(t) ** 3; y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        xr = x * math.cos(rot) - y * math.sin(rot); yr = x * math.sin(rot) + y * math.cos(rot)
        pts.append((cx + xr * s / 32, cy + yr * s / 32))
    pencil_line(d, pts, w=max(2, int(s / 16)))

def text_fit(d, txt, font_path, cx, cy, width, col=INK + (235,), rot=0, canvas=None):
    size = 200
    f = ImageFont.truetype(font_path, size)
    bb = d.textbbox((0, 0), txt, font=f); size = int(size * width / (bb[2] - bb[0])); f = ImageFont.truetype(font_path, size)
    bb = d.textbbox((0, 0), txt, font=f)
    layer = Image.new("RGBA", (bb[2] - bb[0] + 40, bb[3] - bb[1] + 40), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((20 - bb[0], 20 - bb[1]), txt, font=f, fill=col)
    if rot: layer = layer.rotate(rot, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))

# ------------------------------------------------------------------ faces
FRONT_PHOTO = "18"
GRID = ["04", "10", "21", "25", "33", "40", "41", "45", "49", "52", "56", "58",
        "26", "53", "07", "12", "16", "24", "54", "61", "64",
        "08", "38", "44", "51", "55", "22", "03", "31", "13"]

def front():
    im = paper(FW, FH, 1); d = ImageDraw.Draw(im)
    text_fit(d, "Zoie", F_MARK, FW * 0.5, FH * 0.13, FW * 0.27, canvas=im)
    text_fit(d, "Happy Birthday", F_SCRIPT, FW * 0.5, FH * 0.222, FW * 0.66, canvas=im)
    sk = sketch(FRONT_PHOTO, 1600)
    h = int(FH * 0.56); w = int(sk.width * h / sk.height)
    if w > FW * 0.62: w = int(FW * 0.62); h = int(sk.height * w / sk.width)
    sk = sk.resize((w, h), Image.LANCZOS)
    top = int(FH * 0.30)
    # soft pencil ground shadow under the feet
    sh = Image.new("RGBA", (int(w * 0.95), 70), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    for i in range(46):
        y = 35 + rng.uniform(-14, 14); x0 = rng.uniform(0, w * 0.2); x1 = w * 0.95 - rng.uniform(0, w * 0.2)
        sd.line([(x0, y), (x1, y + rng.uniform(-4, 4))], fill=INK + (rng.randint(14, 34),), width=2)
    im.alpha_composite(sh, (int(FW / 2 - sh.width / 2), top + h - 40))
    im.alpha_composite(sk, (int(FW / 2 - w / 2), top))
    for (fx, fy, s, r) in [(0.16, 0.36, 70, -0.3), (0.85, 0.40, 54, 0.25), (0.12, 0.62, 46, 0.2), (0.88, 0.66, 66, -0.2), (0.2, 0.80, 40, 0.4), (0.82, 0.83, 44, -0.35)]:
        heart(d, FW * fx, FH * fy, s, r)
    text_fit(d, "EDWARD × ZOIE × 11.17.2026", F_SC, FW * 0.5, FH * 0.915, FW * 0.70, canvas=im)
    return im

def grid_face(nums, cols, rows, y0, y1, seed, start_no):
    im = paper(FW, FH, seed); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(F_SC, 34)
    cw = FW * 0.86 / cols; ch = (y1 - y0) / rows
    for i, n in enumerate(nums[: cols * rows]):
        c, r = i % cols, i // cols
        cx = FW * 0.07 + cw * (c + 0.5); cy = y0 + ch * r
        sk = sketch(n, 900, 0.22)
        h = int(ch * 0.74); w = int(sk.width * h / sk.height)
        if w > cw * 0.86: w = int(cw * 0.86); h = int(sk.height * w / sk.width)
        sk = sk.resize((w, h), Image.LANCZOS)
        im.alpha_composite(sk, (int(cx - w / 2), int(cy + ch * 0.78 - h)))
        lab = f"no. {start_no + i:02d}"
        bb = d.textbbox((0, 0), lab, font=f); d.text((cx - (bb[2] - bb[0]) / 2, cy + ch * 0.81), lab, font=f, fill=INK + (215,))
    return im, d

def small_print(d, x, y, lines, size=30):
    f = ImageFont.truetype(F_SC, size)
    for i, t in enumerate(lines): d.text((x, y + i * size * 1.25), t, font=f, fill=INK + (200,))

def barcode(d, x, y, w=300, h=110):
    r = random.Random(1117); xx = x
    while xx < x + w:
        bw = r.choice([2, 3, 3, 5, 7]); d.rectangle([xx, y, xx + bw - 1, y + h], fill=INK + (235,)); xx += bw + r.choice([2, 3, 5])
    f = ImageFont.truetype(F_SC, 28); d.text((x + 10, y + h + 6), "1 117 2026 0 0001", font=f, fill=INK + (220,))

def right():
    im, d = grid_face(GRID[0:9], 3, 3, FH * 0.07, FH * 0.76, 2, 1)
    small_print(d, FW * 0.1, FH * 0.8, ["one bag of photos inside.", "nobody knows which ones", "until it's opened."])
    return im
def back():
    im, d = grid_face(GRID[9:21], 4, 3, FH * 0.07, FH * 0.70, 3, 10)
    small_print(d, FW * 0.09, FH * 0.75, ["CONTENTS: OUR PHOTOS", "FOR: ZOIE", "FROM: EDWARD", "AGES: ONLY HER"])
    barcode(d, FW * 0.6, FH * 0.76)
    return im
def left():
    im, d = grid_face(GRID[21:30], 3, 3, FH * 0.07, FH * 0.76, 4, 22)
    small_print(d, FW * 0.1, FH * 0.8, ["open with care.", "keep the box."])
    return im
def top():
    im = paper(FW, FW, 5); d = ImageDraw.Draw(im)
    lw, lh = FW * 0.42, FW * 0.11
    x0, y0 = FW / 2 - lw / 2, FW * 0.16
    d.rounded_rectangle([x0, y0, x0 + lw, y0 + lh], 10, fill=(26, 25, 24, 255))
    text_fit(d, "OPEN ME", F_SC, FW / 2, y0 + lh / 2, lw * 0.62, col=(245, 242, 234, 255), canvas=im)
    return im
def inside():
    r = np.random.default_rng(9); a = np.zeros((512, 512, 3), float); a[:] = (226, 224, 219)
    a += r.normal(0, 4, (512, 512))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))

if __name__ == "__main__":
    for name, fn in [("front", front), ("right", right), ("back", back), ("left", left), ("top", top), ("inside", inside)]:
        img = fn().convert("RGB"); img.save(os.path.join(OUT, f"{name}.webp"), quality=86); print(name, img.size)
