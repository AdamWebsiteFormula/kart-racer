# Writes ~/.cache/rascal-music/candidates/index.html: a local listening page for Adam, one section per slot, each
# candidate with its theme, its course intros, a loop-seam preview and the local ears' scores. Nothing plays until
# Adam presses play (no autoplay anywhere). Light work: reads index.json (run index.py first).
import html, json, os

ROOT = os.path.expanduser('~/.cache/rascal-music/candidates')
idx = json.load(open(os.path.join(ROOT, 'index.json')))


def fmt_screen(sc):
    if not sc:
        return '<span class="muted">not screened</span>'
    c = sc.get('clap5') or {}
    v = sc.get('verdict')
    return (f'<span class="{"pass" if v == "PASS" else "fail"}">{v}</span> · quality {sc.get("PQ")} · enjoyment {sc.get("CE")} · '
            f'cool vs cartoon {sc.get("clapCoolVsCartoon")} · cool {c.get("cool")} / circus {c.get("circus")} / cheesy {c.get("cheesy")}'
            + (f' · <span class="fail">{html.escape("; ".join(sc.get("reasons") or []))}</span>' if sc.get('reasons') else ''))


parts = []
for slot in idx['slots']:
    parts.append(f'<section><h2>{html.escape(slot["name"])} <small>{slot["slot"]}</small></h2>')
    for c in slot['candidates']:
        loop = c.get('loop') or [0, 0]
        parts.append('<article>')
        parts.append(f'<h3>{html.escape(c["candidate"])} <small>{html.escape(str(c.get("key")))}, {c.get("bpm"):g} bpm, {c.get("seconds")} s</small></h3>')
        parts.append(f'<p class="style">{html.escape(c.get("style") or "")}</p>')
        if c.get('file'):
            parts.append(f'<div class="row"><audio controls preload="none" src="{html.escape(c["file"])}"></audio>'
                         f'<button class="seam" data-src="{html.escape(c["file"])}" data-a="{loop[0]}" data-b="{loop[1]}">loop seam preview</button></div>')
            parts.append(f'<p class="scores">{fmt_screen(c.get("screen"))}</p>')
            parts.append(f'<p class="muted">loop {loop[0]:.2f} s to {loop[1]:.2f} s (the intro plays once) · form: {html.escape(" | ".join(c.get("form") or []))}</p>')
        for k, v in (c.get('intros') or {}).items():
            parts.append(f'<div class="row small"><b>{html.escape(k)}</b> <audio controls preload="none" src="{html.escape(v["file"])}"></audio> '
                         f'<span class="muted">{html.escape(v.get("what") or "")}</span></div><p class="scores small">{fmt_screen(v.get("screen"))}</p>')
        parts.append('</article>')
    parts.append('</section>')

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Course Music Candidates</title>
<style>
:root {{ --bg: #f7f6f2; --fg: #1d1d1f; --muted: #6b6b70; --card: #fff; --line: #e3e1da; --pass: #1f7a3a; --fail: #b3261e; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg: #141416; --fg: #ececf0; --muted: #9a9aa2; --card: #1e1e22; --line: #2e2e34; --pass: #6fd08c; --fail: #ff8a80; }} }}
body {{ background: var(--bg); color: var(--fg); font: 15px/1.45 -apple-system, system-ui, sans-serif; margin: 0 auto; max-width: 980px; padding: 16px; }}
h1 {{ font-size: 24px; margin: 8px 0 4px; }} h2 {{ margin: 28px 0 8px; font-size: 20px; }} h2 small, h3 small {{ color: var(--muted); font-weight: normal; font-size: 13px; }}
article {{ background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin: 10px 0; }}
h3 {{ margin: 0 0 4px; font-size: 16px; }} .style {{ margin: 0 0 8px; }} .muted {{ color: var(--muted); }} .scores {{ margin: 4px 0; font-size: 13px; }}
.small {{ font-size: 13px; }} .row {{ display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 6px 0; }} audio {{ max-width: 100%; }}
.pass {{ color: var(--pass); font-weight: 600; }} .fail {{ color: var(--fail); font-weight: 600; }}
button {{ font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; }}
</style></head><body>
<h1>Rascal Rally! course music candidates</h1>
<p class="muted">Written note by note and produced offline (sampled instruments from CC0 libraries, code synths); generated {idx["generated"]}.
Nothing plays until you press play. "Loop seam preview" plays the 4 s before the loop end straight into the loop start, as the game wraps it.</p>
{"".join(parts)}
<script>
let ctx = null, cur = null;
document.querySelectorAll('button.seam').forEach(btn => btn.addEventListener('click', async () => {{
  if (cur) {{ try {{ cur.stop(); }} catch (e) {{}} cur = null; }}
  ctx = ctx || new AudioContext();
  const buf = await ctx.decodeAudioData(await (await fetch(btn.dataset.src)).arrayBuffer());
  const a = parseFloat(btn.dataset.a), b = parseFloat(btn.dataset.b);
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = a; src.loopEnd = b;
  src.connect(ctx.destination); src.start(0, Math.max(a, b - 4)); src.stop(ctx.currentTime + 9); cur = src;
}}));
</script></body></html>'''
open(os.path.join(ROOT, 'index.html'), 'w').write(page)
print(os.path.join(ROOT, 'index.html'))
