// A física de uma fase (sem tela): torres, letras, moedas e o bichinho voando.
// A mesma simulação roda na tela, nos testes e no verificador de fases.

import Matter from 'matter-js';
import {
  CATCH_MARGIN,
  DT,
  GRAVITY,
  GRAVITY_SCALE,
  GROUND_Y,
  LETTER_SIZE,
  TURN_MAX_STEPS,
  WORLD_W,
  launchVelocity,
  pullPosition,
} from './config.ts';
import { BREAKABLE, type Item, type Kind, type Level } from './levels.ts';
import { DASH, FLOAT, SPLIT, petById, type PetId } from './pets.ts';

const { Bodies, Body, Composite, Engine, Events } = Matter;
type MBody = Matter.Body;

export type SimEvent =
  | { type: 'letter'; index: number; x: number; y: number; how: 'touch' | 'fall' }
  | { type: 'coin'; index: number; x: number; y: number }
  | { type: 'break'; item: number; x: number; y: number }
  | { type: 'hit'; kind: Kind | 'ground' | 'letter'; speed: number; x: number; y: number }
  | { type: 'land'; x: number; y: number }
  | { type: 'turnEnd'; x: number; y: number };

export interface FlyingPet {
  readonly body: MBody;
  radius: number;
  /** A principal (as outras são as gatinhas da Mimi). */
  readonly main: boolean;
}

/** Densidade, atrito e quique de cada tipo de peça. */
const MATERIAL: Record<Kind, Matter.IChamferableBodyDefinition> = {
  block: { density: 0.0012, friction: 0.6, restitution: 0.05 },
  pillow: { density: 0.0006, friction: 0.9, restitution: 0.25, chamfer: { radius: 14 } },
  pot: { density: 0.0024, friction: 0.7, restitution: 0.05, chamfer: { radius: 8 } },
  fence: { density: 0.0009, friction: 0.6, restitution: 0.05 },
  crate: { density: 0.0009, friction: 0.6, restitution: 0.05 },
  platform: { isStatic: true, friction: 0.8, chamfer: { radius: 12 } },
};

const PET_GROUP = -1; // as gatinhas não batem umas nas outras

export class Sim {
  readonly engine: Matter.Engine;
  readonly level: Level;
  /** Peças da fase (corpo é null depois de quebrar). */
  readonly items: Array<{ def: Item; body: MBody | null }>;
  readonly letters: Array<{ body: MBody | null; x: number; y: number; float: boolean; collected: boolean }>;
  readonly coins: Array<{ x: number; y: number; collected: boolean }>;
  pets: FlyingPet[] = [];
  petId: PetId = 'pipoca';
  /** Há um bichinho voando (ou rolando) agora. */
  flying = false;
  abilityUsed = false;
  private stepsInTurn = 0;
  private stillSteps = 0;
  private dashSteps = 0;
  private dashing = false;
  private floating = false;
  private landed = false;
  private pending: SimEvent[] = [];
  private toBreak = new Set<number>();
  private readonly ground: MBody;

