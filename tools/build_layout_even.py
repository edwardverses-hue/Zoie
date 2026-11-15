"""Gallery layouts with exactly even gaps (every photo once, real proportions, finite map).

  python3 tools/build_layout_even.py rows     -> justified rows: every row spans the full
                                                  width, same gap between every photo
  python3 tools/build_layout_even.py columns  -> staggered columns (masonry): equal column
                                                  widths, same gap everywhere

Both leave a clear window in the middle for the headline. Writes layout.js.
"""
import json, math, random, sys
from PIL import Image

MODE = sys.argv[1] if len(sys.argv) > 1 else "rows"
SEED = 7
G = 30 if "--loose" in sys.argv else 40   # the gap (minimum gap when --loose)
PAD = 120              # paper margin around the map
HEAD_W, HEAD_H = 720, 330   # window for "happy birthday, zoie." + date (desktop px)

rnd = random.Random(SEED)
txt = open("photos.js").read()
photos = json.loads(txt.split("window.PHOTOS =", 1)[1].split(";\nwindow.SLOT_MAP")[0])
items = []
for i, m in enumerate(photos):
    w, h = Image.open(m["thumb"]).size
    items.append({"i": i, "ar": w / h, "clip": "loop" in m})

# order: shuffled, never two clips back to back
for _ in range(5000):
    rnd.shuffle(items)
    if not any(items[k]["clip"] and items[k + 1]["clip"] for k in range(len(items) - 1)):
        break

def cut(w, h):
    m = lambda: rnd.uniform(3, 5.5)
    j = lambda: rnd.uniform(-1.6, 1.6)
    l, t, r, b = -m(), -m(), w + m(), h + m()
    pts = [(l + j(), t + j()), (r + j(), t + j()), (r + j(), b + j()), (l + j(), b + j())]
    if rnd.random() < .45:
        e = rnd.randrange(4); p, q = pts[e], pts[(e + 1) % 4]; f = rnd.uniform(.3, .7)
        pts.insert(e + 1, (p[0] + (q[0] - p[0]) * f + rnd.uniform(-1.8, 1.8), p[1] + (q[1] - p[1]) * f + rnd.uniform(-1.8, 1.8)))
    return "M " + " L ".join(f"{px:.1f} {py:.1f}" for px, py in pts) + " Z"

slots = []

