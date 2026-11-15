"""The split ring from wildyriftian.com's own '03' charm layer (framerusercontent
fsrZLkxLD4fRbDoXCcY0l7KeyCY.png, rows 408-522, cols 592-635), seen edge-on.
ring_layer() stretches it between two points on the shared 1200 square (only its
length and angle change; its width and shading stay exactly as cut)."""
import os
import numpy as np
from PIL import Image

SPRITE = Image.open(os.path.join(os.path.dirname(__file__), 'ref_split_ring.png')).convert('RGBA')

def _axis():
    a = np.asarray(SPRITE)[..., 3].astype(float)
    rows = [y for y in range(a.shape[0]) if (a[y] > 150).any()]
    def c(y):
        w = np.where(a[y] > 150, a[y], 0); return (w * np.arange(a.shape[1])).sum() / w.sum()
    top, bot = rows[0], rows[-1]
    return np.array([c(top), top]), np.array([c(bot), bot])

ST, SB = _axis()

def ring_layer(top, bottom, SS=2, CAN=2400):
    """RGBA canvas (CAN x CAN) with the ring from `top` to `bottom` (1200-space px)."""
    T = np.array(top, float) * SS; B = np.array(bottom, float) * SS
    d = B - T; L = np.linalg.norm(d); u = d / L; n = np.array([-u[1], u[0]])
    sd = SB - ST; Ls = np.linalg.norm(sd); su = sd / Ls; sn = np.array([-su[1], su[0]])
    # sprite = M @ (P - T) + ST
    M = (Ls / L) * np.outer(su, u) + (1 / SS) * np.outer(sn, n)
    off = ST - M @ T
    return SPRITE.transform((CAN, CAN), Image.AFFINE, (M[0, 0], M[0, 1], off[0], M[1, 0], M[1, 1], off[1]), resample=Image.BICUBIC)
