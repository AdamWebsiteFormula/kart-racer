// The device pixel ratio changes with the browser zoom and when the window moves to another screen.
// Zoom fires a resize; a move between screens may not (the window keeps its size in CSS pixels), so
// watch for the current ratio to stop matching and re-arm on the new one.

/** The slice of `window` this needs (a fake one in the tests). */
export interface PixelRatioHost {
  readonly devicePixelRatio: number;
  matchMedia(query: string): Pick<MediaQueryList, 'addEventListener' | 'removeEventListener'>;
}

/** Call `onChange` every time the device pixel ratio changes. Returns a function that stops watching. */
export function watchPixelRatio(host: PixelRatioHost, onChange: () => void): () => void {
  let query: ReturnType<PixelRatioHost['matchMedia']>;
  const changed = (): void => { arm(); onChange(); };
  const arm = (): void => {
    query = host.matchMedia(`(resolution: ${host.devicePixelRatio}dppx)`);
    query.addEventListener('change', changed, { once: true });
  };
  arm();
  return () => query.removeEventListener('change', changed);
}
