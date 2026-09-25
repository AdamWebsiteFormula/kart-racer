// Fullscreen, as a store-bought game has it: a Settings row, and the F key on any screen. The browser
// holds the state, never the save: the row reads it, and follows it when Esc (or the browser) leaves
// fullscreen (UiRoot listens for fullscreenchange). A request must come from the key or click itself
// (a user gesture); a pad's press is none, so the browser refuses it, harmlessly. iPhone Safari has
// no fullscreen for a page: there is no row there. The document is passed in, so tests use a fake.

/** The parts of `document` fullscreen needs. */
export interface FullscreenDoc {
  readonly fullscreenEnabled?: boolean;
  readonly fullscreenElement?: Element | null;
  readonly documentElement: { requestFullscreen?: (options?: FullscreenOptions) => Promise<void> };
  exitFullscreen?: () => Promise<void>;
}

const page = (): FullscreenDoc | undefined => (typeof document === 'undefined' ? undefined : document);

/** Can this browser put the page in fullscreen? */
export function fullscreenSupported(doc: FullscreenDoc | undefined = page()): boolean {
  return doc?.fullscreenEnabled === true && typeof doc.documentElement.requestFullscreen === 'function';
}

/** The Settings row's value: fullscreen or not, or null where the browser cannot (no row). */
export function fullscreenState(doc: FullscreenDoc | undefined = page()): boolean | null {
  return doc && fullscreenSupported(doc) ? !!doc.fullscreenElement : null;
}

/**
 * Into fullscreen, or out of it. Call from the press itself (keydown, click). A refusal (no gesture,
 * a pad's press, a browser's policy) rejects the promise, or throws in an old engine: let go either way.
 */
export function toggleFullscreen(doc: FullscreenDoc | undefined = page()): void {
  if (!doc || !fullscreenSupported(doc)) return;
  try {
    const p = doc.fullscreenElement ? doc.exitFullscreen?.() : doc.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    p?.catch(() => undefined);
  } catch { /* refused */ }
}
