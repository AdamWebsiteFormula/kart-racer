// UiRoot: mounts the overlay, owns every renderer, the app state, the focus ring and menu
// input (keyboard, gamepad, pointer). The game loop talks to it through UiHost callbacks,
// feed() once per sim tick and race() once per frame. No Three.js here.
import type { KartState, SpeedClass } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { GrandPrixState, KnockoutState, RaceEvent, RaceMode, RaceResults, RaceState } from '../race-manager/types.ts';
import type { Minimap } from '../track-builder/minimap.ts';
import { initialApp, isPaused, needsCup, reduce, topOverlay } from './app.ts';
import { accentOf } from './data/cast.ts';
import { CUPS, KNOCKOUT_SETS } from './data/catalog.ts';
import { firstFocus, move } from './focus.ts';
import { feedHud, hudModel, newHudMemory, type HudMemory } from './hudModel.ts';
import { isPauseKey, navFromKey, navFromPad, newRepeat, repeat } from './input.ts';
import { minimapDots, type MinimapDot } from './minimap.ts';
import { HudView } from './render/hud.ts';
import {
  BootView, CreditsView, CupView, ListView, OverlayMenuView, ResultsView, RosterView, SettingsView, TitleView, type ScreenView,
} from './render/screens.ts';
import { parseCredits } from './screens/credits.ts';
import { adjustSetting, cupMenu, modeMenu, pauseMenu, rosterMenu, settingsMenu, SPEED_CLASSES, titleMenu, type SettingId } from './screens/menus.ts';
import { gpModel, knockoutCutModel, resultsModel } from './screens/results.ts';
import { loadSave, reducedMotion, writeSave, type Backend, type Save, type Settings } from './store.ts';
import type { AppAction, AppState, FocusModel, NavAction } from './types.ts';

export interface RacePlan { mode: RaceMode; racerId: string; speedClass: SpeedClass; cupId: string | null; tracks: string[] }

export interface UiHost {
  readonly builtTracks: ReadonlySet<string>;
  readonly availableModes: ReadonlySet<RaceMode>;
  readonly creditsMarkdown: string;
  /** a new race or series begins (from the roster or cup screen) */
  startRace(plan: RacePlan): void;
  /** the next race of the running series */
  nextRace(): void;
  restartRace(): void;
  /** leave the race for the menus */
  quitRace(): void;
  setPaused(paused: boolean): void;
  settingsChanged(s: Settings): void;
  /** the screen changed (the host swaps the camera between attract and chase) */
  screenChanged?(app: AppState): void;
}

export interface RaceOver {
  results: RaceResults;
  trackName: string;
  playerId: string | null;
  gp?: { before: GrandPrixState | null; after: GrandPrixState };
  ko?: { after: KnockoutState };
  seriesHasNext: boolean;
  /** Time Trial only: the track's medal times */
  medalTimesMs?: { gold: number; silver: number; bronze: number };
}

export interface RaceFrame {
  state: RaceState;
  player: KartState;
  shownRank: number;
  coinCap: number;
  map: Minimap;
  itemDefs: readonly { id: string; name: string }[];
}

export type Medal = 'none' | 'bronze' | 'silver' | 'gold';
export function medalFor(ms: number, m: { gold: number; silver: number; bronze: number }): Medal {
  return ms <= m.gold ? 'gold' : ms <= m.silver ? 'silver' : ms <= m.bronze ? 'bronze' : 'none';
}
const medalName = (m: Medal) => (m === 'none' ? 'No medal this time' : `${m[0].toUpperCase()}${m.slice(1)} medal!`);

const MODE_ICONS: Record<string, string> = { quick: '🏁', grandPrix: '🏆', knockout: '💥', timeTrial: '⏱️', daily: '📅' };

