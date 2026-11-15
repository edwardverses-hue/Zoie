"""Lay out the gallery: every photo once, at its real proportions, on a repeating tile.

How it's arranged
- Size: three steps by area (small / medium / large), so a tall strip and a wide
  photo of the same step weigh the same on screen. Clips skew medium/large.
- Place: a brick grid (alternate rows shifted half a cell) with jitter, then a
  relaxation pass that pushes photos apart until every gap is at least GAP px,
  measured across the tile's wrap-around edges too, so the repeat has no seam.
- Order: shuffled so two clips or two large photos never sit side by side.
- One cell per tile stays empty for the headline at the start; a few more stay
  empty, spread out, as breathing room.
- Backing: white border 3-5 px, each corner nudged a couple of px and sometimes
  one extra kink on an edge, like the hand-cut frames in the Figma.

Writes layout.js (window.LAYOUT).  Run: python3 tools/build_layout.py
"""
import json, math, random
from PIL import Image

SEED = 17
COLS, ROWS = 10, 7
CELL_W, CELL_H = 380, 400
GAP = 46
AREA = {"S": 150 * 200, "M": 200 * 267, "L": 285 * 380}
MAX_LONG = 440
HEAD = (540, 270)            # clear box around the headline (w, h)
# clear band under the fixed header in the starting view (relative to the headline centre)
BANDS = [(-960, -470, 960, -275), (-400, -880, 400, -275)]   # desktop header, phone header

rnd = random.Random(SEED)
W, H = COLS * CELL_W, ROWS * CELL_H

txt = open("photos.js").read()
photos = json.loads(txt.split("window.PHOTOS =", 1)[1].split(";\nwindow.SLOT_MAP")[0])
items = []
for i, m in enumerate(photos):
    w, h = Image.open(m["thumb"]).size
    items.append({"i": i, "ar": w / h, "clip": "loop" in m})

# size steps: ~20% large, ~55% medium, ~25% small; clips never small
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

# cells: one empty for the headline, a few more spread out
cells = [(c, r) for r in range(ROWS) for c in range(COLS)]
HEAD_CELL = (COLS // 2, ROWS // 2)
empty = {HEAD_CELL}
spare = len(cells) - n - 1
cand = [c for c in cells if abs(c[0] - HEAD_CELL[0]) + abs(c[1] - HEAD_CELL[1]) > 2]
while len(empty) < spare + 1:
    c = rnd.choice(cand)
    if all(min(abs(c[0] - e[0]), COLS - abs(c[0] - e[0])) + min(abs(c[1] - e[1]), ROWS - abs(c[1] - e[1])) > 3 for e in empty):
        empty.add(c)
slots = [c for c in cells if c not in empty]

def neighbours(c):
    x, y = c
    return [((x + dx) % COLS, (y + dy) % ROWS) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1))]

# order: no two clips / two large next to each other
for attempt in range(4000):
    order = items[:]; rnd.shuffle(order)
    at = dict(zip(slots, order))
    ok = all(not (at[c]["clip"] and nb in at and at[nb]["clip"]) and not (at[c]["step"] == "L" and nb in at and at[nb]["step"] == "L")
             for c in slots for nb in neighbours(c))
    if ok:
        break

COL_DRIFT = [rnd.uniform(0, CELL_H) for _ in range(COLS)]
def cell_centre(c):
    x, y = c
    return (x * CELL_W + CELL_W / 2) % W, (y * CELL_H + CELL_H / 2 + COL_DRIFT[x]) % H

boxes = []
for c, it in at.items():
    cx, cy = cell_centre(c)
    jx = rnd.uniform(-1, 1) * max(0, (CELL_W - it["w"]) / 2 - GAP / 2) * 1.0
    jy = rnd.uniform(-1, 1) * max(0, (CELL_H - it["h"]) / 2 - GAP / 2) * 1.0
    boxes.append({**it, "cx": cx + jx, "cy": cy + jy})
hx, hy = cell_centre(HEAD_CELL)

def wrap(d, L):
    return (d + L / 2) % L - L / 2

