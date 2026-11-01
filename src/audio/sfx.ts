// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio).
//
// No iPad, o áudio só pode começar depois de um toque; ele também pode ser
// interrompido quando o app vai para o segundo plano. Por isso o contexto é
// criado no primeiro toque, liberado de novo a cada toque e recriado se não
// voltar sozinho.

import { store } from '../storage.ts';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function create(): void {
  ctx = new AudioContext();
  const compressor = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(compressor).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

let speechReady = false;

/** No iOS a voz só funciona depois de ser usada uma vez dentro de um toque completo. */
function unlockSpeech(): void {
  if (speechReady || !('speechSynthesis' in window)) return;
  speechReady = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    // sem voz
  }
}

function unlock(): void {
  try {
    if (!ctx) create();
    if (ctx && ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
      // Um som mudo dentro do toque "destrava" o áudio no iOS.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    // sem áudio neste aparelho
  }
}

export function initAudio(): void {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    // não suportado
  }
  for (const ev of ['pointerdown', 'pointerup', 'touchend']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
  for (const ev of ['touchend', 'click']) {
    window.addEventListener(ev, unlockSpeech, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !ctx) return;
    void ctx.resume().catch(() => {});
    setTimeout(() => {
      if (ctx && ctx.state !== 'running') {
        void ctx.close().catch(() => {});
        ctx = null;
        master = null;
      }
    }, 400);
  });
}

function out(): { ac: AudioContext; dest: GainNode } | null {
  if (!store.sound || !ctx || !master || ctx.state !== 'running') return null;
  return { ac: ctx, dest: master };
}

function tone(
  type: OscillatorType,
  freq: number,
  at: number,
  dur: number,
  peak: number,
  freqEnd?: number,
  dest?: AudioNode,
): void {
  const o = out();
  if (!o) return;
  const t = o.ac.currentTime + at;
  const osc = o.ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = o.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest ?? o.dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noiseBurst(at: number, dur: number, peak: number, filter: BiquadFilterType, f1: number, f2 = f1): void {
  const o = out();
  if (!o || !noise) return;
  const t = o.ac.currentTime + at;
  const src = o.ac.createBufferSource();
  src.buffer = noise;
  const bq = o.ac.createBiquadFilter();
  bq.type = filter;
  bq.frequency.setValueAtTime(f1, t);
  bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = o.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bq).connect(g).connect(o.dest);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Voz em português do aparelho (se tiver). */
function ptVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'pt-BR') ?? voices.find((v) => v.lang.startsWith('pt'));
}

export const sfx = {
  /** Elástico esticando (mais agudo quanto mais forte). */
  stretch(power: number): void {
    tone('triangle', 180 + power * 420, 0, 0.07, 0.07, 200 + power * 460);
  },
  /** Soltou o estilingue: "fiu". */
  launch(): void {
    noiseBurst(0, 0.35, 0.18, 'bandpass', 700, 2600);
    tone('sine', 500, 0, 0.25, 0.12, 1200);
  },
  /** Latido: "au!". */
  bark(): void {
    tone('sawtooth', 460, 0, 0.13, 0.18, 260);
    noiseBurst(0, 0.1, 0.12, 'bandpass', 1400, 700);
    tone('sawtooth', 480, 0.17, 0.12, 0.15, 270);
    noiseBurst(0.17, 0.09, 0.1, 'bandpass', 1400, 700);
  },
  /** Miado: "miau". */
  meow(): void {
    tone('sine', 650, 0, 0.18, 0.18, 1050);
    tone('sine', 1050, 0.17, 0.3, 0.16, 560);
    tone('triangle', 1300, 0.05, 0.3, 0.04, 900);
  },
  /** Coelhinho: guincho fininho. */
  squeak(): void {
    tone('sine', 1500, 0, 0.08, 0.15, 2300);
    tone('sine', 1700, 0.11, 0.09, 0.13, 2600);
  },
  /** Batida: muda conforme o que bateu. */
  hit(kind: string, speed: number): void {
    const v = Math.min(1, speed / 14);
    if (kind === 'pillow') {
      noiseBurst(0, 0.18, 0.12 * v + 0.03, 'lowpass', 600, 200);
    } else if (kind === 'pot') {
      tone('sine', 180, 0, 0.22, 0.25 * v + 0.05, 90);
      noiseBurst(0, 0.12, 0.08 * v, 'lowpass', 900, 300);
    } else if (kind === 'ground') {
      noiseBurst(0, 0.15, 0.1 * v + 0.02, 'lowpass', 400, 120);
    } else {
      tone('triangle', 320 + Math.random() * 80, 0, 0.08, 0.18 * v + 0.04, 220);
      noiseBurst(0, 0.05, 0.08 * v, 'highpass', 2000);
    }
  },
  /** Madeira quebrando (impulso da Pipoca). */
  crack(): void {
    noiseBurst(0, 0.25, 0.3, 'bandpass', 1800, 600);
    tone('square', 140, 0, 0.12, 0.08, 80);
  },
  /** Impulso da Pipoca. */
  dash(): void {
    noiseBurst(0, 0.3, 0.2, 'bandpass', 900, 3000);
  },
  /** Mimi virou três: "plim plim plim". */
  split(): void {
    [1046.5, 1318.51, 1567.98].forEach((f, i) => tone('triangle', f, i * 0.07, 0.15, 0.16));
  },
  /** Orelhas da Bolinha girando. */
  heli(): void {
    for (let i = 0; i < 8; i++) tone('square', 120, i * 0.07, 0.04, 0.06, 100);
  },
  /** Sacudindo a poeira. */
  poof(): void {
    for (let i = 0; i < 4; i++) noiseBurst(i * 0.08, 0.06, 0.07, 'highpass', 2500);
  },
  /** Pegou uma letra: festa! */
  letter(): void {
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone('triangle', f, i * 0.07, 0.22, 0.2));
    tone('sine', 2093, 0.3, 0.3, 0.06);
  },
  /** Pegou uma moeda. */
  coin(): void {
    tone('square', 988, 0, 0.08, 0.08);
    tone('square', 1319, 0.08, 0.22, 0.08);
  },
  /** Comprou uma roupinha. */
  buy(): void {
    [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => tone('square', f, i * 0.07, 0.12, 0.07));
  },
  /** Recomeçar: som "de volta". */
  undo(): void {
    tone('sine', 700, 0, 0.18, 0.3, 300);
  },
  /** Toque em botão. */
  pop(): void {
    tone('sine', 500, 0, 0.1, 0.35, 900);
  },
  /** Festa: palavra completa. */
  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone('triangle', f, i * 0.11, 0.22, 0.3));
    for (const f of [523.25, 659.25, 783.99]) tone('triangle', f, 0.5, 0.8, 0.22);
    [1568, 2093, 1760, 2637].forEach((f, i) => tone('sine', f, 0.55 + i * 0.09, 0.12, 0.08));
  },
  /** Fala, esperando a fala anterior terminar (letras pegas em seguida). */
  sayNext(text: string): void {
    if (!store.sound || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      const voice = ptVoice();
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch {
      // sem voz
    }
  },
  /** Fala com a voz do iPad. */
  say(text: string): void {
    if (!store.sound || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      const voice = ptVoice();
      if (voice) u.voice = voice;
      u.rate = 0.9;
      u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch {
      // sem voz
    }
  },
};
