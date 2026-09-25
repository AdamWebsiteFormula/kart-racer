// UiRoot: mounts the overlay, owns every renderer, the app state, the focus ring and menu
// input (keyboard, gamepad, pointer). The game loop talks to it through UiHost callbacks,
// feed() once per sim tick and race() once per frame. No Three.js here.
import { isRaceKey } from '../kart-controller/input.ts';
import type { KartState, SpeedClass } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { GrandPrixState, KnockoutState, RaceEvent, RaceMode, RaceResults, RaceState } from '../race-manager/types.ts';
import type { Minimap } from '../track-builder/minimap.ts';
import { initialApp, isPaused, needsCup, needsTrack, reduce, topOverlay } from './app.ts';
import { accentOf, CAST, nameOf } from './data/cast.ts';
import { CUPS, KNOCKOUT_SETS, nextTrack, trackCard } from './data/catalog.ts';
import { firstFocus, move } from './focus.ts';
import { feedHud, hudModel, newHudMemory, type HudAssist, type HudMemory } from './hudModel.ts';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { UI } from './constants.ts';
import { modeSvg } from './icons.ts';
import { fullscreenState, toggleFullscreen } from './fullscreen.ts';
import { isFullscreenKey, isPauseKey, navFromKey, navFromPad, newRepeat, repeat } from './input.ts';
import { minimapDots, type MinimapDot } from './minimap.ts';
import { HudView } from './render/hud.ts';
import { IntroCardView } from './render/intro.ts';
import { TouchControls } from './render/touch.ts';
import type { IntroCardVM } from './screens/intro.ts';
import {
  BootView, CreditsView, CupView, HowToView, ListView, OverlayMenuView, ResultsView, RosterView, SettingsView, TitleView, TrackView, UnlocksView, type ScreenView,
} from './render/screens.ts';
import { parseCredits } from './screens/credits.ts';
import { adjustSetting, cupMenu, medalFor, modeMenu, pauseMenu, rosterMenu, rosterMove, settingsMenu, SPEED_CLASSES, titleMenu, trackMenu, type Medal, type MedalTimes, type SettingId } from './screens/menus.ts';
import { boardDown, boardModel, cumulativeSplits, endFocus, endMenu, gpModel, knockoutCutModel, nextDailyAt, resultsModel, type BoardLoad, type BoardPost, type EndMenuVM } from './screens/results.ts';
import { podiumModel } from './screens/podium.ts';
import { PodiumView } from './render/podium.ts';
import type { LeaderboardClient } from '../backend-leaderboard/client.ts';
import { cleanName, dailySeed, type BoardMode, type Submission } from '../backend-leaderboard/rules.ts';
import { loadSave, reducedMotion, writeSave, type Backend, type Save, type Settings } from './store.ts';
import type { AppAction, AppState, FocusModel, NavAction } from './types.ts';
import { grantAll, grantUnlocks, unlockRows } from './unlocks.ts';
import { garageModel, lookFor, mirrorAllowed, setChoice, stepChoice, type ChoiceId } from './garage.ts';

/**
 * `mirrored`: Mirror mode (Quick Race and Grand Prix only); `look`: the player's paint and body (cosmetic only);
 * `intro`: from the results, the course intro to fly: 'short' for a Quick Race's Next track, 'none' for a race
 * again or a Time Trial's Retry (as the pause's Restart); absent, the mode's own (design §9)
 */
export interface RacePlan { mode: RaceMode; racerId: string; speedClass: SpeedClass; cupId: string | null; tracks: string[]; mirrored?: boolean; look?: KartLookIds; intro?: 'short' | 'none' }
/** A kart's look by id: an alt paint (data/cosmetics.ts SKINS) and a body (BODIES); absent = the racer's own. */
export interface KartLookIds { paint?: string; body?: string }

export interface UiHost {
  readonly builtTracks: ReadonlySet<string>;
  /** each built track's Time Trial medal times, by track id: a card grades your best against them */
  readonly medalTimes: ReadonlyMap<string, MedalTimes>;
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
  /** the player has finished and pressed on (Enter, pad A or a tap): end the grace and show the results now */
  skipToResults?(): void;
  /** a key, a pad button or a tap during the course intro: on to the countdown now */
  skipIntro?(): void;
}

export interface RaceOver {
  results: RaceResults;
  trackName: string;
  playerId: string | null;
  gp?: { before: GrandPrixState | null; after: GrandPrixState };
  ko?: { after: KnockoutState };
  seriesHasNext: boolean;
  /** Time Trial only: the track's medal times */
  medalTimesMs?: MedalTimes;
  /** Time Trial and Daily, when the player finished: the run as the leaderboard wants it, minus the name */
  board?: { mode: BoardMode; dailySeed: number | null; draft: Omit<Submission, 'name'> };
  /** Time Trial, when the player finished: the run's ghost path (race-manager/ghost.ts), kept if it is a new best */
  ghost?: string;
  /** the look the player raced in: kept with a new best's ghost, which is drawn in it */
  look?: KartLookIds;
  /** the series is over: its top three (1st to 3rd), for the podium ceremony after the standings or the cut (the host shows it) */
  podium?: readonly string[];
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
  /** the driving assists on (Settings; game/assist.ts): the strip's words for the gas, Steering assist's badge */
  assist?: HudAssist;
}

export { medalFor, type Medal } from './screens/menus.ts';
const medalName = (m: Medal) => (m === 'none' ? 'No medal this time' : `${m[0].toUpperCase()}${m.slice(1)} medal!`);

const NO_BUTTONS: readonly boolean[] = [];
/** keys that are no press of their own (held for a shortcut): they never skip the course intro */
const NOT_A_PRESS: ReadonlySet<string> = new Set(['Meta', 'Control', 'Alt', 'AltGraph', 'OS', 'CapsLock', 'Fn']);
const CAST_IDS: ReadonlySet<string> = new Set(CAST.map((c) => c.id));
const NO_AXES: readonly number[] = [];

