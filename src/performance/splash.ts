// The page's loading screen (index.html #splash, splash.css; docs/sops/performance.md). It is painted
// with the page, before the game's script arrives; the script fades it out once the title screen is
// up, and fades the game's canvas in on the first frame the canvas really draws (until then a canvas
// shows black or nothing, and the attract race popped in over the title).

/** What the boot hand-over watches (main.ts). */
export interface BootWatch {
  /** the title screen (or any screen past the boot screen) is up */
  titleUp(): boolean;
  /** the game has drawn its first real frame */
  firstFrame(): boolean;
  /** the game's canvas: it carries the `booting` class (splash.css) until its first frame */
  canvas: Element;
  doc?: Document;
}

/** Calls `f` once, on the first animation frame on which `ready()` holds. */
function whenFrame(ready: () => boolean, f: () => void): void {
  const tick = () => { if (ready()) f(); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/** Fade the loading screen out and take it off the page. No splash (tests, a dev page): nothing. */
export function hideSplash(doc: Document = document): void {
  const el = doc.getElementById('splash');
  if (!el || el.classList.contains('done')) return;
  el.classList.add('done');
  el.setAttribute('aria-busy', 'false');
  setTimeout(() => el.remove(), 400);
}

/** Hand the page over from the loading screen to the game: the splash goes when the title is up, the canvas fades in on its first frame. */
export function bootScreens(w: BootWatch): void {
  whenFrame(w.titleUp, () => hideSplash(w.doc));
  whenFrame(w.firstFrame, () => w.canvas.classList.remove('booting'));
}
