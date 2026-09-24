import { describe, expect, it } from 'vitest';
import { Color, Group, Mesh, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, type ShaderMaterial } from 'three';
import { DAY_GRADE, fadeSky, lightOf, paintSky, preloadSky, SKIES, SKY_FADE, skyTint } from './sky.ts';

const hsl = (hex: string) => new Color(hex).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);

function domeGroup(): { group: Group; dome: Mesh } {
  const group = new Group();
  const dome = new Mesh(new SphereGeometry(1), new MeshBasicMaterial());
  dome.name = 'sky';
  group.add(dome);
  return { group, dome };
}

describe('sky light (detail review 2026-09-24)', () => {
  it("Canyon's final-lap dusk keeps the ground readable: a pale peach key, violet shade, a smaller colour lift", () => {
    const dusk = lightOf('canyon-dusk');
    // not the old saturated orange (#ff8f60): a pale key that lets the sand keep its own colour
    expect(hsl(dusk.sun).l).toBeGreaterThan(0.75);
    // the fill and the sky light are cool (hue in the blue-violet band), so the shade goes violet
    for (const c of [dusk.sky, dusk.ambient]) { const h = hsl(c).h * 360; expect(h).toBeGreaterThan(230); expect(h).toBeLessThan(280); }
    expect(dusk.grade).toBeLessThan(DAY_GRADE / 2);
  });

  it('the pickups light themselves only under a night or a dusk; every day sky leaves them to the sun', () => {
    for (const id of ['boardwalk-night', 'boardwalk-fireworks', 'skyline-night']) expect(lightOf(id).glow ?? 0, id).toBeGreaterThan(0.2);
    for (const id of ['harbour-day', 'meadow-day', 'canyon-day', 'frost-day', 'skyline-dawn']) expect(lightOf(id).glow ?? 0, id).toBe(0);
    // never past white with the sun on top: the bloom is for sparks, not balloons
    for (const id of Object.keys(SKIES)) expect(lightOf(id).glow ?? 0, id).toBeLessThanOrEqual(0.5);
  });

  it('a sky change tints the unlit horizon ring by the ratio of the two skies\' light', () => {
    const night = skyTint(lightOf('skyline-dawn'), lightOf('skyline-night'));
    // dawn to night: dimmer and bluer
    expect(night[2]).toBeGreaterThan(night[0]);
    expect(night[0]).toBeLessThan(0.5);
    const dusk = skyTint(lightOf('canyon-day'), lightOf('canyon-dusk'));
    // day to dusk: the warm channels drop more than the blue one (violet, not red)
    expect(dusk[0]).toBeLessThan(1);
    expect(dusk[2]).toBeGreaterThan(dusk[1]);
    for (const t of [night, dusk]) for (const c of t) { expect(c).toBeGreaterThanOrEqual(0.2); expect(c).toBeLessThanOrEqual(1.1); }
    expect(skyTint(lightOf('canyon-day'), lightOf('canyon-day'))).toEqual([1, 1, 1]);
  });
});

describe('painted sky dome', () => {
  it('the cloud-sea paintings set their own horizon about a quarter up the file; the others sit on their bottom edge', () => {
    for (const id of ['skyline-dawn', 'skyline-night']) {
      expect(SKIES[id].panoHorizon, id).toBeGreaterThan(0.2);
      expect(SKIES[id].panoHorizon, id).toBeLessThan(0.3);
    }
    for (const id of Object.keys(SKIES)) if (!id.startsWith('skyline')) expect(SKIES[id].panoHorizon ?? 0, id).toBe(0);
    const { group, dome } = domeGroup();
    paintSky(group, 'skyline-dawn');
    expect((dome.material as ShaderMaterial).uniforms.panoHorizonB.value).toBe(SKIES['skyline-dawn'].panoHorizon);
  });

  it('a Final Lap Shift fades the old sky into the new one over SKY_FADE seconds, eased', () => {
    const { group, dome } = domeGroup();
    const day = paintSky(group, 'canyon-day');
    expect(day.equals(new Color(SKIES['canyon-day'].horizon))).toBe(true);
    const mat = dome.material as ShaderMaterial;
    expect(fadeSky(dome, 0)).toBe(1); // a new race starts under its own sky, no fade
    const dusk = paintSky(group, 'canyon-dusk');
    expect(dome.material).toBe(mat); // one material, both skies in it
    expect(dusk.equals(new Color(SKIES['canyon-dusk'].horizon))).toBe(true);
    // the sky on screen became the one it fades from
    expect((mat.uniforms.topA.value as Color).equals(new Color(SKIES['canyon-day'].top))).toBe(true);
    expect((mat.uniforms.topB.value as Color).equals(new Color(SKIES['canyon-dusk'].top))).toBe(true);
    expect(fadeSky(dome, 0)).toBe(0);
    const half = fadeSky(dome, SKY_FADE / 2);
    expect(half).toBeCloseTo(0.5, 6); // smoothstep's midpoint
    expect(fadeSky(dome, SKY_FADE / 4)).toBeGreaterThan(half);
    expect(fadeSky(dome, SKY_FADE)).toBe(1);
    expect(fadeSky(undefined, 1)).toBe(1);
  });

  it('preloading a sky with no painting, or none at all, resolves to nothing', async () => {
    expect(await preloadSky(undefined)).toBeNull();
    expect(await preloadSky('no-such-sky')).toBeNull();
  });
});
