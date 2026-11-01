// A fase na tela (canvas): cenário, estilingue, bichinho voando e efeitos.
//
// Puxe o bichinho para trás (o dedo pode começar em qualquer lugar perto do
// estilingue), veja o caminho em bolinhas e solte. Durante o voo, um toque
// em qualquer lugar usa a habilidade do bichinho.

import { sfx } from '../audio/sfx.ts';
import { DT, GROUND_Y, LETTER_SIZE, MAX_PULL, MIN_PULL, SLING, WORLD_H, WORLD_W, pullPosition } from '../game/config.ts';
import hints from '../game/hints.json';
import type { Level } from '../game/levels.ts';
import { petById, type PetId } from '../game/pets.ts';
import { Sim, type SimEvent } from '../game/sim.ts';
import { trajectory } from '../game/trajectory.ts';
import { store } from '../storage.ts';
import {
  PET_IMG,
  WORLD_SKY,
  drawBand,
  drawCoin,
  drawItem,
  drawLetter,
  drawSlingBack,
  drawSlingFront,
  letterColor,
  petImage,
} from './sprites.ts';

export interface SceneEvents {
  /** Letra pega (posição na tela, para ela voar até a caixa). */
  onLetter(index: number, x: number, y: number): void;
  onCoin(index: number, x: number, y: number): void;
  onLaunch(): void;
  /** Todas as letras pegas (chamado uma vez, logo depois da última). */
  onComplete(): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'dot' | 'splinter' | 'spark' | 'dust' | 'line';
  rot: number;
}

const GRAB_RADIUS = 280;
const PRONG_BACK = { x: SLING.x + 26, y: SLING.y - 30 };
const PRONG_FRONT = { x: SLING.x - 22, y: SLING.y - 30 };
const RAINBOW = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];

const ease = (t: number) => 1 - (1 - t) * (1 - t);

export class Scene {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly events: SceneEvents;
  private readonly bg: HTMLCanvasElement;
  private sim: Sim | null = null;
  private level: Level | null = null;
  petId: PetId = 'pipoca';
  // tela
  private dpr = 1;
  private scale = 1;
  private offX = 0;
  private offY = 0;
  private cssW = 0;
  // puxão
  private pointerId: number | null = null;
  private pulling = false;
  private angle = 40;
  private power = 0;
  private lastStretch = 0;
  // estado da jogada
  launches = 0;
  private turnLetters = 0;
  private misses = 0;
  private completeAt = 0;
  private completed = false;
  private shaking: { x: number; y: number; t0: number } | null = null;
  private popIn = 0;
  private ghost: { angle: number; power: number; t0: number } | null = null;
  private particles: Particle[] = [];
  private lastHit = 0;
  // laço
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private running = false;