export class UiRoot {
  readonly root: HTMLElement;
  app: AppState = initialApp();
  save: Save;
  private readonly host: UiHost;
  private readonly backend: Backend | null;
  private readonly views: {
    boot: BootView; title: TitleView; modes: ListView; roster: RosterView; cups: CupView; hud: HudView; results: ResultsView;
    pause: OverlayMenuView; settings: SettingsView; credits: CreditsView;
  };
  private readonly models = new Map<string, FocusModel>();
  private readonly focusBy = new Map<string, string>();
  private active: { key: string; view: ScreenView } | null = null;
  private hudMem: HudMemory = newHudMemory();
  private dots: MinimapDot[] = [];
  private lastOver: RaceOver | null = null;
  private ttNote = '';
  private padRepeat = newRepeat();
  private padStartWas = false;
  private osReduced = false;
  private readonly onKey = (e: KeyboardEvent) => this.key(e);

  constructor(parent: HTMLElement, host: UiHost, backend: Backend | null) {
    this.host = host;
    this.backend = backend;
    this.save = loadSave(backend);
    this.app = { ...this.app, racerId: this.save.settings.selectedRacerId };
    this.root = document.createElement('div');
    this.root.id = 'ui';
    parent.appendChild(this.root);
    const r = this.root;
    this.views = {
      boot: new BootView(r), title: new TitleView(r), modes: new ListView(r, 'mode-screen', 'Pick a mode'),
      roster: new RosterView(r), cups: new CupView(r), hud: new HudView(r), results: new ResultsView(r),
      pause: new OverlayMenuView(r, 'pause'), settings: new SettingsView(r), credits: new CreditsView(r),
    };
    for (const v of Object.values(this.views)) {
      v.root.addEventListener('pointerover', (e) => this.pointer(e, false));
      v.root.addEventListener('click', (e) => this.pointer(e, true));
    }
    const mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.osReduced = mq?.matches ?? false;
    mq?.addEventListener?.('change', (e) => { this.osReduced = e.matches; this.applyTheme(); });
    addEventListener('keydown', this.onKey);
    this.applyTheme();
    this.show();
  }

  dispose(): void {
    removeEventListener('keydown', this.onKey);
    this.root.remove();
  }

  get paused(): boolean { return isPaused(this.app); }

  // ---------------------------------------------------------------- state
  dispatch(a: AppAction): void {
    const prev = this.app;
    const next = reduce(prev, a);
    if (next === prev) return;
    this.app = next;
    this.effects(prev, next, a);
    this.show();
    this.host.screenChanged?.(next);
  }

  private effects(prev: AppState, next: AppState, a: AppAction): void {
    const wasPaused = isPaused(prev), nowPaused = isPaused(next);
    if (next.screen === 'racing' && prev.screen !== 'racing') {
      this.hudMem = newHudMemory();
      if (prev.screen === 'gpTable' || prev.screen === 'knockoutCut') this.host.nextRace();
      else this.host.startRace(this.plan(next));
    }
    if (a.type === 'restart' && prev.screen === 'racing') { this.hudMem = newHudMemory(); this.host.restartRace(); }
    if (a.type === 'quit' && prev.screen === 'racing') this.host.quitRace();
    if (wasPaused !== nowPaused) this.host.setPaused(nowPaused);
    if (a.type === 'pickRacer' || a.type === 'setSpeedClass') {
      this.save.settings.selectedRacerId = next.racerId;
      writeSave(this.backend, this.save);
    }
  }

  private plan(s: AppState): RacePlan {
    const built = this.host.builtTracks;
    const list = s.mode === 'knockout' ? KNOCKOUT_SETS : CUPS;
    const cup = needsCup(s) ? list.find((c) => c.id === s.cupId) : undefined;
    const vm = cup && (s.mode === 'grandPrix' || s.mode === 'knockout') ? cupMenu(s.mode, built, this.save, s.speedClass).cups.find((c) => c.id === cup.id) : undefined;
    const tracks = vm?.plays ?? [[...built][0]];
    return { mode: s.mode ?? 'quick', racerId: s.racerId, speedClass: s.speedClass, cupId: s.cupId, tracks };
  }

