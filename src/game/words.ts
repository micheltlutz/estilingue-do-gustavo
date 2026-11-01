// Cada letra tem uma palavra ("G de Gato") e cada fase tem uma figura.

/** Nome falado da letra e a palavra que começa com ela. */
export const LETTERS: Record<string, { say: string; word: string }> = {
  A: { say: 'A', word: 'Abelha' },
  B: { say: 'Bê', word: 'Bola' },
  C: { say: 'Cê', word: 'Cachorrinho' },
  D: { say: 'Dê', word: 'Dado' },
  E: { say: 'É', word: 'Elefante' },
  F: { say: 'Éfe', word: 'Foca' },
  G: { say: 'Gê', word: 'Gato' },
  H: { say: 'Agá', word: 'Hipopótamo' },
  I: { say: 'I', word: 'Ilha' },
  J: { say: 'Jota', word: 'Jacaré' },
  K: { say: 'Cá', word: 'Kiwi' },
  L: { say: 'Éle', word: 'Leão' },
  M: { say: 'Ême', word: 'Macaco' },
  N: { say: 'Êne', word: 'Navio' },
  O: { say: 'Ó', word: 'Ovo' },
  P: { say: 'Pê', word: 'Pato' },
  Q: { say: 'Quê', word: 'Queijo' },
  R: { say: 'Érre', word: 'Rato' },
  S: { say: 'Ésse', word: 'Sapo' },
  T: { say: 'Tê', word: 'Tartaruga' },
  U: { say: 'U', word: 'Uva' },
  V: { say: 'Vê', word: 'Vaca' },
  W: { say: 'Dáblio', word: 'Waffle' },
  X: { say: 'Xis', word: 'Xícara' },
  Y: { say: 'Ípsilon', word: 'Yoga' },
  Z: { say: 'Zê', word: 'Zebra' },
};

/** O que a voz fala ao pegar a letra: "Gê de Gato!". */
export function letterLine(ch: string): string {
  const l = LETTERS[ch];
  return l ? `${l.say} de ${l.word}!` : ch;
}

/** A palavra com só a primeira letra maiúscula, para a voz ("GATO" → "Gato"). */
export function spoken(word: string): string {
  return word[0] + word.slice(1).toLowerCase();
}