# relaxation: push overlapping (gap < GAP) pairs apart, toroidally; keep the headline clear
for it_ in range(600):
    moved = 0
    for a in range(len(boxes)):
        A = boxes[a]
        for b in range(a + 1, len(boxes)):
            B = boxes[b]
            dx = wrap(B["cx"] - A["cx"], W); dy = wrap(B["cy"] - A["cy"], H)
            ox = (A["w"] + B["w"]) / 2 + GAP - abs(dx)
            oy = (A["h"] + B["h"]) / 2 + GAP - abs(dy)
            if ox > 0 and oy > 0:
                moved += 1
                if ox < oy:
                    s = math.copysign(ox / 2 + .5, dx or 1); A["cx"] -= s; B["cx"] += s
                else:
                    s = math.copysign(oy / 2 + .5, dy or 1); A["cy"] -= s; B["cy"] += s
        dx = wrap(A["cx"] - hx, W); dy = wrap(A["cy"] - hy, H)
        ox = (A["w"] + HEAD[0]) / 2 + GAP - abs(dx); oy = (A["h"] + HEAD[1]) / 2 + GAP - abs(dy)
        if ox > 0 and oy > 0:
            moved += 1
            if ox < oy: A["cx"] += math.copysign(ox + .5, dx or 1)
            else: A["cy"] += math.copysign(oy + .5, dy or 1)
        dx = wrap(A["cx"] - hx, W); dy = wrap(A["cy"] - hy, H)
        for BAND in BANDS:
            bx = (BAND[0] + BAND[2]) / 2; by = (BAND[1] + BAND[3]) / 2; bw = BAND[2] - BAND[0]; bh = BAND[3] - BAND[1]
            ex = (A["w"] + bw) / 2 + GAP / 2 - abs(dx - bx); ey = (A["h"] + bh) / 2 + GAP / 2 - abs(dy - by)
            if ex > 0 and ey > 0:
                moved += 1
                if ex < ey: A["cx"] += math.copysign(ex + .5, (dx - bx) or 1)
                else: A["cy"] += math.copysign(ey + .5, (dy - by) or 1)
        A["cx"] %= W; A["cy"] %= H
    if not moved:
        break
print("relaxation rounds", it_, "remaining overlaps", moved)

def cut(w, h):
    """Hand-cut backing around a w x h photo: uneven white border, nudged corners."""
    m = lambda: rnd.uniform(3, 5.5)
    j = lambda: rnd.uniform(-1.6, 1.6)
    l, t, r, b = -m(), -m(), w + m(), h + m()
    pts = [(l + j(), t + j()), (r + j(), t + j()), (r + j(), b + j()), (l + j(), b + j())]
    if rnd.random() < .45:                       # one kink on a random edge
        e = rnd.randrange(4); p, q = pts[e], pts[(e + 1) % 4]; f = rnd.uniform(.3, .7)
        k = (p[0] + (q[0] - p[0]) * f + rnd.uniform(-1.8, 1.8), p[1] + (q[1] - p[1]) * f + rnd.uniform(-1.8, 1.8))
        pts.insert(e + 1, k)
    return pts

out = []
for B in boxes:
    x = round(B["cx"] - B["w"] / 2, 1); y = round(B["cy"] - B["h"] / 2, 1)
    pts = cut(B["w"], B["h"])
    out.append({"i": B["i"], "x": x, "y": y, "w": B["w"], "h": B["h"],
                "cut": "M " + " L ".join(f"{px:.1f} {py:.1f}" for px, py in pts) + " Z"})
out.sort(key=lambda s: (s["y"], s["x"]))
layout = {"w": W, "h": H, "start": [round(hx), round(hy)], "slots": out}
with open("layout.js", "w") as f:
    f.write("// Generated by tools/build_layout.py: every photo once, real proportions, even gaps.\n")
    f.write("window.LAYOUT = " + json.dumps(layout, separators=(",", ":")) + ";\n")
print(len(out), "photos on a", W, "x", H, "tile")