  /** The race is over: record it and show the results. */
  raceOver(over: RaceOver): void {
    this.lastOver = over;
    this.save.stats.racesFinished++;
    const { gp, ko } = over;
    if (gp && gp.after.raceIndex >= gp.after.trackIds.length) {
      const vm = gpModel(gp.before, gp.after, over.playerId);
      const byCc = (this.save.grandPrix[gp.after.cupId] ??= {});
      const key = String(gp.after.speedClass);
      const old = byCc[key];
      const mine = vm.rows.find((r) => r.player)?.points ?? 0;
      byCc[key] = { finished: true, stars: Math.max(old?.stars ?? 0, vm.stars), bestPoints: Math.max(old?.bestPoints ?? 0, mine) };
    }
    if (ko && ko.after.segment >= ko.after.trackIds.length && over.playerId) {
      const placing = ko.after.placings[over.playerId];
      const old = this.save.knockout[ko.after.setId];
      this.save.knockout[ko.after.setId] = {
        finished: true, won: (old?.won ?? false) || placing === 1,
        bestPlacing: Math.min(old?.bestPlacing ?? 99, placing ?? 99),
      };
    }
    const me = over.results.ranks.find((r) => r.racerId === over.playerId);
    if (over.medalTimesMs && me && !me.dnf) {
      const tt = this.save.timeTrial[over.results.trackId];
      const medal = medalFor(me.timeMs, over.medalTimesMs);
      this.ttNote = !tt || me.timeMs < tt.bestMs ? `New best! ${medalName(medal)}` : medalName(medal);
      if (!tt || me.timeMs < tt.bestMs) this.save.timeTrial[over.results.trackId] = { bestMs: me.timeMs, medal, racerId: over.playerId ?? undefined };
    } else this.ttNote = '';
    writeSave(this.backend, this.save);
    this.dispatch({ type: 'raceFinished', seriesHasNext: over.seriesHasNext });
  }

  // ---------------------------------------------------------------- race
  /** Once per sim tick with that tick's events. */
  feed(race: readonly RaceEvent[], items: readonly ItemEvent[], playerId: string): void {
    feedHud(this.hudMem, race, items, playerId, performance.now() / 1000);
  }

  /** Once per rendered frame while racing (paused or not). */
  race(f: RaceFrame, nowMs: number): void {
    if (this.app.screen !== 'racing') return;
    const vm = hudModel(f.state, f.player, f.shownRank, f.coinCap, this.hudMem, nowMs / 1000, f.itemDefs, nowMs);
    this.views.hud.render(vm);
    minimapDots(f.state.karts, f.map, accentOf, this.dots);
    this.views.hud.minimap.render(f.map, this.dots, nowMs);
  }

  /** Polls the gamepad. Call every frame. */
  poll(nowMs: number): void {
    const pad = globalThis.navigator?.getGamepads?.().find((p) => p && p.connected);
    if (!pad) return;
    const buttons = pad.buttons.map((b) => b.pressed);
    const start = buttons[9] ?? false;
    if (this.app.screen === 'racing' && !this.app.overlays.length) {
      if (start && !this.padStartWas) this.dispatch({ type: 'pause' });
      this.padStartWas = start;
      return;
    }
    this.padStartWas = start;
    const a = repeat(this.padRepeat, navFromPad(buttons, pad.axes), nowMs);
    if (a) this.nav(a);
  }

  // ---------------------------------------------------------------- input
  private key(e: KeyboardEvent): void {
    const a = navFromKey(e.code, e.key);
    if (e.repeat && (a === 'confirm' || a === 'back')) return;
    if (this.app.screen === 'racing' && !this.app.overlays.length) {
      if (isPauseKey(e.code, e.key)) { e.preventDefault(); this.dispatch({ type: 'pause' }); }
      return;
    }
    if (!a) return;
    e.preventDefault();
    this.nav(a);
  }

