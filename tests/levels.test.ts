import { describe, expect, it } from 'vitest';
import { GROUND_Y, LETTER_SIZE, WORLD_W } from '../src/game/config.ts';
import hints from '../src/game/hints.json';
import { LEVELS } from '../src/game/levels.ts';
import { Sim } from '../src/game/sim.ts';
import { LETTERS } from '../src/game/words.ts';

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

describe('fases', () => {
  it('são 20, terminando em GUSTAVO', () => {
    expect(LEVELS).toHaveLength(20);
    expect(LEVELS.at(-1)!.word).toBe('GUSTAVO');
    expect(new Set(LEVELS.map((l) => l.word)).size).toBe(20);
  });

  it.each(LEVELS.map((l) => [l.word, l] as const))('%s: bem montada', (_, level) => {
    expect(level.letters).toHaveLength(level.word.length);
    for (const ch of level.word) expect(LETTERS[ch]).toBeDefined();
    const boxes: Box[] = [
      ...level.items,
      ...level.letters.filter((l) => !l.float).map((l) => ({ x: l.x, y: l.y, w: LETTER_SIZE, h: LETTER_SIZE })),
    ];
    for (const b of boxes) {
      expect(b.x - b.w / 2).toBeGreaterThan(450);
      expect(b.x + b.w / 2).toBeLessThan(WORLD_W);
      expect(b.y + b.h / 2).toBeLessThanOrEqual(GROUND_Y + 0.01);
      expect(b.y - b.h / 2).toBeGreaterThan(120);
    }
    // nada começa encaixado dentro de outra peça
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
    for (const l of level.letters.filter((l) => l.float)) {
      expect(l.y).toBeGreaterThan(150);
      expect(l.y).toBeLessThan(GROUND_Y - 80);
    }
  });

  it.each(LEVELS.map((l) => [l.word, l] as const))('%s: torres paradas sozinhas (nada cai sem lançar)', (_, level) => {
    const sim = new Sim(level);
    const start = sim.items.map((it) => ({ ...it.body!.position }));
    const events = [];
    for (let i = 0; i < 180; i++) events.push(...sim.step());
    expect(events.filter((e) => e.type === 'letter')).toHaveLength(0);
    sim.items.forEach((it, k) => {
      expect(Math.hypot(it.body!.position.x - start[k].x, it.body!.position.y - start[k].y)).toBeLessThan(1);
    });
  });

  it.each(LEVELS.map((l) => [l.word, l] as const))('%s: toda letra tem um puxão que funciona (dica)', (_, level) => {
    const list = (hints as Record<string, Array<{ angle: number; power: number } | null>>)[level.word];
    expect(list).toHaveLength(level.word.length);
    list.forEach((h, index) => {
      expect(h, `letra ${level.word[index]}`).not.toBeNull();
      const sim = new Sim(level);
      const events = sim.playLaunch('pipoca', h!.angle, h!.power);
      expect(events.some((e) => e.type === 'letter' && e.index === index)).toBe(true);
    });
  });
});
