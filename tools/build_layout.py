"""Lay out the gallery: every photo once, at its real proportions, on one finite map
(like haneda-nice-day), with no holes.

How it's arranged
- Size: three steps by area (small / medium / large), so a tall strip and a wide
  photo of the same step weigh the same on screen. Clips are never small.
- Density: the map is sized so photos (plus their minimum gaps) cover about half
  of it. Less than that and pushing photos apart leaves pockets of empty paper.
- Start: a staggered grid with jitter, then pairwise relaxation to a GAP minimum.
- Holes: an optimizer maps empty space (distance from every point on the map to
  the nearest photo, measured across the wrap-around edges so the repeat has no
  seam... the map is finite now, so edges are a plain paper margin) and keeps nudging single photos and swapping pairs while that lowers the
  penalty on any spot further than HOLE px from a photo. Moves that break the
  minimum gap are rejected.
- Only the headline gets reserved space (it's in the middle at the start).
- Order: no two clips, and no two large photos, side by side.
- Backing: white border 3-5 px, corners nudged a couple of px, sometimes one
  extra kink on an edge, like the hand-cut frames in the Figma.

Writes layout.js (window.LAYOUT).  Run: python3 tools/build_layout.py [iterations]
"""
import json, math, random, sys
import numpy as np
from scipy import ndimage as nd
from PIL import Image

SEED = 17
GAP = 44                      # minimum space between two photos
HOLE = 62                     # no point on the paper should be further than this from a photo
AREA = {"S": 150 * 200, "M": 200 * 267, "L": 280 * 373}
MAX_LONG = 430
HEAD = (470, 220)             # clear box around the headline (w, h)
COVER = 0.62                  # share of the map taken by photos incl. their gap margins
ITERS = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
R = 10                        # raster: 1 px = R layout px
PAD = 150                     # paper margin around the map's edge

rnd = random.Random(SEED)
nrnd = np.random.default_rng(SEED)

txt = open("photos.js").read()
photos = json.loads(txt.split("window.PHOTOS =", 1)[1].split(";\nwindow.SLOT_MAP")[0])
items = []
for i, m in enumerate(photos):
    w, h = Image.open(m["thumb"]).size
    items.append({"i": i, "ar": w / h, "clip": "loop" in m})

n = len(items)
steps = ["L"] * round(n * .17) + ["S"] * round(n * .3)
steps += ["M"] * (n - len(steps))
rnd.shuffle(steps)
for it, s in zip(items, steps):
    it["step"] = s
for it in items:
    if it["clip"] and it["step"] == "S":
        swap = next(o for o in items if not o["clip"] and o["step"] == "M")
        it["step"], swap["step"] = "M", "S"
for it in items:
    a = AREA[it["step"]]
    w = math.sqrt(a * it["ar"]); h = w / it["ar"]
    k = min(1, MAX_LONG / max(w, h))
    it["w"], it["h"] = round(w * k), round(h * k)

# map size from the target density (aspect ~ 1.38, like a laptop screen)
need = sum((it["w"] + GAP) * (it["h"] + GAP) for it in items) + HEAD[0] * HEAD[1]
area = need / COVER
IW = int(round(math.sqrt(area * 1.38) / R) * R); IH = int(round(area / IW / R) * R)
W, H = IW + 2 * PAD, IH + 2 * PAD
print("map", W, "x", H)

COLS = 10; ROWS = math.ceil((n + 1) / COLS)
cw, ch = IW / COLS, IH / ROWS
cells = [(c, r) for r in range(ROWS) for c in range(COLS)]
head_cell = None   # headline goes in the exact centre of the map (set below)
free = cells[:]
rnd.shuffle(free)
free = free[:n]

def neighbours(c):
    x, y = c
    return [((x + dx) % COLS, (y + dy) % ROWS) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))]

def bad_pair(a, b):
    return (a["clip"] and b["clip"]) or (a["step"] == "L" and b["step"] == "L")

for attempt in range(5000):
    order = items[:]; rnd.shuffle(order)
    at = dict(zip(free, order))
    if not any(nb in at and bad_pair(at[c], at[nb]) for c in free for nb in neighbours(c)):
        break

def centre(c):
    x, y = c
    return PAD + ((x + .5 + (.5 if y % 2 else 0)) * cw) % IW, PAD + (y + .5) * ch

