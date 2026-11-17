"""Gallery scatter matched to hakusuku.jp/recruit's hero (measured at 1440x900):
straight photos (no tilt), areas ~9k-50k px^2 (log-spread), ~34% of the paper covered,
irregular gaps, no rows. Placement: best-candidate sampling, largest photos first:
each photo tries many random spots and takes the one furthest from everything already
placed, so the scatter is random but has no clumps or holes.
python3 tools/hakusuku_layout.py  -> layout.js"""
import json, math, random
from PIL import Image
SEED, GAP, COVER, PAD = 11, 40, 0.34, 70
HEAD = (620, 300)                       # clear box for the headline + date
rnd = random.Random(SEED)
P = json.loads(open("photos.js").read().split("window.PHOTOS =", 1)[1].split(";\nwindow.SLOT_MAP")[0])
items = []
for i, m in enumerate(P):
    w, h = Image.open(m["thumb"]).size
    a = math.exp(rnd.uniform(math.log(9500), math.log(50000)))
    if "loop" in m: a = max(a, 20000)    # clips never tiny
    W_ = math.sqrt(a * w / h); H_ = W_ * h / w
    s = min(1, 300 / max(W_, H_))
    items.append({"i": i, "w": round(W_ * s), "h": round(H_ * s)})
area = sum(it["w"] * it["h"] for it in items) / COVER + HEAD[0] * HEAD[1]
W = round(math.sqrt(area * 1.5)); H = round(area / W)
hx, hy = W / 2, H / 2
def clear(x, y, w, h, placed):
    """smallest edge-to-edge distance to placed photos / headline / map edge (negative = overlap)"""
    d = min(x - w / 2 - PAD, W - PAD - x - w / 2, y - h / 2 - PAD, H - PAD - y - h / 2) * 2
    for (px, py, pw, ph) in placed + [(hx, hy, HEAD[0], HEAD[1])]:
        dx = abs(x - px) - (w + pw) / 2; dy = abs(y - py) - (h + ph) / 2
        g = max(dx, dy) if (dx < 0 or dy < 0) else math.hypot(dx, dy)
        d = min(d, g)
    return d
placed, out = [], []
for it in sorted(items, key=lambda t: -t["w"] * t["h"]):
    best = None
    for _ in range(260):
        x = rnd.uniform(PAD + it["w"] / 2, W - PAD - it["w"] / 2); y = rnd.uniform(PAD + it["h"] / 2, H - PAD - it["h"] / 2)
        c = clear(x, y, it["w"], it["h"], placed)
        if best is None or c > best[0]: best = (c, x, y)
    c, x, y = best
    placed.append((x, y, it["w"], it["h"]))
    m = lambda: rnd.uniform(3, 5.5); j = lambda: rnd.uniform(-1.6, 1.6)
    w, h = it["w"], it["h"]; l, t, r, b = -m(), -m(), w + m(), h + m()
    cut = "M " + " L ".join(f"{px:.1f} {py:.1f}" for px, py in [(l + j(), t + j()), (r + j(), t + j()), (r + j(), b + j()), (l + j(), b + j())]) + " Z"
    out.append({"i": it["i"], "x": round(x - w / 2, 1), "y": round(y - h / 2, 1), "w": w, "h": h, "cut": cut, "_c": c})
gaps = sorted(o.pop("_c") for o in out)
print("map", W, "x", H, "| min gap at placement", round(gaps[0]), "median", round(gaps[len(gaps) // 2]))
L = {"w": W, "h": H, "start": [round(hx), round(hy)], "slots": sorted(out, key=lambda s: (s["y"], s["x"]))}
open("layout.js", "w").write("// tools/hakusuku_layout.py: scatter matched to hakusuku.jp/recruit.\nwindow.LAYOUT = " + json.dumps(L, separators=(",", ":")) + ";\n")
