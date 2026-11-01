// As telas: inicial, mapa das palavras, escolha do bichinho, a fase, a
// vitória e a loja de roupinhas.

import { sfx } from '../audio/sfx.ts';
import { LEVELS } from '../game/levels.ts';
import { PETS, type PetId } from '../game/pets.ts';
import { starsFor } from '../game/score.ts';
import { letterLine, spoken } from '../game/words.ts';
import { store } from '../storage.ts';
import { clearConfetti, confetti } from './confetti.ts';
import { ICONS, iconButton } from './icons.ts';
import { Scene } from './scene.ts';
import { ITEMS, itemSvg, letterColor, petSvg } from './sprites.ts';

export interface Nav {
  home(): void;
  map(): void;
  play(level: number): void;
  shop(): void;
}

const COIN_SVG = `<svg viewBox="-28 -28 56 56" aria-hidden="true"><circle r="24" fill="#FFCA28" stroke="#F57F17" stroke-width="4"/><path d="M0 -13 L3.6 -4.2 L12.4 -4 L5.6 2.4 L7.8 11.2 L0 6.4 L-7.8 11.2 L-5.6 2.4 L-12.4 -4 L-3.6 -4.2 Z" fill="#FFF59D"/></svg>`;

function makeScreen(className: string): HTMLElement {
  const el = document.createElement('section');
  el.className = `screen ${className}`;
  el.hidden = true;
  return el;
}

function onTap<T extends HTMLElement>(button: T, action: () => void, sound = true): T {
  button.addEventListener('click', () => {
    if (sound) sfx.pop();
    action();
  });
  return button;
}

function coinPill(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'coin-pill';
  el.innerHTML = `${COIN_SVG}<b></b>`;
  return el;
}

function renderPill(el: HTMLElement): void {
  el.querySelector('b')!.textContent = String(store.coins);
}

/** Primeira palavra ainda não feita. */
function nextLevel(): number {
  const i = LEVELS.findIndex((l) => !store.isDone(l.word));
  return i < 0 ? 0 : i;
}

function starsHtml(n: number): string {
  return Array.from({ length: 3 }, (_, k) => `<span class="${k < n ? 'on' : ''}">${ICONS.star}</span>`).join('');
}

/** Botão de voltar para "Jogos do Gustavo" (só quando aberto por ela). */
function backToGames(screen: HTMLElement): void {
  if (location.hash !== '#jogos') return;
  screen.append(onTap(iconButton('back', 'Todos os jogos', 'back-to-games'), () => location.assign('/jogos-do-gustavo/')));
}

export class HomeScreen {
  readonly el = makeScreen('home');
  private readonly soundBtn: HTMLButtonElement;
  private readonly hero: HTMLElement;
  private readonly pill = coinPill();

  constructor(nav: Nav) {
    this.el.innerHTML = `
      <h1 class="title">Estilingue <span>do Gustavo</span></h1>
      <div class="hero"></div>
      <div class="home-actions"></div>`;
    this.hero = this.el.querySelector('.hero')!;
    this.soundBtn = onTap(iconButton('soundOn', 'Som'), () => {
      store.sound = !store.sound;
      this.render();
    });
    this.el.querySelector('.home-actions')!.append(
      onTap(iconButton('grid', 'Palavras'), () => nav.map()),
      onTap(iconButton('play', 'Jogar', 'big play'), () => nav.play(nextLevel())),
      onTap(iconButton('shirt', 'Bichinhos', 'shop-btn'), () => nav.shop()),
      this.soundBtn,
    );
    this.el.append(this.pill);
    backToGames(this.el);
  }

  show(): void {
    this.hero.innerHTML = PETS.map(
      (p, i) => `<button type="button" class="hero-pet" style="--d:${i * 0.25}s" aria-label="${p.name}" data-pet="${p.id}">${petSvg(p.id, store.outfit(p.id), true)}</button>`,
    ).join('');
    this.hero.querySelectorAll<HTMLButtonElement>('.hero-pet').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.pet as PetId;
        if (id === 'pipoca') sfx.bark();
        else if (id === 'mimi') sfx.meow();
        else sfx.squeak();
        b.animate([{ transform: 'none' }, { transform: 'translateY(-18%) rotate(-8deg)' }, { transform: 'none' }], { duration: 420 });
      }),
    );
    renderPill(this.pill);
    this.render();
  }

  private render(): void {
    this.soundBtn.innerHTML = store.sound ? ICONS.soundOn : ICONS.soundOff;
    this.soundBtn.classList.toggle('off', !store.sound);
  }
}

