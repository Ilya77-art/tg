import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

CROPS = {  # x0, y0, size (square, in source pixels)
  'prism': (14, 18, 990),
  'spray': (8, 22, 990),
  'case':  (10, 22, 990),
}
OUT = 600

def smooth(m, r):
    return np.asarray(Image.fromarray((np.clip(m,0,1)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)/255

def build(n):
    x0, y0, S = CROPS[n]
    src = Image.open(f'{n}_src.png').convert('RGB').crop((x0, y0, x0+S, y0+S)).resize((OUT, OUT), Image.LANCZOS)
    msk = Image.open(f'{n}_mask_isnet.png').convert('L').crop((x0, y0, x0+S, y0+S)).resize((OUT, OUT), Image.LANCZOS)
    c = np.asarray(src, dtype=np.float32)/255
    m = np.asarray(msk, dtype=np.float32)/255
    # colour to alpha against white: glows become tinted light, the floor shadow becomes a dark shadow
    a = np.max(1 - c, axis=2)
    t0 = 0.07
    a2 = np.clip((a - t0)/(1 - t0), 0, 1)
    # solid object: the network's mask with its holes filled, plus saturated blobs (paint balls, rainbow) with holes filled
    core = m > 0.5
    core = ndi.binary_fill_holes(core)
    blobs = ndi.binary_fill_holes(a > 0.5)
    blobs = ndi.binary_opening(blobs, iterations=2)
    solid = np.maximum(smooth(core.astype(np.float32), 1.2) , m)
    solid = np.maximum(solid, smooth(blobs.astype(np.float32), 1.0) * (a > 0.25))
    solid = np.clip(solid, 0, 1)
    if n == 'spray':
        # paint balls are circles: fill each saturated blob outside the can as a disk
        lab, k = ndi.label((a > 0.28) & ~core)
        yy0, xx0 = np.mgrid[0:OUT, 0:OUT]
        disks = np.zeros_like(a)
        for i, sl in enumerate(ndi.find_objects(lab), 1):
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if h * w < 40 or max(h, w) > 2.2 * min(h, w) or sl[0].start > OUT * 0.55: continue
            cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
            r = (h + w) / 4 * 0.97
            disks = np.maximum(disks, ((yy0 - cy) ** 2 + (xx0 - cx) ** 2 <= r * r).astype(np.float32))
        solid = np.maximum(solid, smooth(disks, 1.0))
    if n == 'prism':
        solid = np.maximum(solid, smooth(ndi.binary_fill_holes(m > 0.35).astype(np.float32), 1.5))
    # unblended colour for the glow part
    with np.errstate(divide='ignore', invalid='ignore'):
        cu = 1 - (1 - c) / np.maximum(a, 1e-4)[..., None]
    cu = np.clip(np.nan_to_num(cu), 0, 1)
    alpha = solid + (1 - solid) * a2
    prem = solid[..., None] * c + ((1 - solid) * a2)[..., None] * cu
    # feather the square edges so the glow never shows a box
    yy, xx = np.mgrid[0:OUT, 0:OUT].astype(np.float32) / (OUT - 1)
    f = 0.09
    ramp = lambda d: np.clip(d / f, 0, 1) ** 1.6
    edge = ramp(xx) * ramp(1 - xx) * ramp(yy) * ramp(1 - yy)
    alpha *= edge; prem *= edge[..., None]
    col = np.where(alpha[..., None] > 1e-4, prem / np.maximum(alpha, 1e-4)[..., None], 0)
    rgba = np.dstack([np.clip(col, 0, 1), np.clip(alpha, 0, 1)])
    im = Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA')
    im.save(f'{n}.png')
    im.save(f'{n}.webp', 'WEBP', quality=84, method=6, alpha_quality=90)
    return im

ims = {n: build(n) for n in CROPS}
# preview on the light card, the dark card and the opening overlay
bgs = [(252, 252, 255), (16, 20, 38), (6, 8, 20)]
W = Image.new('RGB', (3 * 310, 3 * 310), (128, 128, 128))
for j, b in enumerate(bgs):
    for i, n in enumerate(ims):
        t = Image.new('RGBA', (300, 300), b + (255,))
        t.alpha_composite(ims[n].resize((300, 300), Image.LANCZOS))
        W.paste(t.convert('RGB'), (i * 310, j * 310))
W.save('preview.png')
import os
for n in ims: print(n, os.path.getsize(f'{n}.webp'))
