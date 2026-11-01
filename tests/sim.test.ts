import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { GROUND_Y, launchVelocity } from '../src/game/config.ts';
import type { Level } from '../src/game/levels.ts';
import { starsFor } from '../src/game/score.ts';
import { Sim } from '../src/game/sim.ts';
import { trajectory } from '../src/game/trajectory.ts';

const empty = (extra: Partial<Level> = {}): Level => ({ word: 'A', emoji: '', world: 0, items: [], letters: [{ x: 1500, y: 150, float: true }], coins: [], ...extra });

describe('física', () => {
  it('o caminho em bolinhas é o mesmo voo da física', () => {
    const sim = new Sim(empty());
    sim.launch('mimi', 40, 0.8);
    const path = trajectory(40, 0.8, 80, 1);
    for (let i = 0; i < 60; i++) {
      sim.step();
      const p = sim.pets[0].body.position;
      expect(Math.hypot(p.x - path[i].x, p.y - path[i].y)).toBeLessThan(1.5);
    }
  });

  it('a velocidade cresce com o puxão e aponta para o ângulo', () => {
    const v = launchVelocity(45, 1);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
    expect(Math.hypot(launchVelocity(30, 0.5).x, launchVelocity(30, 0.5).y)).toBeCloseTo(Math.hypot(v.x, v.y) / 2);
  });

  it('pega letra flutuante encostando e moeda passando perto', () => {
    const level = empty({ letters: [{ x: 700, y: 400, float: true }], coins: [{ x: 700, y: 400 }] });
    let got = false;
    for (let a = 10; a <= 70 && !got; a += 2) {
      for (let pw = 0.4; pw <= 1 && !got; pw += 0.05) {
        if (!trajectory(a, pw, 300, 1).some((q) => Math.hypot(q.x - 700, q.y - 400) < 10)) continue;
        const ev = new Sim(level).playLaunch('mimi', a, pw);
        got = ev.some((e) => e.type === 'letter' && e.how === 'touch') && ev.some((e) => e.type === 'coin');
      }
    }
    expect(got).toBe(true);
  });

  it('letra derrubada no chão também vale', () => {
    const sim = new Sim(
      empty({
        items: [{ kind: 'block', x: 800, y: GROUND_Y - 35, w: 70, h: 70 }],
        letters: [{ x: 800, y: GROUND_Y - 70 - 29, float: false }],
      }),
    );
    // Tira o bloco de baixo: a letra cai no chão.
    Matter.Composite.remove(sim.engine.world, sim.items[0].body!);
    Matter.Sleeping.set(sim.letters[0].body!, false);
    const events = [];
    for (let i = 0; i < 120; i++) events.push(...sim.step());
    expect(events.find((e) => e.type === 'letter')).toMatchObject({ how: 'fall' });
    expect(sim.done).toBe(true);
  });

  it('o lançamento acaba (o bichinho para ou sai da tela) e o estilingue recarrega', () => {
    const sim = new Sim(empty());
    const events = sim.playLaunch('pipoca', 30, 0.5);
    expect(events.at(-1)?.type).toBe('turnEnd');
    expect(sim.flying).toBe(false);
    expect(events.some((e) => e.type === 'land')).toBe(true);
  });
});

describe('habilidades', () => {
  it('Pipoca: impulso em linha reta quebra a cerca', () => {
    const fence = { kind: 'fence' as const, x: 900, y: GROUND_Y - 60, w: 20, h: 120 };
    let broke = false;
    for (let a = 0; a <= 40 && !broke; a += 2) {
      const sim = new Sim(empty({ items: [fence] }));
      const ev = sim.playLaunch('pipoca', a, 0.9, 20);
      broke = ev.some((e) => e.type === 'break');
    }
    expect(broke).toBe(true);
    // sem o impulso, a cerca não quebra
    const sim = new Sim(empty({ items: [fence] }));
    expect(sim.playLaunch('pipoca', 10, 0.9).some((e) => e.type === 'break')).toBe(false);
  });

  it('Mimi: vira três gatinhas', () => {
    const sim = new Sim(empty());
    sim.launch('mimi', 45, 0.9);
    for (let i = 0; i < 20; i++) sim.step();
    expect(sim.ability()).toBe(true);
    expect(sim.pets).toHaveLength(3);
    expect(sim.ability()).toBe(false); // só uma vez
  });

  it('Bolinha: desce flutuando (fica mais tempo no ar)', () => {
    const airTime = (useAbility: boolean) => {
      const sim = new Sim(empty());
      sim.launch('bolinha', 60, 0.9);
      let steps = 0;
      for (; steps < 900 && sim.flying; steps++) {
        if (useAbility && steps === 40) sim.ability();
        if (sim.step().some((e) => e.type === 'land')) break;
      }
      return steps;
    };
    expect(airTime(true)).toBeGreaterThan(airTime(false) * 1.5);
  });
});

describe('estrelas', () => {
  it('nunca zero, mais estrelas com menos lançamentos', () => {
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(5, 3)).toBe(3);
    expect(starsFor(8, 3)).toBe(2);
    expect(starsFor(30, 3)).toBe(1);
  });
});
