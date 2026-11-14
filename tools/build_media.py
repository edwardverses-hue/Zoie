"""Turn original photos/videos into web-sized files and write photos.js.

Run:  python3 tools/build_media.py
Edit SOURCES below to add or change media. Originals stay outside the repo.
"""
import json, os, subprocess
from PIL import Image, ImageOps

UP = "/mnt/user-data/uploads"
OUT = os.path.join(os.path.dirname(__file__), "..", "photos")

# image: path [, crop box (l, t, r, b) after rotation]
# video: path, loop start, loop length, optional ffmpeg crop
KEEP = [l.strip() for l in open(os.path.join(os.path.dirname(__file__), "keep.txt")) if l.strip()]  # de-duplicated photo list
VIDEOS = [
    {"vid": "8fc7cced-IMG_3807.mov", "start": 0.5, "len": 4.5},   # selfie on the screen
    {"vid": "c17534fd-IMG_4694.mov", "start": 3.8, "len": 4.6},   # golf swing
    {"vid": "dafe9740-IMG_4163.mov", "start": 0.0, "len": 4.0},   # in line
    {"vid": "c0915e84-Video_2.mov", "start": 0.0, "len": 8.2, "vcrop": "322:956:320:2"},  # photoism live
    {"vid": "edf73bba-8825cce6b1b94544b1fa2f5f147d7752.mov", "start": 8.0, "len": 4.5},   # dancing in the snow
    {"vid": "c1c442a0-video_1.mov", "start": 0.0, "len": 10.0},  # life four cuts live
    {"vid": "IMG_8105.mov", "start": 6.0, "len": 4.0},           # laughing at the camera
    {"vid": "IMG_9630.mov", "start": 2.5, "len": 5.0},           # gym
    {"vid": "IMG_9860.mov", "start": 4.5, "len": 4.0},           # claw machine
]
SOURCES = [{"img": os.path.basename(f)} for f in KEEP] + VIDEOS

def ff(*args):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)

def scale_expr(long_edge):
    # fit the long edge, keep even dimensions
    return f"scale='if(gt(iw,ih),{long_edge},-2)':'if(gt(iw,ih),-2,{long_edge})'"

def trim_black(im):
    """Cut flat black bars (screenshots, letterboxing) off the edges."""
    import numpy as np
    a = np.asarray(im.convert("L")).astype(float)
    dark = lambda v: v.mean() < 14 and v.std() < 10
    t, b, l, r = 0, a.shape[0], 0, a.shape[1]
    while t < b - 10 and dark(a[t]): t += 1
    while b > t + 10 and dark(a[b - 1]): b -= 1
    while l < r - 10 and dark(a[:, l]): l += 1
    while r > l + 10 and dark(a[:, r - 1]): r -= 1
    return im.crop((l, t, r, b)) if (t, b, l, r) != (0, a.shape[0], 0, a.shape[1]) else im

def build():
    for d in ("thumb", "full", "loop", "video"):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    items = []
    for n, s in enumerate(SOURCES, 1):
        name = f"{n:02d}"
        if "img" in s:
            im = ImageOps.exif_transpose(Image.open(os.path.join(UP, s["img"]))).convert("RGB")
            im = trim_black(im)
            w, h = im.size
            for kind, edge, q in (("thumb", 800, 78), ("full", 2000, 82)):
                c = im.copy(); c.thumbnail((edge, edge), Image.LANCZOS)
                c.save(os.path.join(OUT, kind, name + ".webp"), "WEBP", quality=q, method=6)
            items.append({"thumb": f"photos/thumb/{name}.webp", "full": f"photos/full/{name}.webp", "aspect": w / h})
        else:
            src = os.path.join(UP, s["vid"])
            pre = f"crop={s['vcrop']}," if "vcrop" in s else ""
            loop = os.path.join(OUT, "loop", name + ".mp4")
            full = os.path.join(OUT, "video", name + ".mp4")
            poster = os.path.join(OUT, "thumb", name + ".webp")
            ff("-ss", str(s["start"]), "-t", str(s["len"]), "-i", src, "-an",
               "-vf", pre + scale_expr(640) + ",fps=30", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", loop)
            ff("-i", src, "-vf", pre + scale_expr(1280), "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", full)
            tmp = poster + ".png"
            ff("-ss", str(s["start"]), "-i", src, "-frames:v", "1", "-vf", pre + scale_expr(800), tmp)
            im = Image.open(tmp); w, h = im.size; im.save(poster, "WEBP", quality=78); os.remove(tmp)
            items.append({"thumb": f"photos/thumb/{name}.webp", "loop": f"photos/loop/{name}.mp4",
                          "video": f"photos/video/{name}.mp4", "aspect": w / h})
    return items

def assign(items, copies=4):
    """Map each of the 80 slots to a media index, matching shape so tall strips land in tall frames."""
    src = open(os.path.join(os.path.dirname(__file__), "..", "main.js")).read()
    slots = [json.loads(l.strip().rstrip(",")) for l in src.splitlines() if l.strip().startswith('{"g":')]
    asp = [s["p"][2] / s["p"][3] for s in slots] * copies
    order_s = sorted(range(len(asp)), key=lambda i: asp[i])
    order_m = sorted(range(len(items)), key=lambda i: items[i]["aspect"])
    # spread the extra slots evenly over the shape-sorted media so repeats are a mix of shapes
    n, m = len(order_s), len(order_m)
    out = [0] * n
    for k, si in enumerate(order_s):
        out[si] = order_m[min(m - 1, k * m // n)]
    # shuffle within same-ish shape buckets so neighbours differ, deterministically
    import random
    rnd = random.Random(1117)
    for _ in range(400):
        i, j = rnd.randrange(n), rnd.randrange(n)
        if abs(asp[i] - asp[j]) < 0.12: out[i], out[j] = out[j], out[i]
    return out

if __name__ == "__main__":
    import shutil
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    items = build()
    slot_map = assign(items)
    clean = [{k: v for k, v in m.items() if k != "aspect"} for m in items]
    js = "// Generated by tools/build_media.py\n"
    js += "// PHOTOS: every photo/video once.  SLOT_MAP: which one goes in each of the 80 gallery slots.\n"
    js += "window.PHOTOS = " + json.dumps(clean, indent=1) + ";\n"
    js += "window.SLOT_MAP = " + json.dumps(slot_map) + ";\n"
    open(os.path.join(os.path.dirname(__file__), "..", "photos.js"), "w").write(js)
    print(len(items), "items,", len(slot_map), "slots")
