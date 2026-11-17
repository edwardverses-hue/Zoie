"""Box art for the blind box (box.js), in the layout of a real Hirono single box
(Hirono x Le Petit Prince, measured from Pop Mart's own product render + retail photos):
  cream paper with faint grey crumple, 6.5 : 10 faces.
  front  : wordmark at 13% height (27% wide), script title at 22% (63% wide),
           one pencil-sketch figure 29%-86%, little drawings around it,
           hand-lettered credit line at 91% (68% wide)
  sides  : a grid of small pencil sketches with tiny captions + a small-print block
  back   : 4-col grid + small print + barcode
  top    : black label
None of Pop Mart's art or logos, and no photos of them on the box (Edward's call):
the drawings are simple pencil doodles drawn here in code.
Run: python3 tools/box/box_art.py   (writes assets/box/*.webp)
"""
import os, sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

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

# ------------------------------------------------------------------ pencil doodles (no photos on the box)
def wob(pts, amt=1.6):
    return [(x + rng.uniform(-amt, amt), y + rng.uniform(-amt, amt)) for x, y in pts]
def stroke(d, pts, w, closed=False):
    if closed: pts = pts + pts[:1]
    for j, k in enumerate((1.0, 0.5)):        # gone over twice, slightly off
        d.line(wob(pts), fill=INK + (int(215 * k),), width=max(1, w - j), joint="curve")
def circle_pts(cx, cy, rx, ry, n=48, a0=0, a1=2 * math.pi):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
def hatch(im, poly, spacing, w=2, ang=0.8, alpha=70):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).polygon(poly, fill=255)
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    W_, H_ = im.size; L = W_ + H_
    for o in range(-L, L, spacing):
        x0, y0 = o, 0; x1, y1 = o + math.cos(ang) * L, math.sin(ang) * L
        ld.line([(x0 + rng.uniform(-2, 2), y0), (x1, y1)], fill=INK + (alpha,), width=w)
    a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3].astype(float) * np.asarray(m) / 255).astype("uint8")
    im.alpha_composite(Image.fromarray(a))
def heart_pts(cx, cy, s, n=60):
    out = []
    for i in range(n + 1):
        t = i / n * 2 * math.pi
        x = 16 * math.sin(t) ** 3; y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        out.append((cx + x * s / 32, cy + y * s / 32))
    return out
def star_pts(cx, cy, r, rot=-math.pi / 2):
    return [(cx + (r if i % 2 == 0 else r * 0.45) * math.cos(rot + i * math.pi / 5), cy + (r if i % 2 == 0 else r * 0.45) * math.sin(rot + i * math.pi / 5)) for i in range(10)]

