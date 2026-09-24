// UiRoot: mounts the overlay, owns every renderer, the app state, the focus ring and menu
// input (keyboard, gamepad, pointer). The game loop talks to it through UiHost callbacks,
// feed() once per sim tick and race() once per frame. No Three.js here.
import { isRaceKey } from '../kart-controller/input.ts';
import type { KartState, SpeedClass } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { GrandPrixState, KnockoutState, RaceEvent, RaceMode, RaceResults, RaceState } from '../race-manager/types.ts';
import type { Minimap } from '../track-builder/minimap.ts';
import { initialApp, isPaused, needsCup, needsTrack, reduce, topOverlay } from './app.ts';
import { accentOf } from './data/cast.ts';
import { CUPS, KNOCKOUT_SETS } from './data/catalog.ts';
import { firstFocus, move } from './focus.ts';
import { feedHud, hudModel, newHudMemory, type HudMemory } from './hudModel.ts';
import { ITEM_ICONS, itemArt } from './icons.ts';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { UI } from './constants.ts';
import { isPauseKey, navFromKey, navFromPad, newRepeat, repeat } from './input.ts';
import { minimapDots, type MinimapDot } from './minimap.ts';
import { HudView } from './render/hud.ts';
import { TouchControls } from './render/touch.ts';
import {
  BootView, CreditsView, CupView, HowToView, ListView, OverlayMenuView, ResultsView, RosterView, SettingsView, TitleView, TrackView, type ScreenView,
} from './render/screens.ts';
import { parseCredits } from './screens/credits.ts';
import { adjustSetting, cupMenu, modeMenu, pauseMenu, rosterMenu, settingsMenu, SPEED_CLASSES, titleMenu, trackMenu, type SettingId } from './screens/menus.ts';
import { boardModel, gpModel, knockoutCutModel, resultsModel, type BoardLoad, type BoardPost } from './screens/results.ts';
import type { LeaderboardClient } from '../backend-leaderboard/client.ts';
import { cleanName, type BoardMode, type Submission } from '../backend-leaderboard/rules.ts';
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
  /** a menu blip: focus moved, something was picked, or we went back */
  uiSound?(kind: 'move' | 'confirm' | 'back'): void;
  /** the global leaderboard; absent means no board on the results screen */
  readonly leaderboard?: LeaderboardClient;
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
  /** Time Trial and Daily, when the player finished: the run as the leaderboard wants it, minus the name */
  board?: { mode: BoardMode; dailySeed: number | null; draft: Omit<Submission, 'name'> };
}

export interface RaceFrame {
  state: RaceState;
  player: KartState;
  shownRank: number;
  coinCap: number;
  map: Minimap;
  itemDefs: readonly { id: string; name: string }[];
  /** the player holds a trailable item behind the kart */
  trailing?: boolean;
}

export type Medal = 'none' | 'bronze' | 'silver' | 'gold';
export function medalFor(ms: number, m: { gold: number; silver: number; bronze: number }): Medal {
  return ms <= m.gold ? 'gold' : ms <= m.silver ? 'silver' : ms <= m.bronze ? 'bronze' : 'none';
}
const medalName = (m: Medal) => (m === 'none' ? 'No medal this time' : `${m[0].toUpperCase()}${m.slice(1)} medal!`);

const NO_BUTTONS: readonly boolean[] = [];
const NO_AXES: readonly number[] = [];

const MODE_ICONS: Record<string, string> = { quick: '🏁', grandPrix: '🏆', knockout: '💥', timeTrial: '⏱️', daily: '📅' };

