// GameAudio: the one object the game talks to. Owns the bus, the song, the engines and the SFX.
import type { RevView } from '../kart-controller/rev.ts';
import type { InputState, KartState } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { Barker, BARK_DUCK, type TakeCount } from './barks.ts';
import { AudioBus, type Volumes } from './bus.ts';
import { AUDIO } from './constants.ts';
import { direct, hornFor, resetDirector, type Listener } from './director.ts';
import { boostRev, classVoice, engineDrive, engineHz, engineRpm, limiterFlutter, offroadAmount, racerPitch, sparkLayer, wheelSound } from './engine.ts';
import { IntroCue, introPlan, introSources } from './introCue.ts';
import { playNote } from './music/instruments.ts';
import { SONGS } from './music/patterns.ts';
import { Sequencer, type Scheduled } from './music/sequencer.ts';
import { ambienceId, LoopEngine, mixLevel, playSample, SampleBank, SONG_AHEAD_TIER, SONG_NOW_TIER, SongPlayer, STING_SECONDS, themeForTrack, type Sample, type Voice } from './samples.ts';
import { ENGINE_POP, noiseBuffer, PATCHES, patchSeconds, playPatch } from './sfx.ts';
import type { BarkCue, Cue, MusicCue, SfxId, SongId } from './types.ts';
import { mergeCues, rouletteGap, Voices } from './voices.ts';

interface EngineVoice {
  o1: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode; gain: GainNode; scrub: GainNode; rumble: GainNode | null; pan: StereoPannerNode | null;
  /** every source it runs and every node that reaches the bus, to stop and unplug it */
  srcs: AudioScheduledSourceNode[]; outs: AudioNode[];
}

/** Musical and menu cues play at their written pitch: no random jitter (a detuned fanfare sounds wrong). */
export const STEADY: ReadonlySet<SfxId> = new Set<SfxId>([
  'count', 'go', 'lap', 'finalLap', 'finish', 'finishLow', 'itemReady', 'uiMove', 'uiConfirm', 'uiBack',
  'gainPlace', 'losePlace', 'shift', 'koOut', 'koSafe',
]);
/** Big sounds the music dips under for a moment (bus.musicDuck), when they play loud. */
export const DUCKERS: ReadonlySet<SfxId> = new Set<SfxId>(['airHorn', 'strike', 'krakenSlam', 'stomp', 'roar', 'go', 'shift', 'slam']);
/** Stings that play whatever else is ringing (they still count toward their own voice cap). */
const PRIORITY: ReadonlySet<SfxId> = new Set<SfxId>(['count', 'go', 'lap', 'finalLap', 'finish', 'finishLow', 'shift', 'koOut', 'koSafe', 'wrongWay']);

const SOUND_AS: Readonly<Partial<Record<string, SfxId>>> = Object.freeze({ hit: 'bump', wall: 'bump', uiMove: 'rouletteTick', uiConfirm: 'rouletteTick' });

export class GameAudio {
  readonly bus: AudioBus;
  /** the recorded sounds and songs; whatever is missing plays on the synth */
  readonly bank: SampleBank;
  private seq: Sequencer | null = null;
  private songId: SongId | null = null;
  private wantSong: SongId | null = null;
  /** the recorded song asked for, the one playing, and whether it waits for the go */
  private wantKey: string | null = null;
  private songKey: string | null = null;
  private awaitGo = false;
  /**
   * A recording due within AUDIO.songWait of its start, waited for with no synth stand-in: the song, its start
   * (`after`, as play() takes it) and when the synth stands in after all if the recording has still not started
   */
  private waiting: { key: string; song: SongId | null; after: number; giveUp: number } | null = null;
  private song: SongPlayer | null = null;
  private loopPlayer: LoopEngine | null = null;
  private readonly loopAi: LoopEngine[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly booked: Scheduled[] = [];
  private readonly cues: Cue[] = [];
  private readonly music: MusicCue[] = [];
  private player: EngineVoice | null = null;
  private ai: EngineVoice[] = [];
  private jitter = 0x9e3779b9;
  private lastHorn = false;
  private watching = false;
  /** context time the finish sting ends: the results song waits for it */
  private stingEnds = 0;
  /** the synth off-road rumble, when the engines are recorded but the rumble loop is not */
  private rumble: GainNode | null = null;
  /** the sounds still ringing: a cap per sound and in all */
  private readonly voices = new Voices();
  /** the roulette's last tick, cut when the next one starts so ticks never pile up */
  private tickVoice: Voice | null = null;
  /** who says what and when (barks.ts), and the line ringing now (one at a time) */
  private readonly barker = new Barker();
  private barkVoice: Voice | null = null;
  private readonly takes: TakeCount = (racerId, bark) => this.bank.voiceCount(racerId, bark);
  /** the course intro's music (introCue.ts), and a count that voids one still decoding when the intro ends first */
  private introCue: IntroCue | null = null;
  private introAsk = 0;

  constructor(bus = new AudioBus(), bank = new SampleBank()) {
    this.bus = bus;
    this.bank = bank;
    // the manifest is enough to ask for the recorded song (the synth plays it till the file is in)
    bank.onManifest = () => this.samplesReady();
    // the events a browser lets sound start from (its user activation: html.spec.whatwg.org "activation triggering input event")
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { passive: true });
    addEventListener('visibilitychange', () => this.bus.setHidden(document.hidden));
  }