  private pointer(e: Event, click: boolean): void {
    const b = (e.target as HTMLElement | null)?.closest?.('[data-id]') as HTMLElement | null;
    if (!b || !this.active || !this.active.view.root.contains(b)) return;
    const id = b.dataset.id as string;
    if (b.getAttribute('aria-disabled') === 'true') return;
    this.setFocus(id);
    if (click) this.confirm(id);
  }

  /** One navigation action on whatever is on top. */
  nav(a: NavAction): void {
    if (this.app.screen === 'boot') { this.dispatch({ type: 'boot' }); return; }
    const key = this.active?.key;
    const model = key ? this.models.get(key) : undefined;
    const cur = key ? this.focusBy.get(key) : undefined;
    if (a === 'back') { this.back(); return; }
    if (a === 'confirm') { if (cur) this.confirm(cur); return; }
    if (key === 'settings' && cur && cur !== 'done' && (a === 'left' || a === 'right')) {
      this.changeSetting(cur as SettingId, a === 'left' ? -1 : 1);
      return;
    }
    if (model && cur) this.setFocus(move(model, cur, a));
  }

  private back(): void {
    const s = this.app;
    if (s.screen === 'results' || s.screen === 'gpTable' || s.screen === 'knockoutCut') return; // results need a confirm
    if (topOverlay(s) === 'pause') { this.dispatch({ type: 'resume' }); return; }
    this.dispatch({ type: 'back' });
  }

  private confirm(id: string): void {
    const s = this.app;
    const top = topOverlay(s);
    const btn = this.active?.view.buttons.get(id);
    if (btn?.getAttribute('aria-disabled') === 'true') return;
    if (top === 'settings') {
      if (id === 'done') this.dispatch({ type: 'back' }); else this.changeSetting(id as SettingId, 1);
      return;
    }
    if (top === 'credits') { this.dispatch({ type: 'back' }); return; }
    if (top === 'pause') {
      const map: Record<string, AppAction> = { resume: { type: 'resume' }, restart: { type: 'restart' }, settings: { type: 'openSettings' }, credits: { type: 'openCredits' }, quit: { type: 'quit' } };
      if (map[id]) this.dispatch(map[id]);
      return;
    }
    switch (s.screen) {
      case 'title':
        this.dispatch(id === 'settings' ? { type: 'openSettings' } : id === 'credits' ? { type: 'openCredits' } : { type: 'start' });
        break;
      case 'modeSelect': this.dispatch({ type: 'pickMode', mode: id as RaceMode }); break;
      case 'rosterSelect': {
        const cc = SPEED_CLASSES.find((c) => `cc${c.cc}` === id);
        if (cc) { this.dispatch({ type: 'setSpeedClass', speedClass: cc.cc }); this.show(true); }
        else this.dispatch({ type: 'pickRacer', racerId: id });
        break;
      }
      case 'cupSelect': this.dispatch({ type: 'pickCup', cupId: id }); break;
      case 'results': case 'gpTable': case 'knockoutCut': this.dispatch({ type: 'continue' }); break;
      default: break;
    }
  }

  private changeSetting(id: SettingId, dir: -1 | 1): void {
    this.save.settings = adjustSetting(this.save.settings, id, dir);
    writeSave(this.backend, this.save);
    this.applyTheme();
    this.host.settingsChanged(this.save.settings);
    this.show(true);
  }

  private applyTheme(): void {
    const d = document.documentElement;
    d.dataset.reducedMotion = reducedMotion(this.save.settings, this.osReduced) ? 'on' : 'off';
    d.dataset.iconLabels = this.save.settings.iconLabels ? 'on' : 'off';
  }

  get reducedMotion(): boolean { return reducedMotion(this.save.settings, this.osReduced); }

  // ---------------------------------------------------------------- show
  private setFocus(id: string): void {
    if (!this.active) return;
    const { key, view } = this.active;
    const prevId = this.focusBy.get(key);
    if (prevId && prevId !== id) {
      const pb = view.buttons.get(prevId);
      if (pb) { pb.classList.remove('focused'); pb.tabIndex = -1; } // one Tab stop per screen
    }
    this.focusBy.set(key, id);
    const b = view.buttons.get(id);
    if (b) {
      b.classList.add('focused');
      b.tabIndex = 0;
      if (document.activeElement !== b) b.focus({ preventScroll: true });
    }
  }