export class UiRoot {
  readonly root: HTMLElement;
  app: AppState = initialApp();
  save: Save;
  private readonly host: UiHost;
  private readonly backend: Backend | null;
  private readonly views: {
    boot: BootView; title: TitleView; modes: ListView; roster: RosterView; cups: CupView; tracks: TrackView; hud: HudView; results: ResultsView;
    pause: OverlayMenuView; settings: SettingsView; credits: CreditsView; howTo: HowToView;
  };
  private readonly models = new Map<string, FocusModel>();
  private readonly focusBy = new Map<string, string>();
  private active: { key: string; view: ScreenView } | null = null;
  private hudMem: HudMemory = newHudMemory();
  private dots: MinimapDot[] = [];
  private lastOver: RaceOver | null = null;
  private ttNote = '';
  private boardLoad: BoardLoad = 'loading';
  private boardPost: BoardPost = { state: 'idle' };
  private padRepeat = newRepeat();
  private padStartWas = false;
  /** gamepad buttons still down from the race, ignored by the menus until released */
  private padSpent: boolean[] = [];
  /** the stick still pushed from the race (steering on a diagonal), ignored by the menus until centered */
  private padStickSpent = false;
  /** keys (by code) down in the race: their auto-repeats never reach the menus; a new press does */
  private readonly keySpent = new Set<string>();
  /** where the pointer last moved, anywhere on the page: a move that goes nowhere (a browser's synthetic one) is no hover */
  private readonly pointerAt = { x: NaN, y: NaN };
  private osReduced = false;
  private readonly onKey = (e: KeyboardEvent) => this.key(e);
  private readonly onMove = (e: PointerEvent) => this.hover(e);
  /** a phone or tablet held upright: the rotate prompt covers the screen (CSS, same query) */
  private readonly upright: MediaQueryList | undefined;
  private readonly onUpright = () => this.holdIfUpright();
  /** a phone on its side (the stylesheet's short-screen block): the title and pause buttons sit two by two */
  private readonly short: MediaQueryList | undefined;
  private readonly onShort = () => this.setGrids();

  /** on-screen thumbs for phones and tablets (shown only there, only while racing) */
  readonly touch: TouchControls;

  constructor(parent: HTMLElement, host: UiHost, backend: Backend | null) {
    this.host = host;
    this.backend = backend;
    this.save = loadSave(backend);
    this.app = { ...this.app, racerId: this.save.settings.selectedRacerId };
    this.root = document.createElement('div');
    this.root.id = 'ui';
    parent.appendChild(this.root);
    this.touch = new TouchControls(this.root, () => this.dispatch({ type: 'pause' }));
    // a phone held upright: the race needs it sideways (shown by CSS only, portrait + touch)
    const rotate = document.createElement('div');
    rotate.className = 'rotate-hint';
    rotate.setAttribute('role', 'status');
    rotate.innerHTML = '<div class="phone" aria-hidden="true"></div><p>Turn your phone sideways to race</p>';
    this.root.appendChild(rotate);
    this.upright = globalThis.matchMedia?.('(orientation: portrait) and (pointer: coarse)');
    this.upright?.addEventListener?.('change', this.onUpright);
    this.short = globalThis.matchMedia?.(UI.shortScreenQuery);
    this.short?.addEventListener?.('change', this.onShort);
    // the item roulette flicks through every painted item: have them all in the cache first
    for (const id of Object.keys(ITEM_ICONS)) new Image().src = itemArt(id);
    const r = this.root;
    this.views = {
      boot: new BootView(r), title: new TitleView(r), modes: new ListView(r, 'mode-screen', 'Pick a mode'),
      roster: new RosterView(r), cups: new CupView(r), tracks: new TrackView(r), hud: new HudView(r), results: new ResultsView(r),
      pause: new OverlayMenuView(r, 'pause'), settings: new SettingsView(r), credits: new CreditsView(r), howTo: new HowToView(r),
    };
    for (const v of Object.values(this.views)) v.root.addEventListener('click', (e) => this.pointer(e, true));
    // hover takes the focus only from a pointer that moves: a dialog opening under a resting cursor
    // gets a pointerover and no pointermove, and the pause opened on Quit under it (seam review)
    addEventListener('pointermove', this.onMove);
    const mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.osReduced = mq?.matches ?? false;
    mq?.addEventListener?.('change', (e) => { this.osReduced = e.matches; this.applyTheme(); });
    addEventListener('keydown', this.onKey);
    this.applyTheme();
    this.show();
  }

  dispose(): void {
    removeEventListener('keydown', this.onKey);
    removeEventListener('pointermove', this.onMove);
    this.upright?.removeEventListener?.('change', this.onUpright);
    this.short?.removeEventListener?.('change', this.onShort);
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
    this.holdIfUpright(); // a race begun or resumed with the phone upright
  }

