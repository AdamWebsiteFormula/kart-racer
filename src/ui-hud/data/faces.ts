// The racers' faces for the small round icons that name them in the results, the Grand Prix standings,
// the Knockout cut, the podium places and the leaderboard (Mario Kart World names every racer by their
// face). Each is the racer's portrait (public/art/racers/<id>.webp, the roster cards' art) cropped to the
// head: where the head sits in the picture, as fractions across and down (30 Sept 2026: the portraits are rendered from
// the 3D models, scripts/models/fit/portrait.mjs, each cropped round its head). The roster shows the racer and kart.

/** how far the icons zoom into the portrait: the crop is a little over a third of it, the head and a bit of shoulder */
export const FACE_ZOOM = 2.8;

const HEADS: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  pip: [0.5, 0.23], momo: [0.5, 0.23], nova: [0.5, 0.23], juniper: [0.5, 0.23],
  otto: [0.5, 0.23], sprocket: [0.5, 0.23], boulder: [0.5, 0.23], gus: [0.5, 0.23],
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
