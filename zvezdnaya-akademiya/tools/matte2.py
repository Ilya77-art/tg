"""Case art pipeline v2: cut out, glow/shadow → alpha against the real background, optical size and baseline."""
import json, numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage as ndi

OUT = 600
BASE = 0.79      # where the object touches the ground (fraction of the square)
OPT = 0.47       # optical size: mean of sqrt(area) and sqrt(bbox) of the solid part, as a fraction of the square
MAXD = 0.80      # never wider or taller than this

# name: source, mask, crop box (x0, y0, x1, y1) in the source, background kind, seam (fraction of the object's height), opening style
SPECS = {
  'spray':   dict(src='spray_src.png', mask='spray_mask_isnet.png', box=(8, 22, 998, 1012), bg='white', seam=0.235, style='pop'),
  'case':    dict(src='case_src.png', mask='case_mask_isnet.png', box=(10, 22, 1000, 1012), bg='white', seam=0.585, style='hinge'),
  'prism':   dict(src='prism_src.png', mask='prism_mask_isnet.png', box=(14, 18, 1004, 1008), bg='white', seam=None, style='beam'),
  'capsule': dict(src='banner_src.png', mask='banner_mask.png', box=(0, 60, 460, 640), bg='est', seam=0.47, style='split'),
  'gallery': dict(src='banner_src.png', mask='banner_mask.png', box=(430, 60, 890, 640), bg='est', seam=None, style='frame'),
  'chest':   dict(src='banner_src.png', mask='banner_mask.png', box=(850, 60, 1310, 640), bg='est', seam=0.47, style='hinge'),
  'casket':  dict(src='banner_src.png', mask='banner_mask.png', box=(1280, 60, 1740, 640), bg='est', seam=0.36, style='hinge'),
  'portal':  dict(src='banner_src.png', mask='banner_mask.png', box=(1700, 40, 2169, 640), bg='est', seam=None, style='beam'),
}

def blur(a, r):
    return ndi.gaussian_filter(a, r)

def background(c, solid):
    """smooth estimate of the backdrop: normalised convolution outside a generous zone around the objects"""
    keep = (~ndi.binary_dilation(solid, iterations=55)).astype(np.float32)
    B = np.stack([blur(c[..., k] * keep, 70) for k in range(3)], -1)
    w = blur(keep, 70)[..., None]
    B2 = np.stack([blur(c[..., k] * keep, 160) for k in range(3)], -1); w2 = blur(keep, 160)[..., None]
    B = np.where(w > 0.08, B / np.maximum(w, 1e-4), B2 / np.maximum(w2, 1e-4))
    return np.clip(B, 0.02, 0.98)

