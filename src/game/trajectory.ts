// Caminho do bichinho (as bolinhas coloridas), igual ao que a física faz
// num voo livre: a cada passo a velocidade ganha a gravidade e a posição
// anda a velocidade.

import { G_STEP, GROUND_Y, WORLD_W, launchVelocity, pullPosition } from './config.ts';

export interface Point {
  x: number;
  y: number;
}

/** Pontos do caminho (um a cada `every` passos), até cair no chão ou sair da tela. */
export function trajectory(angleDeg: number, power: number, steps = 150, every = 4): Point[] {
  const p = pullPosition(angleDeg, power);
  const v = launchVelocity(angleDeg, power);
  const out: Point[] = [];
  let { x, y } = p;
  let { x: vx, y: vy } = v;
  for (let i = 1; i <= steps; i++) {
    vy += G_STEP;
    x += vx;
    y += vy;
    if (y > GROUND_Y || x > WORLD_W + 40 || x < -40) break;
    if (i % every === 0) out.push({ x, y });
  }
  return out;
}
