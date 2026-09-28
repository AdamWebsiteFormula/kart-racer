# A machine-wide limit on heavy work (rendering, mixing, mastering): at most SLOTS processes at once, however many
# composers are working, so the machine never runs out of memory (28 Sept 2026: five renders at once filled 18 GB
# of swap and every process was killed). A process waits for a free slot; a slot frees when its process exits.
import contextlib, fcntl, os, time

SLOTS = int(os.environ.get('RASCAL_HEAVY_SLOTS', '1'))  # jobs also go through scripts/heavy.sh (one at a time)
DIR = os.path.expanduser('~/.cache/rascal-music/locks')
_held = []


@contextlib.contextmanager
def heavy(label=''):
    if _held:  # already holding a slot in this process (nested call)
        yield
        return
    os.makedirs(DIR, exist_ok=True)
    waited = 0.0
    while True:
        for i in range(SLOTS):
            f = open(os.path.join(DIR, f'slot{i}.lock'), 'w')
            try:
                fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                f.close()
                continue
            f.write(f'{os.getpid()} {label}\n')
            f.flush()
            _held.append(f)
            try:
                yield
            finally:
                _held.pop()
                fcntl.flock(f, fcntl.LOCK_UN)
                f.close()
            return
        if waited == 0.0:
            print(f'waiting for a free render slot ({SLOTS} in use) ...', flush=True)
        time.sleep(3.0)
        waited += 3.0
