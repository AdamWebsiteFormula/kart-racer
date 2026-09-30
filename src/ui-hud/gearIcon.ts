// The gear pill's icon (Adam, 26 Sept 2026: "I don't think the game needs coins ... not coins"): our own cog
// in the house style, the gear on the road drawn flat (art-pipeline gear.ts: eight tapered teeth with round
// crowns, bright teal, a polished steel hub round the axle hole) under the ink outline, with a white glint,
// as the item icons are drawn. Kept out of icons.ts. Trusted, generated markup; no ids.


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


/** The icon: `size` px square, hidden from screen readers (its holder names it). A glowing orb since 30 Sept 2026,
 * as the pickup on the road: a neon-green plasma sphere, white-hot at its heart; gearPath is kept for the menu's cog. */
export function gearSvg(size = 34): string {
  return `<svg class="gear-svg" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true" focusable="false">`
    + '<defs><radialGradient id="orb-glow"><stop offset="0.45" stop-color="#39ff14" stop-opacity="0.55"/><stop offset="1" stop-color="#39ff14" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="orb-body" cx="0.42" cy="0.38" r="0.62"><stop offset="0" stop-color="#f4ffe9"/><stop offset="0.3" stop-color="#9dff7a"/><stop offset="0.75" stop-color="#39ff14"/><stop offset="1" stop-color="#138a06"/></radialGradient></defs>'
    + '<circle cx="20" cy="20" r="19.5" fill="url(#orb-glow)"/>'
    + '<circle cx="20" cy="20" r="11" fill="url(#orb-body)"/>'
    + '</svg>';
}