export class MapScreen {
  readonly el = makeScreen('map');
  private readonly tiles: HTMLButtonElement[] = [];
  private readonly pill = coinPill();

  constructor(nav: Nav) {
    this.el.innerHTML = `<div class="topbar"></div><div class="map-body"><div class="map-grid"></div></div>`;
    this.el
      .querySelector('.topbar')!
      .append(onTap(iconButton('home', 'Início'), () => nav.home()), this.pill, onTap(iconButton('shirt', 'Bichinhos', 'shop-btn'), () => nav.shop()));
    const grid = this.el.querySelector('.map-grid')!;
    LEVELS.forEach((level, i) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile-btn';
      tile.dataset.world = String(level.world);
      if (level.word === 'GUSTAVO') tile.classList.add('gold');
      tile.setAttribute('aria-label', level.word);
      tile.innerHTML = `<span class="emoji">${level.emoji}</span><span class="word">${level.word}</span><span class="stars"></span>`;
      onTap(tile, () => nav.play(i));
      grid.append(tile);
      this.tiles.push(tile);
    });
  }

  show(): void {
    renderPill(this.pill);
    const next = nextLevel();
    const all = LEVELS.every((l) => store.isDone(l.word));
    this.tiles.forEach((tile, i) => {
      tile.querySelector('.stars')!.innerHTML = starsHtml(store.starsOf(LEVELS[i].word));
      tile.classList.toggle('next', !all && i === next);
    });
  }
}

export class GameScreen {
  readonly el = makeScreen('game');
  private readonly scene: Scene;
  private readonly box: HTMLElement;
  private readonly pill = coinPill();
  private readonly petBtn: HTMLButtonElement;
  private readonly picker: HTMLElement;
  private readonly win: HTMLElement;
  private readonly nav: Nav;
  private level = 0;
  private filled: boolean[] = [];
  private session = 0;

  constructor(nav: Nav) {
    this.nav = nav;
    this.scene = new Scene({
      onLetter: (i, x, y) => this.letterTaken(i, x, y),
      onCoin: (i, x, y) => this.coinTaken(i, x, y),
      onLaunch: () => {},
      onComplete: () => void this.celebrate(),
    });

    const controls = document.createElement('div');
    controls.className = 'controls';
    this.petBtn = document.createElement('button');
    this.petBtn.type = 'button';
    this.petBtn.className = 'btn pet-btn';
    this.petBtn.setAttribute('aria-label', 'Trocar bichinho');
    onTap(this.petBtn, () => this.cyclePet());
    controls.append(
      onTap(iconButton('grid', 'Palavras'), () => nav.map()),
      onTap(
        iconButton('restart', 'Recomeçar'),
        () => {
          sfx.undo();
          this.start(this.scene.petId, false);
        },
        false,
      ),
      onTap(iconButton('bulb', 'Dica', 'hint'), () => this.scene.showHint()),
      this.petBtn,
    );

    const hud = document.createElement('div');
    hud.className = 'hud';
    this.box = document.createElement('div');
    this.box.className = 'toybox';
    hud.append(this.box, this.pill);

    this.picker = document.createElement('div');
    this.picker.className = 'picker';
    this.picker.hidden = true;
    this.win = document.createElement('div');
    this.win.className = 'win';
    this.win.hidden = true;

    this.el.append(this.scene.root, hud, controls, this.picker, this.win);
  }

  /** Abre a fase: primeiro a escolha do bichinho. */
  open(level: number): void {
    this.session++;
    this.level = level;
    this.win.hidden = true;
    clearConfetti(this.el);
    this.el.dataset.world = String(LEVELS[level].world);
    this.renderBox();
    this.showPicker();
  }

  close(): void {
    this.session++;
    this.scene.stop();
    clearConfetti(this.el);
    window.speechSynthesis?.cancel();
  }

  pause(): void {
    this.scene.stop();
  }

  resume(): void {
    if (!this.el.hidden && this.picker.hidden && this.win.hidden) this.scene.start();
  }

