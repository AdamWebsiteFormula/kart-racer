// The eight racers as the menus show them (design §4). Colours as CSS strings. No brand names
// in the words (a jeep and a jet ski are trademarks: an off-roader and a water scooter here).
import type { Archetype } from '../../kart-controller/types.ts';

/** `face`: the head in the racer's concept art (public/art/racers), its centre x, y and radius as fractions of the picture: the minimap cuts its round portraits there */
export interface CastCard { id: string; name: string; archetype: Archetype; species: string; personality: string; kart: string; accent: string; secondary: string; face: readonly [number, number, number] }

export const CAST: readonly CastCard[] = Object.freeze([
  { id: 'pip', name: 'Pip', archetype: 'light', species: 'Hummingbird pilot', personality: 'Quick, sharp, never lets up', kart: 'Sport scooter', accent: '#2EC4B6', secondary: '#FF6F61', face: [0.469, 0.215, 0.125] },
  { id: 'momo', name: 'Momo', archetype: 'light', species: 'Cat mechanic', personality: 'Deadpan, precise', kart: 'Race buggy', accent: '#3B3B3B', secondary: '#FFD23F', face: [0.488, 0.25, 0.125] },
  { id: 'nova', name: 'Nova', archetype: 'light', species: 'Moth starpilot', personality: 'Cool-headed night flyer', kart: 'Thruster pod', accent: '#B39DDB', secondary: '#FFFFFF', face: [0.5, 0.254, 0.16] },
  { id: 'juniper', name: 'Juniper', archetype: 'medium', species: 'Fox ranger', personality: 'Calm, focused, secretly fierce', kart: 'Off-road racer', accent: '#B7410E', secondary: '#2D6A4F', face: [0.48, 0.203, 0.125] },
  { id: 'otto', name: 'Otto', archetype: 'medium', species: 'Otter biker', personality: 'Laid-back, unshakable', kart: 'Cruiser chopper', accent: '#64B5F6', secondary: '#E53935', face: [0.5, 0.188, 0.117] },
  { id: 'sprocket', name: 'Sprocket', archetype: 'medium', species: 'Droid racer', personality: 'Cold, exact, relentless', kart: 'Hover racer', accent: '#F5E6C8', secondary: '#B08D57', face: [0.488, 0.277, 0.152] },
  { id: 'boulder', name: 'Boulder', archetype: 'heavy', species: 'Rock golem', personality: 'Quiet powerhouse', kart: 'Stone monster truck', accent: '#708090', secondary: '#6A994E', face: [0.473, 0.207, 0.141] },
  { id: 'gus', name: 'Big Gus', archetype: 'heavy', species: 'Walrus boss', personality: 'Old-school, never in a hurry', kart: 'Vintage roadster', accent: '#E63946', secondary: '#FFFFFF', face: [0.488, 0.207, 0.156] },
]);

export const castCard = (id: string): CastCard | undefined => CAST.find((c) => c.id === id);
export const accentOf = (id: string): string => castCard(id)?.accent ?? '#FFFFFF';
export const nameOf = (id: string): string => castCard(id)?.name ?? id;
