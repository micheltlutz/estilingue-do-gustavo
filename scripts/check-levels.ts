// Verificador de fases: para cada letra, procura um puxão (ângulo e força)
// que pega a letra com qualquer bichinho, sem habilidade, a partir da fase
// montada. Grava esses puxões como dicas em src/game/hints.json.
// Uso: npm run check

import { writeFileSync } from 'node:fs';
import { CATCH_MARGIN, LETTER_SIZE } from '../src/game/config.ts';
import { LEVELS, type Level } from '../src/game/levels.ts';
import { PETS } from '../src/game/pets.ts';
import { Sim } from '../src/game/sim.ts';
import { trajectory } from '../src/game/trajectory.ts';

export interface Hint {
  angle: number;
  power: number;
}

/** Puxões cujo caminho (sem obstáculos) passa bem perto da letra: o melhor de cada ângulo. */
function candidates(x: number, y: number): Array<Hint & { d: number }> {
  const reach = 33 + LETTER_SIZE / 2 + CATCH_MARGIN - 12;
  const out: Array<Hint & { d: number }> = [];
  for (let angle = -8; angle <= 82; angle += 2) {
    let best: (Hint & { d: number }) | null = null;
    for (let power = 0.25; power <= 1.0001; power += 0.0125) {
      let d = Infinity;
      for (const p of trajectory(angle, power, 260, 1)) d = Math.min(d, Math.hypot(p.x - x, p.y - y));
      if (d < reach && (!best || d < best.d)) best = { angle, power: Math.round(power * 1000) / 1000, d };
    }
    if (best) out.push(best);
  }
  // Primeiro os que passam mais no meio da letra.
  return out.sort((a, b) => a.d - b.d);
}

/** O puxão pega a letra com os três bichinhos? */
function works(level: Level, index: number, h: Hint): boolean {
  return PETS.every((pet) => {
    const sim = new Sim(level);
    const events = sim.playLaunch(pet.id, h.angle, h.power);
    return events.some((e) => e.type === 'letter' && e.index === index);
  });
}

export function findHints(level: Level): Array<Hint | null> {
  return level.letters.map((spot, index) => {
    for (const c of candidates(spot.x, spot.y).slice(0, 30)) {
      if (works(level, index, c)) return { angle: c.angle, power: c.power };
    }
    return null;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all: Record<string, Array<Hint | null>> = {};
  let missing = 0;
  for (const level of LEVELS) {
    const t0 = performance.now();
    const hints = findHints(level);
    all[level.word] = hints;
    const bad = hints.flatMap((h, i) => (h ? [] : [`${level.word[i]}(${i + 1})`]));
    missing += bad.length;
    console.log(
      `${level.word.padEnd(8)} ${bad.length ? 'SEM PUXÃO: ' + bad.join(' ') : 'ok'}  (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
    );
  }
  writeFileSync(new URL('../src/game/hints.json', import.meta.url), JSON.stringify(all, null, 1) + '\n');
  if (missing) {
    console.log(`\n${missing} letra(s) sem puxão que funcione.`);
    process.exitCode = 1;
  }
}
