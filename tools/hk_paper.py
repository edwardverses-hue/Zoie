"""Grey paper background matched to hakusuku.jp/recruit's hero (measured on their kv_pc.mp4,
2560 px square shown at 1440 css px wide): neutral grey mean 224.5, std 6.2, with the noise
spread over scales like theirs (high-pass std at sigma 1/3/10/30 video px = 2.7/5.1/5.9/6.1),
~0.18% darker specks. Seamless tile (wrap filtering). Writes assets/bg-grey.jpg (2048 px,
shown at 1024 css px = their 1820 video px)."""
import numpy as np
from scipy import ndimage as nd
from PIL import Image
N = 1820; rng = np.random.default_rng(7)
target = {1: 2.72, 3: 5.06, 10: 5.87, 30: 6.05}
amps = np.array([2.0, 3.0, 1.6, 1.2]); scales = [0.6, 1.6, 5.0, 16.0]
noise = [nd.gaussian_filter(rng.normal(0, 1, (N, N)), s, mode="wrap") for s in scales]
noise = [n / n.std() for n in noise]
def build(a): return 224.5 + sum(k * n for k, n in zip(a, noise))
def stats(img): return {s: (img - nd.gaussian_filter(img, s, mode="wrap")).std() for s in target}
for _ in range(25):                       # fit band amplitudes to the measured profile
    st = stats(build(amps))
    amps[0] *= (target[1] / st[1]) ** 0.7
    amps[1] *= (target[3] / st[3]) ** 0.7 * (st[1] / target[1]) ** 0.2
    amps[2] *= (target[10] / st[10]) ** 0.7
    amps[3] *= (target[30] / st[30]) ** 0.7
img = build(amps)
sp = rng.random((N, N)) < 0.0018           # specks
img[nd.binary_dilation(sp)] -= 14
print({k: round(v, 2) for k, v in stats(img).items()}, round(img.mean(), 1), round(img.std(), 2))
Image.fromarray(np.clip(img, 0, 255).astype("uint8")).resize((2048, 2048), Image.LANCZOS).convert("RGB").save(
    __import__("os").path.join(__import__("os").path.dirname(__file__), "..", "assets", "bg-grey.jpg"), quality=88)