def doodle(im, kind, cx, cy, s, w=3):
    d = ImageDraw.Draw(im)
    if kind == "heart":
        p = heart_pts(cx, cy, s * 1.6); hatch(im, p, 9, ang=0.9); stroke(d, p, w)
    elif kind == "star":
        p = star_pts(cx, cy, s * 0.8); stroke(d, p, w, True)
    elif kind == "moon":
        a = circle_pts(cx, cy, s * 0.7, s * 0.7, 40, math.pi * 0.42, math.pi * 1.58); b = circle_pts(cx + s * 0.28, cy - s * 0.05, s * 0.56, s * 0.56, 40, math.pi * 1.42, math.pi * 0.58)
        p = a + b; hatch(im, p, 9); stroke(d, p, w, True)
    elif kind == "flower":
        for k in range(5):
            ang = k * 2 * math.pi / 5; px, py = cx + math.cos(ang) * s * 0.36, cy - s * 0.25 + math.sin(ang) * s * 0.36
            stroke(d, circle_pts(px, py, s * 0.24, s * 0.24, 24), w)
        stroke(d, circle_pts(cx, cy - s * 0.25, s * 0.12, s * 0.12, 16), w)
        stroke(d, [(cx, cy - s * 0.05), (cx - s * 0.05, cy + s * 0.4), (cx, cy + s * 0.85)], w)
        stroke(d, [(cx - s * 0.03, cy + s * 0.45), (cx - s * 0.32, cy + s * 0.3), (cx - s * 0.05, cy + s * 0.55)], w)
    elif kind == "gift":
        x0, y0, x1, y1 = cx - s * 0.6, cy - s * 0.2, cx + s * 0.6, cy + s * 0.75
        box = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]; hatch(im, box, 11, ang=2.3, alpha=45); stroke(d, box, w, True)
        stroke(d, [(x0 - s * 0.06, y0 - s * 0.22), (x1 + s * 0.06, y0 - s * 0.22), (x1 + s * 0.06, y0), (x0 - s * 0.06, y0)], w, True)
        stroke(d, [(cx, y0 - s * 0.22), (cx, y1)], w)
        stroke(d, circle_pts(cx - s * 0.2, y0 - s * 0.38, s * 0.2, s * 0.13, 24), w); stroke(d, circle_pts(cx + s * 0.2, y0 - s * 0.38, s * 0.2, s * 0.13, 24), w)
    elif kind == "cake":
        x0, x1 = cx - s * 0.65, cx + s * 0.65
        stroke(d, [(x0, cy), (x0, cy + s * 0.7), (x1, cy + s * 0.7), (x1, cy)], w)
        stroke(d, circle_pts(cx, cy, s * 0.65, s * 0.16, 40), w)
        stroke(d, [(x0, cy + s * 0.32)] + [(x0 + (x1 - x0) * i / 8, cy + s * (0.32 + 0.08 * (i % 2))) for i in range(9)], w - 1)
        for k in (-0.3, 0, 0.3):
            stroke(d, [(cx + k * s, cy - s * 0.05), (cx + k * s, cy - s * 0.45)], w)
            stroke(d, [(cx + k * s, cy - s * 0.5), (cx + k * s - s * 0.07, cy - s * 0.6), (cx + k * s, cy - s * 0.75), (cx + k * s + s * 0.07, cy - s * 0.6), (cx + k * s, cy - s * 0.5)], w - 1)
    elif kind == "envelope":
        x0, y0, x1, y1 = cx - s * 0.75, cy - s * 0.45, cx + s * 0.75, cy + s * 0.5
        stroke(d, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], w, True); stroke(d, [(x0, y0), (cx, cy + s * 0.1), (x1, y0)], w)
        p = heart_pts(cx, cy + s * 0.1, s * 0.35); hatch(im, p, 6); stroke(d, p, w - 1)
    elif kind == "camera":
        x0, y0, x1, y1 = cx - s * 0.75, cy - s * 0.35, cx + s * 0.75, cy + s * 0.55
        stroke(d, [(x0, y0), (cx - s * 0.25, y0), (cx - s * 0.15, y0 - s * 0.2), (cx + s * 0.25, y0 - s * 0.2), (cx + s * 0.35, y0), (x1, y0), (x1, y1), (x0, y1)], w, True)
        stroke(d, circle_pts(cx, cy + s * 0.1, s * 0.3, s * 0.3), w); p = circle_pts(cx, cy + s * 0.1, s * 0.16, s * 0.16); hatch(im, p, 5); stroke(d, p, w - 1)
    elif kind == "balloon":
        p = circle_pts(cx, cy - s * 0.25, s * 0.45, s * 0.55); hatch(im, p, 10, ang=2.2, alpha=55); stroke(d, p, w)
        stroke(d, [(cx, cy + s * 0.3), (cx - s * 0.1, cy + s * 0.5), (cx + s * 0.08, cy + s * 0.7), (cx - s * 0.04, cy + s * 0.95)], w - 1)
    elif kind == "sun":
        stroke(d, circle_pts(cx, cy, s * 0.35, s * 0.35), w)
        for k in range(10):
            a = k * math.pi / 5; stroke(d, [(cx + math.cos(a) * s * 0.5, cy + math.sin(a) * s * 0.5), (cx + math.cos(a) * s * 0.78, cy + math.sin(a) * s * 0.78)], w)
    elif kind == "cloud":
        p = (circle_pts(cx - s * 0.4, cy + s * 0.1, s * 0.3, s * 0.28, 20, math.pi * 0.5, math.pi * 1.6) + circle_pts(cx - s * 0.05, cy - s * 0.12, s * 0.38, s * 0.36, 24, math.pi * 1.1, math.pi * 1.95)
             + circle_pts(cx + s * 0.42, cy + s * 0.08, s * 0.3, s * 0.3, 20, math.pi * 1.4, math.pi * 2.5))
        stroke(d, p, w, True)
    elif kind == "ring":
        stroke(d, circle_pts(cx, cy + s * 0.2, s * 0.5, s * 0.5), w); stroke(d, circle_pts(cx, cy + s * 0.2, s * 0.38, s * 0.38), w - 1)
        p = [(cx - s * 0.2, cy - s * 0.32), (cx + s * 0.2, cy - s * 0.32), (cx + s * 0.3, cy - s * 0.45), (cx, cy - s * 0.75), (cx - s * 0.3, cy - s * 0.45)]
        hatch(im, p, 6, alpha=60); stroke(d, p, w, True)

