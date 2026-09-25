// The racers' faces for the small round icons that name them in the results, the Grand Prix standings,
// the Knockout cut, the podium places and the leaderboard (Mario Kart World names every racer by their
// face). Each is the racer's portrait (public/art/racers/<id>.webp, the roster cards' art) cropped to the
// head: where the head sits in the picture, as fractions across and down, measured on the art (25 Sept
// 2026). The roster's framing shows the racer and kart, too small to know at 36 px.

/** how far the icons zoom into the portrait: the crop is a little over a third of it, the head and a bit of shoulder */
export const FACE_ZOOM = 2.8;

const HEADS: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  pip: [0.45, 0.22], momo: [0.48, 0.3], nova: [0.54, 0.29], juniper: [0.44, 0.19],
  otto: [0.5, 0.22], sprocket: [0.49, 0.27], boulder: [0.49, 0.28], gus: [0.47, 0.27],
});

/**
 * The CSS background position and size that crop `racerId`'s portrait to the head ("42.2% 6.4% / 280%");
 * an id with no head measured gets the middle top. Pure.
 */
export function faceCrop(racerId: string): string {
  const [x, y] = HEADS[racerId] ?? [0.5, 0.3];
  // a background position p lines the picture's p up with the box's p, so the crop centered on x needs
  // p = (x·zoom − ½) / (zoom − 1), kept inside the picture
  const at = (f: number) => Math.min(100, Math.max(0, ((f * FACE_ZOOM - 0.5) / (FACE_ZOOM - 1)) * 100));
  return `${at(x).toFixed(1)}% ${at(y).toFixed(1)}% / ${Math.round(FACE_ZOOM * 100)}%`;
}
