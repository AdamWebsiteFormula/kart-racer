# Fetches Meta's Audiobox Aesthetics source (a local ear for production quality; CC-BY 4.0, a measuring tool only,
# nothing of it ships) into scripts/music/.work/pylib. The model weights come from Hugging Face on first use.
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, '.work', 'pylib', 'audiobox_aesthetics')
RAW = 'https://raw.githubusercontent.com/facebookresearch/audiobox-aesthetics/main/'
for f in ('LICENSE', 'src/audiobox_aesthetics/__init__.py', 'src/audiobox_aesthetics/infer.py', 'src/audiobox_aesthetics/utils.py',
          'src/audiobox_aesthetics/model/__init__.py', 'src/audiobox_aesthetics/model/aes.py', 'src/audiobox_aesthetics/model/utils.py',
          'src/audiobox_aesthetics/model/wavlm.py'):
    out = os.path.join(DEST, f.replace('src/audiobox_aesthetics/', ''))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['curl', '-sL', RAW + f, '-o', out], check=True)
    print(out, os.path.getsize(out))
