class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  public unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.buildNoiseBuffer();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean) {
    this.muted = m;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private buildNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private ready(): boolean {
    if (this.muted) return false;
    if (!this.ctx || this.ctx.state !== "running") return false;
    return true;
  }

  public playWeaponFire(
    type: "smg" | "shotgun" | "ar" | "sniper",
    volume = 1
  ) {
    if (!this.ready() || !this.ctx || !this.noiseBuffer) return;
    const vol = Math.max(0.02, Math.min(1, volume));
    const now = this.ctx.currentTime;

    if (type === "smg") {
      // Crisp suppressed snap
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1900 + Math.random() * 250, now);
      filter.Q.value = 1.6;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      noise.connect(filter).connect(gain).connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.06);

      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);
      const oGain = this.ctx.createGain();
      oGain.gain.setValueAtTime(0.14 * vol, now);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(oGain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === "shotgun") {
      // Heavy booming scattergun blast
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.22);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.42 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      noise.connect(filter).connect(gain).connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.25);

      const sub = this.ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(135, now);
      sub.frequency.exponentialRampToValueAtTime(34, now + 0.19);
      const sGain = this.ctx.createGain();
      sGain.gain.setValueAtTime(0.45 * vol, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      sub.connect(sGain).connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.22);
    } else if (type === "ar") {
      // Punchy tactical carbine
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1250 + Math.random() * 180, now);
      filter.Q.value = 0.85;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.26 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      noise.connect(filter).connect(gain).connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.1);

      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.07);
      const oGain = this.ctx.createGain();
      oGain.gain.setValueAtTime(0.18 * vol, now);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(oGain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    } else {
      // Rail sniper crack + harmonic whine
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(650, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.36 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      noise.connect(filter).connect(gain).connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.28);

      const rail = this.ctx.createOscillator();
      rail.type = "sawtooth";
      rail.frequency.setValueAtTime(940, now);
      rail.frequency.exponentialRampToValueAtTime(90, now + 0.24);
      const rGain = this.ctx.createGain();
      rGain.gain.setValueAtTime(0.24 * vol, now);
      rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      rail.connect(rGain).connect(this.ctx.destination);
      rail.start(now);
      rail.stop(now + 0.26);
    }
  }

  public playHitmarker(isKill = false, armorCrack = false) {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isKill ? 1480 : 1120, now);
    osc.frequency.exponentialRampToValueAtTime(isKill ? 680 : 520, now + 0.045);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isKill ? 0.22 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    if (armorCrack) {
      const sh = this.ctx.createOscillator();
      sh.type = "square";
      sh.frequency.setValueAtTime(2200, now);
      sh.frequency.exponentialRampToValueAtTime(600, now + 0.09);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.11, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      sh.connect(sg).connect(this.ctx.destination);
      sh.start(now);
      sh.stop(now + 0.11);
    }

    if (isKill) {
      // Deep satisfying elimination double-chime
      const chime = this.ctx.createOscillator();
      chime.type = "sine";
      chime.frequency.setValueAtTime(587.33, now + 0.03);
      chime.frequency.setValueAtTime(880, now + 0.11);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.18, now + 0.03);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      chime.connect(cg).connect(this.ctx.destination);
      chime.start(now + 0.03);
      chime.stop(now + 0.35);
    }
  }

  public playExplosion(volume = 1) {
    if (!this.ready() || !this.ctx || !this.noiseBuffer) return;
    const vol = Math.max(0.06, Math.min(1, volume));
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(85, now + 0.65);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    noise.connect(filter).connect(gain).connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.75);

    const boom = this.ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(110, now);
    boom.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.58 * vol, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    boom.connect(bg).connect(this.ctx.destination);
    boom.start(now);
    boom.stop(now + 0.62);
  }

  public playRicochet(volume = 0.5) {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    const startFreq = 2100 + Math.random() * 900;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.06);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playFootstep(volume = 0.35) {
    if (!this.ready() || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280 + Math.random() * 80, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.075 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    noise.connect(filter).connect(gain).connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  public playPickup(kind: "medkit" | "armor" | "ammo" | "optics") {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs =
      kind === "medkit"
        ? [523, 659, 784]
        : kind === "armor"
          ? [392, 587]
          : kind === "optics"
            ? [660, 990, 1320]
            : [440, 554];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.11, now + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.12);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.13);
    });
  }

  public playReload() {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.14].forEach((offset, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(idx === 0 ? 320 : 520, now + offset);
      osc.frequency.exponentialRampToValueAtTime(160, now + offset + 0.035);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.075, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.045);
    });
  }

  public playAbility() {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playTargetLock() {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1750, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playPlayerHurt() {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.11);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playMatchEnd(victory: boolean) {
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = victory ? [440, 554.37, 659.25, 880] : [330, 277.18, 220, 146.83];
    notes.forEach((n, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = victory ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(n, now + i * 0.11);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, now + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.32);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.35);
    });
  }

  public playUiClick(pitch = 1) {
    this.unlock();
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(620 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(280 * pitch, now + 0.032);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playPurchase() {
    this.unlock();
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.13, now + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.22);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.24);
    });
  }

  public playQuestClaim() {
    this.unlock();
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 587.33, 880].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, now + i * 0.065);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.26);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.28);
    });
  }

  public playCrateOpen(rarity: "rare" | "epic" | "legendary" = "epic") {
    this.unlock();
    if (!this.ready() || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Tension riser
    const riser = this.ctx.createOscillator();
    riser.type = "sawtooth";
    riser.frequency.setValueAtTime(140, now);
    riser.frequency.exponentialRampToValueAtTime(640, now + 0.35);
    const rg = this.ctx.createGain();
    rg.gain.setValueAtTime(0.07, now);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    riser.connect(rg).connect(this.ctx.destination);
    riser.start(now);
    riser.stop(now + 0.4);

    // Reveal chord
    const notes =
      rarity === "legendary"
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : rarity === "epic"
          ? [440, 554.37, 659.25, 880]
          : [392, 493.88, 587.33];

    notes.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + 0.32 + idx * 0.045);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, now + 0.32 + idx * 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.85 + idx * 0.045);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + 0.32 + idx * 0.045);
      osc.stop(now + 0.88 + idx * 0.045);
    });
  }
}

export const soundEngine = new TacticalSoundEngine();
