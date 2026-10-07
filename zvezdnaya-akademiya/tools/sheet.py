import json, sys
from PIL import Image, ImageDraw
fr = json.load(open('/home/claude/work/shots/_frames.json'))
ims = [Image.open(f['f']).convert('RGB') for f in fr]
w, h = ims[0].size; tw = 420; th = int(h * tw / w); cols = 4
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + 6), rows * (th + 6)), (60, 60, 60))
for i, (im, f) in enumerate(zip(ims, fr)):
    t = im.resize((tw, th)); d = ImageDraw.Draw(t); d.rectangle((0, 0, 70, 16), fill=(0, 0, 0)); d.text((4, 2), f['label'] + 'ms', fill=(255, 255, 0))
    S.paste(t, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
S.save(f'/home/claude/work/shots/{sys.argv[1]}.png')
