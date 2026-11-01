// Medidas do mundo (unidades da física = "pixels" de um cenário 1600 x 900).

export const WORLD_W = 1600;
export const WORLD_H = 900;
/** Altura do chão (topo da grama). */
export const GROUND_Y = 840;
/** Onde o bichinho fica no estilingue (entre as forquilhas). */
export const SLING = { x: 250, y: 620 } as const;
/** Quanto dá para puxar o elástico. */
export const MAX_PULL = 160;
/** Velocidade com o elástico todo puxado (por passo de física). */
export const MAX_SPEED = 23;
/** Puxão menor que isso cancela (o bichinho volta). */
export const MIN_PULL = 24;
/** Passo fixo da física (60 por segundo). */
export const DT = 1000 / 60;
/** Gravidade do Matter.js e a aceleração que ela dá por passo. */
export const GRAVITY = 1;
export const GRAVITY_SCALE = 0.001;
export const G_STEP = GRAVITY * GRAVITY_SCALE * DT * DT;
/** Tamanho das letras e quão perto o bichinho precisa passar para pegar. */
export const LETTER_SIZE = 58;
export const CATCH_MARGIN = 14;
/** Um lançamento acaba depois disso, no máximo (passos). */
export const TURN_MAX_STEPS = 60 * 8;

/** Velocidade de saída para um puxão (ângulo em graus: 0 = para a direita, 90 = para cima). */
export function launchVelocity(angleDeg: number, power: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  const speed = Math.max(0, Math.min(1, power)) * MAX_SPEED;
  return { x: Math.cos(a) * speed, y: -Math.sin(a) * speed };
}

/** Onde o bichinho fica quando o elástico está puxado com esse ângulo e força. */
export function pullPosition(angleDeg: number, power: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  const len = Math.max(0, Math.min(1, power)) * MAX_PULL;
  return { x: SLING.x - Math.cos(a) * len, y: SLING.y + Math.sin(a) * len };
}
