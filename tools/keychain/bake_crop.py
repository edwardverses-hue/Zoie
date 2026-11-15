"""Bake the soft drop shadow into a 1200-square charm layer, crop it to its bounds,
and print its BOX entry (left, top, width, height as % of the square) for keychain.js."""
import sys
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
sh = im.getchannel('A').point(lambda v: int(v * 0.18)).filter(ImageFilter.GaussianBlur(5))
shadow = Image.new('RGBA', im.size, (0, 0, 0, 0)); shadow.putalpha(sh)
out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(shadow, (3, 3)); out.alpha_composite(im)
l, t, r, b = out.getchannel('A').point(lambda v: 255 if v > 2 else 0).getbbox()
out.crop((l, t, r, b)).save(dst, 'WEBP', quality=92, method=6)
print([round(v / 12, 3) for v in (l, t, r - l, b - t)])
