// Desenhos: os bichinhos (SVG, redondos), as roupinhas e o cenário (canvas).

import type { Kind } from '../game/levels.ts';
import type { PetId } from '../game/pets.ts';

// ---------- roupinhas ----------

export type Slot = 'hat' | 'glasses' | 'neck';

export interface Item {
  readonly id: string;
  readonly slot: Slot;
  readonly name: string;
  /** Preço em moedas (somam 102; o jogo tem 108 moedas). */
  readonly price: number;
}

export const ITEMS: readonly Item[] = [
  { id: 'party', slot: 'hat', name: 'Chapéu de festa', price: 8 },
  { id: 'bow', slot: 'neck', name: 'Gravata borboleta', price: 10 },
  { id: 'sun', slot: 'glasses', name: 'Óculos de sol', price: 14 },
  { id: 'cowboy', slot: 'hat', name: 'Chapéu de caubói', price: 18 },
  { id: 'heart', slot: 'glasses', name: 'Óculos de coração', price: 22 },
  { id: 'crown', slot: 'hat', name: 'Coroa', price: 30 },
];

export type Outfit = Partial<Record<Slot, string>>;

const INK = '#3E2723';

/** Roupinhas desenhadas no espaço do rosto (raio 50, centro 0,0). */
const ITEM_ART: Record<string, string> = {
  party: `<g transform="rotate(12 0 -44)"><path d="M-17 -40 L0 -96 L17 -40 Q0 -34 -17 -40 Z" fill="#AB47BC" stroke="#6A1B9A" stroke-width="3" stroke-linejoin="round"/><path d="M-11 -58 L11 -58 M-8 -74 L8 -74" stroke="#FFEB3B" stroke-width="4"/><circle cx="0" cy="-98" r="7" fill="#FFEB3B" stroke="#F9A825" stroke-width="2"/></g>`,
  cowboy: `<g><ellipse cx="0" cy="-42" rx="50" ry="10" fill="#8D6E63" stroke="#5D4037" stroke-width="3"/><path d="M-26 -44 Q-28 -78 -10 -78 Q0 -70 10 -78 Q28 -78 26 -44 Z" fill="#A1887F" stroke="#5D4037" stroke-width="3" stroke-linejoin="round"/><path d="M-25 -52 H25" stroke="#E53935" stroke-width="5"/></g>`,
  crown: `<g><path d="M-30 -40 L-34 -80 L-17 -60 L0 -88 L17 -60 L34 -80 L30 -40 Z" fill="#FFCA28" stroke="#F57F17" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-54" r="5" fill="#E53935"/><circle cx="-18" cy="-50" r="4" fill="#1E88E5"/><circle cx="18" cy="-50" r="4" fill="#43A047"/></g>`,
  sun: `<g><path d="M-36 -14 H-4 Q-3 4 -20 4 Q-37 4 -36 -14 Z M4 -14 H36 Q37 4 20 4 Q3 4 4 -14 Z" fill="#212121" stroke="#000" stroke-width="2" stroke-linejoin="round"/><path d="M-4 -12 Q0 -16 4 -12" fill="none" stroke="#000" stroke-width="3"/><path d="M-30 -9 h8 M10 -9 h8" stroke="#90CAF9" stroke-width="3" stroke-linecap="round"/></g>`,
  heart: `<g fill="#E53935" stroke="#B71C1C" stroke-width="2.5" stroke-linejoin="round"><path d="M-20 6 L-36 -8 Q-42 -20 -31 -22 Q-23 -23 -20 -15 Q-17 -23 -9 -22 Q2 -20 -4 -8 Z"/><path d="M20 6 L4 -8 Q-2 -20 9 -22 Q17 -23 20 -15 Q23 -23 31 -22 Q42 -20 36 -8 Z"/><path d="M-4 -12 Q0 -16 4 -12" fill="none"/></g>`,
  bow: `<g><path d="M0 46 L-20 34 Q-24 46 -20 58 Z M0 46 L20 34 Q24 46 20 58 Z" fill="#1E88E5" stroke="#0D47A1" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="46" r="6.5" fill="#42A5F5" stroke="#0D47A1" stroke-width="3"/></g>`,
};