  private showPicker(): void {
    this.scene.load(LEVELS[this.level], store.pet);
    this.scene.stop();
    this.picker.innerHTML = `<div class="picker-card"><div class="picker-pets"></div></div>`;
    const row = this.picker.querySelector('.picker-pets')!;
    for (const p of PETS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pick${p.id === store.pet ? ' last' : ''}`;
      b.setAttribute('aria-label', p.name);
      b.innerHTML = petSvg(p.id, store.outfit(p.id), true);
      b.addEventListener('click', () => {
        store.pet = p.id;
        this.picker.hidden = true;
        sfx.pop();
        this.start(p.id, true);
      });
      row.append(b);
    }
    this.picker.hidden = false;
  }

  private start(pet: PetId, announce: boolean): void {
    this.session++;
    this.win.hidden = true;
    clearConfetti(this.el);
    this.scene.load(LEVELS[this.level], pet);
    this.renderBox();
    this.renderPet();
    renderPill(this.pill);
    if (announce) sfx.say(`Vamos formar a palavra ${spoken(LEVELS[this.level].word)}!`);
  }

  private cyclePet(): void {
    const i = PETS.findIndex((p) => p.id === this.scene.petId);
    const next = PETS[(i + 1) % PETS.length].id;
    store.pet = next;
    this.scene.setPet(next);
    this.renderPet();
    if (next === 'pipoca') sfx.bark();
    else if (next === 'mimi') sfx.meow();
    else sfx.squeak();
  }

  private renderPet(): void {
    this.petBtn.innerHTML = petSvg(this.scene.petId, store.outfit(this.scene.petId));
  }

  /** Caixa de Brinquedos: as letras da palavra (as que faltam bem clarinhas). */
  private renderBox(): void {
    const word = LEVELS[this.level].word;
    this.filled = [...word].map(() => false);
    this.box.innerHTML = [...word].map((c, i) => `<span class="slot" style="--c:${letterColor(i)}">${c}</span>`).join('');
  }

  private letterTaken(index: number, x: number, y: number): void {
    const level = LEVELS[this.level];
    const ch = level.word[index];
    // Vai para o primeiro espaço livre com essa letra.
    let slot = [...level.word].findIndex((c, i) => c === ch && !this.filled[i]);
    if (slot < 0) slot = index;
    this.filled[slot] = true;
    sfx.letter();
    sfx.sayNext(letterLine(ch));
    if (store.earn(level.word, `L${index}`)) this.bumpCoins();
    const target = this.box.children[slot] as HTMLElement;
    const r = target.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly-letter';
    fly.textContent = ch;
    fly.style.setProperty('--c', letterColor(slot));
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;
    this.el.append(fly);
    fly
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)' },
          { transform: `translate(calc(-50% + ${(r.left + r.width / 2 - x) * 0.5}px), calc(-50% + ${(r.top - y) * 0.5 - 80}px)) scale(1.4)`, offset: 0.45 },
          { transform: `translate(calc(-50% + ${r.left + r.width / 2 - x}px), calc(-50% + ${r.top + r.height / 2 - y}px)) scale(0.9)` },
        ],
        { duration: 750, easing: 'ease-in-out', fill: 'forwards' },
      )
      .finished.catch(() => {})
      .then(() => {
        fly.remove();
        target.classList.add('got');
        target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 350 });
      });
  }

  private coinTaken(index: number, _x: number, _y: number): void {
    sfx.coin();
    if (store.earn(LEVELS[this.level].word, `C${index}`)) this.bumpCoins();
  }

  private bumpCoins(): void {
    renderPill(this.pill);
    this.pill.animate([{ transform: 'none' }, { transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 400 });
  }

  private async celebrate(): Promise<void> {
    const session = this.session;
    const level = LEVELS[this.level];
    const stars = starsFor(this.scene.launches, level.word.length);
    store.setStars(level.word, stars);
    await new Promise((r) => setTimeout(r, 400));
    if (session !== this.session) return;
    sfx.win();
    confetti(this.el, 120);
    sfx.sayNext(`${spoken(level.word)}!`);
    this.showWin(stars);
  }

  private showWin(stars: number): void {
    const level = LEVELS[this.level];
    const last = this.level === LEVELS.length - 1;
    this.win.innerHTML = `
      <div class="win-card">
        <div class="word-card">
          <span class="emoji">${level.emoji}</span>
          <span class="word">${[...level.word].map((c, i) => `<b style="color:${letterColor(i)}">${c}</b>`).join('')}</span>
          <span class="stars">${starsHtml(stars)}</span>
        </div>
        <div class="dance">${PETS.map((p, i) => `<span style="--d:${i * 0.18}s">${petSvg(p.id, store.outfit(p.id), true)}</span>`).join('')}</div>
        <div class="win-actions"></div>
      </div>`;
    this.win.querySelector('.win-actions')!.append(
      onTap(iconButton('grid', 'Palavras', 'small'), () => this.nav.map()),
      onTap(iconButton(last ? 'grid' : 'next', last ? 'Palavras' : 'Próxima palavra', 'big next'), () =>
        last ? this.nav.map() : this.nav.play(this.level + 1),
      ),
      onTap(iconButton('shirt', 'Bichinhos', 'small shop-btn'), () => this.nav.shop()),
    );
    this.win.querySelector('.word-card')!.addEventListener('click', () => sfx.say(`${spoken(level.word)}!`));
    this.win.hidden = false;
  }
}

export class ShopScreen {
  readonly el = makeScreen('shop');
  private readonly preview: HTMLElement;
  private readonly pets: HTMLElement;
  private readonly pill = coinPill();
  private readonly cards = new Map<string, HTMLButtonElement>();
  private pet: PetId = 'pipoca';

  constructor(nav: Nav) {
    this.el.innerHTML = `
      <div class="topbar"></div>
      <div class="shop-body">
        <div class="shop-left"><div class="shop-pets"></div><div class="preview"></div></div>
        <div class="shop-grid"></div>
      </div>`;
    this.el.querySelector('.topbar')!.append(onTap(iconButton('back', 'Voltar'), () => nav.home()), this.pill);
    this.preview = this.el.querySelector('.preview')!;
    this.pets = this.el.querySelector('.shop-pets')!;
    const grid = this.el.querySelector('.shop-grid')!;
    for (const item of ITEMS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'item';
      card.setAttribute('aria-label', item.name);
      card.innerHTML = `<span class="art">${itemSvg(item.id)}</span><span class="price">${COIN_SVG}<b>${item.price}</b></span><span class="worn-badge">${ICONS.check}</span>`;
      card.addEventListener('click', () => this.tapItem(item.id));
      grid.append(card);
      this.cards.set(item.id, card);
    }
  }

  show(): void {
    this.pet = store.pet;
    this.render();
  }

  private tapItem(id: string): void {
    const item = ITEMS.find((it) => it.id === id)!;
    const card = this.cards.get(id)!;
    if (store.owns(id)) {
      sfx.pop();
      store.toggleWear(this.pet, item.slot, id);
    } else if (store.buy(id, item.price)) {
      sfx.buy();
      store.toggleWear(this.pet, item.slot, id);
      confetti(this.el, 50);
    } else {
      sfx.hit('block', 2);
      card.animate([{ transform: 'none' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'none' }], { duration: 360 });
      this.pill.animate([{ transform: 'none' }, { transform: 'scale(1.2)' }, { transform: 'none' }], { duration: 400 });
      return;
    }
    this.render();
    this.preview.animate([{ transform: 'none' }, { transform: 'translateY(-8%)' }, { transform: 'none' }], { duration: 380 });
  }

  private render(): void {
    renderPill(this.pill);
    this.preview.innerHTML = petSvg(this.pet, store.outfit(this.pet), true);
    this.pets.innerHTML = '';
    for (const p of PETS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `mini-pet${p.id === this.pet ? ' on' : ''}`;
      b.setAttribute('aria-label', p.name);
      b.innerHTML = petSvg(p.id, store.outfit(p.id));
      b.addEventListener('click', () => {
        sfx.pop();
        this.pet = p.id;
        store.pet = p.id;
        this.render();
      });
      this.pets.append(b);
    }
    const outfit = store.outfit(this.pet);
    for (const item of ITEMS) {
      const card = this.cards.get(item.id)!;
      const owned = store.owns(item.id);
      card.classList.toggle('owned', owned);
      card.classList.toggle('worn', outfit[item.slot] === item.id);
      card.classList.toggle('affordable', !owned && store.coins >= item.price);
    }
  }
}
