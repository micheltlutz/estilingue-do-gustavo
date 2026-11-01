// As 20 fases: uma palavra cujas letras estão flutuando no céu ou em cima de
// torres de brinquedo. Montadas com ajudantes (empilhar, ilha, letra, moeda).

import { GROUND_Y, LETTER_SIZE } from './config.ts';

export type Kind = 'block' | 'pillow' | 'pot' | 'fence' | 'crate' | 'platform';

export interface Item {
  readonly kind: Kind;
  /** Centro. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Cor do bloco de brinquedo. */
  readonly color?: string;
}

export interface LetterSpot {
  readonly x: number;
  readonly y: number;
  /** Flutuando (não cai) ou em cima de uma torre (cai se derrubar). */
  readonly float: boolean;
}

export interface Level {
  readonly word: string;
  readonly emoji: string;
  /** Mundo (0 a 3), para a cor do mapa e do cenário. */
  readonly world: number;
  readonly items: readonly Item[];
  /** Uma por letra da palavra, na mesma ordem. */
  readonly letters: readonly LetterSpot[];
  readonly coins: readonly { x: number; y: number }[];
}

/** Quebram com o impulso da Pipoca. */
export const BREAKABLE: readonly Kind[] = ['fence', 'crate'];

const SIZES: Record<string, [Kind, number, number]> = {
  cube: ['block', 70, 70],
  plank: ['block', 150, 28],
  pillow: ['pillow', 112, 46],
  pot: ['pot', 74, 100],
  crate: ['crate', 66, 66],
  fence: ['fence', 20, 120],
};
type Part = keyof typeof SIZES;

const TOY_COLORS = ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#8E24AA', '#FB8C00'];

class Builder {
  readonly items: Item[] = [];
  readonly letters: LetterSpot[] = [];
  readonly coins: { x: number; y: number }[] = [];
  private color = 0;

  /** Empilha peças a partir de uma base (o chão, por padrão). Devolve o topo. */
  stack(x: number, parts: Part[], base = GROUND_Y): number {
    let y = base;
    for (const p of parts) {
      const [kind, w, h] = SIZES[p];
      y -= h;
      const color = kind === 'block' ? TOY_COLORS[this.color++ % TOY_COLORS.length] : undefined;
      this.items.push({ kind, x, y: y + h / 2, w, h, color });
    }
    return y;
  }

  /** Ilha flutuante (não cai). Devolve o topo. */
  island(x: number, top: number, w = 170): number {
    this.items.push({ kind: 'platform', x, y: top + 20, w, h: 40 });
    return top;
  }

  /** Letra em cima de algo (topo em `top`). */
  on(x: number, top: number): this {
    this.letters.push({ x, y: top - LETTER_SIZE / 2, float: false });
    return this;
  }

  /** Letra flutuando no ar. */
  float(x: number, y: number): this {
    this.letters.push({ x, y, float: true });
    return this;
  }

  coin(x: number, y: number): this {
    this.coins.push({ x, y });
    return this;
  }
}

function level(word: string, emoji: string, world: number, build: (b: Builder) => void): Level {
  const b = new Builder();
  build(b);
  return { word, emoji, world, items: b.items, letters: b.letters, coins: b.coins };
}

