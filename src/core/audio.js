/**
 * Áudio atmosférico provisório, gerado com WebAudio — sem arquivos externos.
 * Piano/harpa/flauta serão substituídos por trilhas originais no futuro.
 */
const CHORDS = {
  morning: [57, 61, 64, 69],
  afternoon: [60, 64, 67, 72],
  sunset: [53, 57, 60, 65],
  night: [50, 53, 57, 62]
};
const PENTATONIC = [69, 72, 74, 76, 79, 81, 84];

const midiToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

export class AudioManager {
  constructor(volume = 45) {
    this.volume = volume;
    this.ctx = null;
    this.master = null;
    this.padGain = null;
    this.oscillators = [];
    this.phase = 'morning';
    this.nextChord = 0;
    this.nextBell = 0;
    this.enabled = false;
  }

  /** Deve ser chamado dentro de um gesto do usuário. */
  async start() {
    if (this.ctx) {
      await this.ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume / 100 * 0.5;
      this.master.connect(this.ctx.destination);

      this.padGain = this.ctx.createGain();
      this.padGain.gain.value = 0.0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      this.padGain.connect(filter);
      filter.connect(this.master);

      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = midiToFreq(CHORDS[this.phase][i]);
        osc.detune.value = (i - 1.5) * 4;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.035 / (i + 1);
        osc.connect(gain);
        gain.connect(this.padGain);
        osc.start();
        this.oscillators.push(osc);
      }

      // Leve oscilação de volume, como respiração.
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(this.padGain.gain);
      lfo.start();

      this.padGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 2);
      this.enabled = true;
      this.nextBell = this.ctx.currentTime + 4;
      this.nextChord = this.ctx.currentTime + 12;
    } catch (error) {
      console.warn('[Minha Noite] Áudio indisponível:', error);
    }
  }

  setVolume(value) {
    this.volume = value;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value / 100 * 0.5, this.ctx.currentTime, 0.2);
    }
  }

  setPhase(phaseId) {
    if (!CHORDS[phaseId] || phaseId === this.phase) return;
    this.phase = phaseId;
    this.master && this.oscillators.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(midiToFreq(CHORDS[phaseId][i]), this.ctx.currentTime, 3);
    });
  }

  playBell(note = null) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToFreq(note ?? PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]);
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 2.5);
  }

  update() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now > this.nextChord) {
      this.nextChord = now + 14 + Math.random() * 8;
      const chord = CHORDS[this.phase];
      this.oscillators.forEach((osc, i) => {
        osc.frequency.setTargetAtTime(midiToFreq(chord[i] + (Math.random() > 0.8 ? 12 : 0)), now, 2.5);
      });
    }
    if (now > this.nextBell) {
      this.nextBell = now + 5 + Math.random() * 11;
      this.playBell();
    }
  }

  suspend() {
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
  }
}
