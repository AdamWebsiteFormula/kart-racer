# Cuts excerpts of a song for the local listening model (nothing played): cut.py <file> <start>:<end> [...]
import os, sys
import soundfile as sf

src = sys.argv[1]
y, r = sf.read(src, always_2d=True)
out = []
for spec in sys.argv[2:]:
    a, b = (float(v) for v in spec.split(':'))
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.work', f'{os.path.splitext(os.path.basename(src))[0]}_{int(a)}-{int(b)}.wav')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    sf.write(p, y[int(a * r):int(b * r)], r)
    out.append(p)
print(','.join(out))