export class UiRoot {
  readonly root: HTMLElement;
  app: AppState = initialApp();
  save: Save;
  private readonly host: UiHost;
  private readonly backend: Backend | null;
  private readonly views: {
    boot: BootView; title: TitleView; modes: ListView; roster: RosterView; cups: CupView; tracks: TrackView; hud: HudView; results: ResultsView; podium: PodiumView;
    pause: OverlayMenuView; settings: SettingsView; credits: CreditsView; howTo: HowToView; unlocks: UnlocksView;
  };
  private readonly models = new Map<string, FocusModel>();
  private readonly focusBy = new Map<string, string>();
  private active: { key: string; view: ScreenView } | null = null;
  private hudMem: HudMemory = newHudMemory();
  /** races the player has started this session (a restart counts): only the first one's countdown shows the controls strip */
  private racesStarted = 0;
  private dots: MinimapDot[] = [];
  private lastOver: RaceOver | null = null;
  private ttNote = '';
  /** a Time Trial's best before the run just finished (0: none), for the results' "−1.37"; `ttSlower`: the run did not beat it */
  private ttBefore = 0;
  private ttSlower = false;
  /** the end screen's buttons as they sit (screens/results.ts endMenu); the focus grid follows them */
  private end: EndMenuVM = { rows: [] };
  private boardLoad: BoardLoad = 'loading';
  private boardPost: BoardPost = { state: 'idle' };
  /** the player crossed the line in the race on screen: a fresh confirm skips to the results */
  private playerDone = false;
  /** gamepad A last frame, for a fresh press in the race */
  private padAWas = true;
  /** confirms on a new end screen wait until then (UI.endScreenGuardMs) */
  private endGuardUntil = 0;
  /** when the screen or dialog on top opened (UI.screenGuardMs) */
  private enteredAt = -Infinity;
  /** a number for the suggested leaderboard name ("Pip 427"), fixed for the session */
  private readonly nameNumber = 100 + Math.floor(Math.random() * 900);
  /** the player crossed the line: the save's counters stop (the autopilot drives on under the results) */
  private statsOff = false;
  /** the racer the garage dresses on the racer screen: the card last focused (by a key, a click, or the pointer resting on it) */
  private dressing = '';
  /** a racer card under the pointer goes on show once the pointer rests on it (UI.hoverDressMs) */
  private dressTimer: ReturnType<typeof setTimeout> | undefined;
  /**
   * The screen change under way (UI.wipeMs): the views going (kept on show while they leave), the view
   * coming, a view's old face when it is drawn again as the next screen (results → standings), and when
   * it is over. Keys, clicks and the pad do nothing until then.
   */
  private wipe: { els: HTMLElement[]; ghost: HTMLElement | null; until: number; timer: ReturnType<typeof setTimeout> } | null = null;
  /** the screen coming waits this much longer (ms): the results over the race, for FINISH! to leave first (UI.finishLagMs) */
  private arriveLag = 0;
  /** the unlock reveal (design §10), over whatever screen is up */
  private readonly toast: HTMLElement;
  /** the course intro's title card, in the race HUD (game/intro.ts flies the camera) */
  private readonly introView: IntroCardView;
  /** every gamepad button last poll, for a fresh press (the course intro's skip) */
  private padWas: readonly boolean[] = [];
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  /** the UI's clock (ms); tests replace it */
  clock: () => number = () => performance.now();
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
  private readonly onDown = (e: PointerEvent) => this.tapInRace(e);
  /** the window lost the focus mid-race (alt-tab, a click on the address bar or another window) */
  private readonly onBlur = () => { if (this.app.screen === 'racing' && !this.app.overlays.length) this.dispatch({ type: 'pause' }); };
  /** into or out of fullscreen (F, the Settings row, Esc, the browser): Settings' row says which */
  private readonly onFullscreen = () => { if (this.active?.key === 'settings') this.show(true); };
  /** a phone or tablet held upright: the rotate prompt covers the screen (CSS, same query) */
  private readonly upright: MediaQueryList | undefined;
  private readonly onUpright = () => this.holdIfUpright();
  /** a phone on its side (the stylesheet's short-screen block): the title and pause buttons sit two by two */
  private readonly short: MediaQueryList | undefined;
  private readonly onShort = () => this.setGrids();
  /** a short window (a laptop, a phone on its side): the end buttons sit in one line (UI.endOneLineQuery) */
  private readonly oneLine: MediaQueryList | undefined;

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
    // a tablet held upright sees it too, so it says device, not phone
    rotate.innerHTML = '<div class="phone" aria-hidden="true"></div><p>Turn your device sideways to race</p>';
    this.root.appendChild(rotate);
    this.toast = document.createElement('div');
    this.toast.className = 'toast';
    this.toast.setAttribute('role', 'status');
    this.toast.setAttribute('aria-live', 'polite');
    this.root.appendChild(this.toast);
    this.upright = globalThis.matchMedia?.('(orientation: portrait) and (pointer: coarse)');
    this.upright?.addEventListener?.('change', this.onUpright);
    this.short = globalThis.matchMedia?.(UI.shortScreenQuery);
    this.short?.addEventListener?.('change', this.onShort);
    this.oneLine = globalThis.matchMedia?.(UI.endOneLineQuery);
    this.oneLine?.addEventListener?.('change', this.onShort);
    // the item roulette flicks through every painted item: main.ts fetches them all into the cache,
    // in turn with the other background files, once the title is up (performance/loadQueue.ts)
    const r = this.root;
    this.views = {
      boot: new BootView(r), title: new TitleView(r), modes: new ListView(r, 'mode-screen', 'Pick a mode'),
      roster: new RosterView(r), cups: new CupView(r), tracks: new TrackView(r), hud: new HudView(r), results: new ResultsView(r), podium: new PodiumView(r),
      pause: new OverlayMenuView(r, 'pause'), settings: new SettingsView(r), credits: new CreditsView(r), howTo: new HowToView(r), unlocks: new UnlocksView(r),
    };
    this.introView = new IntroCardView(this.views.hud.root);
    for (const v of Object.values(this.views)) v.root.addEventListener('click', (e) => this.pointer(e, true));
    // hover takes the focus only from a pointer that moves: a dialog opening under a resting cursor
    // gets a pointerover and no pointermove, and the pause opened on Quit under it (seam review)
    addEventListener('pointermove', this.onMove);
    addEventListener('pointerdown', this.onDown);
    const mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.osReduced = mq?.matches ?? false;
    mq?.addEventListener?.('change', (e) => { this.osReduced = e.matches; this.applyTheme(); });
    addEventListener('keydown', this.onKey);
    // alt-tab mid-race leaves the window on screen (no visibilitychange): the race waits under the pause,
    // as for a hidden tab, instead of the pack driving off from a kart whose keys the blur let go
    addEventListener('blur', this.onBlur);
    // Settings' Fullscreen row shows the browser's state: Esc (or the browser) leaving it redraws the row
    document.addEventListener('fullscreenchange', this.onFullscreen);
    this.applyTheme();
    this.usedInput('keys');
    this.show();
  }

  dispose(): void {
    this.endWipe();
    clearTimeout(this.dressTimer);
    removeEventListener('keydown', this.onKey);
    removeEventListener('pointermove', this.onMove);
    removeEventListener('pointerdown', this.onDown);
    removeEventListener('blur', this.onBlur);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    clearTimeout(this.toastTimer);
    this.upright?.removeEventListener?.('change', this.onUpright);
    this.short?.removeEventListener?.('change', this.onShort);
    this.oneLine?.removeEventListener?.('change', this.onShort);
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
    // back and quit go the other way: the screen coming slides in from the left
    this.show(false, a.type === 'back' || a.type === 'quit' ? -1 : 1);
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
      this.hudMem = newHudMemory(this.racesStarted++ === 0);
      this.playerDone = false;
      this.statsOff = false;
      if (prev.screen === 'gpTable' || prev.screen === 'knockoutCut') this.host.nextRace();
      // one more go from the results: no course intro for the same race again, a short one for the next track
      else this.host.startRace({ ...this.plan(next), ...(a.type === 'raceAgain' ? { intro: 'none' as const } : a.type === 'nextTrack' ? { intro: 'short' as const } : {}) });
    }
    if (a.type === 'restart' && prev.screen === 'racing') { this.hudMem = newHudMemory(this.racesStarted++ === 0); this.playerDone = false; this.statsOff = false; this.host.restartRace(); }
    if (a.type === 'quit' && prev.screen === 'racing') writeSave(this.backend, this.save); // the race's counters (ultra turbos, hits)
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
    const mode = s.mode ?? 'quick';
    return { mode, racerId: s.racerId, speedClass: s.speedClass, cupId: s.cupId, tracks, mirrored: s.mirrored && mirrorAllowed(this.save, mode), look: lookFor(this.save, s.racerId) };
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
    // the placing is saved when it is decided: at the final, or when the player is cut (audit 24 Sept 2026).
    // `finished` means the player raced the whole Knockout (design §10: Buggy)
    const koDone = !!ko && ko.after.segment >= ko.after.trackIds.length;
    const koOut = !!ko && !!over.playerId && ko.after.eliminated.includes(over.playerId);
    if (ko && over.playerId && (koDone || koOut)) {
      const placing = ko.after.placings[over.playerId];
      const old = this.save.knockout[ko.after.setId];
      const best = Math.min(old?.bestPlacing ?? 99, placing ?? 99);
      this.save.knockout[ko.after.setId] = {
        finished: (old?.finished ?? false) || koDone, won: (old?.won ?? false) || (koDone && placing === 1),
        ...(best <= 8 ? { bestPlacing: best } : {}),
      };
    }
    const me = over.results.ranks.find((r) => r.racerId === over.playerId);
    if (over.medalTimesMs && me && !me.dnf) {
      const tt = this.save.timeTrial[over.results.trackId];
      const medal = medalFor(me.timeMs, over.medalTimesMs);
      this.ttSlower = !!tt && me.timeMs >= tt.bestMs;
      this.ttNote = this.ttSlower ? medalName(medal) : `New best! ${medalName(medal)}`;
      this.ttBefore = tt?.bestMs ?? 0; // the results say how the run did against it
      // the ghost goes with the best it drove, never with a slower run; so do its lap lines, which the next run races
      const look = over.ghost ? { ...(over.look?.paint ? { paint: over.look.paint } : {}), ...(over.look?.body ? { body: over.look.body } : {}) } : {};
      if (!tt || me.timeMs < tt.bestMs) {
        this.save.timeTrial[over.results.trackId] = {
          bestMs: me.timeMs, medal, racerId: over.playerId ?? undefined, splitsMs: cumulativeSplits(me.lapTimesMs, me.timeMs), ...(over.ghost ? { ghost: over.ghost } : {}), ...look,
        };
      } else tt.medal = medalFor(tt.bestMs, over.medalTimesMs); // the kept best, graded against today's times
    } else { this.ttNote = ''; this.ttBefore = 0; this.ttSlower = false; }
    // design §10: anything this race earned is granted now, and shown once
    const fresh = grantUnlocks(this.save, this.host.medalTimes);
    if (fresh.length) this.showToast(`Unlocked: ${fresh.map((u) => u.name).join(', ')}!`);
    writeSave(this.backend, this.save);
    if (over.board && this.host.leaderboard) {
      this.boardLoad = 'loading';
      this.boardPost = { state: 'idle' };
      this.refreshBoard();
    }
    this.dispatch({ type: 'raceFinished', seriesHasNext: over.seriesHasNext, podium: !!over.podium?.length });
  }

  // ---------------------------------------------------------------- leaderboard
  private refreshBoard(): void {
    const o = this.lastOver, lb = this.host.leaderboard;
    if (!o?.board || !lb) return;
    // a read that failed shows Loading again while it retries
    if (this.boardLoad === 'offline') { this.boardLoad = 'loading'; this.paintBoard(); }
    void lb.fetchBoard(o.results.trackId, o.board.mode, o.board.dailySeed).then((rows) => {
      if (this.lastOver !== o) return; // a newer race finished meanwhile
      this.boardLoad = rows ?? 'offline';
      this.paintBoard();
    });
  }

  private paintBoard(): void {
    const o = this.lastOver;
    if (!o?.board || this.app.screen !== 'results' || this.app.overlays.length) return;
    const vm = boardModel(o.board.mode, o.trackName, o.board.dailySeed, this.boardLoad, this.boardPost, o.board.mode === 'daily' ? nextDailyAt() : '');
    this.views.results.updateBoard(vm);
    // Try again sits between the name box and the buttons while the board cannot be read
    this.models.set('results', this.resultsGrid());
    if (this.focusBy.get('results') === 'retry') this.setFocus(vm.retry ? 'retry' : 'post', false); // the button was drawn again
    // the rows arriving push the name box down: keep whatever has the focus in sight
    const id = this.focusBy.get(this.app.screen);
    if (id) this.views.results.buttons.get(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /** Post the finished run under the name in the box. The server replays it before saving. */
  private async postRun(): Promise<void> {
    const o = this.lastOver, lb = this.host.leaderboard;
    // posting works whatever the board read did: a failed read is often a blip, and the post fails soft on its own
    if (!o?.board || !lb || this.boardPost.state === 'posting' || this.boardPost.state === 'posted') return;
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
    } else {
      this.boardPost = { state: 'failed', error: r.error };
      if (this.boardLoad === 'offline') this.refreshBoard(); // the network may be back for the times too
    }
    this.paintBoard();
    // posted: the focus moves on to the main button (Retry, Race again), so the next press is one more go; a
    // press as it moves is the post's own second press, held back like a double press on a new screen
    const at = this.focusBy.get('results');
    if (r.ok && this.app.screen === 'results' && !this.app.overlays.length && (at === 'post' || at === 'name')) {
      const main = this.end.rows[0]?.[0]?.id;
      if (main) { this.setFocus(main); this.enteredAt = this.clock(); }
    }
  }

  // ---------------------------------------------------------------- race
  /** Once per sim tick with that tick's events. */
  feed(race: readonly RaceEvent[], items: readonly ItemEvent[], playerId: string): void {
    feedHud(this.hudMem, race, items, playerId, performance.now() / 1000);
    if (this.statsOff) return;
    // the save's counters (design §10): the player's own Ultra Turbos and item hits, until the line
    for (const e of race) {
      if (e.type === 'kart' && e.racerId === playerId && e.event.type === 'driftEnd' && e.event.tier >= 3) this.save.stats.ultraTurbos++;
      else if (e.type === 'finish' && e.racerId === playerId) this.statsOff = true;
    }
    for (const e of items) if (e.type === 'hit' && e.byRacerId === playerId && e.racerId !== playerId) this.save.stats.itemsHit++;
  }

  private showToast(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove('on'), 5000);
  }

  /** The player's finish celebration (main.ts, game/celebrate.ts): the race HUD steps aside for it (podium.css): the banner up and small, the item slots, map, assist badge and hints away. */
  celebrate(on: boolean): void { this.views.hud.root.classList.toggle('celebrate', on); }

  /** Once per rendered frame while racing (paused or not). */
  race(f: RaceFrame, nowMs: number): void {
    if (this.app.screen !== 'racing') return;
    this.playerDone = f.player.finishTick !== undefined;
    // a Time Trial's finish shows the medal its time won, and each lap line how the run stands against the best
    // (the save changes only with the results, after the finish: this race's lines are always against the best it raced)
    const tt = f.state.mode === 'timeTrial';
    const medals = tt ? this.host.medalTimes.get(f.state.trackId) : undefined;
    const best = tt ? this.save.timeTrial[f.state.trackId]?.splitsMs : undefined;
    const vm = hudModel(f.state, f.player, f.shownRank, f.coinCap, this.hudMem, nowMs / 1000, f.itemDefs, nowMs, f.trailing, medals, best, f.assist);
    this.views.hud.render(vm);
    minimapDots(f.state.karts, f.map, accentOf, this.dots);
    this.views.hud.minimap.render(f.map, this.dots, nowMs);
  }

  /**
   * The course intro's title card (game/intro.ts flies the camera meanwhile): a race's card goes up on
   * ink ('hold', while its shaders compile); null takes it down and brings the race HUD back.
   */
  introCard(vm: IntroCardVM | null): void {
    if (vm) this.introView.show(vm); else this.introView.set('off');
    this.views.hud.root.classList.toggle('intro-on', vm !== null);
  }

  /** The flight has started (the ink lifts: 'show') or the card is on its way out ('out'). */
  introPhase(p: 'show' | 'out'): void {
    if (this.introView.phase !== 'off') this.introView.set(p);
  }

  /** A course intro's card is up: any key, pad button or tap skips on to the countdown. */
  get introOn(): boolean { return this.introView.phase !== 'off'; }

  /** Polls the gamepad. Call every frame. */
  poll(nowMs: number): void {
    const pad = globalThis.navigator?.getGamepads?.().find((p) => p && p.connected);
    if (!pad) return;
    const buttons = pad.buttons.map((b) => b.pressed);
    const was = this.padWas;
    this.padWas = buttons.slice();
    const start = buttons[9] ?? false;
    const stickOut = navFromPad(NO_BUTTONS, pad.axes) !== null;
    if (stickOut || buttons.some(Boolean)) this.usedInput('pad');
    // a press while the screen changes is dropped, not kept for later (UI.wipeMs)
    const wiping = this.inWipe();
    if (this.app.screen === 'racing' && !this.app.overlays.length) {
      if (start && !this.padStartWas && !wiping) this.dispatch({ type: 'pause' });
      this.padStartWas = start;
      // the course intro: any button pressed afresh skips it (Start pauses, as in the race; the A that
      // started the race is still down, so it is no fresh press, nor is anything on a pad's first poll)
      if (this.introOn && !wiping && was.length && buttons.some((b, i) => b && i !== 9 && !was[i])) this.host.skipIntro?.();
      // over the line, a fresh A goes straight to the results (A held for a drift across it does not)
      const a = buttons[0] ?? false;
      if (a && !this.padAWas && this.playerDone && !wiping) this.host.skipToResults?.();
      this.padAWas = a;
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
    this.padAWas = true; // back in a race, A counts only once let go
    for (let i = 0; i < buttons.length; i++) {
      if (!buttons[i]) this.padSpent[i] = false;
      else if (this.padSpent[i]) buttons[i] = false;
    }
    if (!stickOut) this.padStickSpent = false;
    const a = repeat(this.padRepeat, navFromPad(buttons, this.padStickSpent ? NO_AXES : pad.axes), nowMs);
    if (!a || wiping) return;
    // A pressed twice: the second press would pick the new screen's first entry unseen, as a key or a click would
    if (a === 'confirm' && this.clock() - this.enteredAt < UI.screenGuardMs) return;
    this.nav(a);
  }

  // ---------------------------------------------------------------- input
  /** The prompts (menu hints, Press Enter, the race's controls strip) name the keys or a gamepad's
   *  buttons, whichever was pressed last (`data-input` on the page; the stylesheet shows one set). */
  private usedInput(kind: 'keys' | 'pad'): void {
    if (document.documentElement.dataset.input !== kind) document.documentElement.dataset.input = kind;
  }

  private key(e: KeyboardEvent): void {
    this.usedInput('keys');
    const racing = this.app.screen === 'racing' && !this.app.overlays.length;
    const code = e.code || e.key;
    if (racing) this.keySpent.add(code);
    else if (this.keySpent.has(code)) {
      // a key held from the race (gas over the line, the Escape that paused): its auto-repeats never
      // type into the name box or move the focus on the dialog that opened; a new press counts
      if (e.repeat) { e.preventDefault(); return; }
      this.keySpent.delete(code);
    }
    // F: fullscreen on any screen, asked from this press (the browser wants the gesture); not while typing a
    // name, and never a skip of the course intro
    if (isFullscreenKey(e) && !e.repeat && (e.target as HTMLElement | null)?.tagName !== 'INPUT') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }
    // a key while the screen changes is dropped, not kept for later (UI.wipeMs); letters still type in the name box
    if (this.inWipe(e)) {
      if (racing ? isRaceKey(e.code) || isPauseKey(e.code, e.key) : navFromKey(e.code, e.key)) e.preventDefault();
      return;
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
      // the course intro: any other key pressed afresh skips it (the Enter that started the race only repeats)
      else if (this.introOn && !e.repeat && !NOT_A_PRESS.has(e.key)) { if (isRaceKey(e.code)) e.preventDefault(); this.host.skipIntro?.(); }
      // over the line, Enter goes straight to the results (Space, the drift key, does not)
      else if (this.playerDone && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter' || (!e.code && e.key === 'Enter'))) { e.preventDefault(); this.host.skipToResults?.(); }
      // the driving keys are the game's while racing: the browser does not scroll on Space or bookmark on Ctrl+D
      else if (isRaceKey(e.code)) e.preventDefault();
      return;
    }
    if (!a) return;
    e.preventDefault();
    if (a === 'confirm' && this.tooSoon(e)) return; // the second press of a double press that opened this screen
    this.nav(a);
  }

  /** A confirm from a real key or click this soon after the screen or dialog on top opened is the second
   *  half of a double press: it picked the new screen's first entry unseen (Enter twice on the title chose
   *  Quick Race). Script-made events (the tests) are not held. */
  private tooSoon(e: Event): boolean { return this.trusted(e) && this.clock() - this.enteredAt < UI.screenGuardMs; }
  /** A screen change is under way: a real key, click or tap now is dropped, and so is a pad press (always the player's). */
  private inWipe(e?: Event): boolean { return this.wipe !== null && this.clock() < this.wipe.until && (!e || this.trusted(e)); }
  /** A screen change is under way (UI.wipeMs): input waits it out. */
  get changingScreen(): boolean { return this.inWipe(); }
  /** whether an input event came from the player, not a script; tests replace it */
  trusted: (e: Event) => boolean = (e) => e.isTrusted;

  /** Every pointer move on the page (over the race too, so a move in place is known as one wherever it lands). */
  private hover(e: PointerEvent): void {
    const moved = e.clientX !== this.pointerAt.x || e.clientY !== this.pointerAt.y;
    this.pointerAt.x = e.clientX;
    this.pointerAt.y = e.clientY;
    if (moved) this.pointer(e, false);
  }

  private pointer(e: Event, click: boolean): void {
    if (this.inWipe(e)) return; // the screen is changing under the pointer
    const b = (e.target as HTMLElement | null)?.closest?.('[data-id]') as HTMLElement | null;
    if (!b || !this.active || !this.active.view.root.contains(b)) return;
    const id = b.dataset.id as string;
    if (b.getAttribute('aria-disabled') === 'true') return;
    if (!click && this.focusBy.get(this.active.key) !== id) this.host.uiSound?.('move');
    this.setFocus(id, false, !click); // under the pointer it is already in sight
    if (!click || id === 'name') return; // a click in the name box is for typing
    if (this.tooSoon(e)) return; // the second click of a double click that opened this screen
    // a settings row's ◀ or ▶ steps that way, like left and right on the keys
    const dir = (e.target as HTMLElement).closest?.('[data-dir]')?.getAttribute('data-dir');
    if (dir && this.active.key === 'settings' && id !== 'done') {
      this.host.uiSound?.('move');
      this.changeSetting(id as SettingId, dir === '-1' ? -1 : 1);
      return;
    }
    if (this.active.key === 'rosterSelect' && (id === 'paint' || id === 'body')) {
      // a swatch picks itself (a locked one does nothing); an arrow steps that way
      const opt = (e.target as HTMLElement).closest?.('[data-opt]')?.getAttribute('data-opt');
      if (opt) {
        this.host.uiSound?.('move');
        this.save.settings = setChoice(this.save, this.dressing || this.app.racerId, id, opt);
        writeSave(this.backend, this.save);
        this.redrawGarage();
        return;
      }
      if (dir) {
        this.host.uiSound?.('move');
        this.changeLook(id, dir === '-1' ? -1 : 1);
        return;
      }
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
    // the garage's Paint and Body step left and right, like a setting
    if (key === 'rosterSelect' && (cur === 'paint' || cur === 'body') && (a === 'left' || a === 'right')) {
      this.host.uiSound?.('move');
      this.changeLook(cur, a === 'left' ? -1 : 1);
      return;
    }
    // the rows under the racer cards (Paint, Body, the class) are the racer on show's: down from any card
    // goes straight to them and up comes back to that card, so no other card is passed (and put on
    // show) on the way; left and right run through the eight cards (screens/menus.ts rosterMove)
    if (key === 'rosterSelect' && model && cur) {
      const jump = rosterMove(model, cur, a, this.dressing || this.app.racerId);
      if (jump) { if (jump !== cur) { this.host.uiSound?.('move'); this.setFocus(jump); } return; }
    }
    // down from the leaderboard's name box or Post: the main button (Retry, Race again), wherever it sits
    if (key === 'results' && model && cur) {
      const main = boardDown(model, cur, a, this.end.rows[0]?.[0]?.id);
      if (main) { this.host.uiSound?.('move'); this.setFocus(main); return; }
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
    if (s.screen === 'results' || s.screen === 'gpTable' || s.screen === 'knockoutCut' || s.screen === 'podium') return; // results need a confirm
    if (topOverlay(s) === 'pause') { this.dispatch({ type: 'resume' }); return; }
    this.dispatch({ type: 'back' });
  }

  private confirm(id: string): void {
    const s = this.app;
    const top = topOverlay(s);
    const btn = this.active?.view.buttons.get(id);
    if (btn?.getAttribute('aria-disabled') === 'true') return;
    const endScreen = s.screen === 'results' || s.screen === 'gpTable' || s.screen === 'knockoutCut' || s.screen === 'podium';
    if (endScreen && !top && this.clock() < this.endGuardUntil) return;
    if (top === 'settings') {
      if (id === 'done') this.dispatch({ type: 'back' }); else this.changeSetting(id as SettingId, 1);
      return;
    }
    if (top === 'credits' || top === 'howTo' || top === 'unlocks') { this.dispatch({ type: 'back' }); return; }
    if (top === 'pause') {
      const map: Record<string, AppAction> = { resume: { type: 'resume' }, restart: { type: 'restart' }, howTo: { type: 'openHowTo' }, settings: { type: 'openSettings' }, credits: { type: 'openCredits' }, quit: { type: 'quit' } };
      if (map[id]) this.dispatch(map[id]);
      return;
    }
    // the menus' own Back button (a tap or a click): the way Escape goes
    if (id === 'back') { this.back(); return; }
    switch (s.screen) {
      case 'title':
        this.dispatch(id === 'settings' ? { type: 'openSettings' } : id === 'credits' ? { type: 'openCredits' } : id === 'howTo' ? { type: 'openHowTo' } : id === 'unlocks' ? { type: 'openUnlocks' } : { type: 'start' });
        break;
      case 'modeSelect': this.dispatch({ type: 'pickMode', mode: id as RaceMode }); break;
      case 'rosterSelect': {
        const cc = SPEED_CLASSES.find((c) => `cc${c.cc}` === id);
        if (cc) { this.dispatch({ type: 'setSpeedClass', speedClass: cc.cc }); this.show(true); }
        else if (id === 'mirror') { this.dispatch({ type: 'toggleMirror' }); this.show(true); }
        else if (id === 'paint' || id === 'body') this.changeLook(id, 1);
        else this.dispatch({ type: 'pickRacer', racerId: id });
        break;
      }
      case 'cupSelect': this.dispatch({ type: 'pickCup', cupId: id }); break;
      case 'trackSelect': this.dispatch({ type: 'pickTrack', trackId: id }); break;
      case 'results': case 'gpTable': case 'knockoutCut': case 'podium': {
        if (id === 'post') { void this.postRun(); break; }
        if (id === 'retry') { this.refreshBoard(); break; }
        // a pad's A in the name box moves on to Post (Enter typed inside the box posts)
        if (id === 'name') { this.setFocus('post'); break; }
        // one more go (screens/results.ts endMenu): the reducer refuses each where it does not fit
        const track = id === 'next' ? nextTrack(s.trackId, this.host.builtTracks) : undefined;
        const go: AppAction = id === 'again' ? { type: 'raceAgain' } : track ? { type: 'nextTrack', trackId: track }
          : id === 'track' ? { type: 'changeTrack' } : id === 'racer' ? { type: 'changeRacer' } : { type: 'continue' };
        this.dispatch(go);
        break;
      }
      default: break;
    }
  }

  /** Put a racer on show: the hero turntable turns them and the garage dresses them. */
  private dress(id: string): void {
    this.dressing = id;
    this.redrawGarage();
  }

  /** Step the dressed racer's paint or body, save it, and draw the garage again (the cards stay put). */
  private changeLook(id: ChoiceId, dir: -1 | 1): void {
    const racerId = this.dressing || this.app.racerId;
    this.save.settings = stepChoice(this.save, racerId, id, dir);
    writeSave(this.backend, this.save);
    this.redrawGarage();
  }

  /** The garage for the racer being dressed, drawn again; its row in the focus grid follows its choices. */
  private redrawGarage(): void {
    if (this.active?.key !== 'rosterSelect') return;
    const s = this.app;
    const vm = rosterMenu(s.speedClass, s.mode, this.rosterExtras(), this.short?.matches ?? false);
    if (!vm.garage) return;
    this.views.roster.renderGarage(vm.garage);
    this.views.roster.markDressed(vm.garage.racerId);
    this.models.set('rosterSelect', vm.focus);
    // the focused Paint or Body button was drawn again: focus the new one (or its neighbour, if it went)
    const cur = this.focusBy.get('rosterSelect');
    if ((cur === 'paint' || cur === 'body') && vm.garage.choices.length) this.setFocus(vm.focus.rows.flat().includes(cur) ? cur : vm.garage.choices[0].id, false);
  }

  private rosterExtras() {
    const s = this.app;
    return { garage: garageModel(this.save, this.dressing || s.racerId), mirror: mirrorAllowed(this.save, s.mode) ? s.mirrored : undefined };
  }

  /** The racer screen's turntable: the canvas to draw the dressed kart in, turning, and who and how; null when there is none. */
  turntable(): { canvas: HTMLCanvasElement; racerId: string; look: KartLookIds } | null {
    const canvas = this.views.roster.turntable;
    if (this.active?.key !== 'rosterSelect' || !canvas?.isConnected) return null;
    const racerId = this.dressing || this.app.racerId;
    return { canvas, racerId, look: lookFor(this.save, racerId) };
  }

  /** Every unlock at once (the dev console's kart.unlockAll(), for trying the rewards). Saved; the screen on top is drawn again. */
  grantAllUnlocks(): void {
    grantAll(this.save);
    writeSave(this.backend, this.save);
    this.show(true);
  }

  private changeSetting(id: SettingId, dir: -1 | 1): void {
    // Fullscreen is the browser's (never saved): asked for from this press; the row follows fullscreenchange
    if (id === 'fullscreen') { toggleFullscreen(); this.show(true); return; }
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
  /** `reveal`: scroll it into sight inside its panel (a long results board, Settings on a phone); `hover`: the
   *  pointer moved onto it (a racer card goes on show only once the pointer rests there, UI.hoverDressMs) */
  private setFocus(id: string, reveal = true, hover = false): void {
    if (!this.active) return;
    const { key, view } = this.active;
    const prevId = this.focusBy.get(key);
    if (prevId && prevId !== id) {
      const pb = view.buttons.get(prevId);
      if (pb) { pb.classList.remove('focused'); pb.tabIndex = -1; } // one Tab stop per screen
    }
    this.focusBy.set(key, id);
    view.focused?.(id); // Settings' help line says what the focused row does
    // a racer card focused: the garage dresses that racer now; one the pointer is only passing over on its
    // way down to Paint or Body does not (it would swap the rows under the pointer)
    clearTimeout(this.dressTimer);
    if (key === 'rosterSelect' && id !== this.dressing && CAST_IDS.has(id)) {
      if (hover) this.dressTimer = setTimeout(() => { if (this.active?.key === 'rosterSelect' && this.focusBy.get(key) === id) this.dress(id); }, UI.hoverDressMs);
      else this.dress(id);
    }
    const b = view.buttons.get(id);
    if (b) {
      b.classList.add('focused');
      b.tabIndex = 0;
      if (document.activeElement !== b) b.focus({ preventScroll: true });
      if (reveal) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }

  /** Which view is on top, rendered fresh when it changes (or when `force`). `dir`: -1 when going back (the transition's way). */
  private show(force = false, dir: 1 | -1 = 1): void {
    const s = this.app;
    const v = this.views;
    const top = topOverlay(s);
    const base: Record<string, ScreenView> = {
      boot: v.boot, title: v.title, modeSelect: v.modes, rosterSelect: v.roster, cupSelect: v.cups, trackSelect: v.tracks,
      racing: v.hud, results: v.results, gpTable: v.results, knockoutCut: v.results, podium: v.podium,
    };
    const baseView = base[s.screen];
    const overlayView = top === 'pause' ? v.pause : top === 'settings' ? v.settings : top === 'credits' ? v.credits : top === 'howTo' ? v.howTo : top === 'unlocks' ? v.unlocks : null;
    const key = top ?? s.screen;
    const view = overlayView ?? baseView;
    const entering = this.active?.key !== key;
    const wasOn = entering ? Object.values(v).filter((x) => x.root.classList.contains('on')) : [];
    for (const x of Object.values(v)) x.root.classList.toggle('on', x === baseView || x === overlayView);
    // a dialog on top makes everything under it unreachable, by Tab and by pointer
    for (const x of Object.values(v)) x.root.inert = overlayView !== null && x !== overlayView;
    if (!force && !entering) return;
    const from = this.active;
    if (entering) this.enteredAt = this.clock();
    this.active = { key, view };
    if (entering && (key === 'results' || key === 'gpTable' || key === 'knockoutCut' || key === 'podium')) this.endGuardUntil = this.clock() + UI.endScreenGuardMs;
    // (before the new screen is drawn: a view drawn again as the next screen leaves its old face as a ghost)
    if (entering) this.beginWipe(from, view, wasOn, dir);
    this.renderScreen(key, entering);
    const model = this.models.get(key);
    if (!model) return;
    const remembered = this.focusBy.get(key);
    const ok = remembered && model.rows.flat().includes(remembered) && !model.disabled?.includes(remembered);
    // the saved racer, when it is still a card (a stale id falls back to the first card)
    const racer = entering && key === 'rosterSelect' && model.rows.flat().includes(s.racerId) ? s.racerId : undefined;
    const id = ok ? remembered : racer ?? firstFocus(model);
    // How to Play and Credits open at the top: their one button, Back, is at the end
    if (id) this.setFocus(id, key !== 'howTo' && key !== 'credits' && key !== 'unlocks');
  }

  /**
   * A screen change's transition (ui.css "screen transitions"): every view that was on show and is not now
   * stays on show while it leaves (`x-out`), the view coming slides in (`x-in`), and a view drawn again as
   * the next screen (results → standings → the cut) leaves its old face behind as a ghost that leaves the
   * same way. `dir` -1 goes back. None from the loading screen, and none with reduced motion: a plain cut.
   * The results over the race wait for FINISH! and its lines to leave first (UI.finishLagMs), so no frame
   * shows both at full strength.
   * Transforms and opacity only (the race or attract camera behind never waits); input waits it out (inWipe).
   */
  private beginWipe(from: { key: string; view: ScreenView } | null, to: ScreenView, wasOn: readonly ScreenView[], dir: 1 | -1): void {
    this.endWipe();
    this.arriveLag = 0;
    if (!from || from.key === 'boot' || this.reducedMotion) return;
    if (from.key === 'racing' && to === this.views.results) this.arriveLag = UI.finishLagMs;
    const way = dir < 0 ? 'back' : 'fwd';
    const els: HTMLElement[] = [];
    for (const v of wasOn) if (!v.root.classList.contains('on')) els.push(v.root);
    let ghost: HTMLElement | null = null;
    if (from.view === to) {
      // a copy of the old face (the view keeps its own until it is drawn again)
      ghost = to.root.cloneNode(true) as HTMLElement;
      ghost.classList.remove('on');
      ghost.classList.add('x-ghost');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.inert = true;
      to.root.after(ghost);
      // a copy starts unscrolled: it leaves as it was
      const was = to.root.querySelectorAll<HTMLElement>('.stage, .scroll'), copy = ghost.querySelectorAll<HTMLElement>('.stage, .scroll');
      was.forEach((e, i) => { if (copy[i]) copy[i].scrollTop = e.scrollTop; });
      els.push(ghost);
    }
    for (const el of els) { el.classList.add('x-out'); el.dataset.x = way; }
    // a view already on show (the screen under a dialog that closes) does not come in again
    if (ghost || !wasOn.includes(to)) { to.root.classList.add('x-in'); to.root.dataset.x = way; els.push(to.root); }
    if (!els.length) return;
    const ms = UI.wipeMs + this.arriveLag;
    this.wipe = { els, ghost, until: this.clock() + ms, timer: setTimeout(() => this.endWipe(), ms + 40) };
  }

  /** The transition is over (or another begins): every view as it stands, the ghost gone. */
  private endWipe(): void {
    const w = this.wipe;
    if (!w) return;
    this.wipe = null;
    clearTimeout(w.timer);
    for (const el of w.els) { el.classList.remove('x-out', 'x-in'); delete el.dataset.x; }
    w.ghost?.remove();
  }

  /** `entering`: false when the screen on top is drawn again (a setting changed) */
  private renderScreen(key: string, entering: boolean): void {
    const s = this.app, v = this.views, built = this.host.builtTracks;
    const short = this.short?.matches ?? false;
    switch (key) {
      case 'title': { const vm = titleMenu(short); v.title.render(vm); this.models.set(key, vm.focus); break; }
      case 'modeSelect': {
        const vm = modeMenu(this.host.availableModes);
        // our own icons (icons.ts); the Daily's calendar is on the Daily's own day (UTC, as its track and board)
        const today = dailySeed();
        v.modes.render(vm, Object.fromEntries(vm.entries.map((e) => [e.id, modeSvg(e.id, today)])));
        this.models.set(key, vm.focus);
        break;
      }
      case 'rosterSelect': {
        if (entering) this.dressing = s.racerId;
        // a phone on its side sets the eight cards in one row, and so does the grid
        const vm = rosterMenu(s.speedClass, s.mode, this.rosterExtras(), short);
        v.roster.render(vm);
        v.roster.markDressed(this.dressing);
        this.models.set(key, vm.focus);
        break;
      }
      case 'cupSelect': {
        const vm = cupMenu(s.mode === 'knockout' ? 'knockout' : 'grandPrix', built, this.save, s.speedClass);
        v.cups.render(vm);
        this.models.set(key, vm.focus);
        break;
      }
      case 'trackSelect': { const vm = trackMenu(s.mode ?? 'quick', built, this.save, this.host.medalTimes); v.tracks.render(vm); this.models.set(key, vm.focus); break; }
      case 'pause': { const vm = pauseMenu(short, this.canRestart); v.pause.render(vm); this.models.set(key, vm.focus); break; }
      case 'settings': { const vm = settingsMenu(this.save.settings, fullscreenState()); v.settings.render(vm.rows, !entering); this.models.set(key, vm.focus); break; }
      case 'credits': { v.credits.render(parseCredits(this.host.creditsMarkdown)); this.models.set(key, { rows: [['back']] }); break; }
      case 'unlocks': { v.unlocks.render(unlockRows(this.save)); this.models.set(key, { rows: [['back']] }); break; }
      case 'howTo': { v.howTo.render(ITEM_DEFINITIONS, this.save.settings.autoAccelerate); this.models.set(key, { rows: [['back']] }); break; }
      case 'results': case 'gpTable': case 'knockoutCut': this.renderEnd(key, entering); break;
      case 'podium': {
        // the ceremony's overlay (the host draws the podium itself): the headline, the places, Continue
        const o = this.lastOver;
        if (o?.podium) this.views.podium.render(podiumModel(o.podium, o.playerId, { gp: o.gp?.after, ko: o.ko?.after }));
        this.models.set(key, { rows: [['continue']] });
        break;
      }
      default: break;
    }
  }

  /** The screen height crossed the short-screen line (a window resized): the title and pause grids follow the buttons. */
  private setGrids(): void {
    const short = this.short?.matches ?? false;
    if (this.models.has('title')) this.models.set('title', titleMenu(short).focus);
    if (this.models.has('pause')) this.models.set('pause', pauseMenu(short, this.canRestart).focus);
    if (this.models.has('rosterSelect')) this.models.set('rosterSelect', rosterMenu(this.app.speedClass, this.app.mode, this.rosterExtras(), short).focus);
    // the end buttons: one row in a short window, row by row elsewhere
    for (const k of ['results', 'gpTable', 'knockoutCut'] as const) if (this.models.has(k) && this.app.screen === k) this.models.set(k, this.resultsGrid());
  }

  /** A Grand Prix or Knockout race cannot be run again from the pause (it farmed stars and wins; Mario Kart hides it too) */
  private get canRestart(): boolean { return this.app.mode !== 'grandPrix' && this.app.mode !== 'knockout'; }

  /** A tap or click anywhere once the player has finished goes straight to the results (not the pause button). */
  private tapInRace(e: PointerEvent): void {
    if (this.app.screen !== 'racing' || this.app.overlays.length) return;
    if (this.inWipe(e)) return; // the menu still leaving: a double tap on the track must not skip the intro unseen
    if (this.introOn) { this.host.skipIntro?.(); return; } // a tap skips the course intro
    if (!this.playerDone) return;
    if ((e.target as HTMLElement | null)?.closest?.('[data-pause]')) return;
    this.host.skipToResults?.();
  }

  /** `entering`: the screen is coming in (not drawn again): the results wait for the race's FINISH! to leave, the standings play out */
  private renderEnd(key: 'results' | 'gpTable' | 'knockoutCut', entering = true): void {
    const o = this.lastOver;
    if (!o) return;
    const s = this.app;
    const lag = entering ? this.arriveLag : 0;
    // the buttons: a one-off race is one more go away (the next track named on its button), a series goes on
    const next = s.mode === 'quick' ? trackCard(nextTrack(s.trackId, this.host.builtTracks) ?? '')?.name : '';
    const end = endMenu(key, s.mode, s, next);
    this.end = end;
    const nextLabel = end.rows[0][0].label;
    if (key === 'results') {
      // a Time Trial: the medal its time won, the ladder of medal times, and the run against the best it raced
      const vm = resultsModel(o.results, o.playerId, o.trackName, UI.staggerResultsMs, o.medalTimesMs, this.ttBefore);
      if (this.ttNote) vm.headline = this.ttNote;
      const withBoard = !!o.board && !!this.host.leaderboard;
      // a first-timer gets a friendly name to post under (a pad has no keys to type one), selected so typing replaces it
      const known = !!this.save.playerName && this.save.playerName !== 'Player';
      const name = known ? this.save.playerName : o.playerId ? `${nameOf(o.playerId)} ${this.nameNumber}`.slice(0, 16) : '';
      this.views.results.renderResults(vm, end, withBoard ? { name, suggested: !known } : undefined, lag);
      if (withBoard) {
        this.models.set(key, this.resultsGrid());
        // a run worth posting (a Time Trial's new best, a Daily) starts on the board, as it can be posted only now:
        // a known name on Post, a first-timer in the name box (Retry is one press down, and the focus moves on to it
        // once the run is posted); a Time Trial run slower than the best starts on Retry, one press from one more go
        this.focusBy.set(key, this.ttSlower ? end.rows[0][0].id : known ? 'post' : 'name');
        this.paintBoard();
        return;
      }
      // no board: the main button (Next track, Retry, Race again) has the focus
      this.focusBy.set(key, end.rows[0][0].id);
    }
    // the standings play out (the old order, the count, the flips); reduced motion shows how they end
    else if (key === 'gpTable' && o.gp) this.views.results.renderGp(gpModel(o.gp.before, o.gp.after, o.playerId), nextLabel, entering && !this.reducedMotion);
    else if (key === 'knockoutCut' && o.ko) this.views.results.renderCut(knockoutCutModel(o.results, o.ko.after, o.playerId), nextLabel);
    // the player's own row in sight (a phone on its side, the player low in the standings)
    this.views.results.revealPlayer();
    this.models.set(key, this.resultsGrid());
  }

  /**
   * An end screen's focus grid as its controls sit: the leaderboard's name box and Post (and Try again while the
   * board cannot be read) over the buttons, which are one row in a short window (a laptop, a phone on its side:
   * UI.endOneLineQuery) and row by row elsewhere, as the stylesheet sets them.
   */
  private resultsGrid(): FocusModel {
    const o = this.lastOver;
    const board = this.app.screen === 'results' && !!o?.board && !!this.host.leaderboard;
    const buttons = endFocus(this.end, this.oneLine?.matches ?? false);
    return { rows: board ? [['name', 'post'], ...(this.boardLoad === 'offline' ? [['retry']] : []), ...buttons] : buttons };
  }
}