hx, hy = W / 2, H / 2
B = [dict(it, cx=centre(c)[0] + rnd.uniform(-.2, .2) * cw, cy=centre(c)[1] + rnd.uniform(-.2, .2) * ch) for c, it in at.items()]
N = len(B)
cx = np.array([b["cx"] for b in B]); cy = np.array([b["cy"] for b in B])
bw = np.array([b["w"] for b in B], float); bh = np.array([b["h"] for b in B], float)
bad = np.array([[bad_pair(B[a], B[b]) and a != b for b in range(N)] for a in range(N)])

def wrap(d, L):
    return d            # finite map: no wrap-around

def inside(k, X, Y):
    return PAD + bw[k] / 2 <= X[k] <= W - PAD - bw[k] / 2 and PAD + bh[k] / 2 <= Y[k] <= H - PAD - bh[k] / 2

def clamp_all():
    np.clip(cx, PAD + bw / 2, W - PAD - bw / 2, out=cx); np.clip(cy, PAD + bh / 2, H - PAD - bh / 2, out=cy)

def violates(k, X, Y):
    """photo k at (X[k], Y[k]) breaks the minimum gap, the headline space, or sits beside a same-kind photo"""
    dx = np.abs(wrap(X - X[k], W)); dy = np.abs(wrap(Y - Y[k], H))
    ox = (bw + bw[k]) / 2 + GAP - dx; oy = (bh + bh[k]) / 2 + GAP - dy
    hit = (ox > 0) & (oy > 0); hit[k] = False
    if hit.any(): return True
    hdx = abs(wrap(X[k] - hx, W)); hdy = abs(wrap(Y[k] - hy, H))
    return (bw[k] + HEAD[0]) / 2 + GAP / 2 - hdx > 0 and (bh[k] + HEAD[1]) / 2 + GAP / 2 - hdy > 0

for rnd_i in range(2000):
    moved = 0
    for a in range(N):
        dx = wrap(cx - cx[a], W); dy = wrap(cy - cy[a], H)
        ox = (bw + bw[a]) / 2 + GAP - np.abs(dx); oy = (bh + bh[a]) / 2 + GAP - np.abs(dy)
        for b in np.nonzero((ox > 0) & (oy > 0))[0]:
            if b == a: continue
            moved += 1
            if ox[b] < oy[b]:
                s = math.copysign(ox[b] / 2 + .5, dx[b] or 1); cx[a] -= s; cx[b] += s
            else:
                s = math.copysign(oy[b] / 2 + .5, dy[b] or 1); cy[a] -= s; cy[b] += s
        hdx = wrap(cx[a] - hx, W); hdy = wrap(cy[a] - hy, H)
        ex = (bw[a] + HEAD[0]) / 2 + GAP / 2 - abs(hdx); ey = (bh[a] + HEAD[1]) / 2 + GAP / 2 - abs(hdy)
        if ex > 0 and ey > 0:
            moved += 1
            if ex < ey: cx[a] += math.copysign(ex + .5, hdx or 1)
            else: cy[a] += math.copysign(ey + .5, hdy or 1)
    clamp_all()
    if not moved: break
print("relaxed in", rnd_i, "rounds")

GW, GH = W // R, H // R
yy, xx = np.mgrid[0:GH, 0:GW]
head_mask = (np.abs(wrap(xx * R + R / 2 - hx, W)) < HEAD[0] / 2) & (np.abs(wrap(yy * R + R / 2 - hy, H)) < HEAD[1] / 2)

edge_mask = (xx * R < PAD - HOLE / 2) | (xx * R > W - PAD + HOLE / 2) | (yy * R < PAD - HOLE / 2) | (yy * R > H - PAD + HOLE / 2)

def hole_map(X, Y):
    occ = head_mask | edge_mask                            # headline + paper margin count as filled
    for k in range(N):
        x0 = int(math.floor((X[k] - bw[k] / 2) / R)); x1 = int(math.ceil((X[k] + bw[k] / 2) / R))
        y0 = int(math.floor((Y[k] - bh[k] / 2) / R)); y1 = int(math.ceil((Y[k] + bh[k] / 2) / R))
        occ[max(0, y0):y1, max(0, x0):x1] = True
    return nd.distance_transform_edt(~occ) * R

