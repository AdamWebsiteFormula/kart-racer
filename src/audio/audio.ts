// GameAudio: the one object the game talks to. Owns the bus, the song, the engines and the SFX.
import type { InputState, KartState } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { AudioBus, type Volumes } from './bus.ts';
import { AUDIO } from './constants.ts';
import { direct, hornFor, resetDirector, type Listener } from './director.ts';
import { boostRev, classVoice, engineHz, offroadAmount, racerPitch, rpmFor, sparkLayer, wheelSound } from './engine.ts';
import { playNote } from './music/instruments.ts';
import { SONGS } from './music/patterns.ts';
import { Sequencer, type Scheduled } from './music/sequencer.ts';
import { LoopEngine, mixLevel, playSample, SampleBank, SongPlayer, STING_SECONDS, themeForTrack, type Sample, type Voice } from './samples.ts';
import { noiseBuffer, PATCHES, patchSeconds, playPatch } from './sfx.ts';
import type { Cue, MusicCue, SfxId, SongId } from './types.ts';
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

  constructor(bus = new AudioBus(), bank = new SampleBank()) {
    this.bus = bus;
    this.bank = bank;
    bank.onLoaded = () => this.samplesReady();
    const unlock = () => {
      if (this.bus.unlock()) { this.start(); return; }
      // resume() settles asynchronously: start the scheduler the moment the context runs,
      // so the very first gesture is enough (Safari and Chrome)
      const c = this.bus.ctx;
      if (c && !this.watching) {
        this.watching = true;
        c.addEventListener?.('statechange', () => { if (c.state === 'running') this.start(); });
      }
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { passive: true });
    addEventListener('visibilitychange', () => this.bus.setHidden(document.hidden));
  }

  private start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.pump(), AUDIO.schedulerTickMs);
    void this.bank.load(this.bus.ctx!);
    if (!this.awaitGo && (this.wantSong || this.wantKey)) this.play(this.wantSong, this.wantKey);
  }

  /** The recordings arrived: swap the synth song for the recorded one if there is one. */
  private samplesReady(): void {
    if (!this.bus.running || this.awaitGo || !this.wantKey || this.songKey === this.wantKey || !this.bank.hasSong(this.wantKey)) return;
    this.play(this.wantSong, this.wantKey);
  }

  setVolumes(v: Volumes): void { this.bus.setVolumes(v); }

  /** The pause menu opened or closed: the music drops back under it (the engines go quiet on their own). */
  pause(on: boolean): void { this.bus.setPaused(on); }

  /**
   * Switch songs: the recording `key` when there is one, else the synth `song`. Queued until the
   * context is unlocked. The results song waits for the finish sting's last chord.
   */
  play(song: SongId | null, key: string | null = song): void {
    this.wantSong = song;
    this.wantKey = key;
    this.awaitGo = false;
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    const after = song === 'results' ? this.stingEnds : 0;
    if (key && this.bank.hasSong(key)) {
      this.seq = null;
      this.songId = null;
      if (this.songKey !== key) this.startSong(ctx, key, after);
      return;
    }
    this.stopSong();
    if (song === this.songId && this.seq) return;
    this.songId = song;
    this.seq = song ? new Sequencer(SONGS[song], Math.max(ctx.currentTime + 0.1, after)) : null;
  }

  /** Start the recording `key`, not before context time `after`. */
  private startSong(ctx: AudioContext, key: string, after = 0): void {
    this.songKey = key;
    this.song ??= new SongPlayer(ctx, this.bus.music!);
    this.song.stop(ctx.currentTime, 0.3);
    void this.bank.song(ctx, key).then((s) => {
      if (this.songKey !== key) return; // another song was asked for while this one decoded
      if (s) { this.song!.start(s, Math.max(ctx.currentTime + 0.05, after)); return; }
      // it would not decode: the synth plays instead
      this.songKey = null;
      if (this.wantSong) { this.songId = this.wantSong; this.seq = new Sequencer(SONGS[this.wantSong], Math.max(ctx.currentTime + 0.1, after)); }
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
  }

  private stopSong(): void {
    if (this.songKey) this.song?.stop(this.bus.time);
    this.songKey = null;
  }

  /**
   * Race start: fresh director memory, from the player's grid rank and the race's winning line
   * (`finishLine`). A recorded race song decodes during the countdown and starts on the go; the
   * synth one plays with its drums muted until the go.
   */
  newRace(song: SongId, trackId?: string, gridRank?: number, finishLine?: number, balloons = true): void {
    resetDirector(gridRank, finishLine, balloons);
    this.trackId = trackId ?? '';
    this.stingEnds = 0;
    this.songId = null;
    const key = trackId ? themeForTrack(trackId) : song;
    if (this.bank.hasSong(key)) {
      this.seq = null;
      this.stopSong();
      this.wantSong = song;
      this.wantKey = key;
      this.awaitGo = true;
      if (this.bus.ctx) void this.bank.song(this.bus.ctx, key);
      return;
    }
    this.play(song, key);
    if (this.seq) this.seq.drums = false;
  }

  private pump(): void {
    const ctx = this.bus.ctx, seq = this.seq;
    if (!ctx || ctx.state !== 'running') return;
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
    const s = this.bank.get(id);
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

  ui(kind: 'move' | 'confirm' | 'back'): void {
    this.sfx(kind === 'move' ? 'uiMove' : kind === 'confirm' ? 'uiConfirm' : 'uiBack');
  }

  /** One sim tick of race and item events. */
  tick(race: readonly RaceEvent[], items: readonly ItemEvent[], l: Listener): void {
    if (!this.bus.running) return;
    const { cues, music } = direct(race, items, l, this.cues, this.music);
    // one of each sound a tick, the loudest (a strike's three spins, a pile-up's bumps)
    for (const c of mergeCues(cues)) this.sfx(c.sfx, c.gain, c.pan, c.rate);
    for (const m of music) {
      if (m.type === 'finalLap') {
        if (this.songKey) this.song?.lift(this.bus.time); else this.seq?.lift(this.bus.time);
      } else if (m.type === 'drums') {
        if (m.on && this.awaitGo && this.wantKey && this.bus.ctx) { this.awaitGo = false; this.startSong(this.bus.ctx, this.wantKey); }
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
    const left = Math.max(player.item.rouletteRemaining, player.item.nextRouletteRemaining);
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

  private lastTick = 0;
  /** the course (its surfaces), and when the player's current boost began (the engine's rev) */
  private trackId = '';
  private boostAt = -1;
  private wasBoosting = false;
  private readonly extras = new Map<string, { s: Sample; gain: number; rate: number }>();
  private readonly near: KartState[] = [];
  private readonly nearD: number[] = [];

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
   * Once per rendered frame while a race runs. The player's engine follows its own speed; the
   * three nearest others get a quiet panned hum. `topSpeed` is the player's kart top speed.
   */
  engines(player: KartState | undefined, throttle: number, topSpeed: number, others: readonly KartState[], l: Listener, on: boolean): void {
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    if (this.recordedEngines(ctx, player, throttle, topSpeed, others, l, on)) return;
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
    const rpm = rpmFor(player.speed, topSpeed, boosting);
    const hz = engineHz(rpm);
    pv.o1.frequency.setTargetAtTime(hz, t, 0.03);
    pv.o2.frequency.setTargetAtTime(hz * 2, t, 0.03);
    pv.lp.frequency.setTargetAtTime(400 + rpm * 0.35 + throttle * 600 + (boosting ? 900 : 0), t, 0.05);
    pv.gain.gain.setTargetAtTime(0.05 + 0.07 * throttle + (boosting ? 0.04 : 0), t, 0.05);
    const slip = Math.min(1, Math.abs(player.lateralVelocity) / 6) * (player.grounded ? 1 : 0);
    pv.scrub.gain.setTargetAtTime(player.drift.active ? 0.04 + 0.08 * slip : 0.06 * Math.max(0, slip - 0.4), t, 0.05);
    pv.rumble?.gain.setTargetAtTime(AUDIO.offroad.synth * offroadAmount(player, topSpeed), t, 0.05);

    const near = this.nearest(player, others, l);
    this.ai.forEach((v, i) => {
      const k = near[i], d = this.nearD[i];
      if (!k || d > AUDIO.farMetres) { v.gain.gain.setTargetAtTime(0, t, 0.1); return; }
      const r = rpmFor(k.speed, topSpeed);
      v.o1.frequency.setTargetAtTime(engineHz(r) * 1.02 * racerPitch(k.racerId), t, 0.05);
      v.lp.frequency.setTargetAtTime(300 + r * 0.2, t, 0.05);
      const g = 0.035 * Math.max(0, 1 - d / AUDIO.farMetres);
      v.gain.gain.setTargetAtTime(g, t, 0.1);
      v.pan?.pan.setTargetAtTime(panOf(k, l, d), t, 0.1);
    });
  }

  /** The three racers nearest the ear, into reused slots (no per-frame arrays), nearest first. */
  private nearest(player: KartState, others: readonly KartState[], l: Listener): KartState[] {
    const near = this.near;
    near.length = 0;
    for (const k of others) {
      if (k === player || k.isGhost) continue;
      const d = Math.hypot(k.position[0] - l.position[0], k.position[2] - l.position[2]);
      let i = near.length;
      if (i < AUDIO.aiEngines) near.push(k); else if (d >= this.nearD[i - 1]) continue; else i = AUDIO.aiEngines - 1;
      this.nearD[i] = d;
      near[i] = k;
      // bubble it into place by distance
      while (i > 0 && this.nearD[i - 1] > this.nearD[i]) {
        const td = this.nearD[i - 1]; this.nearD[i - 1] = this.nearD[i]; this.nearD[i] = td;
        const tk = near[i - 1]; near[i - 1] = near[i]; near[i] = tk;
        i--;
      }
    }
    return near;
  }

  /**
   * The recorded engine once its loops are decoded: three loops crossfaded by rpm and the drift
   * screech for the player, the mid loop panned for the nearest rivals. False: use the synth.
   */
  private recordedEngines(ctx: AudioContext, player: KartState | undefined, throttle: number, topSpeed: number, others: readonly KartState[], l: Listener, on: boolean): boolean {
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
    // the kart's class sets the engine's voice: light high and bright, heavy low and dark
    const cv = classVoice(player.racerId), R = AUDIO.boostRev;
    this.loopPlayer.set(t, rpmFor(player.speed, topSpeed, boosting), L.base + L.throttle * throttle + (boosting ? L.boost : 0) + R.gain * rev, screech * L.screech, 0, 0, cv.pitch * (1 + R.pitch * rev), cv.bright);
    // under the wheels: this course's own surfaces (sand, snow, grass, ice, planks, the rail), and the drift sparks by tier
    const extras = this.extras;
    extras.clear();
    const w = wheelSound(player, this.trackId, topSpeed);
    // an off-road recording not there yet: the plain one stands in (never for the planks, ice or rail)
    const ws = w.id ? this.bank.get(w.id) ?? (w.id.startsWith('offroad-') ? this.bank.get('offroad') : undefined) : undefined;
    if (w.id && ws) extras.set(w.id, { s: ws, gain: w.amount * (AUDIO.wheels[w.id] ?? AUDIO.offroad.loop), rate: 1 });
    const sp = sparkLayer(player), sparks = this.bank.get('sparks');
    if (sparks) extras.set('sparks', { s: sparks, gain: sp.gain * AUDIO.sparks.level, rate: sp.rate });
    this.loopPlayer.setExtras(t, extras);
    // no recorded wheel loop at all: the synth rumble stands in off the road
    this.rumble?.gain.setTargetAtTime(ws ? 0 : offroadAmount(player, topSpeed) * AUDIO.offroad.synth, t, 0.05);
    const near = this.nearest(player, others, l);
    this.loopAi.forEach((v, i) => {
      const k = near[i], d = this.nearD[i];
      if (!k || d > AUDIO.farMetres) { v.set(t, AUDIO.idleRpm, 0); return; }
      const c = classVoice(k.racerId);
      v.set(t, rpmFor(k.speed, topSpeed), L.other * Math.max(0, 1 - d / AUDIO.farMetres), 0, panOf(k, l, d), 0, racerPitch(k.racerId) * c.pitch, c.bright);
    });
    return true;
  }
}

/** Screen-right pan of a racer from the ear (see director.spatial). */
function panOf(k: KartState, l: Listener, d: number): number {
  const dx = k.position[0] - l.position[0], dz = k.position[2] - l.position[2];
  const right = -dx * Math.cos(l.heading) + dz * Math.sin(l.heading);
  return Math.max(-1, Math.min(1, right / Math.max(d, 1)));
}