  /**
   * A press, click or tap (the page's own listeners), or the start screen's press by a pad (ui-hud: Chrome counts a pad
   * button the page reads as the page's user activation, blink navigator_gamepad.cc): the one context is built and
   * resumed, and the song asked for starts. A browser that refuses (no gesture yet) leaves it for the next; a silent
   * bus (?mute) never builds one.
   */
  unlock(): void {
    if (this.bus.unlock()) { this.start(); return; }
    // resume() settles asynchronously: start the scheduler the moment the context runs,
    // so the very first gesture is enough (Safari and Chrome)
    const c = this.bus.ctx;
    if (c && !this.watching) {
      this.watching = true;
      c.addEventListener?.('statechange', () => { if (c.state === 'running') this.start(); });
    }
  }

  private start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.pump(), AUDIO.schedulerTickMs);
    void this.bank.load(this.bus.ctx!);
    // (the racers' voice lines were taken out on 30 Sept 2026: no voice.json to load; bank.loadVoices stays for new ones)
    if (!this.awaitGo && (this.wantSong || this.wantKey)) this.play(this.wantSong, this.wantKey);
  }

  /** The recordings' list arrived: ask for the recorded song if there is one (the synth plays on till it is decoded). */
  private samplesReady(): void {
    if (!this.bus.running || this.awaitGo || !this.wantKey || this.songKey === this.wantKey || !this.bank.hasSong(this.wantKey)) return;
    this.play(this.wantSong, this.wantKey);
  }

  setVolumes(v: Volumes): void { this.bus.setVolumes(v); }

  /** The pause menu opened or closed: the music drops back under it (the engines go quiet on their own). */
  pause(on: boolean): void { this.bus.setPaused(on); }

  /**
   * Switch songs: the recording `key` when there is one, else the synth `song`. Queued until the
   * context is unlocked. The results song waits for the finish sting's last chord. A recording still
   * coming down (the files take turns, performance/loadQueue.ts) has the synth play the song meanwhile,
   * unless it is due within AUDIO.songWait of its start (its file in hand, decoding: the title's after
   * the start screen's press): then nothing plays till it starts, as a synth flash and then the switch
   * sounds cheap (Adam, 28 Sept 2026). One waited for that stalls gets the synth after AUDIO.songGiveUp.
   */
  play(song: SongId | null, key: string | null = song): void {
    this.endIntro();
    this.wantSong = song;
    this.wantKey = key;
    this.awaitGo = false;
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    const after = song === 'results' ? this.stingEnds : 0;
    if (key && this.bank.hasSong(key)) {
      if (this.songKey !== key) this.startSong(ctx, key, after);
      if (this.bank.isReady(key)) { this.seq = null; this.songId = null; this.waiting = null; return; }
      // the synth already stands in (the recording's list came late): it plays on till the recording takes over
      if ((this.seq && this.songId === song) || this.waiting?.key === key) return;
      const at = Math.max(ctx.currentTime, after);
      if (ctx.currentTime + this.bank.readyIn(key) <= at + AUDIO.songWait) {
        this.seq = null;
        this.songId = null;
        this.waiting = { key, song, after, giveUp: at + AUDIO.songGiveUp };
      } else this.synth(ctx, song, after);
      return;
    }
    this.waiting = null;
    this.stopSong();
    this.synth(ctx, song, after);
  }

  /** The synth plays `song` (from context time `after`), unless it already is. */
  private synth(ctx: AudioContext, song: SongId | null, after: number): void {
    if (song === this.songId && this.seq) return;
    this.songId = song;
    this.seq = song ? new Sequencer(SONGS[song], Math.max(ctx.currentTime + 0.1, after)) : null;
  }

  /** Start the recording `key`, not before context time `after`; the synth stand-in, if any, stops as it starts. */
  private startSong(ctx: AudioContext, key: string, after = 0): void {
    this.songKey = key;
    this.song ??= new SongPlayer(ctx, this.bus.music!);
    this.song.stop(ctx.currentTime, 0.3);
    void this.bank.song(ctx, key).then((s) => {
      if (this.songKey !== key) return; // another song was asked for while this one decoded
      if (this.waiting?.key === key) this.waiting = null;
      if (s) { this.seq = null; this.songId = null; this.song!.start(s, Math.max(ctx.currentTime + 0.05, after)); return; }
      // it would not decode: the synth plays instead
      this.songKey = null;
      if (this.wantSong) this.synth(ctx, this.wantSong, after);
    });
  }

  /**
   * The player crossed the line: the race song fades out so the sting plays alone (the classic
   * finish), and nothing brings it back (a late decode, the recordings arriving). The results
   * song starts after the sting (`play`).
   */
  private finish(win: boolean): void {
    const t = this.bus.time;
    this.stingEnds = t + (win ? STING_SECONDS.finish : STING_SECONDS.finishLow);
    if (this.songKey) this.song?.stop(t, AUDIO.finishFade);
    this.songKey = null;
    this.seq = null;
    this.songId = null;
    this.wantSong = null;
    this.wantKey = null;
    this.awaitGo = false;
    this.waiting = null;
  }

  private stopSong(): void {
    if (this.songKey) this.song?.stop(this.bus.time);
    this.songKey = null;
    this.waiting = null;
  }

  /**
   * Race start: fresh director memory, from the player's grid rank and the race's winning line
   * (`finishLine`). Silent till the go, as Mario Kart World is (28 Sept 2026): the course intro's music
   * plays under the flight (`courseIntro`), the countdown has only its beeps, and the race song starts on
   * the go, the synth's too. The race song and the course's intro piece decode meanwhile.
   */
  newRace(song: SongId, trackId?: string, gridRank?: number, finishLine?: number, balloons = true): void {
    resetDirector(gridRank, finishLine, balloons);
    this.barker.reset(gridRank ?? null, finishLine ?? AUDIO.podium);
    this.endIntro();
    this.trackId = trackId ?? '';
    this.stingEnds = 0;
    this.songId = null;
    this.seq = null;
    this.stopSong();
    this.wantSong = song;
    this.wantKey = trackId ? themeForTrack(trackId) : song;
    this.awaitGo = true;
    const ctx = this.bus.ctx;
    if (!ctx) return;
    for (const key of trackId ? introSources(trackId, this.wantKey) : [this.wantKey]) if (this.bank.hasSong(key)) void this.bank.song(ctx, key);
    if (trackId) void this.bank.bed(ctx, trackId);
  }

  /**
   * A course is chosen, before its race loads (main.ts: the Track or Cup screen's pick, before the race is built; the
   * Daily's at its pick on the Mode screen; a series' next course during the results, `ahead`): its music's files come
   * down now, bytes only, the chosen course's alone (phones pay for data): its intro piece (`intro:<trackId>`) when the
   * manifest lists one, and its race song. No context is made and nothing plays; a silent bus (?mute) fetches nothing.
   * A pick's are wanted this moment (SONG_NOW_TIER: at once, not a turn in the line); `ahead`, well before its race,
   * behind every file wanted now (the results song first: SONG_AHEAD_TIER).
   */
  courseChosen(trackId: string, ahead = false): void {
    if (this.bus.silent) return;
    for (const key of introSources(trackId, themeForTrack(trackId))) void this.bank.prefetch(key, ahead ? SONG_AHEAD_TIER : SONG_NOW_TIER);
  }

  /**
   * A race picked with a course intro to fly (main.ts: not a restart, not a series' next race). Mario Kart World's
   * start press rings a falling whoosh over its confirm as the menu music stops (muted footage, docs/sops/audio.md,
   * 28 Sept 2026): the manifest's pick sting (AUDIO.sting.id, the music lab's) when it is in, else the slipstream's
   * falling whoosh; the menu song fades now, at the press, not once the race is built (newRace, about 0.6 s later).
   */
  raceChosen(): void {
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    const S = AUDIO.sting, s = this.bank.get(S.id);
    if (s) playSample(ctx, this.bus.sfx!, s, ctx.currentTime + 0.005, S.gain * mixLevel(S.id), 0);
    else this.sfx(S.standIn as SfxId, S.standInGain);
    this.stopSong();
    this.seq = null;
    this.songId = null;
    this.wantSong = null;
    this.wantKey = null;
  }

  /**
   * The course intro's flight begins (main.ts, game/intro.ts: `seconds` long, the countdown straight after it). Its
   * music plays under it and is silent AUDIO.intro.breath before the countdown's first beep: the course's own intro
   * piece (`intro:<trackId>`, the music lab's) when the manifest has one, else the first bars of its race song, faded
   * out on a bar line (introPlan). A recording still coming down starts when it lands, if enough of the flight is left
   * (AUDIO.intro.minPlay); no synth stands in (a synth flash and then a recording sounds cheap: Adam, 28 Sept 2026).
   */
  courseIntro(seconds: number): void {
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running || !this.trackId) return;
    const ask = ++this.introAsk, over = ctx.currentTime + seconds - AUDIO.intro.breath;
    const key = introSources(this.trackId, themeForTrack(this.trackId)).find((k) => this.bank.hasSong(k));
    if (!key) return;
    void this.bank.song(ctx, key).then((s) => {
      if (!s || ask !== this.introAsk || !this.bus.running) return;
      const when = ctx.currentTime + 0.02, room = over - when;
      const plan = room >= AUDIO.intro.minPlay ? introPlan(room, s.end - s.start, s.bar ?? 0, Math.max(0, (s.beat0 ?? s.start) - s.start)) : null;
      if (!plan) return;
      this.introCue ??= new IntroCue(ctx, this.bus.music!);
      this.introCue.start(s, when, plan);
    });
  }

  /**
   * The flight is over, played through or skipped (any key or tap), and the countdown comes: the intro's music, if
   * any still sounds, fades out fast (AUDIO.intro.skipFade), and one still decoding never starts.
   */
  introOver(): void { this.endIntro(); }

  private endIntro(): void {
    this.introAsk++;
    const ctx = this.bus.ctx;
    if (ctx) this.introCue?.stop(ctx.currentTime, AUDIO.intro.skipFade);
  }

  private pump(): void {
    const ctx = this.bus.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // a recording waited for (no synth stand-in) that has still not started: a stalled line, the synth after all
    const w = this.waiting;
    if (w && ctx.currentTime >= w.giveUp) {
      this.waiting = null;
      if (this.songKey === w.key) this.synth(ctx, w.song, w.after);
    }
    const seq = this.seq;
    if (!seq) return;
    const notes = seq.take(ctx.currentTime + AUDIO.scheduleAhead, this.booked);
    for (const n of notes) {
      if (n.time < ctx.currentTime - 0.05) continue; // fell behind (tab was busy): skip, never pile up
      playNote(ctx, this.bus.music!, n.voice, Math.max(n.time, ctx.currentTime), n.duration, n.pitch, n.vel);
    }
  }

  /**
   * One sound now; `pitch` scales its playback rate on top of the jitter (none for musical and menu
   * cues). Nothing plays past the voice caps; a loud big sound dips the music. Returns the recorded
   * voice, which can be cut short, when there is one.
   */
  sfx(id: SfxId, gain = 1, pan = 0, pitch = 1): Voice | null {
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return null;
    let rate = pitch;
    if (!STEADY.has(id)) {
      this.jitter = (this.jitter * 1664525 + 1013904223) >>> 0;
      rate *= 1 + ((this.jitter / 0xffffffff) * 2 - 1) * AUDIO.pitchJitter;
    }
    // a hit and a wall play the bump's blunt thud, and a menu move the roulette's plain tick (Adam, 30 Sept 2026:
    // the hit "high pitched cartoony", the move "boing"y; each keeps its own level in the mix)
    const s = this.bank.get(SOUND_AS[id] ?? id) ?? this.bank.get(id);
    const seconds = (s ? s.end - s.start : patchSeconds(PATCHES[id])) / rate;
    if (!this.voices.admit(id, ctx.currentTime, seconds, PRIORITY.has(id))) return null;
    // the Final Lap Shift is the game's big moment: the music stays down under most of it
    if (DUCKERS.has(id) && gain >= 0.5) {
      if (id === 'shift') this.bus.musicDuck(seconds * AUDIO.shiftDuck.hold, AUDIO.shiftDuck.gain);
      else this.bus.musicDuck();
    }
    if (s) return playSample(ctx, this.bus.sfx!, s, ctx.currentTime + 0.005, gain * mixLevel(id), pan, rate);
    playPatch(ctx, this.bus.sfx!, PATCHES[id], ctx.currentTime + 0.005, gain, pan, rate);
    return null;
  }

  /** The Racer screen: the racer just picked says their line (Mario Kart's racers greet you the same way). */
  select(racerId: string): void {
    if (!this.bus.running) return;
    const b = this.barker.select(racerId, this.takes, this.bus.time);
    if (b) this.say(b, true);
  }

  /**
   * A racer's line on the voice bus, one at a time: a line the barker lets cut in stops the one
   * ringing. The music dips a little (−3 dB) under the player's own lines so the words carry.
   */
  private say(b: BarkCue, own: boolean): void {
    const ctx = this.bus.ctx, s = this.bank.voiceLine(b.racerId, b.bark, b.n);
    if (!ctx || !s || !this.bus.voice) return;
    const t = ctx.currentTime + 0.005, seconds = s.end - s.start;
    if (this.barkVoice && t < this.barker.until) this.barkVoice.stop(t);
    this.barkVoice = playSample(ctx, this.bus.voice, s, t, b.gain * AUDIO.voiceLevel, b.pan);
    this.barker.until = this.bus.time + seconds;
    if (own) this.bus.musicDuck(seconds, BARK_DUCK);
  }

  ui(kind: 'move' | 'confirm' | 'back'): void {
    this.sfx(kind === 'move' ? 'uiMove' : kind === 'confirm' ? 'uiConfirm' : 'uiBack');
  }

  /** One sim tick of race and item events. */
  tick(race: readonly RaceEvent[], items: readonly ItemEvent[], l: Listener): void {
    if (!this.bus.running) return;
    const { cues, music } = direct(race, items, l, this.cues, this.music);
    // one of each sound a tick, the loudest (a strike's three spins, a pile-up's bumps); a racer saying their
    // own hit line (barks: about one hit in three) says it in place of the creature yelp, and yelps on every other
    // hit (Adam, 30 Sept 2026: a hit with no sound at all felt flat)
    const bark = this.barker.pick(race, items, l, this.bus.time, this.takes);
    const saying = bark?.bark === 'hit' ? `yelp:${bark.racerId}` : null;
    for (const c of mergeCues(cues)) if (c.sfx !== saying) this.sfx(c.sfx, c.gain, c.pan, c.rate);
    if (bark) this.say(bark, bark.racerId === l.playerId);
    for (const m of music) {
      if (m.type === 'finalLap') {
        if (this.songKey) this.song?.lift(this.bus.time); else this.seq?.lift(this.bus.time);
      } else if (m.type === 'drums') {
        // the recorded race song on the go (the synth stands in if its file is still coming down)
        if (m.on && this.awaitGo && this.wantKey && this.bus.ctx) this.play(this.wantSong, this.wantKey);
        else if (this.seq) this.seq.drums = m.on;
      } else if (m.type === 'duck') this.bus.duck();
      else if (m.type === 'finish') this.finish(m.win);
    }
  }

  /**
   * Player horn on the rising edge of the horn button. The roulette ticks while it rolls, quick at
   * first and slowing before the chime (`rouletteGap`); each tick cuts the one before.
   */
  input(player: KartState | undefined, input: InputState | undefined): void {
    if (!player || !input) return;
    if (input.horn && !this.lastHorn) this.sfx(hornFor(player.racerId), 0.8);
    this.lastHorn = input.horn;
    const left = Math.max(player.item.rouletteRemaining, player.item.nextRouletteRemaining, player.item.thirdRouletteRemaining);
    if (left > 0 && this.bus.time - this.lastTick >= rouletteGap(left)) {
      this.lastTick = this.bus.time;
      // the tick before is cut, so its voice is free: without this the cap of three refused ticks
      // at the quick start of every roll (42 of 98 in a race), and the wheel stuttered
      if (this.tickVoice) { this.tickVoice.stop(this.bus.time + 0.004); this.voices.release('rouletteTick', this.bus.time); }
      this.tickVoice = this.sfx('rouletteTick', 0.7);
    }
  }

  /**
   * The Knockout cut is shown (main.ts `raceOver`): through to the next round, or out. The results
   * song waits for the sting's last note.
   */
  knockout(out: boolean): void {
    const id = out ? 'koOut' : 'koSafe';
    this.sfx(id);
    if (this.bus.running) this.stingEnds = Math.max(this.stingEnds, this.bus.time + STING_SECONDS[id]);
  }

  /**
   * The podium ceremony begins (main.ts, game/podium.ts): the results song fades for the fanfare,
   * the victory sting when the player stands on the podium and the friendly one when not, then the
   * results song comes back after its last chord. No new recordings: the finish stings.
   */
  ceremony(onPodium: boolean): void {
    this.sfx(onPodium ? 'finish' : 'finishLow');
    this.finish(onPodium);
    this.play('results');
  }

  private lastTick = 0;
  /** the course (its surfaces), and when the player's current boost began (the engine's rev) */
  private trackId = '';
  private boostAt = -1;
  private wasBoosting = false;
  private readonly extras = new Map<string, { s: Sample; gain: number; rate: number }>();
  private readonly near: KartState[] = [];
  private readonly nearD: number[] = [];
  /** each near racer's index in the karts (their revs) */
  private readonly nearI: number[] = [];
  /** the pops heard from each engine's rev so far, and when the last one played (context time) */
  private readonly popsHeard = new WeakMap<RevView, { n: number; at: number }>();

  // ---------------------------------------------------------------- engines
  private voice(ctx: AudioContext, panned: boolean): EngineVoice {
    const srcs: AudioScheduledSourceNode[] = [], outs: AudioNode[] = [];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let pan: StereoPannerNode | null = null;
    if (panned) { pan = ctx.createStereoPanner(); gain.connect(pan).connect(this.bus.sfx!); outs.push(pan); } else { gain.connect(this.bus.sfx!); outs.push(gain); }
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.connect(gain);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    o2.detune.value = panned ? 0 : 9;
    o1.connect(lp);
    const o2g = ctx.createGain();
    o2g.gain.value = panned ? 0 : 0.5;
    o2.connect(o2g).connect(lp);
    o1.start(); o2.start();
    srcs.push(o1, o2);
    const scrub = ctx.createGain();
    scrub.gain.value = 0;
    const rumble = panned ? null : this.rumbleVoice(ctx, srcs);
    if (rumble) outs.push(rumble);
    if (!panned) {
      const n = ctx.createBufferSource();
      n.buffer = (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); let x = 7; for (let i = 0; i < d.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; d[i] = x / 0x80000000 - 1; } return b; })();
      n.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 1.2;
      n.connect(bp).connect(scrub).connect(this.bus.sfx!);
      n.start();
      srcs.push(n);
      outs.push(scrub);
    }
    return { o1, o2, lp, gain, scrub, rumble, pan, srcs, outs };
  }

  /** Stop a synth engine voice and unplug it from the bus (a quick fade first, so it does not click). */
  private dispose(v: EngineVoice, t: number): void {
    for (const g of [v.gain, v.scrub, v.rumble]) g?.gain.setTargetAtTime(0, t, 0.02);
    for (const s of v.srcs) { try { s.stop(t + 0.12); } catch { /* already stopped */ } }
    v.srcs[0].onended = () => { for (const n of v.outs) n.disconnect(); };
  }

  /** The synth off-road rumble: looped noise under a low-pass, silent until the wheels leave the road. */
  private rumbleVoice(ctx: AudioContext, srcs?: AudioScheduledSourceNode[]): GainNode {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx);
    n.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = AUDIO.offroad.synthHz;
    const g = ctx.createGain();
    g.gain.value = 0;
    n.connect(lp).connect(g).connect(this.bus.sfx!);
    n.start();
    srcs?.push(n);
    return g;
  }

  /**
   * Once per rendered frame while a race runs. The player's engine follows its own speed and, off the
   * road, its own rev (the gas on the grid revs it); the three nearest others get a quiet panned hum,
   * revving on the grid too. `topSpeed` is the player's kart top speed. `revs` (kart-controller rev.ts,
   * one per kart, in `others`' order; none: the engines follow the speed alone) are the engines' own
   * revs, and their pops are heard: the player's, and the near rivals' quieter.
   */
  engines(player: KartState | undefined, throttle: number, topSpeed: number, others: readonly KartState[], l: Listener, on: boolean, revs?: readonly (RevView | undefined)[]): void {
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    if (on && player && revs) this.hearPops(ctx, player, others, l, revs);
    if (this.recordedEngines(ctx, player, throttle, topSpeed, others, l, on, revs)) return;
    const t = ctx.currentTime;
    // nothing is built outside a race (the menus, the attract loop before a race)
    if (!this.player && (!on || !player)) return;
    if (!this.player) this.player = this.voice(ctx, false);
    if (this.ai.length === 0) for (let i = 0; i < AUDIO.aiEngines; i++) this.ai.push(this.voice(ctx, true));
    const pv = this.player;
    if (!on || !player) {
      pv.gain.gain.setTargetAtTime(0, t, 0.08);
      pv.scrub.gain.setTargetAtTime(0, t, 0.08);
      pv.rumble?.gain.setTargetAtTime(0, t, 0.08);
      for (const v of this.ai) v.gain.gain.setTargetAtTime(0, t, 0.08);
      return;
    }
    const boosting = player.boost.remaining > 0;
    const pRev = revs?.[others.indexOf(player)];
    const rpm = engineRpm(player.speed, topSpeed, boosting, pRev), drive = engineDrive(throttle, pRev);
    const hz = engineHz(rpm);
    pv.o1.frequency.setTargetAtTime(hz, t, 0.03);
    pv.o2.frequency.setTargetAtTime(hz * 2, t, 0.03);
    pv.lp.frequency.setTargetAtTime(400 + rpm * 0.35 + drive * 600 + (boosting ? 900 : 0), t, 0.05);
    pv.gain.gain.setTargetAtTime(0.05 + 0.07 * drive + (boosting ? 0.04 : 0), t, 0.05);
    const slip = Math.min(1, Math.abs(player.lateralVelocity) / 6) * (player.grounded ? 1 : 0);
    pv.scrub.gain.setTargetAtTime(player.drift.active ? 0.04 + 0.08 * slip : 0.06 * Math.max(0, slip - 0.4), t, 0.05);
    pv.rumble?.gain.setTargetAtTime(AUDIO.offroad.synth * offroadAmount(player, topSpeed), t, 0.05);

    const near = this.nearest(player, others, l);
    this.ai.forEach((v, i) => {
      const k = near[i], d = this.nearD[i];
      if (!k || d > AUDIO.farMetres) { v.gain.gain.setTargetAtTime(0, t, 0.1); return; }
      const kRev = revs?.[this.nearI[i]];
      const r = engineRpm(k.speed, topSpeed, false, kRev);
      v.o1.frequency.setTargetAtTime(engineHz(r) * 1.02 * racerPitch(k.racerId), t, 0.05);
      v.lp.frequency.setTargetAtTime(300 + r * 0.2, t, 0.05);
      const g = 0.035 * Math.max(0, 1 - d / AUDIO.farMetres) * rivalSwell(kRev);
      v.gain.gain.setTargetAtTime(g, t, 0.1);
      v.pan?.pan.setTargetAtTime(panOf(k, l, d), t, 0.1);
    });
  }

  /** The three racers nearest the ear, into reused slots (no per-frame arrays), nearest first; their indices in `others` in nearI. */
  private nearest(player: KartState, others: readonly KartState[], l: Listener): KartState[] {
    const near = this.near;
    near.length = 0;
    for (let j = 0; j < others.length; j++) {
      const k = others[j];
      if (k === player || k.isGhost) continue;
      const d = Math.hypot(k.position[0] - l.position[0], k.position[2] - l.position[2]);
      let i = near.length;
      if (i < AUDIO.aiEngines) near.push(k); else if (d >= this.nearD[i - 1]) continue; else i = AUDIO.aiEngines - 1;
      this.nearD[i] = d;
      this.nearI[i] = j;
      near[i] = k;
      // bubble it into place by distance
      while (i > 0 && this.nearD[i - 1] > this.nearD[i]) {
        const td = this.nearD[i - 1]; this.nearD[i - 1] = this.nearD[i]; this.nearD[i] = td;
        const ti = this.nearI[i - 1]; this.nearI[i - 1] = this.nearI[i]; this.nearI[i] = ti;
        const tk = near[i - 1]; near[i - 1] = near[i]; near[i] = tk;
        i--;
      }
    }
    return near;
  }

  /**
   * The engines' pops since last frame (kart-controller rev.ts: a let-off after a high rev, a start held
   * too early): the player's at full level, the three nearest rivals' quieter, panned and fading with
   * distance. An engine seen for the first time replays nothing from before.
   */
  private hearPops(ctx: AudioContext, player: KartState, others: readonly KartState[], l: Listener, revs: readonly (RevView | undefined)[]): void {
    const P = AUDIO.engineRev;
    this.popsOf(ctx, revs[others.indexOf(player)], P.pop, 0);
    const near = this.nearest(player, others, l);
    for (let i = 0; i < near.length; i++) {
      const d = this.nearD[i];
      if (d > AUDIO.farMetres) continue;
      this.popsOf(ctx, revs[this.nearI[i]], P.rivalPop * (1 - d / AUDIO.farMetres), panOf(near[i], l, d));
    }
  }

  /** Play `rev`'s newest pop, if it has one not heard yet (at most `popsPerSecond` a kart). */
  private popsOf(ctx: AudioContext, rev: RevView | undefined, gain: number, pan: number): void {
    if (!rev) return;
    let h = this.popsHeard.get(rev);
    if (!h) { h = { n: rev.pops, at: -Infinity }; this.popsHeard.set(rev, h); return; }
    if (rev.pops === h.n) return;
    h.n = rev.pops;
    const t = ctx.currentTime;
    if (t - h.at < 1 / AUDIO.engineRev.popsPerSecond) return;
    h.at = t;
    this.pop(ctx, rev.popSize, gain, pan);
  }

  /** One pop of `size` 0..1 at `gain` and `pan`: the puff, with a thump under it when big (a backfire), else a crisp crack (a small pop, a crackle). Pitch varies ±8 %. */
  private pop(ctx: AudioContext, size: number, gain: number, pan: number): void {
    const at = ctx.currentTime + 0.005, dest = this.bus.sfx!;
    this.jitter = (this.jitter * 1664525 + 1013904223) >>> 0;
    const rate = 1 + ((this.jitter / 0xffffffff) * 2 - 1) * 0.08;
    playPatch(ctx, dest, ENGINE_POP.puff, at, gain * size, pan, rate);
    playPatch(ctx, dest, size >= AUDIO.engineRev.thumpFrom ? ENGINE_POP.thump : ENGINE_POP.crack, at, gain * size, pan, rate);
  }

  /**
   * The recorded engine once its loops are decoded: three loops crossfaded by rpm and the drift
   * screech for the player, the mid loop panned for the nearest rivals. False: use the synth.
   */
  private recordedEngines(ctx: AudioContext, player: KartState | undefined, throttle: number, topSpeed: number, others: readonly KartState[], l: Listener, on: boolean, revs?: readonly (RevView | undefined)[]): boolean {
    const idle = this.bank.get('engine-idle'), mid = this.bank.get('engine-mid'), high = this.bank.get('engine-high');
    if (!idle || !mid || !high) return false;
    const t = ctx.currentTime, L = AUDIO.engineLoop;
    // the synth voices, if they ran before the recordings arrived, stop and leave the graph
    if (this.player) { this.dispose(this.player, t); this.player = null; }
    for (const v of this.ai.splice(0)) this.dispose(v, t);
    if (!this.loopPlayer) {
      // nothing is built outside a race
      if (!on || !player) return true;
      // the wheels' loops (surfaces, sparks) start on first use (setExtras)
      this.loopPlayer = new LoopEngine(ctx, this.bus.sfx!, [idle, mid, high], this.bank.get('drift'), false);
      // no recorded rumble: the synth one stands in
      if (!this.bank.get('offroad')) this.rumble = this.rumbleVoice(ctx);
      // each rival its own start point in the loop (and its own pitch, below), so none phase together
      for (let i = 0; i < AUDIO.aiEngines; i++) this.loopAi.push(new LoopEngine(ctx, this.bus.sfx!, [mid], undefined, true, undefined, i + 1));
    }
    if (!on || !player) {
      this.loopPlayer.set(t, AUDIO.idleRpm, 0);
      this.extras.clear();
      this.loopPlayer.setExtras(t, this.extras);
      this.rumble?.gain.setTargetAtTime(0, t, 0.05);
      for (const v of this.loopAi) v.set(t, AUDIO.idleRpm, 0);
      return true;
    }
    const boosting = player.boost.remaining > 0;
    // a boost's whoosh rides a rev: the engine jumps up and swells, then settles (boostRev)
    if (boosting && !this.wasBoosting) this.boostAt = t;
    this.wasBoosting = boosting;
    const rev = boosting ? boostRev(t - this.boostAt) : 0;
    const slip = Math.min(1, Math.abs(player.lateralVelocity) / 6) * (player.grounded ? 1 : 0);
    const screech = player.drift.active ? 0.35 + 0.65 * slip : 0.5 * Math.max(0, slip - 0.4);
    // the kart's class sets the engine's voice: light high and bright, heavy low and dark; off the road
    // (the grid, a standstill) the engine's own rev sets its rpm and loudness (engineRpm, engineDrive)
    const cv = classVoice(player.racerId), R = AUDIO.boostRev, pRev = revs?.[others.indexOf(player)];
    this.loopPlayer.set(t, engineRpm(player.speed, topSpeed, boosting, pRev), L.base + L.throttle * engineDrive(throttle, pRev) + (boosting ? L.boost : 0) + R.gain * rev, screech * L.screech, 0, 0, cv.pitch * (1 + R.pitch * rev), cv.bright, limiterFlutter(pRev));
    // under the wheels: this course's own surfaces (sand, snow, grass, ice, planks, the rail), and the drift sparks by tier
    const extras = this.extras;
    extras.clear();
    const w = wheelSound(player, this.trackId, topSpeed);
    // an off-road recording not there yet: the plain one stands in (never for the planks, ice or rail)
    const ws = w.id ? this.bank.get(w.id) ?? (w.id.startsWith('offroad-') ? this.bank.get('offroad') : undefined) : undefined;
    if (w.id && ws) extras.set(w.id, { s: ws, gain: w.amount * (AUDIO.wheels[w.id] ?? AUDIO.offroad.loop), rate: 1 });
    const sp = sparkLayer(player), sparks = this.bank.get('sparks');
    if (sparks) extras.set('sparks', { s: sparks, gain: sp.gain * AUDIO.sparks.level, rate: sp.rate });
    // the course's own quiet world under it all (waves, wind, birds), when the manifest has one
    const bed = this.bank.get(ambienceId(this.trackId));
    if (bed) extras.set('ambience', { s: bed, gain: AUDIO.ambience, rate: 1 });
    this.loopPlayer.setExtras(t, extras);
    // no recorded wheel loop at all: the synth rumble stands in off the road
    this.rumble?.gain.setTargetAtTime(ws ? 0 : offroadAmount(player, topSpeed) * AUDIO.offroad.synth, t, 0.05);
    const near = this.nearest(player, others, l);
    this.loopAi.forEach((v, i) => {
      const k = near[i], d = this.nearD[i];
      if (!k || d > AUDIO.farMetres) { v.set(t, AUDIO.idleRpm, 0); return; }
      const c = classVoice(k.racerId), kRev = revs?.[this.nearI[i]];
      // a rival revving on the grid climbs and swells too (its own rev, its own start timing)
      v.set(t, engineRpm(k.speed, topSpeed, false, kRev), L.other * Math.max(0, 1 - d / AUDIO.farMetres) * rivalSwell(kRev), 0, panOf(k, l, d), 0, racerPitch(k.racerId) * c.pitch, c.bright);
    });
    return true;
  }
}

/** A rival's engine level on top of its hum: up to 1 + `engineRev.rivalLift` while it revs off the road (1 with no rev, or driving). */
export function rivalSwell(rev: Pick<RevView, 'rev' | 'load'> | undefined): number {
  return rev ? 1 + AUDIO.engineRev.rivalLift * rev.rev * (1 - rev.load) : 1;
}

/** Screen-right pan of a racer from the ear (see director.spatial). */
function panOf(k: KartState, l: Listener, d: number): number {
  const dx = k.position[0] - l.position[0], dz = k.position[2] - l.position[2];
  const right = -dx * Math.cos(l.heading) + dz * Math.sin(l.heading);
  return Math.max(-1, Math.min(1, right / Math.max(d, 1)));
}
