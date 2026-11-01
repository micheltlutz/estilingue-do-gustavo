# Estilingue do Gustavo

Jogo de estilingue para crianças pequenas, **sem propagandas, sem compras e sem coleta de dados**.
A criança lança três bichinhos — **Pipoca** (o filhote golden), **Mimi** (a gatinha) e **Bolinha** (o coelhinho) — para pegar as letras de uma palavra, que vão para a Caixa de Brinquedos. Nada de destruir: o objetivo é **pegar letras**.

**Jogar:** https://micheltlutz.github.io/estilingue-do-gustavo/

## Instalar no iPad

1. Abra o link acima no **Safari**.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra o jogo pelo ícone **uma vez com internet**. Depois disso ele funciona offline.

Fica melhor com o iPad **deitado** (em pé, o cenário aparece menor, embaixo).

## Como se joga

- **Escolher o bichinho** antes de cada fase (e trocar a qualquer hora pelo botão com o rosto dele).
- **Puxar e soltar:** o dedo pode começar em qualquer lugar perto do estilingue. Enquanto puxa, um **caminho em bolinhas coloridas** mostra até onde ele vai.
- **Tocar na tela durante o voo** usa a habilidade:
  - **Pipoca:** late e dá um impulso em linha reta, quebrando cercas e caixotes.
  - **Mimi:** dá uma cambalhota e vira três gatinhas (todas pegam letras).
  - **Bolinha:** gira as orelhas e desce flutuando devagar.
- **Letras:** pega encostando nelas — ou derrubando a torre (letra que cai no chão também vale). A voz diz "**Gê de Gato!**".
- **Sem castigo:** lançamentos infinitos. O bichinho sacode a poeira e o estilingue recarrega.
- **Dica:** a lâmpada (ou 3 lançamentos seguidos sem pegar nada) mostra um dedinho puxando o estilingue do jeito certo.
- **Vitória:** a palavra completa, com figura, estrelas (1 a 3, nunca zero) e os bichinhos dançando.
- **Moedas e roupinhas:** cada letra (na primeira vez) e cada moeda da fase vale uma moeda. Na loja: chapéu de festa, gravata borboleta, óculos de sol, chapéu de caubói, óculos de coração e coroa — comprou uma vez, serve para os três.

**Fases (20 palavras):** SOL, LUA, UVA, OVO, MEL · GATO, PATO, BOLA, SAPO, CASA · VACA, FOCA, DADO, ZEBRA, MACACO · MIMI, PIPOCA, BOLINHA, ESTRELA e **GUSTAVO**.

## Desenvolvimento

Requer Node 24 ou mais novo.

```sh
npm install
npm run dev -- --host   # abre na rede local (teste no iPad pela Wi-Fi)
npm test                # fases, física, habilidades e dicas
npm run check           # procura o puxão de cada letra e grava as dicas (src/game/hints.json)
npm run build           # versão final em dist/
npm run icons           # gera os ícones PNG a partir de public/icon.svg
```

- `src/game/levels.ts`: as 20 fases (torres montadas com ajudantes).
- `src/game/sim.ts`: a física (Matter.js) — lançar, habilidades, pegar letras e moedas.
- `src/game/trajectory.ts`: o caminho em bolinhas (igual ao voo da física).
- `scripts/check-levels.ts`: o verificador de fases (toda letra pode ser pega por algum lançamento, com qualquer bichinho e sem habilidade).
- `src/ui/scene.ts`: o canvas da fase (desenho, estilingue, efeitos).
- `src/ui/sprites.ts`: os bichinhos, as roupinhas e o cenário.
- `src/ui/screens.ts`: telas inicial, mapa, escolha do bichinho, fase, vitória e loja.

Cada push na branch `main` roda os testes e publica no GitHub Pages.
