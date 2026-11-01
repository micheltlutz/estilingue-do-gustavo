// Os três bichinhos e as habilidades (tocar na tela durante o voo).

export type PetId = 'pipoca' | 'mimi' | 'bolinha';

export interface Pet {
  readonly id: PetId;
  readonly name: string;
  /** Raio do corpo (física). */
  readonly radius: number;
  readonly density: number;
}

export const PETS: readonly Pet[] = [
  // Pipoca: late e dá um impulso em linha reta, quebrando cercas e caixotes.
  { id: 'pipoca', name: 'Pipoca', radius: 36, density: 0.004 },
  // Mimi: cambalhota e vira três gatinhas.
  { id: 'mimi', name: 'Mimi', radius: 33, density: 0.003 },
  // Bolinha: gira as orelhas e desce flutuando.
  { id: 'bolinha', name: 'Bolinha', radius: 33, density: 0.0028 },
];

export function petById(id: string): Pet {
  return PETS.find((p) => p.id === id) ?? PETS[0];
}

/** Impulso da Pipoca: velocidade mínima e quantos passos ela voa reto. */
export const DASH = { speed: 21, factor: 1.5, steps: 26 };
/** Divisão da Mimi: tamanho das gatinhas e abertura do leque (graus). */
export const SPLIT = { scale: 0.68, spread: 13 };
/** Voo da Bolinha: quanto da gravidade sobra e a velocidade máxima de descida. */
export const FLOAT = { gravity: 0.18, maxFall: 2.6, drag: 0.992 };