KINDS = ["heart", "star", "moon", "flower", "gift", "cake", "envelope", "camera", "balloon", "sun", "cloud", "ring"]
LABEL = {"heart": "heart", "star": "star", "moon": "moon", "flower": "flower", "gift": "gift", "cake": "cake", "envelope": "letter", "camera": "camera", "balloon": "balloon", "sun": "sun", "cloud": "cloud", "ring": "ring"}

def scatter_stars(im, n, box, seed):
    r = random.Random(seed); d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r.uniform(x0, x1), r.uniform(y0, y1); s = r.uniform(24, 46)
        stroke(d, star_pts(x, y, s, r.uniform(-0.6, 0.6) - math.pi / 2), 3, True)

# ------------------------------------------------------------------ faces: lettering only, no drawings
# The series checklist. PLACEHOLDER names from the photos: Edward to rename.
SERIES = ["prom night", "tractor day", "the fog walk", "photobooth #1", "christmas tree", "waterfall",
          "camp out", "times square", "golf range", "escape room", "face masks", "mcdonald's run",
          "the drive", "lake lookout", "dinner date", "photobooth #2", "art museum", "first selfie"]

def text_at(d, txt, font, x, y, col=INK + (225,), anchor="la"):
    d.text((x, y), txt, font=font, fill=col, anchor=anchor)

def tick_box(d, x, y, s):
    d.rectangle([x, y, x + s, y + s], outline=INK + (200,), width=3)

def front():
    im = paper(FW, FH, 1); d = ImageDraw.Draw(im)
    sc = lambda n: ImageFont.truetype(F_SC, n)
    text_at(d, "A BLIND BOX FOR", sc(54), FW / 2, FH * 0.17, anchor="mm")
    text_fit(d, "Zoie", F_SCRIPT, FW * 0.5, FH * 0.33, FW * 0.62, canvas=im)
    text_fit(d, "happy birthday", F_SCRIPT, FW * 0.5, FH * 0.475, FW * 0.56, col=INK + (210,), canvas=im)
    d.line([(FW * 0.3, FH * 0.56), (FW * 0.7, FH * 0.56)], fill=INK + (150,), width=3)
    text_at(d, "11.17.2026", sc(64), FW / 2, FH * 0.61, anchor="mm")
    text_at(d, f"SERIES OF {len(SERIES)} + 2 SECRET", sc(40), FW / 2, FH * 0.83, col=INK + (190,), anchor="mm")
    text_at(d, "EDWARD × ZOIE", sc(46), FW / 2, FH * 0.915, anchor="mm")
    return im

def list_face(seed, title, items, start, secrets=0, foot=None):
    im = paper(FW, FH, seed); d = ImageDraw.Draw(im)
    big, f, num = ImageFont.truetype(F_SC, 60), ImageFont.truetype(F_SC, 50), ImageFont.truetype(F_SC, 38)
    x0, x1 = FW * 0.12, FW * 0.88
    text_at(d, title, big, x0, FH * 0.08)
    d.line([(x0, FH * 0.08 + 82), (x1, FH * 0.08 + 82)], fill=INK + (160,), width=3)
    y, step = FH * 0.15, FH * 0.062
    rows = [(f"no. {start + i:02d}", t) for i, t in enumerate(items)] + [("secret", "? ? ?")] * secrets
    for n, t in rows:
        text_at(d, n, num, x0, y + 8, col=INK + (170,))
        text_at(d, t, f, x0 + FW * 0.2, y)
        tick_box(d, x1 - 44, y + 8, 40)
        y += step
    if foot: small_print(d, x0, FH * 0.82, foot)
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
    im, d = list_face(2, "THE SERIES", SERIES[0:9], 1)
    return im
def left():
    im, d = list_face(4, "THE SERIES (cont.)", SERIES[9:18], 10, secrets=2, foot=["open with care.", "keep the box."])
    return im
def back():
    im = paper(FW, FH, 3); d = ImageDraw.Draw(im)
    sc = lambda n: ImageFont.truetype(F_SC, n)
    text_at(d, "HOW IT WORKS", sc(60), FW * 0.12, FH * 0.08)
    d.line([(FW * 0.12, FH * 0.08 + 82), (FW * 0.88, FH * 0.08 + 82)], fill=INK + (160,), width=3)
    lines = ["one bag inside.", "nobody knows which photos", "until it's opened.", "", "lift the lid,", "pull out the bag,", "tear the top."]
    for i, t in enumerate(lines): text_at(d, t, sc(52), FW * 0.12, FH * 0.17 + i * 80)
    small_print(d, FW * 0.12, FH * 0.75, ["CONTENTS: OUR PHOTOS", "FOR: ZOIE", "FROM: EDWARD", "AGES: ONLY HER"])
    barcode(d, FW * 0.58, FH * 0.76)
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