if MODE == "rows":
    W_IN = 2900
    ROW_H = 290
    HW = 700                                   # headline window width in its row
    n = len(items)
    ars = [it["ar"] for it in items]
    nat = sum(a * ROW_H for a in ars) + G * n
    K = max(3, round(nat / (W_IN + G)))        # number of rows
    K += K % 2 == 0                            # odd, so one row sits exactly in the middle
    mid = K // 2
    targets = [W_IN + G] * K; targets[mid] = W_IN - HW - G + G
    # balanced split into K consecutive rows (dynamic programming on squared misfit)
    pre = [0]
    for a_ in ars: pre.append(pre[-1] + a_ * ROW_H + G)
    INF = float("inf")
    best = [[INF] * (n + 1) for _ in range(K + 1)]; back = [[0] * (n + 1) for _ in range(K + 1)]
    best[0][0] = 0
    for k in range(1, K + 1):
        for j in range(1, n + 1):
            for i in range(k - 1, j):
                if best[k - 1][i] == INF: continue
                c = best[k - 1][i] + (pre[j] - pre[i] - targets[k - 1]) ** 2
                if c < best[k][j]: best[k][j] = c; back[k][j] = i
    cuts = [n]
    for k in range(K, 0, -1): cuts.append(back[k][cuts[-1]])
    cuts = cuts[::-1]
    rows = [items[cuts[k]:cuts[k + 1]] for k in range(K)]
    y = PAD
    for r, row in enumerate(rows):
        sa = sum(it["ar"] for it in row)
        if r == mid:
            # two halves with the same height; the window takes whatever width is left (~HW)
            h = (W_IN - HW - G * len(row)) / sa
            half = max(1, len(row) // 2)
            # pick the split that best centres the window
            best_s, best_d = half, 1e9
            for s_ in range(1, len(row)):
                lw = sum(it["ar"] for it in row[:s_]) * h + G * (s_ - 1)
                d = abs(lw - (W_IN - (sa * h + G * (len(row) - 2))) / 2 - 0)  # left width vs right width balance
                rw = sum(it["ar"] for it in row[s_:]) * h + G * (len(row) - s_ - 1)
                d = abs(lw - rw)
                if d < best_d: best_s, best_d = s_, d
            left, right = row[:best_s], row[best_s:]
            x = PAD
            for it in left:
                w = it["ar"] * h; slots.append({"i": it["i"], "x": round(x, 1), "y": round(y, 1), "w": round(w), "h": round(h), "cut": cut(round(w), round(h))}); x += w + G
            win_l = x - G
            rw = sum(it["ar"] for it in right) * h + G * (len(right) - 1)
            x = PAD + W_IN - rw
            win_r = x
            for it in right:
                w = it["ar"] * h; slots.append({"i": it["i"], "x": round(x, 1), "y": round(y, 1), "w": round(w), "h": round(h), "cut": cut(round(w), round(h))}); x += w + G
            head = (round((win_l + win_r) / 2), round(y + h / 2))
        else:
            h = (W_IN - G * (len(row) - 1)) / sa
            x = PAD
            for it in row:
                w = it["ar"] * h; slots.append({"i": it["i"], "x": round(x, 1), "y": round(y, 1), "w": round(w), "h": round(h), "cut": cut(round(w), round(h))}); x += w + G
        y += h + G
    W, H = W_IN + 2 * PAD, round(y - G + PAD)
    print("rows", K, "heights", [round((W_IN - G * (len(r) - 1)) / sum(i["ar"] for i in r)) for r in rows], "window", round(win_r - win_l), "x", round(h))

else:  # columns
    NC = 11
    W_IN = 3000
    cw = (W_IN - G * (NC - 1)) / NC
    tops = [rnd.uniform(0, cw * .9) for _ in range(NC)]          # stagger the columns
    colh = tops[:]
    est = sum(cw / it["ar"] + G for it in items) / NC + HEAD_H / NC
    hy = est / 2                                                   # headline vertical centre
    c0 = NC // 2 - 1                                               # headline covers columns c0..c0+2
    hcols = range(c0, c0 + 3)
    hw = cw * 3 + G * 2
    gap_top, gap_bot = hy - HEAD_H / 2, hy + HEAD_H / 2
    placed = [[] for _ in range(NC)]
    for it in items:
        c = min(range(NC), key=lambda k: colh[k])
        h = cw / it["ar"]
        if c in hcols and colh[c] < gap_bot and colh[c] + h > gap_top:
            colh[c] = gap_bot + G                                  # jump over the headline window
        placed[c].append((it, colh[c], h)); colh[c] += h + G
    # trim: finish all columns at the same line by stretching the paper margin, not the photos
    W = W_IN + 2 * PAD; H = round(max(colh) - G + 2 * PAD)
    for c in range(NC):
        x = PAD + c * (cw + G)
        for it, y, h in placed[c]:
            slots.append({"i": it["i"], "x": round(x, 1), "y": round(PAD + y, 1), "w": round(cw), "h": round(h), "cut": cut(round(cw), round(h))})
    head = (round(PAD + c0 * (cw + G) + hw / 2), round(PAD + hy))

if "--loose" in sys.argv:
    # break the grid: each photo shrinks to a random size inside its cell, sits at a random
    # spot in it and gets a slight tilt. The cell grid stays invisible underneath, so gaps
    # vary from G up to G + (unused cell) but never open into holes.
    lr = random.Random(SEED + 1)
    for sl in slots:
        big = lr.random() < .22
        k = 1.0 if big else lr.uniform(.62, .9)
        w, h = sl["w"] * k, sl["h"] * k
        sl["x"] = round(sl["x"] + lr.uniform(0, sl["w"] - w), 1)
        sl["y"] = round(sl["y"] + lr.uniform(0, sl["h"] - h), 1)
        sl["w"], sl["h"] = round(w), round(h)
        sl["cut"] = cut(sl["w"], sl["h"])
        sl["r"] = round(lr.uniform(-2.2, 2.2), 2)
layout = {"w": W, "h": H, "start": list(head), "slots": slots}
with open("layout.js", "w") as f:
    f.write(f"// Generated by tools/build_layout_even.py {MODE}: every photo once, real proportions, one even gap.\n")
    f.write("window.LAYOUT = " + json.dumps(layout, separators=(",", ":")) + ";\n")
print(MODE, len(slots), "photos on", W, "x", H, "start", head)