export const LEVELS: readonly Level[] = [
  // ---------- Mundo 1: céu aberto (aprender a mirar) ----------
  level('SOL', '☀️', 0, (b) => b.float(700, 520).float(900, 470).float(1100, 520)),
  level('LUA', '🌙', 0, (b) => b.float(720, 430).float(960, 350).float(1200, 440)),
  level('UVA', '🍇', 0, (b) => b.float(760, 600).float(1000, 440).float(1260, 330).coin(1000, 270)),
  level('OVO', '🥚', 0, (b) => b.float(700, 330).float(980, 600).float(1280, 420).coin(840, 470)),
  level('MEL', '🍯', 0, (b) => b.float(820, 270).float(1060, 500).float(1350, 660).coin(1200, 310)),

  // ---------- Mundo 2: torres de blocos de brinquedo ----------
  level('GATO', '🐱', 1, (b) => {
    b.on(760, b.stack(760, ['cube', 'cube']));
    b.float(950, 420);
    b.on(1150, b.stack(1150, ['cube', 'cube', 'cube']));
    b.on(1380, b.stack(1380, ['cube']));
    b.coin(1260, 330);
  }),
  level('PATO', '🦆', 1, (b) => {
    b.on(800, b.stack(800, ['cube', 'plank']));
    b.on(1000, b.stack(1000, ['cube', 'cube']));
    b.float(1180, 380);
    b.on(1390, b.stack(1390, ['cube', 'cube', 'cube']));
    b.coin(900, 400);
  }),
  level('BOLA', '⚽', 1, (b) => {
    b.float(780, 450);
    b.on(1000, b.stack(1000, ['cube', 'cube']));
    b.on(1200, b.stack(1200, ['cube']));
    b.on(1420, b.stack(1420, ['cube', 'cube', 'cube', 'cube']));
    b.coin(1310, 420);
  }),
  level('SAPO', '🐸', 1, (b) => {
    b.on(820, b.stack(820, ['cube', 'cube', 'cube']));
    b.on(1020, b.stack(1020, ['cube']));
    b.on(1220, b.stack(1220, ['cube', 'plank']));
    b.on(1430, b.stack(1430, ['cube', 'cube', 'cube']));
    b.coin(1120, 380);
  }),
  level('CASA', '🏠', 1, (b) => {
    b.on(780, b.stack(780, ['cube', 'cube']));
    // Uma "casinha": dois pilares e o telhado.
    b.stack(990, ['cube', 'cube']);
    b.stack(1130, ['cube', 'cube']);
    b.items.push({ kind: 'block', x: 1060, y: GROUND_Y - 140 - 14, w: 230, h: 28, color: '#E53935' });
    b.on(1060, GROUND_Y - 168);
    b.float(1250, 360);
    b.on(1420, b.stack(1420, ['cube', 'cube']));
    b.coin(1060, 400);
  }),

  // ---------- Mundo 3: travesseiros, potes de ração, cercas e caixotes ----------
  level('VACA', '🐄', 2, (b) => {
    b.on(800, b.stack(800, ['pillow', 'pillow']));
    b.on(1000, b.stack(1000, ['pot']));
    b.stack(1150, ['fence']);
    b.on(1240, b.stack(1240, ['cube']));
    b.on(1430, b.island(1430, 460));
    b.coin(1320, 330);
  }),
  level('FOCA', '🦭', 2, (b) => {
    b.on(780, b.stack(780, ['crate']));
    b.on(1000, b.stack(1000, ['pot', 'pillow']));
    b.float(1200, 270);
    b.on(1410, b.stack(1410, ['pot', 'crate']));
    b.coin(890, 420);
  }),
  level('DADO', '🎲', 2, (b) => {
    b.on(800, b.stack(800, ['cube', 'cube']));
    b.on(1060, b.island(1060, 480));
    b.on(1260, b.stack(1260, ['pillow', 'pillow', 'pillow']));
    b.on(1460, b.stack(1460, ['cube', 'cube', 'cube']));
    b.coin(1160, 340);
  }),
  level('ZEBRA', '🦓', 2, (b) => {
    b.float(720, 380);
    b.on(900, b.stack(900, ['pot']));
    b.on(1080, b.stack(1080, ['crate', 'crate']));
    b.on(1280, b.island(1280, 420));
    b.on(1460, b.stack(1460, ['cube', 'pillow', 'cube']));
    b.coin(1180, 280);
  }),
  level('MACACO', '🐒', 2, (b) => {
    b.on(700, b.stack(700, ['cube']));
    b.on(860, b.stack(860, ['pillow']));
    b.float(1000, 330);
    b.on(1170, b.island(1170, 520, 150));
    b.on(1330, b.stack(1330, ['pot']));
    b.on(1490, b.stack(1490, ['cube', 'cube', 'cube']));
    b.coin(1100, 250);
  }),

  // ---------- Mundo 4: os nomes ----------
  level('MIMI', '🐈', 3, (b) => {
    b.float(760, 480);
    b.on(980, b.stack(980, ['cube', 'cube']));
    b.on(1200, b.island(1200, 360));
    b.on(1420, b.stack(1420, ['pot']));
    b.coin(1090, 300);
  }),
  level('PIPOCA', '🐶', 3, (b) => {
    b.float(700, 560);
    b.on(850, b.stack(850, ['crate']));
    b.on(1000, b.stack(1000, ['pillow', 'pillow']));
    b.float(1150, 300);
    b.on(1300, b.island(1300, 480, 150));
    b.on(1470, b.stack(1470, ['cube', 'cube', 'cube']));
    b.coin(1220, 240);
  }),
  level('BOLINHA', '🐰', 3, (b) => {
    b.float(680, 420);
    b.on(820, b.stack(820, ['cube']));
    b.on(960, b.stack(960, ['pot']));
    b.float(1090, 250);
    b.on(1230, b.island(1230, 420, 140));
    b.on(1370, b.stack(1370, ['pillow', 'pillow']));
    b.on(1510, b.stack(1510, ['crate', 'crate']));
    b.coin(1300, 300);
  }),
  level('ESTRELA', '⭐', 3, (b) => {
    b.float(700, 300);
    b.on(840, b.stack(840, ['cube']));
    b.on(980, b.stack(980, ['pot']));
    b.on(1120, b.island(1120, 360, 140));
    b.on(1260, b.stack(1260, ['pillow']));
    b.on(1390, b.stack(1390, ['crate']));
    b.float(1500, 500);
    b.coin(1000, 220);
  }),
  level('GUSTAVO', '👦', 3, (b) => {
    b.float(680, 520);
    b.on(800, b.stack(800, ['cube']));
    b.on(930, b.stack(930, ['pillow']));
    b.on(1060, b.island(1060, 340, 140));
    b.on(1190, b.stack(1190, ['pot']));
    b.on(1320, b.stack(1320, ['crate', 'crate']));
    b.float(1460, 280);
    b.coin(1130, 220).coin(1400, 480);
  }),
];
