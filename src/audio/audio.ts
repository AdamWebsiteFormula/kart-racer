// GameAudio: the one object the game talks to. Owns the bus, the song, the engines and the SFX.
import type { InputState, KartState } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { AudioBus, type Volumes } from './bus.ts';
import { AUDIO } from './constants.ts';
import { direct, hornFor, resetDirector, type Listener } from './director.ts';
import { engineHz, rpmFor } from './engine.ts';
import { playNote } from './music/instruments.ts';
import { SONGS } from './music/patterns.ts';
import { Sequencer, type Scheduled } from './music/sequencer.ts';
import { LoopEngine, mixLevel, playSample, SampleBank, SongPlayer, themeForTrack } from './samples.ts';
import { PATCHES, playPatch } from './sfx.ts';
import type { Cue, MusicCue, SfxId, SongId } from './types.ts';

interface EngineVoice { o1: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode; gain: GainNode; scrub: GainNode; pan: StereoPannerNode | null }

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

  /**
   * Switch songs: the recording `key` when there is one, else the synth `song`. Queued until the
   * context is unlocked.
   */
  play(song: SongId | null, key: string | null = song): void {
    this.wantSong = song;
    this.wantKey = key;
    this.awaitGo = false;
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    if (key && this.bank.hasSong(key)) {
      this.seq = null;
      this.songId = null;
      if (this.songKey !== key) this.startSong(ctx, key);
      return;
    }
    this.stopSong();
    if (song === this.songId && this.seq) return;
    this.songId = song;
    this.seq = song ? new Sequencer(SONGS[song], ctx.currentTime + 0.1) : null;
  }

  private startSong(ctx: AudioContext, key: string): void {
    this.songKey = key;
    this.song ??= new SongPlayer(ctx, this.bus.music!);
    this.song.stop(ctx.currentTime, 0.3);
    void this.bank.song(ctx, key).then((s) => {
      if (this.songKey !== key) return; // another song was asked for while this one decoded
      if (s) { this.song!.start(s, ctx.currentTime + 0.05); return; }
      // it would not decode: the synth plays instead
      this.songKey = null;
      if (this.wantSong) { this.songId = this.wantSong; this.seq = new Sequencer(SONGS[this.wantSong], ctx.currentTime + 0.1); }
    });
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
  newRace(song: SongId, trackId?: string, gridRank?: number, finishLine?: number): void {
    resetDirector(gridRank, finishLine);
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
    this.song?.pump(ctx.currentTime);
    if (!seq) return;
    const notes = seq.take(ctx.currentTime + AUDIO.scheduleAhead, this.booked);
    for (const n of notes) {
      if (n.time < ctx.currentTime - 0.05) continue; // fell behind (tab was busy): skip, never pile up
      playNote(ctx, this.bus.music!, n.voice, Math.max(n.time, ctx.currentTime), n.duration, n.pitch, n.vel);
    }
  }

  sfx(id: SfxId, gain = 1, pan = 0): void {
    const ctx = this.bus.ctx;
    if (!ctx || !this.bus.running) return;
    this.jitter = (this.jitter * 1664525 + 1013904223) >>> 0;
    const rate = 1 + ((this.jitter / 0xffffffff) * 2 - 1) * AUDIO.pitchJitter;
    const s = this.bank.get(id);
    if (s) playSample(ctx, this.bus.sfx!, s, ctx.currentTime + 0.005, gain * mixLevel(id), pan, rate);
    else playPatch(ctx, this.bus.sfx!, PATCHES[id], ctx.currentTime + 0.005, gain, pan, rate);
  }

  ui(kind: 'move' | 'confirm' | 'back'): void {
    this.sfx(kind === 'move' ? 'uiMove' : kind === 'confirm' ? 'uiConfirm' : 'uiBack');
  }

  /** One sim tick of race and item events. */
  tick(race: readonly RaceEvent[], items: readonly ItemEvent[], l: Listener): void {
    if (!this.bus.running) return;
    const { cues, music } = direct(race, items, l, this.cues, this.music);
    for (const c of cues) this.sfx(c.sfx, c.gain, c.pan);
    for (const m of music) {
      if (m.type === 'finalLap') {
        if (this.songKey) this.song?.lift(this.bus.time); else this.seq?.lift(this.bus.time);
      } else if (m.type === 'drums') {
        if (m.on && this.awaitGo && this.wantKey && this.bus.ctx) { this.awaitGo = false; this.startSong(this.bus.ctx, this.wantKey); }
        else if (this.seq) this.seq.drums = m.on;
      } else if (m.type === 'duck') this.bus.duck();
    }
  }

  /** Player horn on the rising edge of the horn button; the roulette ticks while it rolls. */
  input(player: KartState | undefined, input: InputState | undefined): void {
    if (!player || !input) return;
    if (input.horn && !this.lastHorn) this.sfx(hornFor(player.racerId), 0.8);
    this.lastHorn = input.horn;
    const rolling = player.item.rouletteRemaining > 0 || player.item.nextRouletteRemaining > 0;
    if (rolling && this.bus.time - this.lastTick > 0.09) { this.lastTick = this.bus.time; this.sfx('rouletteTick', 0.7); }
  }

  private lastTick = 0;
  private readonly near: KartState[] = [];
  private readonly nearD: number[] = [];

  // ---------------------------------------------------------------- engines
  private voice(ctx: AudioContext, panned: boolean): EngineVoice {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let pan: StereoPannerNode | null = null;
    if (panned) { pan = ctx.createStereoPanner(); gain.connect(pan).connect(this.bus.sfx!); } else gain.connect(this.bus.sfx!);
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
    const scrub = ctx.createGain();
    scrub.gain.value = 0;
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
    }
    return { o1, o2, lp, gain, scrub, pan };
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
    if (!this.player) this.player = this.voice(ctx, false);
    if (this.ai.length === 0) for (let i = 0; i < AUDIO.aiEngines; i++) this.ai.push(this.voice(ctx, true));
    const pv = this.player;
    if (!on || !player) {
      pv.gain.gain.setTargetAtTime(0, t, 0.08);
      pv.scrub.gain.setTargetAtTime(0, t, 0.08);
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

    const near = this.nearest(player, others, l);
    this.ai.forEach((v, i) => {
      const k = near[i], d = this.nearD[i];
      if (!k || d > AUDIO.farMetres) { v.gain.gain.setTargetAtTime(0, t, 0.1); return; }
      const r = rpmFor(k.speed, topSpeed);
      v.o1.frequency.setTargetAtTime(engineHz(r) * 1.02, t, 0.05);
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
    if (!this.loopPlayer) {
      this.loopPlayer = new LoopEngine(ctx, this.bus.sfx!, [idle, mid, high], this.bank.get('drift'), false);
      for (let i = 0; i < AUDIO.aiEngines; i++) this.loopAi.push(new LoopEngine(ctx, this.bus.sfx!, [mid], undefined, true));
      // the synth voices, if they ran before the recordings arrived, go quiet
      if (this.player) { this.player.gain.gain.setTargetAtTime(0, t, 0.05); this.player.scrub.gain.setTargetAtTime(0, t, 0.05); }
      for (const v of this.ai) v.gain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (!on || !player) {
      this.loopPlayer.set(t, AUDIO.idleRpm, 0);
      for (const v of this.loopAi) v.set(t, AUDIO.idleRpm, 0);
      return true;
    }
    const boosting = player.boost.remaining > 0;
    const slip = Math.min(1, Math.abs(player.lateralVelocity) / 6) * (player.grounded ? 1 : 0);
    const screech = player.drift.active ? 0.35 + 0.65 * slip : 0.5 * Math.max(0, slip - 0.4);
    this.loopPlayer.set(t, rpmFor(player.speed, topSpeed, boosting), L.base + L.throttle * throttle + (boosting ? L.boost : 0), screech * L.screech);
    const near = this.nearest(player, others, l);
    this.loopAi.forEach((v, i) => {
      const k = near[i], d = this.nearD[i];
      if (!k || d > AUDIO.farMetres) { v.set(t, AUDIO.idleRpm, 0); return; }
      v.set(t, rpmFor(k.speed, topSpeed), L.other * Math.max(0, 1 - d / AUDIO.farMetres), 0, panOf(k, l, d));
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
