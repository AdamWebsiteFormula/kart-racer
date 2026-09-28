# Apple's Final Cut Pro sound library, decoded (macOS afconvert: the files are AAC in CAF) into a cache, for two
# uses only: (1) a reference to measure a model against (a real tire skid, a real small engine), never shipped; and
# (2) a minor, heavily processed ingredient inside a new layered sound (house rule, 28 Sept 2026: Apple's license
# names film, video and audio projects, not games, https://support.apple.com/en-us/101851), recorded in its recipe
# as an {fcp: "<Folder>/<File>.caf"} source. Nothing is played.
import hashlib, os, subprocess

LIB = '/Library/Audio/Apple Loops/Apple/Final Cut Pro Sound Effects'
CACHE = os.path.expanduser(os.environ.get('RASCAL_FCP_CACHE', '~/.cache/rascal-sfx/fcp-wav'))


def decoded(rel):
    """A WAV (float32) of `rel` (e.g. 'Transportation/Auto Skid 1.caf'), decoded once and cached."""
    src = os.path.join(LIB, rel)
    if not os.path.exists(src):
        raise FileNotFoundError(src)
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, hashlib.sha1(rel.encode()).hexdigest()[:12] + '-' + os.path.basename(rel).replace('.caf', '.wav'))
    if not os.path.exists(out):
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEF32', src, out + '.part.wav'], check=True)
        os.replace(out + '.part.wav', out)
    return out


if __name__ == '__main__':
    import sys
    for rel in sys.argv[1:]:
        print(decoded(rel))
