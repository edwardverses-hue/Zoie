"""Box art for the blind box (box.js). Visual language after a reference Edward picked
(Nibbo bean-to-bar chocolate box, Bin_Design): one flat colour, one dark ink, a wide-tracked
geometric wordmark, a hairline arc with dot ends, tracked small caps, a ruled contents table,
numbered steps in circles, a lot of empty space. No drawings, no slogans: every line is a
fact about the gift. Faces are 6.5 x 10 cm at 200 px/cm (box.js geometry).
Run: python3 tools/box/box_art.py   (writes assets/box/*.webp)"""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__); OUT = os.path.join(HERE, "..", "..", "assets", "box"); os.makedirs(OUT, exist_ok=True)
F = lambda w, n: ImageFont.truetype(os.path.join(HERE, f"jost-{w}.ttf"), n)
BASE = (246, 245, 241)       # white board (slightly warm, as printed card stock reads)
INK = (31, 32, 32)            # near-black, the same ink as the title
FW, FH = 1300, 2000

def paper(w, h, seed):
    r = np.random.default_rng(seed)
    a = np.zeros((h, w, 3), float); a[:] = BASE
    a += r.normal(0, 2.2, (h, w))[..., None]                       # print grain only
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8")).convert("RGBA")

def tracked(d, x, y, txt, font, track, anchor="m", fill=INK):
    """letter-spaced text; anchor m = centred on x, l = from x"""
    widths = [d.textlength(c, font=font) for c in txt]
    total = sum(widths) + track * (len(txt) - 1)
    cx = x - total / 2 if anchor == "m" else x
    for c, wdt in zip(txt, widths):
        d.text((cx, y), c, font=font, fill=fill, anchor="ls"); cx += wdt + track
    return total

def arc(d, cx, cy, w, sag, lw=3):
    pts = [(cx - w / 2 + w * i / 80, cy + sag * math.sin(math.pi * i / 80)) for i in range(81)]
    d.line(pts, fill=INK, width=lw, joint="curve")
    for x, y in (pts[0], pts[-1]): d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=BASE, outline=INK, width=2)

def front():
    im = paper(FW, FH, 1); d = ImageDraw.Draw(im)
    tracked(d, FW / 2, FH * 0.33, "zoie", F("300-normal", 250), 120)
    arc(d, FW / 2, FH * 0.40, FW * 0.62, 26)
    tracked(d, FW / 2, FH * 0.50, "11.17.2026", F("400-normal", 50), 22)
    # contents table
    x0, x1, y = FW * 0.12, FW * 0.88, FH * 0.775
    sm, smb = F("400-normal", 34), F("500-normal", 34)
    d.line([(x0, y), (x1, y)], fill=INK, width=4); y += 52
    d.text((x0, y), "Details", font=smb, fill=INK, anchor="ls"); y += 22
    d.line([(x0, y), (x1, y)], fill=INK, width=2)
    # nothing here says what's inside: it's a blind box
    for k, v in [("Edition", "1 of 1"), ("Opened", "not yet")]:
        y += 54; d.text((x0, y), k, font=sm, fill=INK, anchor="ls"); d.text((x1, y), v, font=sm, fill=INK, anchor="rs")
        y += 20; d.line([(x0, y), (x1, y)], fill=INK, width=1)
    d.line([(x0, y + 6), (x1, y + 6)], fill=INK, width=4)
    return im

def vertical(im, x, y, txt, font, track, rot):
    lay = Image.new("RGBA", (900, 120), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    tracked(ld, 450, 80, txt, font, track)
    lay = lay.rotate(rot, expand=True); im.alpha_composite(lay, (int(x - lay.width / 2), int(y - lay.height / 2)))

def left():
    im = paper(FW, FH, 2); d = ImageDraw.Draw(im)
    tracked(d, FW / 2, FH * 0.47, "for zoie,", F("400-normal", 54), 10)
    tracked(d, FW / 2, FH * 0.47 + 78, "from edward.", F("400-normal", 54), 10)
    vertical(im, FW * 0.92, FH * 0.18, "11.17.2026", F("400-normal", 34), 10, -90)
    return im

def right():
    im = paper(FW, FH, 3); d = ImageDraw.Draw(im)
    x0 = FW * 0.12
    tracked(d, x0, FH * 0.16, "zoie", F("300-normal", 110), 52, anchor="l")
    body = F("400-normal", 40)
    lines = ["Inside is one", "sealed bag.", "",
             "What's in it stays", "hidden until the bag", "is torn open."]
    y = FH * 0.33
    for t in lines: d.text((x0, y), t, font=body, fill=INK, anchor="ls"); y += 62
    d.line([(FW * 0.52, FH * 0.86), (FW * 0.66, FH * 0.86)], fill=INK, width=2)
    d.text((FW * 0.69, FH * 0.86 + 12), "Edward", font=F("400-italic", 46), fill=INK, anchor="ls")
    return im

def circled(d, cx, cy, n, r=44):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=INK, width=3)
    d.text((cx, cy + 2), str(n), font=F("400-normal", 48), fill=INK, anchor="mm")

def back():
    im = paper(FW, FH, 4); d = ImageDraw.Draw(im)
    tracked(d, FW / 2, FH * 0.12, "How to open", F("500-normal", 46), 12)
    arc(d, FW / 2, FH * 0.16, FW * 0.5, 18, 2)
    steps = [("Lift the lid", "Drag up on the box."), ("Pull out the bag", "Keep dragging up."), ("Tear the top", "See what's inside.")]
    for i, (a, b) in enumerate(steps):
        y = FH * (0.28 + i * 0.17)
        circled(d, FW / 2, y, i + 1)
        d.text((FW / 2, y + 112), a, font=F("500-italic", 50), fill=INK, anchor="ms")
        d.text((FW / 2, y + 168), b, font=F("400-normal", 36), fill=INK, anchor="ms")
    x0, x1 = FW * 0.12, FW * 0.88
    d.line([(x0, FH * 0.83), (x1, FH * 0.83)], fill=INK, width=2)
    sm = F("400-normal", 30)
    for i, t in enumerate(["Keep the box."]):
        d.text((FW / 2, FH * 0.87 + i * 46), t, font=sm, fill=INK, anchor="ms")
    return im

def top():
    im = paper(FW, FW, 5); d = ImageDraw.Draw(im)
    tracked(d, FW / 2, FW * 0.42, "zoie", F("300-normal", 120), 58)
    arc(d, FW / 2, FW * 0.48, FW * 0.36, 14, 2)
    tracked(d, FW / 2, FW * 0.62, "open here", F("400-italic", 40), 10)
    return im

def inside():
    r = np.random.default_rng(9); a = np.zeros((512, 512, 3), float); a[:] = (232, 230, 225)
    a += r.normal(0, 3, (512, 512))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))

if __name__ == "__main__":
    for name, fn in [("front", front), ("right", right), ("back", back), ("left", left), ("top", top), ("inside", inside)]:
        fn().convert("RGB").save(os.path.join(OUT, f"{name}.webp"), quality=90); print(name)
