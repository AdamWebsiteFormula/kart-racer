// The eight racers as the menus show them (design §4). Colours as CSS strings.
import type { Archetype } from '../../kart-controller/types.ts';

export interface CastCard { id: string; name: string; archetype: Archetype; species: string; personality: string; kart: string; accent: string; secondary: string }

export const CAST: readonly CastCard[] = Object.freeze([
  { id: 'pip', name: 'Pip', archetype: 'light', species: 'Hummingbird courier', personality: 'Fast-talking, never stops moving', kart: 'Delivery scooter', accent: '#2EC4B6', secondary: '#FF6F61' },
  { id: 'momo', name: 'Momo', archetype: 'light', species: 'Cat mechanic', personality: 'Deadpan, competent', kart: 'Stripped-down buggy', accent: '#3B3B3B', secondary: '#FFD23F' },
  { id: 'nova', name: 'Nova', archetype: 'light', species: 'Moth astronaut', personality: 'Dreamy, drawn to the lights', kart: 'Thruster pod', accent: '#B39DDB', secondary: '#FFFFFF' },
  { id: 'juniper', name: 'Juniper', archetype: 'medium', species: 'Fox park ranger', personality: 'Rule-follower, secretly ruthless', kart: 'Wood-panel jeep', accent: '#B7410E', secondary: '#2D6A4F' },
  { id: 'otto', name: 'Otto', archetype: 'medium', species: 'Otter lifeguard', personality: 'Laid-back, waves at everyone', kart: 'Jet-ski kart', accent: '#64B5F6', secondary: '#E53935' },
  { id: 'sprocket', name: 'Sprocket', archetype: 'medium', species: 'Wind-up robot', personality: 'Literal, counts laps aloud', kart: 'Tin-toy racer', accent: '#F5E6C8', secondary: '#B08D57' },
  { id: 'boulder', name: 'Boulder', archetype: 'heavy', species: 'Rock golem', personality: 'Gentle giant, says sorry after ramming', kart: 'Stone monster truck', accent: '#708090', secondary: '#6A994E' },
  { id: 'gus', name: 'Big Gus', archetype: 'heavy', species: 'Walrus chef', personality: 'Booming laugh, feeds rivals after', kart: 'Food-truck kart', accent: '#E63946', secondary: '#FFFFFF' },
]);

export const castCard = (id: string): CastCard | undefined => CAST.find((c) => c.id === id);
export const accentOf = (id: string): string => castCard(id)?.accent ?? '#FFFFFF';
export const nameOf = (id: string): string => castCard(id)?.name ?? id;