  /** Under the rotate prompt no race runs: turned upright mid-race, it pauses (as a hidden tab does),
   *  so the touch gas stops and the kart waits. */
  private holdIfUpright(): void {
    if (this.upright?.matches && this.app.screen === 'racing' && !this.app.overlays.length) this.dispatch({ type: 'pause' });
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
    // every pause opens on Resume: a Quit or Restart remembered from the last one ended the race on Enter (bug hunt 3)
    if (wasPaused && !nowPaused) this.focusBy.delete('pause');
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
    const tracks = needsTrack(s) && s.trackId ? [s.trackId] : vm?.plays ?? [[...built][0]];
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
    if (over.board && this.host.leaderboard) {
      this.boardLoad = 'loading';
      this.boardPost = { state: 'idle' };
      this.refreshBoard();
    }
    this.dispatch({ type: 'raceFinished', seriesHasNext: over.seriesHasNext });
  }

  // ---------------------------------------------------------------- leaderboard
  private refreshBoard(): void {
    const o = this.lastOver, lb = this.host.leaderboard;
    if (!o?.board || !lb) return;
    void lb.fetchBoard(o.results.trackId, o.board.mode, o.board.dailySeed).then((rows) => {
      if (this.lastOver !== o) return; // a newer race finished meanwhile
      this.boardLoad = rows ?? 'offline';
      this.paintBoard();
    });
  }