  /** Which view is on top, rendered fresh when it changes (or when `force`). */
  private show(force = false): void {
    const s = this.app;
    const v = this.views;
    const top = topOverlay(s);
    const base: Record<string, ScreenView> = {
      boot: v.boot, title: v.title, modeSelect: v.modes, rosterSelect: v.roster, cupSelect: v.cups,
      racing: v.hud, results: v.results, gpTable: v.results, knockoutCut: v.results,
    };
    const baseView = base[s.screen];
    const overlayView = top === 'pause' ? v.pause : top === 'settings' ? v.settings : top === 'credits' ? v.credits : null;
    for (const x of Object.values(v)) x.root.classList.toggle('on', x === baseView || x === overlayView);
    // a dialog on top makes everything under it unreachable, by Tab and by pointer
    for (const x of Object.values(v)) x.root.inert = overlayView !== null && x !== overlayView;
    const key = top ?? s.screen;
    const view = overlayView ?? baseView;
    if (!force && this.active?.key === key) return;
    const entering = this.active?.key !== key;
    this.active = { key, view };
    this.renderScreen(key);
    const model = this.models.get(key);
    if (!model) return;
    const remembered = this.focusBy.get(key);
    const ok = remembered && model.rows.flat().includes(remembered) && !model.disabled?.includes(remembered);
    const id = ok ? remembered : entering && key === 'rosterSelect' ? s.racerId : firstFocus(model);
    if (id) this.setFocus(id);
  }

  private renderScreen(key: string): void {
    const s = this.app, v = this.views, built = this.host.builtTracks;
    switch (key) {
      case 'title': { const vm = titleMenu(); v.title.render(vm); this.models.set(key, vm.focus); break; }
      case 'modeSelect': { const vm = modeMenu(this.host.availableModes); v.modes.render(vm, MODE_ICONS); this.models.set(key, vm.focus); break; }
      case 'rosterSelect': { const vm = rosterMenu(s.speedClass); v.roster.render(vm); this.models.set(key, vm.focus); break; }
      case 'cupSelect': {
        const vm = cupMenu(s.mode === 'knockout' ? 'knockout' : 'grandPrix', built, this.save, s.speedClass);
        v.cups.render(vm);
        this.models.set(key, vm.focus);
        break;
      }
      case 'pause': { const vm = pauseMenu(); v.pause.render(vm); this.models.set(key, vm.focus); break; }
      case 'settings': { const vm = settingsMenu(this.save.settings); v.settings.render(vm.rows); this.models.set(key, vm.focus); break; }
      case 'credits': { v.credits.render(parseCredits(this.host.creditsMarkdown)); this.models.set(key, { rows: [['back']] }); break; }
      case 'results': case 'gpTable': case 'knockoutCut': this.renderEnd(key); break;
      default: break;
    }
  }

  private renderEnd(key: string): void {
    const o = this.lastOver;
    if (!o) return;
    const s = this.app;
    const series = s.mode === 'grandPrix' || s.mode === 'knockout';
    const nextLabel = key === 'results' ? (series ? 'Standings' : 'Back to menu') : s.seriesHasNext ? 'Next race' : 'Back to menu';
    if (key === 'results') {
      const vm = resultsModel(o.results, o.playerId, o.trackName);
      if (this.ttNote) vm.headline = this.ttNote;
      this.views.results.renderResults(vm, nextLabel);
    }
    else if (key === 'gpTable' && o.gp) this.views.results.renderGp(gpModel(o.gp.before, o.gp.after, o.playerId), nextLabel);
    else if (key === 'knockoutCut' && o.ko) this.views.results.renderCut(knockoutCutModel(o.results, o.ko.after, o.playerId), nextLabel);
    this.models.set(key, { rows: [['continue']] });
  }
}
