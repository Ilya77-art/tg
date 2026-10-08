import sys, glob
from PIL import Image, ImageDraw
pref, out, box, cols = sys.argv[1], sys.argv[2], tuple(map(int, sys.argv[3].split(','))), int(sys.argv[4])
fs = sorted(glob.glob(f'/home/claude/work/fr/{pref}*.png'))
ims = [Image.open(f).convert('RGB').crop(box) for f in fs]
tw = 220; th = int(ims[0].height * tw / ims[0].width); rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + 4), rows * (th + 4)), (70, 70, 70))
for i, im in enumerate(ims):
    t = im.resize((tw, th), Image.LANCZOS); d = ImageDraw.Draw(t); d.text((3, 2), f'{i * 80}', fill=(255, 255, 0))
    S.paste(t, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
S.save(out)
