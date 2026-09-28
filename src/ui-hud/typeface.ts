// The game's type on trial (28 Sept 2026; Adam: "Why do so many of the graphics with the fonts feel outdated and not
// cool?"). Two directions behind the address, for Adam to pick from; the house type (Lilita One and Fredoka) stays the
// default, so nothing changes for players until he does:
//   ?type=a  Broadcast: Mona Sans, its Expanded Black Italic for the big words and its text widths for the small ones
//            (type-a.css)
//   ?type=b  Cartoon: Rubik Black Italic for the big words, Nunito for the small ones (type-b.css)
// Each direction's stylesheet and fonts are their own chunk, fetched only when the address asks for them.

export type TypeDirection = 'a' | 'b';

/** The direction an address asks for (`?type=a`, `?type=b`), or null for the house type (none named, or an unknown one). */
export function typeDirection(search: string): TypeDirection | null {
  const v = new URLSearchParams(search).get('type');
  return v === 'a' || v === 'b' ? v : null;
}

/** Marks the page with `dir` (`data-type` on the root: the direction's rules key on it) and loads its stylesheet and fonts. */
export async function applyTypeDirection(root: HTMLElement, dir: TypeDirection | null): Promise<void> {
  if (!dir) return;
  root.dataset.type = dir;
  await (dir === 'a' ? import('./type-a.css') : import('./type-b.css'));
}
