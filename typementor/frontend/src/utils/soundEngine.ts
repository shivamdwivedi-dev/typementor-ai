// Real-Time Web Audio API Sound Engine

export type SoundPack = 'Mechanical' | 'Laptop' | 'Typewriter' | 'Silent';
export type SoundType = 'key' | 'space' | 'backspace' | 'enter';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5; // 0.0 to 1.0
  private soundEnabled: boolean = true;
  private soundPack: SoundPack = 'Mechanical';

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const savedEnabled = localStorage.getItem('typementor_sound_enabled');
      if (savedEnabled !== null) {
        this.soundEnabled = savedEnabled === 'true';
      }

      const savedVolume = localStorage.getItem('typementor_sound_volume');
      if (savedVolume !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVolume)));
      }

      const savedPack = localStorage.getItem('typementor_sound_pack');
      if (savedPack !== null) {
        this.soundPack = savedPack as SoundPack;
      }
    } catch (e) {
      console.error('Failed to load sound engine settings', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('typementor_sound_enabled', String(this.soundEnabled));
      localStorage.setItem('typementor_sound_volume', String(this.volume));
      localStorage.setItem('typementor_sound_pack', this.soundPack);
    } catch (e) {
      console.error('Failed to save sound engine settings', e);
    }
  }

  public initCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    this.saveSettings();
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setSoundPack(pack: SoundPack) {
    this.soundPack = pack;
    this.saveSettings();
  }

  public getSoundPack(): SoundPack {
    return this.soundPack;
  }

  public play(type: SoundType) {
    if (!this.soundEnabled || this.soundPack === 'Silent') return;

    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);

      switch (this.soundPack) {
        case 'Mechanical':
          this.playMechanical(ctx, masterGain, type, now);
          break;
        case 'Laptop':
          this.playLaptop(ctx, masterGain, type, now);
          break;
        case 'Typewriter':
          this.playTypewriter(ctx, masterGain, type, now);
          break;
      }
    } catch (e) {
      // Ignore audio failure
    }
  }

  // ── Mechanical Click Synthesis ─────────────────────────────────────────────
  private playMechanical(ctx: AudioContext, destination: AudioNode, type: SoundType, now: number) {
    const oscClick = ctx.createOscillator();
    const oscThud = ctx.createOscillator();
    const gainClick = ctx.createGain();
    const gainThud = ctx.createGain();

    oscClick.connect(gainClick);
    oscThud.connect(gainThud);
    gainClick.connect(destination);
    gainThud.connect(destination);

    let clickFreq = 1100;
    let thudFreq = 190;
    let clickDecay = 0.012;
    let thudDecay = 0.06;

    if (type === 'space') {
      clickFreq = 800;
      thudFreq = 120;
      clickDecay = 0.015;
      thudDecay = 0.12;
    } else if (type === 'backspace') {
      clickFreq = 950;
      thudFreq = 160;
      clickDecay = 0.012;
      thudDecay = 0.08;
    } else if (type === 'enter') {
      clickFreq = 1000;
      thudFreq = 140;
      clickDecay = 0.02;
      thudDecay = 0.15;
    }

    // High transient click
    oscClick.type = 'triangle';
    oscClick.frequency.setValueAtTime(clickFreq, now);
    oscClick.frequency.exponentialRampToValueAtTime(clickFreq / 2, now + clickDecay);
    gainClick.gain.setValueAtTime(0.08, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + clickDecay);

    // Low chassis thud
    oscThud.type = 'sine';
    oscThud.frequency.setValueAtTime(thudFreq, now);
    gainThud.gain.setValueAtTime(0.35, now);
    gainThud.gain.exponentialRampToValueAtTime(0.001, now + thudDecay);

    oscClick.start(now);
    oscClick.stop(now + clickDecay + 0.01);
    oscThud.start(now);
    oscThud.stop(now + thudDecay + 0.01);
  }

  // ── Laptop Short Pop Synthesis ─────────────────────────────────────────────
  private playLaptop(ctx: AudioContext, destination: AudioNode, type: SoundType, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(destination);

    let freq = 1600;
    let decay = 0.008;
    let vol = 0.18;

    if (type === 'space') {
      freq = 900;
      decay = 0.018;
      vol = 0.22;
    } else if (type === 'backspace') {
      freq = 1300;
      decay = 0.012;
      vol = 0.18;
    } else if (type === 'enter') {
      freq = 1200;
      decay = 0.015;
      vol = 0.25;
    }

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.start(now);
    osc.stop(now + decay + 0.01);
  }

  // ── Typewriter Retro Bell & Metallic Strike Synthesis ──────────────────────
  private playTypewriter(ctx: AudioContext, destination: AudioNode, type: SoundType, now: number) {
    if (type === 'enter') {
      // Play a satisfying classic Typewriter Return Bell
      const oscs = [ctx.createOscillator(), ctx.createOscillator(), ctx.createOscillator()];
      const gain = ctx.createGain();

      gain.connect(destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      // Bell harmonics
      const freqs = [1980, 2430, 2960];
      oscs.forEach((osc, idx) => {
        osc.connect(gain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[idx], now);
        osc.start(now);
        osc.stop(now + 0.5);
      });
      return;
    }

    // Normal strike sounds: noise strike + metallic resonance
    const strikeDecay = type === 'space' ? 0.06 : 0.035;
    const ringDecay = type === 'space' ? 0.09 : 0.055;
    const oscRing = ctx.createOscillator();
    const gainRing = ctx.createGain();

    oscRing.connect(gainRing);
    gainRing.connect(destination);

    let ringFreq = type === 'space' ? 880 : 1800;

    oscRing.type = 'triangle';
    oscRing.frequency.setValueAtTime(ringFreq, now);
    gainRing.gain.setValueAtTime(0.06, now);
    gainRing.gain.exponentialRampToValueAtTime(0.001, now + ringDecay);

    // Dynamic noise strike
    const bufferSize = ctx.sampleRate * strikeDecay;
    if (bufferSize > 0) {
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = type === 'space' ? 700 : 1300;
      noiseFilter.Q.value = 3.0;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + strikeDecay);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(destination);

      noiseSource.start(now);
      noiseSource.stop(now + strikeDecay);
    }

    oscRing.start(now);
    oscRing.stop(now + ringDecay);
  }
}

export const soundEngine = new SoundEngine();