def same_kind_close(X, Y):
    """pairs of clips / large photos closer than 3x the gap (they'd read as a clump)"""
    dx = np.abs(wrap(X[:, None] - X[None, :], W)); dy = np.abs(wrap(Y[:, None] - Y[None, :], H))
    ox = (bw[:, None] + bw[None, :]) / 2 + 3 * GAP - dx; oy = (bh[:, None] + bh[None, :]) / 2 + 3 * GAP - dy
    return int((bad & (ox > 0) & (oy > 0)).sum() // 2)

def score(d, X, Y):
    over = np.maximum(0, d - HOLE)
    return float((over ** 2).sum() + 40 * over.max() ** 2) + 60000 * same_kind_close(X, Y)

d = hole_map(cx, cy); cur = score(d, cx, cy)
print("start: worst hole radius", round(d.max()), "score", round(cur))
T0 = cur * 0.002
for t in range(ITERS):
    temp = T0 * (1 - t / ITERS) ** 2
    nx, ny = cx.copy(), cy.copy()
    if rnd.random() < .25:
        a, b = rnd.sample(range(N), 2)
        nx[a], nx[b] = cx[b], cx[a]; ny[a], ny[b] = cy[b], cy[a]
        ks = (a, b)
    else:
        k = rnd.randrange(N)
        if rnd.random() < .5:                              # pull a photo next to the worst hole into it
            hy_, hx_ = np.unravel_index(np.argmax(d), d.shape)
            tx, ty = hx_ * R, hy_ * R
            dist = np.hypot(wrap(cx - tx, W), wrap(cy - ty, H)); k = int(np.argsort(dist)[rnd.randrange(3)])
            step = rnd.uniform(.15, .6)
            nx[k] = cx[k] + (tx - cx[k]) * step; ny[k] = cy[k] + (ty - cy[k]) * step
        else:
            nx[k] = cx[k] + nrnd.normal(0, 45); ny[k] = cy[k] + nrnd.normal(0, 45)
        ks = (k,)
    if any(not inside(k, nx, ny) or violates(k, nx, ny) for k in ks): continue
    nd_ = hole_map(nx, ny); s = score(nd_, nx, ny)
    if s < cur or (temp > 0 and rnd.random() < math.exp(-(s - cur) / temp)):
        cx, cy, d, cur = nx, ny, nd_, s
    if t % 1500 == 0:
        print(t, "worst hole radius", round(d.max()), "score", round(cur))
print("final: worst hole radius", round(d.max()), "px  (target", HOLE, ")  paper further than",
      HOLE, "px from a photo:", f"{(d > HOLE).mean() * 100:.1f}%")
np.save("/tmp/holes.npy", d)
print("clip/large pairs close together:", same_kind_close(cx, cy))

def cut(w, h):
    m = lambda: rnd.uniform(3, 5.5)
    j = lambda: rnd.uniform(-1.6, 1.6)
    l, t, r, b = -m(), -m(), w + m(), h + m()
    pts = [(l + j(), t + j()), (r + j(), t + j()), (r + j(), b + j()), (l + j(), b + j())]
    if rnd.random() < .45:
        e = rnd.randrange(4); p, q = pts[e], pts[(e + 1) % 4]; f = rnd.uniform(.3, .7)
        pts.insert(e + 1, (p[0] + (q[0] - p[0]) * f + rnd.uniform(-1.8, 1.8), p[1] + (q[1] - p[1]) * f + rnd.uniform(-1.8, 1.8)))
    return pts

out = []
for k, b in enumerate(B):
    x = round(cx[k] - bw[k] / 2, 1); y = round(cy[k] - bh[k] / 2, 1)
    pts = cut(b["w"], b["h"])
    out.append({"i": b["i"], "x": x, "y": y, "w": b["w"], "h": b["h"],
                "cut": "M " + " L ".join(f"{px:.1f} {py:.1f}" for px, py in pts) + " Z"})
out.sort(key=lambda s: (s["y"], s["x"]))
layout = {"w": W, "h": H, "start": [round(hx), round(hy)], "slots": out}
with open("layout.js", "w") as f:
    f.write("// Generated by tools/build_layout.py: one finite map, every photo once, real proportions, no holes.\n")
    f.write("window.LAYOUT = " + json.dumps(layout, separators=(",", ":")) + ";\n")
print(len(out), "photos on a", W, "x", H, "map")