GLOW = {'capsule': (1.0, 0.42), 'gallery': (0.9, 0.38), 'chest': (0.8, 0.34), 'casket': (0.9, 0.42), 'portal': (1.25, 0.75)}
def synth(im, ox, oy, base_y, width, name):
    """a soft glow from the object's own colours and an elliptical contact shadow, under the object"""
    can = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0))
    lay = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0)); lay.alpha_composite(im, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
    g = np.asarray(lay, dtype=np.float32) / 255
    k, amt = GLOW[name]
    rgb = g[..., :3]; lum = rgb.mean(2, keepdims=True); rgb = np.clip(lum + (rgb - lum) * 1.6, 0, 1)   # saturate
    big = np.stack([ndi.gaussian_filter(rgb[..., i] * g[..., 3], 26 * k) for i in range(3)], -1)
    ab = ndi.gaussian_filter(g[..., 3], 26 * k)
    col = big / np.maximum(ab, 1e-4)[..., None]
    glow = np.dstack([col, np.clip(ab * amt * 1.6, 0, amt)])
    # contact shadow: a wide soft ellipse on the ground line
    yy, xx = np.mgrid[0:OUT, 0:OUT].astype(np.float32)
    cx = OUT / 2; cy = oy + base_y - 0.004 * OUT
    e = ((xx - cx) / (width * 0.48)) ** 2 + ((yy - cy) / (0.032 * OUT)) ** 2
    sh = np.clip(1 - e, 0, 1) ** 1.4 * 0.5
    sh = ndi.gaussian_filter(sh, 5)
    shadow = np.dstack([np.zeros((OUT, OUT, 3)), sh])
    for L in (shadow, glow):
        can.alpha_composite(Image.fromarray((np.clip(L, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA'))
    return can

def build(name, sp, cache):
    src = np.asarray(Image.open(sp['src']).convert('RGB'), dtype=np.float32) / 255
    msk = np.asarray(Image.open(sp['mask']).convert('L'), dtype=np.float32) / 255
    if sp['bg'] == 'est':
        if 'B' not in cache: cache['B'] = background(src, msk > 0.5)
        B = cache['B']
    else:
        B = np.ones_like(src)
    x0, y0, x1, y1 = sp['box']
    c, m, B = src[y0:y1, x0:x1], msk[y0:y1, x0:x1], B[y0:y1, x0:x1]
    # colour-to-alpha against the backdrop: glows become light, the floor shadow becomes shadow
    up = (c - B) / np.maximum(1 - B, 1e-3); dn = (B - c) / np.maximum(B, 1e-3)
    a = np.max(np.where(c > B, up, dn), axis=2)
    t0 = 0.07 if sp['bg'] == 'white' else 0.10
    a2 = np.clip((a - t0) / (1 - t0), 0, 1)
    G = np.clip(B + (c - B) / np.maximum(a, 1e-3)[..., None], 0, 1)
    core = ndi.binary_fill_holes(m > 0.5)
    # keep only the main object (largest component) as solid; everything else may only glow
    lab, k = ndi.label(core)
    if k > 1:
        sizes = ndi.sum(core, lab, range(1, k + 1)); core = lab == (1 + int(np.argmax(sizes)))
    solid = np.maximum(ndi.gaussian_filter(core.astype(np.float32), 1.2), m * core)
    if name == 'spray':
        lab2, _ = ndi.label((a > 0.28) & ~core)
        yy, xx = np.mgrid[0:c.shape[0], 0:c.shape[1]]; disks = np.zeros_like(a)
        for sl in ndi.find_objects(lab2):
            if sl is None: continue
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if h * w < 60 or max(h, w) > 2.2 * min(h, w) or sl[0].start > c.shape[0] * 0.55: continue
            cy, cx, r = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, (h + w) / 4 * 0.97
            disks = np.maximum(disks, ((yy - cy) ** 2 + (xx - cx) ** 2 <= r * r).astype(np.float32))
        solid = np.maximum(solid, ndi.gaussian_filter(disks, 1.0))
    if name == 'prism':
        solid = np.maximum(solid, ndi.gaussian_filter(ndi.binary_fill_holes(m > 0.35).astype(np.float32), 1.5))
    if sp['bg'] == 'est':
        # the painted backdrop is too busy to unmix: keep the solid object, keep bright sparkles near it,
        # and draw the glow and the contact shadow ourselves (synth() below)
        dist = ndi.distance_transform_edt(~core)
        ys_core = np.where(core)[0]
        mx, mn = c.max(2), c.min(2)
        spark = (mx > 0.93) & ((mx - mn) < 0.16) & (dist < 140) & (dist > 3)
        spark = ndi.binary_opening(spark, iterations=1)
        lab3, k3 = ndi.label(spark); keep = np.zeros_like(spark)
        for i3, sl in enumerate(ndi.find_objects(lab3), 1):
            if sl is None or name != 'portal': continue
            n3 = (lab3[sl] == i3).sum(); h3, w3 = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if 25 <= n3 <= 900 and max(h3, w3) < 60 and sl[0].stop < ys_core.max() - 40: keep |= lab3 == i3
        sp_a = ndi.gaussian_filter(ndi.binary_dilation(keep, iterations=2).astype(np.float32), 1.5) * np.clip((mx - 0.78) / 0.2, 0, 1)
        a2 = sp_a; G = np.ones_like(c)
    solid = np.clip(solid, 0, 1)
    alpha = solid + (1 - solid) * a2
    prem = solid[..., None] * c + ((1 - solid) * a2)[..., None] * G
    # optical size and baseline
    ys, xs = np.where(core); by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    bw, bh = bx1 - bx0, by1 - by0
    opt = 0.5 * np.sqrt(core.sum()) + 0.5 * np.sqrt(bw * bh)
    sc = min(OPT * OUT / opt, MAXD * OUT / max(bw, bh))
    cx = (bx0 + bx1) / 2
    rgba = np.dstack([np.where(alpha[..., None] > 1e-4, prem / np.maximum(alpha, 1e-4)[..., None], 0), alpha])
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA')
    im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    ox, oy = round(OUT / 2 - cx * sc), round(BASE * OUT - by1 * sc)
    can = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0))
    if sp['bg'] == 'est': can = synth(im, ox, oy, by1 * sc, bw * sc, name)
    can.alpha_composite(im, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
    # feather the square so no glow ever shows a box edge
    arr = np.asarray(can, dtype=np.float32) / 255
    yy, xx = np.mgrid[0:OUT, 0:OUT].astype(np.float32) / (OUT - 1)
    f = 0.08; ramp = lambda d: np.clip(d / f, 0, 1) ** 1.6
    arr[..., 3] *= ramp(xx) * ramp(1 - xx) * ramp(yy) * ramp(1 - yy)
    can = Image.fromarray((arr * 255 + .5).astype(np.uint8), 'RGBA')
    can.save(f'v2_{name}.png'); can.save(f'v2_{name}.webp', 'WEBP', quality=84, method=6, alpha_quality=90)
    top = (oy + by0 * sc) / OUT; bot = (oy + by1 * sc) / OUT
    meta = dict(style=sp['style'], top=round(top, 4), bot=round(bot, 4), w=round(bw * sc / OUT, 4))
    if sp['seam'] is not None: meta['seam'] = round(top + sp['seam'] * (bot - top), 4)
    return can, meta

cache = {}; metas = {}; ims = {}
for n, sp in SPECS.items():
    ims[n], metas[n] = build(n, sp, cache)
json.dump(metas, open('v2_meta.json', 'w'), indent=1)
print(json.dumps(metas))
# preview: light card, dark card, opening overlay; seam lines in red on the last row
bgs = [(252, 252, 255), (12, 17, 34), (4, 6, 16)]
T = 220; W = Image.new('RGB', (len(ims) * (T + 6), 4 * (T + 6)), (90, 90, 90))
for j, b in enumerate(bgs + [(12, 17, 34)]):
    for i, n in enumerate(ims):
        t = Image.new('RGBA', (T, T), b + (255,)); t.alpha_composite(ims[n].resize((T, T), Image.LANCZOS))
        d = ImageDraw.Draw(t)
        if j == 3:
            mt = metas[n]
            for k, col in (('top', (80, 160, 255)), ('bot', (80, 255, 120)), ('seam', (255, 60, 60))):
                if k in mt: d.line((0, mt[k] * T, T, mt[k] * T), fill=col, width=1)
        W.paste(t.convert('RGB'), (i * (T + 6), j * (T + 6)))
W.save('v2_preview.png')