// ---------- bichinhos ----------

function eyes(color = INK, pupil = false): string {
  if (pupil) {
    // Gatinha: olho verde com pupila fininha.
    return `<ellipse cx="-18" cy="-6" rx="9" ry="10" fill="#7CB342"/><ellipse cx="18" cy="-6" rx="9" ry="10" fill="#7CB342"/>
      <ellipse cx="-18" cy="-6" rx="3" ry="8" fill="${INK}"/><ellipse cx="18" cy="-6" rx="3" ry="8" fill="${INK}"/>
      <circle cx="-15" cy="-10" r="2.5" fill="#fff"/><circle cx="21" cy="-10" r="2.5" fill="#fff"/>`;
  }
  return `<circle cx="-18" cy="-6" r="8.5" fill="${color}"/><circle cx="18" cy="-6" r="8.5" fill="${color}"/>
    <circle cx="-15" cy="-9.5" r="3" fill="#fff"/><circle cx="21" cy="-9.5" r="3" fill="#fff"/>`;
}

const mouthHappy = `<path d="M-12 21 Q0 38 12 21 Z" fill="#5D4037"/><path d="M-6 28 Q0 35 6 28 Q0 25 -6 28 Z" fill="#FF8A80"/>`;
const mouthSmile = `<path d="M0 15 V20 M-11 20 Q-5.5 26 0 20 Q5.5 26 11 20" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

function face(id: PetId, happy: boolean): string {
  const mouth = happy ? mouthHappy : mouthSmile;
  if (id === 'pipoca') {
    return `
      <path d="M-40 -34 Q-74 -24 -62 22 Q-52 36 -38 14 Z" fill="#C98A2B"/>
      <path d="M40 -34 Q74 -24 62 22 Q52 36 38 14 Z" fill="#C98A2B"/>
      <circle r="50" fill="#F0B44C"/>
      <ellipse cy="-28" rx="26" ry="13" fill="#F8CF78"/>
      <ellipse cy="18" rx="27" ry="20" fill="#FCE6BA"/>
      <circle cx="-31" cy="14" r="6" fill="#FF8A80" opacity=".5"/><circle cx="31" cy="14" r="6" fill="#FF8A80" opacity=".5"/>
      ${eyes()}
      <ellipse cy="9" rx="10" ry="7" fill="${INK}"/><ellipse cx="-3" cy="6.5" rx="3" ry="1.8" fill="#fff" opacity=".7"/>
      ${mouth}`;
  }
  if (id === 'mimi') {
    return `
      <path d="M-46 -12 L-40 -64 L-8 -44 Z" fill="#90A4AE" stroke="#78909C" stroke-width="3" stroke-linejoin="round"/>
      <path d="M46 -12 L40 -64 L8 -44 Z" fill="#90A4AE" stroke="#78909C" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-38 -24 L-36 -52 L-18 -40 Z M38 -24 L36 -52 L18 -40 Z" fill="#F8BBD0"/>
      <circle r="50" fill="#B0BEC5"/>
      <path d="M-10 -48 L-8 -32 M0 -50 L0 -33 M10 -48 L8 -32" stroke="#78909C" stroke-width="4" stroke-linecap="round"/>
      <ellipse cy="20" rx="24" ry="17" fill="#ECEFF1"/>
      <circle cx="-32" cy="14" r="6" fill="#FF8A80" opacity=".45"/><circle cx="32" cy="14" r="6" fill="#FF8A80" opacity=".45"/>
      ${eyes(INK, true)}
      <path d="M-6 8 L6 8 L0 15 Z" fill="#F06292"/>
      <path d="M-46 10 L-22 14 M-46 22 L-22 19 M46 10 L22 14 M46 22 L22 19" stroke="#607D8B" stroke-width="2" stroke-linecap="round"/>
      ${mouth}`;
  }
  return `
    <ellipse cx="-20" cy="-74" rx="15" ry="44" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="3" transform="rotate(-10 -20 -40)"/>
    <ellipse cx="20" cy="-74" rx="15" ry="44" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="3" transform="rotate(10 20 -40)"/>
    <ellipse cx="-20" cy="-72" rx="7" ry="32" fill="#F8BBD0" transform="rotate(-10 -20 -40)"/>
    <ellipse cx="20" cy="-72" rx="7" ry="32" fill="#F8BBD0" transform="rotate(10 20 -40)"/>
    <circle r="50" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="3"/>
    <ellipse cy="18" rx="22" ry="16" fill="#FFFFFF"/>
    <circle cx="-31" cy="14" r="7" fill="#F48FB1" opacity=".55"/><circle cx="31" cy="14" r="7" fill="#F48FB1" opacity=".55"/>
    ${eyes()}
    <ellipse cy="8" rx="6" ry="4.5" fill="#F06292"/>
    ${happy ? mouthHappy : `${mouthSmile}<rect x="-6" y="21" width="12" height="9" rx="2" fill="#fff" stroke="#BDBDBD" stroke-width="1.5"/>`}`;
}

/** O bichinho (rosto de raio 50 no centro), com as roupinhas. */
export function petSvg(id: PetId, outfit: Outfit = {}, happy = false, size = 256): string {
  const extras = (['neck', 'glasses', 'hat'] as Slot[]).map((s) => (outfit[s] ? ITEM_ART[outfit[s]!] ?? '' : '')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-75 -125 150 190" width="${size}" height="${Math.round((size * 190) / 150)}">${face(id, happy)}${extras}</svg>`;
}