  constructor(events: SceneEvents) {
    this.events = events;
    this.root = document.createElement('div');
    this.root.className = 'scene';
    this.canvas = document.createElement('canvas');
    this.root.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.bg = document.createElement('canvas');
    this.canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onCancel(e));
    this.canvas.addEventListener('lostpointercapture', (e) => this.onCancel(e));
    new ResizeObserver(() => this.resize()).observe(this.root);
  }

  get collected(): boolean[] {
    return this.sim?.letters.map((l) => l.collected) ?? [];
  }

  load(level: Level, petId: PetId): void {
    this.level = level;
    this.sim = new Sim(level);
    this.petId = petId;
    this.launches = 0;
    this.misses = 0;
    this.completed = false;
    this.completeAt = 0;
    this.shaking = null;
    this.ghost = null;
    this.particles = [];
    this.pulling = false;
    this.pointerId = null;
    this.popIn = performance.now();
    this.resize();
    this.start();
  }

  setPet(petId: PetId): void {
    if (this.sim?.flying) return;
    this.petId = petId;
    this.popIn = performance.now();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.pulling = false;
    this.pointerId = null;
  }

  /** Dica: a mãozinha puxa o estilingue do jeito certo para a próxima letra. */
  showHint(): void {
    const sim = this.sim;
    if (!sim || sim.flying || !this.level) return;
    const next = sim.letters.findIndex((l) => !l.collected);
    const list = (hints as Record<string, Array<{ angle: number; power: number } | null>>)[this.level.word];
    const h = list?.[next];
    if (h) this.ghost = { ...h, t0: performance.now() };
  }

  // ---------- tela ----------

  private resize(): void {
    const { width, height } = this.root.getBoundingClientRect();
    if (!width || !height) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = width;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.scale = Math.min(width / WORLD_W, height / WORLD_H);
    this.offX = (width - WORLD_W * this.scale) / 2;
    // Chão sempre embaixo; sobra céu em cima.
    this.offY = height - WORLD_H * this.scale;
    this.drawBackground();
  }

  private toWorld(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.offX) / this.scale, y: (e.clientY - r.top - this.offY) / this.scale };
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + this.offX + x * this.scale, y: r.top + this.offY + y * this.scale };
  }

  private drawBackground(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.bg.width = w;
    this.bg.height = h;
    const g = this.bg.getContext('2d')!;
    const [top, bottom] = WORLD_SKY[this.level?.world ?? 0];
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.offX, this.dpr * this.offY);
    const left = -this.offX / this.scale;
    const right = (this.cssW - this.offX) / this.scale;
    const topY = -this.offY / this.scale;
    // Estrelinhas no último mundo, sol nos outros.
    if (this.level?.world === 3) {
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 40; i++) {
        const x = left + ((i * 397) % 1000) / 1000 * (right - left);
        const y = topY + ((i * 211) % 1000) / 1000 * (500 - topY);
        g.beginPath();
        g.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.fillStyle = '#FFF59D';
      g.beginPath();
      g.arc(1400, 150, 60, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (const [cx, cy, s] of [
      [300, 160, 1],
      [760, 110, 0.8],
      [1120, 220, 1.1],
    ]) {
      for (const [dx, dy, r] of [
        [-50, 10, 34],
        [0, -8, 46],
        [52, 8, 36],
      ]) {
        g.beginPath();
        g.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Morros ao longe.
    g.fillStyle = 'rgba(129, 199, 132, .7)';
    g.beginPath();
    g.moveTo(left, GROUND_Y);
    for (let x = left; x <= right + 40; x += 40) g.lineTo(x, GROUND_Y - 90 - Math.sin(x / 210) * 50 - Math.sin(x / 90) * 12);
    g.lineTo(right + 40, GROUND_Y);
    g.fill();
    // Chão: grama e terra, até a borda da tela.
    g.fillStyle = '#7CB342';
    g.fillRect(left, GROUND_Y, right - left, 24);
    g.fillStyle = '#8D6E63';
    g.fillRect(left, GROUND_Y + 24, right - left, 400);
    g.fillStyle = '#9CCC65';
    g.fillRect(left, GROUND_Y, right - left, 7);
  }

  // ---------- toque ----------

  private onDown(e: PointerEvent): void {
    const sim = this.sim;
    if (!sim || this.completed) return;
    if (sim.flying) {
      if (sim.ability()) this.abilityFx();
      return;
    }
    if (this.pointerId !== null || this.shaking) return;
    const w = this.toWorld(e);
    if (Math.hypot(w.x - SLING.x, w.y - SLING.y) > GRAB_RADIUS) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.pulling = true;
    this.ghost = null;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // segue sem captura
    }
    this.updatePull(w);
  }

  private onMove(e: PointerEvent): void {
    if (!this.pulling || e.pointerId !== this.pointerId) return;
    this.updatePull(this.toWorld(e));
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (!this.pulling) return;
    this.pulling = false;
    if (this.power * MAX_PULL < MIN_PULL || !this.sim) {
      this.power = 0;
      return;
    }
    this.sim.launch(this.petId, this.angle, this.power);
    this.launches++;
    this.turnLetters = 0;
    sfx.launch();
    this.petVoice();
    this.events.onLaunch();
    this.power = 0;
  }

  private onCancel(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.pulling = false;
    this.power = 0;
  }

  private updatePull(w: { x: number; y: number }): void {
    const dx = w.x - SLING.x;
    const dy = w.y - SLING.y;
    const len = Math.hypot(dx, dy);
    let angle = (Math.atan2(dy, -dx) * 180) / Math.PI;
    angle = Math.max(-20, Math.min(88, angle));
    this.angle = angle;
    const power = Math.min(1, len / MAX_PULL);
    if (Math.abs(power - this.lastStretch) > 0.1) {
      this.lastStretch = power;
      sfx.stretch(power);
    }
    this.power = power;
  }

  private petVoice(): void {
    if (this.petId === 'pipoca') sfx.bark();
    else if (this.petId === 'mimi') sfx.meow();
    else sfx.squeak();
  }

  private abilityFx(): void {
    const sim = this.sim!;
    const p = sim.pets[0]?.body.position;
    if (!p) return;
    if (this.petId === 'pipoca') {
      sfx.bark();
      sfx.dash();
    } else if (this.petId === 'mimi') {
      sfx.split();
      this.burst(p.x, p.y, 'spark', 14, ['#FFEB3B', '#FFFFFF', '#F48FB1']);
    } else {
      sfx.heli();
    }
  }

  // ---------- laço ----------

  private frame(now: number): void {
    if (!this.running) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(100, now - this.last);
    this.last = now;
    this.time += dt / 1000;
    const sim = this.sim;
    if (sim) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= DT && n < 4) {
        this.handle(sim.step());
        this.acc -= DT;
        n++;
      }
      if (n === 4) this.acc = 0;
      if (sim.flying && this.petId === 'pipoca' && sim.abilityUsed) {
        const b = sim.pets[0]?.body;
        if (b && Math.hypot(b.velocity.x, b.velocity.y) > 12) this.burst(b.position.x, b.position.y, 'line', 1, ['#FFFFFF']);
      }
    }
    if (this.shaking && now - this.shaking.t0 > 800) {
      this.shaking = null;
      this.popIn = now;
    }
    if (this.completeAt && now >= this.completeAt && !this.completed) {
      this.completed = true;
      this.events.onComplete();
    }
    this.updateParticles(dt / 16.67);
    this.root.dataset.state = sim?.flying ? 'flying' : this.shaking ? 'shaking' : 'ready';
    this.render(now);
  }

  private handle(events: SimEvent[]): void {
    const sim = this.sim!;
    for (const ev of events) {
      switch (ev.type) {
        case 'letter': {
          this.turnLetters++;
          const s = this.toScreen(ev.x, ev.y);
          this.burst(ev.x, ev.y, 'spark', 18, ['#FFEB3B', '#FFFFFF', letterColor(ev.index)]);
          this.events.onLetter(ev.index, s.x, s.y);
          if (sim.done && !this.completeAt) this.completeAt = performance.now() + 1100;
          break;
        }
        case 'coin': {
          const s = this.toScreen(ev.x, ev.y);
          this.burst(ev.x, ev.y, 'spark', 10, ['#FFCA28', '#FFFFFF']);
          this.events.onCoin(ev.index, s.x, s.y);
          break;
        }
        case 'break':
          sfx.crack();
          this.burst(ev.x, ev.y, 'splinter', 14, ['#D7B899', '#8D6E63', '#C68A4E']);
          break;
        case 'hit': {
          const now = performance.now();
          if (now - this.lastHit > 70) {
            this.lastHit = now;
            sfx.hit(ev.kind, ev.speed);
          }
          if (ev.kind === 'pot' && ev.speed > 6) this.burst(ev.x, ev.y, 'dot', 10, ['#8D6E63', '#A1887F', '#6D4C41']);
          break;
        }
        case 'land':
          this.burst(ev.x, GROUND_Y - 6, 'dust', 8, ['#D7CCC8', '#BCAAA4']);
          break;
        case 'turnEnd':
          sfx.poof();
          this.burst(ev.x, GROUND_Y - 10, 'dust', 14, ['#D7CCC8', '#BCAAA4', '#EFEBE9']);
          this.shaking = { x: ev.x, y: ev.y, t0: performance.now() };
          if (this.turnLetters === 0 && !sim.done) {
            this.misses++;
            if (this.misses >= 3) {
              this.misses = 0;
              setTimeout(() => this.showHint(), 900);
            }
          } else this.misses = 0;
          break;
      }
    }
  }

  private burst(x: number, y: number, kind: Particle['kind'], n: number, colors: string[]): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = kind === 'dust' ? 1 + Math.random() * 2 : kind === 'line' ? 0 : 2 + Math.random() * 5;
      const life = kind === 'line' ? 14 : 30 + Math.random() * 25;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (kind === 'dust' ? 1 : 2),
        life,
        max: life,
        size: kind === 'dust' ? 14 + Math.random() * 14 : kind === 'splinter' ? 12 : 5 + Math.random() * 5,
        color: colors[i % colors.length],
        kind,
        rot: Math.random() * Math.PI,
      });
    }
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
  }

  private updateParticles(k: number): void {
    for (const p of this.particles) {
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.kind !== 'dust' && p.kind !== 'line') p.vy += 0.25 * k;
      else p.vy -= 0.02 * k;
      p.rot += 0.2 * k;
      p.life -= k;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- desenho ----------

  private render(now: number): void {
    const ctx = this.ctx;
    const sim = this.sim;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    if (!sim || !this.level) return;
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.offX, this.dpr * this.offY);

    // O estilingue fica atrás do bichinho; só o elástico da frente passa na frente.
    drawSlingBack(ctx, SLING.x, SLING.y);
    drawSlingFront(ctx, SLING.x, SLING.y, GROUND_Y);

    // Peças.
    sim.items.forEach((it, i) => {
      const b = it.body;
      if (!b) return;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      drawItem(ctx, it.def.kind, it.def.w, it.def.h, it.def.color, i);
      ctx.restore();
    });

    // Moedas e letras.
    sim.coins.forEach((c, i) => {
      if (c.collected) return;
      ctx.save();
      ctx.translate(c.x, c.y + Math.sin(this.time * 3 + i) * 6);
      ctx.scale(Math.cos(this.time * 3 + i) * 0.35 + 0.75, 1);
      drawCoin(ctx, 24);
      ctx.restore();
    });
    sim.letters.forEach((l, i) => {
      if (l.collected) return;
      ctx.save();
      if (l.body) {
        ctx.translate(l.body.position.x, l.body.position.y);
        ctx.rotate(l.body.angle);
      } else {
        ctx.translate(l.x, l.y + Math.sin(this.time * 2.2 + i * 1.3) * 7);
      }
      drawLetter(ctx, this.level!.word[i], LETTER_SIZE, letterColor(i), !l.body);
      ctx.restore();
    });

    // Bichinho: voando, sacudindo a poeira ou no estilingue.
    const pet = petById(this.petId);
    const outfit = store.outfit(this.petId);
    if (sim.flying) {
      for (const p of sim.pets) {
        let wobble = 0;
        if (this.petId === 'bolinha' && sim.abilityUsed) wobble = Math.sin(this.time * 30) * 0.15;
        this.drawPet(p.body.position.x, p.body.position.y, p.radius, p.body.angle + wobble, outfit, true);
      }
    } else if (this.shaking) {
      const t = (now - this.shaking.t0) / 800;
      const wob = Math.sin(t * Math.PI * 8) * 0.3 * (1 - t);
      ctx.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
      this.drawPet(this.shaking.x, Math.min(this.shaking.y, GROUND_Y - pet.radius), pet.radius, wob, outfit, false);
      ctx.globalAlpha = 1;
    } else if (!this.completed || this.completeAt === 0) {
      const pos = this.pulling
        ? pullPosition(this.angle, this.power)
        : this.ghost
          ? pullPosition(this.ghost.angle, this.ghostPower(now))
          : { x: SLING.x, y: SLING.y + Math.sin(this.time * 3) * 2 };
      const pop = Math.min(1, (now - this.popIn) / 260);
      drawBand(ctx, PRONG_BACK.x, PRONG_BACK.y, pos.x, pos.y);
      if (this.ghost) ctx.globalAlpha = 0.85;
      this.drawPet(pos.x, pos.y, pet.radius * (0.3 + 0.7 * ease(pop)), 0, outfit, false);
      ctx.globalAlpha = 1;
      drawBand(ctx, PRONG_FRONT.x, PRONG_FRONT.y, pos.x, pos.y);
      if (this.pulling && this.power * MAX_PULL >= MIN_PULL) this.drawPath(this.angle, this.power, 1);
      if (this.ghost) this.drawGhost(now);
    }

    // Efeitos.
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.kind === 'splinter') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -3, p.size, 6);
        ctx.restore();
      } else if (p.kind === 'line') {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16 * a + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'spark') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
        ctx.fillRect(-p.size / 6, -p.size / 2, p.size / 3, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.kind === 'dust' ? p.size * (1.6 - a * 0.6) : p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPet(x: number, y: number, r: number, angle: number, outfit: ReturnType<typeof store.outfit>, happy: boolean): void {
    const img = petImage(this.petId, outfit, happy);
    const ctx = this.ctx;
    const w = r / PET_IMG.faceR;
    const h = (w * 190) / 150;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -w * PET_IMG.cx, -h * PET_IMG.cy, w, h);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#F0B44C';
      ctx.fill();
    }
    ctx.restore();
  }

  /** Caminho em bolinhas coloridas (diminuindo no fim). */
  private drawPath(angle: number, power: number, alpha: number): void {
    const ctx = this.ctx;
    const pts = trajectory(angle, power, 170, 4);
    pts.forEach((p, i) => {
      const k = 1 - i / Math.max(1, pts.length);
      ctx.globalAlpha = alpha * (0.35 + 0.65 * k);
      ctx.fillStyle = RAINBOW[Math.floor(i / 2) % RAINBOW.length];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + 8 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  /** Força do puxão da mãozinha fantasma agora (duas vezes, e some). */
  private ghostPower(now: number): number {
    const g = this.ghost!;
    const t = (now - g.t0) / 1600;
    if (t >= 2) {
      this.ghost = null;
      return 0;
    }
    const k = t % 1;
    return g.power * ease(Math.min(1, k / 0.7));
  }

  private drawGhost(now: number): void {
    const g = this.ghost;
    if (!g) return;
    const power = this.ghostPower(now);
    if (!this.ghost) return;
    this.drawPath(g.angle, power, 0.8);
    const pos = pullPosition(g.angle, power);
    // Dedinho puxando o bichinho.
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pos.x - 18, pos.y + 52);
    ctx.rotate(-0.5);
    ctx.font = '64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', 0, 0);
    ctx.restore();
  }
}
