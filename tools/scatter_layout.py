"""Turn the even-rows skeleton into a loose scatter (closer to haneda-nice-day's map):
photos drift across row lines, sizes vary a lot, slight tilts; then a relaxation pass
pushes overlapping photos apart (min gap GAP) and keeps the headline window clear.
Run after: python3 tools/build_layout_even.py rows   ->   python3 tools/scatter_layout.py"""
import json, math, random
SEED, GAP = 23, 34
rnd = random.Random(SEED)
L = json.loads(open("layout.js").read().split("=", 1)[1].rstrip(";\n"))
W, H = L["w"], L["h"]; hx, hy = L["start"]; HW, HH = 640, 300; PAD = 110
S = L["slots"]
for s in S:
    k = rnd.choice([rnd.uniform(.45, .65), rnd.uniform(.6, .85), rnd.uniform(.8, 1.05)])
    cx, cy = s["x"] + s["w"] / 2, s["y"] + s["h"] / 2
    s["w"], s["h"] = round(s["w"] * k), round(s["h"] * k)
    s["cx"] = cx + rnd.uniform(-1, 1) * 140
    s["cy"] = cy + rnd.uniform(-1, 1) * 170
    s["r"] = round(rnd.uniform(-3.5, 3.5), 2)
for it in range(1500):
    moved = 0
    for i, a in enumerate(S):
        for b in S[i + 1:]:
            dx = b["cx"] - a["cx"]; dy = b["cy"] - a["cy"]
            ox = (a["w"] + b["w"]) / 2 + GAP - abs(dx); oy = (a["h"] + b["h"]) / 2 + GAP - abs(dy)
            if ox > 0 and oy > 0:
                moved += 1
                if ox < oy: m = math.copysign(ox / 2 + .5, dx or 1); a["cx"] -= m; b["cx"] += m
                else: m = math.copysign(oy / 2 + .5, dy or 1); a["cy"] -= m; b["cy"] += m
        dx = a["cx"] - hx; dy = a["cy"] - hy
        ex = (a["w"] + HW) / 2 - abs(dx); ey = (a["h"] + HH) / 2 - abs(dy)
        if ex > 0 and ey > 0:
            moved += 1
            if ex < ey: a["cx"] += math.copysign(ex + .5, dx or 1)
            else: a["cy"] += math.copysign(ey + .5, dy or 1)
        a["cx"] = min(max(a["cx"], PAD + a["w"] / 2), W - PAD - a["w"] / 2)
        a["cy"] = min(max(a["cy"], PAD + a["h"] / 2), H - PAD - a["h"] / 2)
    if not moved: break
print("relaxed", it, "left", moved)
def cut(w, h):
    m = lambda: rnd.uniform(3, 5.5); j = lambda: rnd.uniform(-1.6, 1.6)
    l, t, r, b = -m(), -m(), w + m(), h + m()
    pts = [(l + j(), t + j()), (r + j(), t + j()), (r + j(), b + j()), (l + j(), b + j())]
    return "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
for s in S:
    s["x"] = round(s.pop("cx") - s["w"] / 2, 1); s["y"] = round(s.pop("cy") - s["h"] / 2, 1); s["cut"] = cut(s["w"], s["h"])
open("layout.js", "w").write("// tools/build_layout_even.py rows + tools/scatter_layout.py: loose scatter.\nwindow.LAYOUT = " + json.dumps(L, separators=(",", ":")) + ";\n")