/** Uma roupinha sozinha (para a loja). */
export function itemSvg(id: string): string {
  const view: Record<string, string> = {
    party: '-30 -110 60 75',
    cowboy: '-55 -84 110 50',
    crown: '-40 -94 80 60',
    sun: '-40 -20 80 30',
    heart: '-44 -26 88 36',
    bow: '-26 30 52 32',
  };
  return `<svg viewBox="${view[id]}" aria-hidden="true">${ITEM_ART[id]}</svg>`;
}

/** Imagens prontas para o canvas (o SVG vira imagem uma vez só). */
const cache = new Map<string, HTMLImageElement>();
export function petImage(id: PetId, outfit: Outfit, happy: boolean): HTMLImageElement {
  const key = `${id}|${outfit.hat ?? ''}|${outfit.glasses ?? ''}|${outfit.neck ?? ''}|${happy}`;
  let img = cache.get(key);
  if (!img) {
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(petSvg(id, outfit, happy))}`;
    cache.set(key, img);
  }
  return img;
}

/** Posição do centro do rosto dentro da imagem (fração da largura e da altura). */
export const PET_IMG = { cx: 75 / 150, cy: 125 / 190, faceR: 50 / 150 };

// ---------- cenário (canvas) ----------

export const WORLD_SKY = [
  ['#4FC3F7', '#E1F5FE'],
  ['#4DD0E1', '#FCE4EC'],
  ['#FF8A65', '#FFF3E0'],
  ['#5C6BC0', '#F3E5F5'],
] as const;

type Ctx = CanvasRenderingContext2D;

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const PILLOWS = ['#CE93D8', '#81D4FA', '#FFF59D', '#A5D6A7'];

/** Desenha uma peça centrada em (0,0) (o chamador já girou e posicionou). */
export function drawItem(ctx: Ctx, kind: Kind, w: number, h: number, color = '#E53935', seed = 0): void {
  const x = -w / 2;
  const y = -h / 2;
  ctx.lineJoin = 'round';
  if (kind === 'block') {
    // Bloco de montar, com pininhos em cima.
    const studs = Math.max(1, Math.round(w / 36));
    for (let i = 0; i < studs; i++) {
      const cx = x + (w / studs) * (i + 0.5);
      rrect(ctx, cx - 9, y - 7, 18, 10, 3);
      ctx.fillStyle = shade(color, 0.85);
      ctx.fill();
    }
    rrect(ctx, x, y, w, h, 8);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = shade(color, 0.7);
    ctx.stroke();
    rrect(ctx, x + 5, y + 5, w - 10, Math.min(10, h / 3), 4);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fill();
  } else if (kind === 'pillow') {
    const c = PILLOWS[seed % PILLOWS.length];
    rrect(ctx, x, y, w, h, 18);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = shade(c, 0.8);
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    rrect(ctx, x + 7, y + 7, w - 14, h - 14, 12);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = shade(c, 0.75);
    ctx.fill();
  } else if (kind === 'pot') {
    // Pote gigante de ração, com um ossinho no rótulo.
    rrect(ctx, x, y, w, h, 10);
    ctx.fillStyle = '#EF5350';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#B71C1C';
    ctx.stroke();
    rrect(ctx, x - 4, y, w + 8, 14, 6);
    ctx.fillStyle = '#C62828';
    ctx.fill();
    rrect(ctx, x + 8, -14, w - 16, 30, 8);
    ctx.fillStyle = '#FFF8E1';
    ctx.fill();
    // Ossinho no rótulo.
    ctx.fillStyle = '#FFB300';
    for (const [bx, by] of [
      [-12, -4],
      [-12, 6],
      [12, -4],
      [12, 6],
    ]) {
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(-12, -3, 24, 8);
  } else if (kind === 'fence') {
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.lineTo(0, y);
    ctx.lineTo(x + w, y + 12);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = '#D7B899';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8D6E63';
    ctx.stroke();
  } else if (kind === 'crate') {
    rrect(ctx, x, y, w, h, 6);
    ctx.fillStyle = '#C68A4E';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#7B4A21';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + w - 8, y + h - 8);
    ctx.moveTo(x + w - 8, y + 8);
    ctx.lineTo(x + 8, y + h - 8);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#9C6532';
    ctx.stroke();
  } else {
    // Ilha flutuante: grama em cima, terra embaixo.
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 16);
    ctx.quadraticCurveTo(x + w * 0.2, y + h + 34, 0, y + h + 40);
    ctx.quadraticCurveTo(x + w * 0.8, y + h + 34, x + w - 10, y + 16);
    ctx.closePath();
    ctx.fillStyle = '#8D6E63';
    ctx.fill();
    rrect(ctx, x, y, w, 22, 11);
    ctx.fillStyle = '#7CB342';
    ctx.fill();
    ctx.fillStyle = '#9CCC65';
    rrect(ctx, x + 6, y + 3, w - 12, 7, 4);
    ctx.fill();
  }
}

const LETTER_COLORS = ['#E53935', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00', '#00ACC1', '#D81B60'];

export function letterColor(i: number): string {
  return LETTER_COLORS[i % LETTER_COLORS.length];
}

/** Letra: bloquinho do alfabeto (em cima das torres) ou bolha (flutuando). */
export function drawLetter(ctx: Ctx, ch: string, size: number, color: string, float: boolean): void {
  if (float) {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-size * 0.22, -size * 0.28, size * 0.14, size * 0.08, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fill();
  } else {
    rrect(ctx, -size / 2, -size / 2, size, size, 10);
    ctx.fillStyle = '#FFF8E1';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.fillStyle = float ? '#ffffff' : color;
  ctx.font = `900 ${Math.round(size * 0.72)}px ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, size * 0.04);
}

export function drawCoin(ctx: Ctx, r: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFCA28';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#F57F17';
  ctx.stroke();
  ctx.fillStyle = '#FFF59D';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r * 0.55 : r * 0.24;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Estilingue: a parte de trás (forquilha) e a da frente (cabo e elástico). */
export function drawSlingBack(ctx: Ctx, x: number, y: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 30);
  ctx.lineTo(x + 26, y - 30);
  ctx.stroke();
}

export function drawSlingFront(ctx: Ctx, x: number, y: number, ground: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.lineTo(x, y + 40);
  ctx.moveTo(x, y + 44);
  ctx.lineTo(x - 22, y - 30);
  ctx.moveTo(x, y + 44);
  ctx.lineTo(x + 18, y + 30);
  ctx.stroke();
  ctx.strokeStyle = '#A1887F';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 4, ground - 10);
  ctx.lineTo(x - 4, y + 50);
  ctx.stroke();
}

/** Elástico do estilingue até o bichinho. */
export function drawBand(ctx: Ctx, fromX: number, fromY: number, toX: number, toY: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#C62828';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}