  constructor(level: Level) {
    this.level = level;
    this.engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: GRAVITY, scale: GRAVITY_SCALE } });
    this.ground = Bodies.rectangle(WORLD_W / 2, GROUND_Y + 60, WORLD_W * 4, 120, {
      isStatic: true,
      friction: 0.9,
      label: 'ground',
    });
    const wall = Bodies.rectangle(-60, 0, 120, 4000, { isStatic: true, label: 'ground' });
    Composite.add(this.engine.world, [this.ground, wall]);

    this.items = level.items.map((def) => {
      const body = Bodies.rectangle(def.x, def.y, def.w, def.h, { ...MATERIAL[def.kind], label: def.kind });
      Composite.add(this.engine.world, body);
      return { def, body };
    });
    this.letters = level.letters.map((spot) => {
      let body: MBody | null = null;
      if (!spot.float) {
        body = Bodies.rectangle(spot.x, spot.y, LETTER_SIZE, LETTER_SIZE, {
          density: 0.0008,
          friction: 0.8,
          restitution: 0,
          chamfer: { radius: 10 },
          label: 'letter',
        });
        Composite.add(this.engine.world, body);
      }
      return { body, x: spot.x, y: spot.y, float: spot.float, collected: false };
    });
    this.coins = level.coins.map((c) => ({ ...c, collected: false }));

    Events.on(this.engine, 'collisionStart', (e) => this.onCollisions(e.pairs));
    // Deixa tudo assentar antes de começar.
    for (let i = 0; i < 30; i++) Engine.update(this.engine, DT);
  }

  get done(): boolean {
    return this.letters.every((l) => l.collected);
  }

  get collectedCount(): number {
    return this.letters.filter((l) => l.collected).length;
  }

  /** Lança o bichinho (ângulo em graus, força de 0 a 1). */
  launch(petId: PetId, angleDeg: number, power: number): void {
    if (this.flying) return;
    const pet = petById(petId);
    this.petId = petId;
    const p = pullPosition(angleDeg, power);
    const body = Bodies.circle(p.x, p.y, pet.radius, {
      density: pet.density,
      friction: 0.6,
      frictionAir: 0,
      restitution: 0.35,
      label: 'pet',
      collisionFilter: { group: PET_GROUP },
    });
    Composite.add(this.engine.world, body);
    Body.setVelocity(body, launchVelocity(angleDeg, power));
    this.pets = [{ body, radius: pet.radius, main: true }];
    this.flying = true;
    this.abilityUsed = false;
    this.stepsInTurn = 0;
    this.stillSteps = 0;
    this.dashSteps = 0;
    this.dashing = false;
    this.floating = false;
    this.landed = false;
  }

  /** Toque na tela durante o voo: a habilidade do bichinho (uma vez). */
  ability(): boolean {
    if (!this.flying || this.abilityUsed || this.landed) return false;
    this.abilityUsed = true;
    const main = this.pets[0].body;
    const v = main.velocity;
    const speed = Math.hypot(v.x, v.y) || 1;
    if (this.petId === 'pipoca') {
      const s = Math.max(DASH.speed, speed * DASH.factor);
      Body.setVelocity(main, { x: (v.x / speed) * s, y: (v.y / speed) * s });
      this.dashSteps = DASH.steps;
      this.dashing = true;
    } else if (this.petId === 'mimi') {
      const pet = this.pets[0];
      Body.scale(main, SPLIT.scale, SPLIT.scale);
      pet.radius *= SPLIT.scale;
      for (const turn of [-SPLIT.spread, SPLIT.spread]) {
        const a = (turn * Math.PI) / 180;
        const kitten = Bodies.circle(main.position.x, main.position.y, pet.radius, {
          density: main.density,
          friction: 0.6,
          frictionAir: 0,
          restitution: 0.35,
          label: 'pet',
          collisionFilter: { group: PET_GROUP },
        });
        Composite.add(this.engine.world, kitten);
        Body.setVelocity(kitten, {
          x: v.x * Math.cos(a) - v.y * Math.sin(a),
          y: v.x * Math.sin(a) + v.y * Math.cos(a),
        });
        this.pets.push({ body: kitten, radius: pet.radius, main: false });
      }
    } else {
      this.floating = true;
    }
    return true;
  }

  /** Um passo de física. Devolve o que aconteceu. */
  step(): SimEvent[] {
    // Forças das habilidades antes do passo.
    const g = GRAVITY * GRAVITY_SCALE;
    if (this.dashSteps > 0) {
      this.dashSteps--;
      for (const p of this.pets) Body.applyForce(p.body, p.body.position, { x: 0, y: -p.body.mass * g });
    }
    if (this.floating) {
      for (const p of this.pets) {
        Body.applyForce(p.body, p.body.position, { x: 0, y: -p.body.mass * g * (1 - FLOAT.gravity) });
        const v = p.body.velocity;
        Body.setVelocity(p.body, { x: v.x * FLOAT.drag, y: Math.min(v.y, FLOAT.maxFall) });
      }
    }
    Engine.update(this.engine, DT);
    this.breakPending();
    this.collect();
    if (this.flying) this.checkTurnEnd();
    const out = this.pending;
    this.pending = [];
    return out;
  }

  private onCollisions(pairs: Matter.Pair[]): void {
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;
      const petBody = bodyA.label === 'pet' ? bodyA : bodyB.label === 'pet' ? bodyB : null;
      const other = petBody === bodyA ? bodyB : bodyA;
      const speed = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y);
      const at = pair.collision.supports[0] ?? bodyA.position;
      if (petBody) {
        if (other.label === 'ground' && !this.landed) {
          this.landed = true;
          this.floating = false;
          this.dashing = false;
          this.dashSteps = 0;
          for (const p of this.pets) p.body.frictionAir = 0.025;
          this.pending.push({ type: 'land', x: petBody.position.x, y: petBody.position.y });
        }
        if (this.dashing && BREAKABLE.includes(other.label as Kind)) {
          const idx = this.items.findIndex((it) => it.body === other);
          if (idx >= 0) this.toBreak.add(idx);
          continue;
        }
        if (this.dashing && other.label !== 'letter') {
          this.dashing = false;
          this.dashSteps = 0;
        }
      }
      if (speed > 2.5) {
        const kind = (petBody ? other.label : bodyA.label === 'ground' ? bodyB.label : bodyA.label) as Kind | 'ground' | 'letter';
        this.pending.push({ type: 'hit', kind, speed, x: at.x, y: at.y });
      }
    }
  }

  private breakPending(): void {
    for (const idx of this.toBreak) {
      const it = this.items[idx];
      if (!it.body) continue;
      const { x, y } = it.body.position;
      Composite.remove(this.engine.world, it.body);
      it.body = null;
      this.pending.push({ type: 'break', item: idx, x, y });
    }
    this.toBreak.clear();
  }

  /** Letras e moedas pegas: bichinho encostou, ou a letra caiu no chão. */
  private collect(): void {
    this.letters.forEach((l, index) => {
      if (l.collected) return;
      const pos = l.body ? l.body.position : l;
      let how: 'touch' | 'fall' | null = null;
      for (const p of this.pets) {
        const reach = p.radius + LETTER_SIZE / 2 + CATCH_MARGIN;
        if (Math.hypot(pos.x - p.body.position.x, pos.y - p.body.position.y) < reach) how = 'touch';
      }
      if (!how && l.body) {
        const out = pos.x > WORLD_W + 60 || pos.x < -60 || pos.y > GROUND_Y + 80;
        if (l.body.bounds.max.y >= GROUND_Y - 1 || out) how = 'fall';
      }
      if (!how) return;
      l.collected = true;
      l.x = pos.x;
      l.y = pos.y;
      if (l.body) {
        Composite.remove(this.engine.world, l.body);
        l.body = null;
      }
      this.pending.push({ type: 'letter', index, x: l.x, y: l.y, how });
    });
    this.coins.forEach((c, index) => {
      if (c.collected) return;
      for (const p of this.pets) {
        if (Math.hypot(c.x - p.body.position.x, c.y - p.body.position.y) < p.radius + 26 + CATCH_MARGIN) {
          c.collected = true;
          this.pending.push({ type: 'coin', index, x: c.x, y: c.y });
          return;
        }
      }
    });
  }

  /** O lançamento acaba quando o bichinho para, sai da tela ou demora demais. */
  private checkTurnEnd(): void {
    this.stepsInTurn++;
    const inside = this.pets.filter((p) => {
      const { x, y } = p.body.position;
      return x > -80 && x < WORLD_W + 80 && y < GROUND_Y + 100;
    });
    const slow = inside.every((p) => Math.hypot(p.body.velocity.x, p.body.velocity.y) < 0.3);
    this.stillSteps = slow ? this.stillSteps + 1 : 0;
    if (inside.length === 0 || this.stillSteps > 40 || this.stepsInTurn > TURN_MAX_STEPS) {
      const main = (inside.find((p) => p.main) ?? inside[0] ?? this.pets[0]).body.position;
      for (const p of this.pets) Composite.remove(this.engine.world, p.body);
      this.pets = [];
      this.flying = false;
      this.pending.push({ type: 'turnEnd', x: main.x, y: Math.min(main.y, GROUND_Y - 30) });
    }
  }

  /** Roda um lançamento inteiro (para testes e o verificador). */
  playLaunch(petId: PetId, angleDeg: number, power: number, abilityAt = -1): SimEvent[] {
    this.launch(petId, angleDeg, power);
    const all: SimEvent[] = [];
    for (let i = 0; this.flying && i < TURN_MAX_STEPS + 10; i++) {
      if (i === abilityAt) this.ability();
      all.push(...this.step());
    }
    return all;
  }
}