  private paintBoard(): void {
    const o = this.lastOver;
    if (!o?.board || this.app.screen !== 'results' || this.app.overlays.length) return;
    this.views.results.updateBoard(boardModel(o.board.mode, o.trackName, o.board.dailySeed, this.boardLoad, this.boardPost));
    // the rows arriving push the name box down: keep whatever has the focus in sight
    const id = this.focusBy.get(this.app.screen);
    if (id) this.views.results.buttons.get(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /** Post the finished run under the name in the box. The server replays it before saving. */
  private async postRun(): Promise<void> {
    const o = this.lastOver, lb = this.host.leaderboard;
    if (!o?.board || !lb || this.boardPost.state === 'posting' || this.boardPost.state === 'posted' || this.boardLoad === 'offline') return;
    const name = this.views.results.nameValue.trim();
    const bad = !/^[A-Za-z0-9 _-]{1,16}$/.test(name) ? 'Use 1 to 16 letters, digits, spaces, _ or -.' : !cleanName(name) ? 'Please pick another name.' : '';
    if (bad) { this.boardPost = { state: 'failed', error: bad }; this.paintBoard(); return; }
    this.boardPost = { state: 'posting' };
    this.paintBoard();
    const r = await lb.post({ ...o.board.draft, name });
    if (this.lastOver !== o) return;
    if (r.ok) {
      this.boardPost = { state: 'posted', id: r.id, rank: r.rank, best: r.best };
      this.save.playerName = name;
      writeSave(this.backend, this.save);
      this.refreshBoard();
    } else this.boardPost = { state: 'failed', error: r.error };
    this.paintBoard();
  }

  // ---------------------------------------------------------------- race
  /** Once per sim tick with that tick's events. */
  feed(race: readonly RaceEvent[], items: readonly ItemEvent[], playerId: string): void {
    feedHud(this.hudMem, race, items, playerId, performance.now() / 1000);
  }

  /** Once per rendered frame while racing (paused or not). */
  race(f: RaceFrame, nowMs: number): void {
    if (this.app.screen !== 'racing') return;
    const vm = hudModel(f.state, f.player, f.shownRank, f.coinCap, this.hudMem, nowMs / 1000, f.itemDefs, nowMs, f.trailing);
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
    const stickOut = navFromPad(NO_BUTTONS, pad.axes) !== null;
    if (this.app.screen === 'racing' && !this.app.overlays.length) {
      if (start && !this.padStartWas) this.dispatch({ type: 'pause' });
      this.padStartWas = start;
      // every button down in the race (the Start that paused, A held for a drift) is spent:
      // on the menu that opens next it counts only once let go and pressed again. So is the stick
      // (steering on a diagonal read as a fresh up or down, and moved the pause off Resume): it
      // counts once back inside the dead zone
      this.padSpent = buttons;
      this.padStickSpent = stickOut;
      this.padRepeat.held = null;
      return;
    }
    this.padStartWas = start;
    for (let i = 0; i < buttons.length; i++) {
      if (!buttons[i]) this.padSpent[i] = false;
      else if (this.padSpent[i]) buttons[i] = false;
    }
    if (!stickOut) this.padStickSpent = false;
    const a = repeat(this.padRepeat, navFromPad(buttons, this.padStickSpent ? NO_AXES : pad.axes), nowMs);
    if (a) this.nav(a);
  }

  // ---------------------------------------------------------------- input
  private key(e: KeyboardEvent): void {
    const racing = this.app.screen === 'racing' && !this.app.overlays.length;
    const code = e.code || e.key;
    if (racing) this.keySpent.add(code);
    else if (this.keySpent.has(code)) {
      // a key held from the race (gas over the line, the Escape that paused): its auto-repeats never
      // type into the name box or move the focus on the dialog that opened; a new press counts
      if (e.repeat) { e.preventDefault(); return; }
      this.keySpent.delete(code);
    }
    // typing in the name box: letters stay in the box; only Enter, Escape and up/down navigate
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') {
      if (e.key === 'Enter') { e.preventDefault(); this.host.uiSound?.('confirm'); void this.postRun(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.setFocus('post'); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.nav(e.key === 'ArrowUp' ? 'up' : 'down'); }
      return;
    }
    // P pauses, so on the pause dialog it resumes too, like Escape
    const a = navFromKey(e.code, e.key) ?? (topOverlay(this.app) === 'pause' && isPauseKey(e.code, e.key) ? 'back' : null);
    if (e.repeat && (a === 'confirm' || a === 'back')) return;
    if (racing) {
      if (isPauseKey(e.code, e.key)) { e.preventDefault(); this.dispatch({ type: 'pause' }); }
      // the driving keys are the game's while racing: the browser does not scroll on Space or bookmark on Ctrl+D
      else if (isRaceKey(e.code)) e.preventDefault();
      return;
    }
    if (!a) return;
    e.preventDefault();
    this.nav(a);
  }

  /** Every pointer move on the page (over the race too, so a move in place is known as one wherever it lands). */
  private hover(e: PointerEvent): void {
    const moved = e.clientX !== this.pointerAt.x || e.clientY !== this.pointerAt.y;
    this.pointerAt.x = e.clientX;
    this.pointerAt.y = e.clientY;
    if (moved) this.pointer(e, false);
  }

  private pointer(e: Event, click: boolean): void {
    const b = (e.target as HTMLElement | null)?.closest?.('[data-id]') as HTMLElement | null;
    if (!b || !this.active || !this.active.view.root.contains(b)) return;
    const id = b.dataset.id as string;
    if (b.getAttribute('aria-disabled') === 'true') return;
    if (!click && this.focusBy.get(this.active.key) !== id) this.host.uiSound?.('move');
    this.setFocus(id, false); // under the pointer it is already in sight
    if (!click) return;
    // a settings row's ◀ or ▶ steps that way, like left and right on the keys
    const dir = (e.target as HTMLElement).closest?.('[data-dir]')?.getAttribute('data-dir');
    if (dir && this.active.key === 'settings' && id !== 'done') {
      this.host.uiSound?.('move');
      this.changeSetting(id as SettingId, dir === '-1' ? -1 : 1);
      return;
    }
    this.host.uiSound?.(id === 'back' ? 'back' : 'confirm');
    this.confirm(id);
  }

  /** One navigation action on whatever is on top. */
  nav(a: NavAction): void {
    if (this.app.screen === 'boot') { this.dispatch({ type: 'boot' }); return; }
    const key = this.active?.key;
    const model = key ? this.models.get(key) : undefined;
    const cur = key ? this.focusBy.get(key) : undefined;
    if (a === 'back') { this.host.uiSound?.('back'); this.back(); return; }
    if (a === 'confirm') { if (cur) { this.host.uiSound?.('confirm'); this.confirm(cur); } return; }
    if (key === 'settings' && cur && cur !== 'done' && (a === 'left' || a === 'right')) {
      this.host.uiSound?.('move');
      this.changeSetting(cur as SettingId, a === 'left' ? -1 : 1);
      return;
    }
    if (model && cur) {
      const next = move(model, cur, a);
      // past the top or bottom stop, a panel taller than the screen (How to Play, Credits, a long
      // results board) scrolls on before the focus wraps round, so all of it can be read on keys or a pad
      if (a === 'up' || a === 'down') {
        const dir = a === 'down' ? 1 : -1;
        const row = (id: string) => model.rows.findIndex((r) => r.includes(id));
        const panel = (row(next) - row(cur)) * dir <= 0 ? this.scrollsOn(dir) : null;
        // a plain jump: a smooth one restarts from where it got to, so quick presses would fall short
        if (panel) { panel.scrollBy({ top: dir * UI.panelScrollPx }); return; }
      }
      if (next !== cur) { this.host.uiSound?.('move'); this.setFocus(next); }
    }
  }

  /** The panel on top, when it has more to show that way. */
  private scrollsOn(dir: 1 | -1): HTMLElement | null {
    const root = this.active?.view.root;
    const p = root?.querySelector<HTMLElement>('.scroll') ?? root?.querySelector<HTMLElement>('.box');
    if (!p?.scrollBy) return null;
    return (dir > 0 ? p.scrollTop + p.clientHeight < p.scrollHeight - 1 : p.scrollTop > 0) ? p : null;
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
    if (top === 'credits' || top === 'howTo') { this.dispatch({ type: 'back' }); return; }
    if (top === 'pause') {
      const map: Record<string, AppAction> = { resume: { type: 'resume' }, restart: { type: 'restart' }, howTo: { type: 'openHowTo' }, settings: { type: 'openSettings' }, credits: { type: 'openCredits' }, quit: { type: 'quit' } };
      if (map[id]) this.dispatch(map[id]);
      return;
    }
    // the menus' own Back button (a tap or a click): the way Escape goes
    if (id === 'back') { this.back(); return; }
    switch (s.screen) {
      case 'title':
        this.dispatch(id === 'settings' ? { type: 'openSettings' } : id === 'credits' ? { type: 'openCredits' } : id === 'howTo' ? { type: 'openHowTo' } : { type: 'start' });
        break;
      case 'modeSelect': this.dispatch({ type: 'pickMode', mode: id as RaceMode }); break;
      case 'rosterSelect': {
        const cc = SPEED_CLASSES.find((c) => `cc${c.cc}` === id);
        if (cc) { this.dispatch({ type: 'setSpeedClass', speedClass: cc.cc }); this.show(true); }
        else this.dispatch({ type: 'pickRacer', racerId: id });
        break;
      }
      case 'cupSelect': this.dispatch({ type: 'pickCup', cupId: id }); break;
      case 'trackSelect': this.dispatch({ type: 'pickTrack', trackId: id }); break;
      case 'results': case 'gpTable': case 'knockoutCut':
        if (id === 'post') { void this.postRun(); break; }
        if (id === 'name') break; // the box takes focus; Enter inside it posts
        this.dispatch({ type: 'continue' });
        break;
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
  /** `reveal`: scroll it into sight inside its panel (a long results board, Settings on a phone) */
  private setFocus(id: string, reveal = true): void {
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
      if (reveal) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }

  /** Which view is on top, rendered fresh when it changes (or when `force`). */
  private show(force = false): void {
    const s = this.app;
    const v = this.views;
    const top = topOverlay(s);
    const base: Record<string, ScreenView> = {
      boot: v.boot, title: v.title, modeSelect: v.modes, rosterSelect: v.roster, cupSelect: v.cups, trackSelect: v.tracks,
      racing: v.hud, results: v.results, gpTable: v.results, knockoutCut: v.results,
    };
    const baseView = base[s.screen];
    const overlayView = top === 'pause' ? v.pause : top === 'settings' ? v.settings : top === 'credits' ? v.credits : top === 'howTo' ? v.howTo : null;
    for (const x of Object.values(v)) x.root.classList.toggle('on', x === baseView || x === overlayView);
    // a dialog on top makes everything under it unreachable, by Tab and by pointer
    for (const x of Object.values(v)) x.root.inert = overlayView !== null && x !== overlayView;
    const key = top ?? s.screen;
    const view = overlayView ?? baseView;
    if (!force && this.active?.key === key) return;
    const entering = this.active?.key !== key;
    this.active = { key, view };
    this.renderScreen(key, entering);
    const model = this.models.get(key);
    if (!model) return;
    const remembered = this.focusBy.get(key);
    const ok = remembered && model.rows.flat().includes(remembered) && !model.disabled?.includes(remembered);
    const id = ok ? remembered : entering && key === 'rosterSelect' ? s.racerId : firstFocus(model);
    // How to Play and Credits open at the top: their one button, Back, is at the end
    if (id) this.setFocus(id, key !== 'howTo' && key !== 'credits');
  }

  /** `entering`: false when the screen on top is drawn again (a setting changed) */
  private renderScreen(key: string, entering: boolean): void {
    const s = this.app, v = this.views, built = this.host.builtTracks;
    const short = this.short?.matches ?? false;
    switch (key) {
      case 'title': { const vm = titleMenu(short); v.title.render(vm); this.models.set(key, vm.focus); break; }
      case 'modeSelect': { const vm = modeMenu(this.host.availableModes); v.modes.render(vm, MODE_ICONS); this.models.set(key, vm.focus); break; }
      case 'rosterSelect': { const vm = rosterMenu(s.speedClass, s.mode); v.roster.render(vm); this.models.set(key, vm.focus); break; }
      case 'cupSelect': {
        const vm = cupMenu(s.mode === 'knockout' ? 'knockout' : 'grandPrix', built, this.save, s.speedClass);
        v.cups.render(vm);
        this.models.set(key, vm.focus);
        break;
      }
      case 'trackSelect': { const vm = trackMenu(s.mode ?? 'quick', built, this.save); v.tracks.render(vm); this.models.set(key, vm.focus); break; }
      case 'pause': { const vm = pauseMenu(short); v.pause.render(vm); this.models.set(key, vm.focus); break; }
      case 'settings': { const vm = settingsMenu(this.save.settings); v.settings.render(vm.rows, !entering); this.models.set(key, vm.focus); break; }
      case 'credits': { v.credits.render(parseCredits(this.host.creditsMarkdown)); this.models.set(key, { rows: [['back']] }); break; }
      case 'howTo': { v.howTo.render(ITEM_DEFINITIONS); this.models.set(key, { rows: [['back']] }); break; }
      case 'results': case 'gpTable': case 'knockoutCut': this.renderEnd(key); break;
      default: break;
    }
  }

  /** The screen height crossed the short-screen line (a window resized): the title and pause grids follow the buttons. */
  private setGrids(): void {
    const short = this.short?.matches ?? false;
    if (this.models.has('title')) this.models.set('title', titleMenu(short).focus);
    if (this.models.has('pause')) this.models.set('pause', pauseMenu(short).focus);
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
      const withBoard = !!o.board && !!this.host.leaderboard;
      this.views.results.renderResults(vm, nextLabel, withBoard ? { name: this.save.playerName === 'Player' ? '' : this.save.playerName } : undefined);
      if (withBoard) {
        this.models.set(key, { rows: [['name', 'post'], ['continue']] });
        // a known name goes straight to Post; a first-timer starts in the name box
        this.focusBy.set(key, this.save.playerName && this.save.playerName !== 'Player' ? 'post' : 'name');
        this.paintBoard();
        return;
      }
    }
    else if (key === 'gpTable' && o.gp) this.views.results.renderGp(gpModel(o.gp.before, o.gp.after, o.playerId), nextLabel);
    else if (key === 'knockoutCut' && o.ko) this.views.results.renderCut(knockoutCutModel(o.results, o.ko.after, o.playerId), nextLabel);
    this.models.set(key, { rows: [['continue']] });
  }
}
