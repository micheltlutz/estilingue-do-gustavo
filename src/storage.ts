// Progresso salvo no próprio iPad. Se o armazenamento falhar (modo privado,
// por exemplo), o jogo continua funcionando, só não lembra o progresso.

import type { PetId } from './game/pets.ts';
import type { Outfit } from './ui/sprites.ts';

const KEY = 'estilingue-do-gustavo:v1';

interface SaveData {
  /** Melhor número de estrelas de cada palavra. */
  stars: Record<string, number>;
  /** O que já deu moeda em cada palavra ("L0" = 1ª letra, "C0" = 1ª moeda). */
  earned: Record<string, string[]>;
  /** Moedas gastas na loja. */
  spent: number;
  owned: string[];
  outfits: Partial<Record<PetId, Outfit>>;
  pet: PetId;
  sound: boolean;
}

const PET_IDS: PetId[] = ['pipoca', 'mimi', 'bolinha'];

function read(): SaveData {
  const empty: SaveData = { stars: {}, earned: {}, spent: 0, owned: [], outfits: {}, pet: 'pipoca', sound: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const d = JSON.parse(raw) as Partial<SaveData>;
    return {
      stars: d.stars && typeof d.stars === 'object' ? d.stars : {},
      earned: d.earned && typeof d.earned === 'object' ? d.earned : {},
      spent: Number.isFinite(d.spent) ? Math.max(0, d.spent as number) : 0,
      owned: Array.isArray(d.owned) ? d.owned.filter((x) => typeof x === 'string') : [],
      outfits: d.outfits && typeof d.outfits === 'object' ? d.outfits : {},
      pet: PET_IDS.includes(d.pet as PetId) ? (d.pet as PetId) : 'pipoca',
      sound: d.sound !== false,
    };
  } catch {
    return empty;
  }
}

const state = read();

function write(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento disponível
  }
}

export const store = {
  starsOf: (word: string) => state.stars[word] ?? 0,
  isDone: (word: string) => (state.stars[word] ?? 0) > 0,
  setStars(word: string, stars: number): void {
    if (stars > (state.stars[word] ?? 0)) {
      state.stars[word] = stars;
      write();
    }
  },
  /** Ganha uma moeda (cada letra e cada moeda da fase só valem uma vez). */
  earn(word: string, id: string): boolean {
    const list = (state.earned[word] ??= []);
    if (list.includes(id)) return false;
    list.push(id);
    write();
    return true;
  },
  hasEarned: (word: string, id: string) => (state.earned[word] ?? []).includes(id),
  get coins(): number {
    return Object.values(state.earned).reduce((n, l) => n + l.length, 0) - state.spent;
  },
  owns: (id: string) => state.owned.includes(id),
  buy(id: string, price: number): boolean {
    if (state.owned.includes(id) || this.coins < price) return false;
    state.owned.push(id);
    state.spent += price;
    write();
    return true;
  },
  outfit: (pet: PetId): Outfit => state.outfits[pet] ?? {},
  /** Veste (ou tira, se já estiver usando) a roupinha no bichinho. */
  toggleWear(pet: PetId, slot: keyof Outfit, id: string): void {
    const o = { ...(state.outfits[pet] ?? {}) };
    if (o[slot] === id) delete o[slot];
    else o[slot] = id;
    state.outfits[pet] = o;
    write();
  },
  get pet(): PetId {
    return state.pet;
  },
  set pet(id: PetId) {
    state.pet = id;
    write();
  },
  get sound(): boolean {
    return state.sound;
  },
  set sound(on: boolean) {
    state.sound = on;
    write();
  },
};
