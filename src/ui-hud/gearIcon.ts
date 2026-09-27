// The gear pill's icon (Adam, 26 Sept 2026: "I don't think the game needs coins ... not coins"): our own cog
// in the house style, the gear on the road drawn flat (art-pipeline gear.ts: eight tapered teeth with round
// crowns, bright teal, a polished steel hub round the axle hole) under the ink outline, with a white glint,
// as the item icons are drawn. Kept out of icons.ts. Trusted, generated markup; no ids.

const INK = '#1b1b2f', FACE = '#3ad6c8', HUB = '#eef3f8';

/** The cog's outline in a 40 × 40 box round (20, 20): the model's proportions (gear.ts GEAR), scaled. */
export function gearPath(teeth = 8, tip = 17, root = 12.8, tipHalf = 0.14, rootHalf = 0.3, crown = 0.6): string {
  const pitch = (Math.PI * 2) / teeth, pts: string[] = [];
  const knots: [number, number][] = [[-rootHalf, root], [-tipHalf, tip], [0, tip + crown], [tipHalf, tip], [rootHalf, root]];
  for (let j = 0; j < teeth; j++) {
    for (const [d, r] of knots) {
      // the first tooth straight up, as the eye expects a gear icon
      const a = (j + d) * pitch - Math.PI / 2;
      pts.push(`${(20 + Math.cos(a) * r).toFixed(2)} ${(20 + Math.sin(a) * r).toFixed(2)}`);
    }
  }
  return `M${pts.join('L')}Z`;
}

const PATH = gearPath();

/** The icon: `size` px square, hidden from screen readers (its holder names it). */
export function gearSvg(size = 34): string {
  return `<svg class="gear-svg" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true" focusable="false">`
    + `<path d="${PATH}" fill="${FACE}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
    + `<circle cx="20" cy="20" r="7.2" fill="${HUB}" stroke="${INK}" stroke-width="2.2"/>`
    + `<circle cx="20" cy="20" r="3" fill="${INK}"/>`
    + '<path d="M9.6 16.2a11 11 0 0 1 6-6.6" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
}
