import os, tempfile
import subprocess, sys, os, json
from PIL import Image, ImageDraw
FF=os.environ.get('FFMPEG', 'ffmpeg')
DIR = os.environ.get('TRAILER_DIR', os.path.join(tempfile.gettempdir(), 'rascal-trailer'))
def dur(f):
    p=subprocess.run([FF,'-i',f],capture_output=True,text=True).stderr
    import re; m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',p); return int(m[1])*3600+int(m[2])*60+float(m[3])
def sheet(names, out, cols=6, w=320, h=180):
    rows=[]
    for n in names:
        f=f'{DIR}/shots/{n}.mp4'; d=dur(f); row=[]
        for k in range(cols):
            t=d*(k+0.5)/cols
            tmp=f'/tmp/_sh_{os.getpid()}.jpg'
            subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-ss',f'{t:.2f}','-i',f,'-frames:v','1','-vf',f'scale={w}:{h}',tmp])
            im=Image.open(tmp).copy(); d2=ImageDraw.Draw(im); d2.text((4,4),f'{n} {t:.1f}s',fill=(255,255,0)); row.append(im)
        rows.append(row)
    S=Image.new('RGB',(cols*w,len(rows)*h))
    for r,row in enumerate(rows):
        for c,im in enumerate(row): S.paste(im,(c*w,r*h))
    S.save(os.path.join(DIR, out),quality=80)
sheet(sys.argv[2].split(','), sys.argv[1])
