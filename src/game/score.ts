// Estrelas da fase: nunca zero. Quanto menos lançamentos, mais estrelas.

export function starsFor(launches: number, letters: number): 1 | 2 | 3 {
  if (launches <= letters + 2) return 3;
  if (launches <= letters + 5) return 2;
  return 1;
}
