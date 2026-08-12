# MOTION_SPEC — template original

**Fase 1 da diretriz de fidelidade de motion. O canvas não foi tocado.**

Referência: <https://teste123456321654.framer.website>
Duplicata: <https://busy-buttons-865629.framer.app> (hoje idêntica ao template)
Levantado em 12/08/2026.

---

## Procedência de cada número — leia antes de usar

A diretriz pede para não estimar valores "se estiverem disponíveis no editor".
**Eu não tenho acesso ao editor do Framer.** Então este documento usa duas
fontes, e cada linha diz qual é:

| Marca | Fonte | Confiabilidade |
|---|---|---|
| **DECLARADO** | JSON que o próprio Framer publica no HTML, em `<script type="framer/appear" id="__framer__appearAnimationsContent">` | Autoritativo. É o valor que o editor exportou. |
| **MEDIDO** | `getComputedStyle` no runtime real, Edge headless por CDP, 5 viewports | Autoritativo para comportamento. Não revela o nome do controle no editor. |
| **PENDENTE** | Só o editor mostra | Não preenchido. Não inventei. |

Nada aqui foi estimado no olho.

Ferramentas: `tools/cdp.js` e `tools/medir.js`. Dados brutos em
`medidas/` e no `motion-bruto.json` da sessão.

---

## Achado que muda o plano

O template tem **muito menos motion declarado do que a diretriz pressupõe**.

- **Uma única appear animation** em toda a home: id `zfsne5`, com 3 variantes de
  breakpoint. Não há dezenas de efeitos de entrada.
- **Todo o resto do movimento é scroll transform**, aplicado pelo runtime do
  Framer, sem entrada correspondente no JSON de appear.
- **Nenhum elemento tem rotation, rotationX/Y, blur, parallax ou stagger
  declarado.** Medi em 5 viewports, em 5 marcos de progresso: os únicos valores
  que mudam são `opacity`, `scale` e `translateY`.

Isso é bom: o vocabulário de motion a preservar é pequeno e coerente. E é
importante, porque uma reprodução "rica" seria **infiel** — inventaria
movimento que o original não tem.

Console limpo nos 5 viewports: **0 erros**.

---

## 1. Appear animation — a única declarada

**DECLARADO**, íntegro do JSON publicado.

| Campo | Valor |
|---|---|
| appear-id | `zfsne5` |
| Frame | `Card Product` |
| Classe | `framer-a0g3Z` |
| Variantes | 3 — `default`, `1g8fb3q`, `wq5psc` (uma por breakpoint) |

Estado inicial e final, **idênticos nas três variantes**:

| Propriedade | initial | animate |
|---|---|---|
| opacity | `0.001` | `1` |
| scale | `1` | `1` |
| x | `0` | `0` |
| y | `0` | `0` |
| rotate | `0` | `0` |
| rotateX | `0` | `0` |
| rotateY | `0` | `0` |
| skewX | `0` | `0` |
| skewY | `0` | `0` |
| transformPerspective | `1200` | `1200` |

Transição — **spring, não easing**:

| stiffness | damping | mass | delay | type |
|---|---|---|---|---|
| `200` | `100` | `1` | `0.3` s | `spring` |

Sem `bounce` no JSON: o Framer exportou a forma stiffness/damping/mass.

**Ponto importante:** esta animação move **só opacidade**. `scale` e `y` são
iguais nos dois estados. Quem quiser reproduzir "a entrada com escala" pelo
appear effect está no lugar errado — a escala vem do scroll transform, adiante.

---

## 2. Scroll transforms — inventário medido

**MEDIDO** no desktop 1440×900, 5 marcos de progresso da página.

| Frame | Classe | opacity | scale | translateY |
|---|---|---|---|---|
| `Header` (fileira de imagens) | `framer-dtlgl4` | 0 → 1 | **0.5 → 1** | **150 px → 0** |
| `Glow` | `framer-1xteqe7` | 0 → 0.993 | 1 (fixo) | 0 (fixo) |
| `Glow` | `framer-69jsss` | 0 → 0.993 | 1 (fixo) | 0 (fixo) |
| `Elevating Your Style Game` (título da seção) | `framer-1wb9l8v` | 0 → 1 | 1 (fixo) | 0 (fixo) |
| `TRENDING NOW` | `framer-18huwhn` | 0 → 1 | 1 (fixo) | 0 (fixo) |

Ou seja: **um só elemento** na home tem transformação geométrica no scroll. Os
outros quatro são revelação de opacidade pura.

Os dois `Glow` acendem tarde (nada até 50% do progresso, 0.893 em 75%). Os dois
títulos acendem em tempos diferentes entre si — `Elevating Your Style Game` já
está em 0.86 aos 25%, enquanto `TRENDING NOW` ainda está em 0 e só sobe aos 50%.
Isso é escalonamento por posição na página, não `stagger` declarado.

---

## 3. Seção prioritária — "A câmera que vive com você"

### Identificação

| | |
|---|---|
| Título da seção | `.framer-klb4ly`, `data-framer-name="Header Info"` |
| Fileira animada | `.framer-dtlgl4`, `data-framer-name="Header"` — **irmã**, não filha |
| Layers | 10, nomeadas `Image 1` … `Image 9` e `Image` |

Classes das dez, na ordem: `framer-1mlwrve` · `framer-1lggaqu` ·
`framer-p5dsc8` · `framer-zhwqt9` · `framer-14kqz2p` · `framer-vsbea7` ·
`framer-lk3zu3` · `framer-hz6fbf` · `framer-1baa5n9` · `framer-1qo1eaf`.

### Geometria — as dez dividem uma única regra CSS

```css
aspect-ratio: .666667;   /* 2:3 vertical, travado */
width: auto;             /* derivada da altura x proporcao */
height: 80vh;            /* 50vh nos dois breakpoints menores */
border-radius: 4px;
flex: none;
position: relative;
overflow: hidden;        /* o clipping */
gap: 0;
```

Container: `flex-flow:row` · `gap:20px` · `width:min-content` ·
`height:min-content` · `overflow:hidden` · `align-items:flex-start`.

Cada imagem é **Fill**: `<div style="position:absolute;inset:0">` envolvendo um
`<img>` com `object-fit:cover; object-position:center`.

**Sem rotação, sem offset individual, sem sobreposição, sem máscara própria por
layer, sem movimento individual.** A fileira é uma linha reta de dez frames
iguais, com gap constante. O único recorte é o `overflow:hidden`, do grupo e de
cada frame. Isso responde vários itens da diretriz: não existem no original.

### Tamanhos renderizados

| Breakpoint | frame | grupo | procedência |
|---|---|---|---|
| desktop 1440 | 480×720 | **4980×720** | medido |
| laptop 1024 | 256×384 | **2740** | grupo medido; frame derivado |
| tablet 768 | 341×512 | **3593×512** | medido |
| mobile 390 | 281×422 | **2993×422** | medido |
| mobile 360 | 267×400 | **2847** | grupo medido; frame derivado |

Em negrito o que foi lido do navegador. Nos dois breakpoints intermediários eu
medi a largura do grupo e **derivei** o frame pela fórmula do próprio layout
(`largura = (grupo − 9×20) ÷ 10`, altura = largura ÷ 0,666667), que fecha com a
regra CSS de `height:50vh`:

- 1024×768 → 50vh = 384 → 384 × 0,6667 = 256 → 10×256 + 180 = **2740** ✓
- 360×800 → 50vh = 400 → 400 × 0,6667 = 266,7 → 10×266,7 + 180 = **2847** ✓

Bate com a largura medida nos dois casos, então a derivação está conferida — mas
está marcada como derivação, não como leitura direta.

### A curva, nos cinco viewports pedidos

**MEDIDO.** Progresso é a fração de rolagem da página.

**desktop-1440** (doc 4308px)

| progresso | opacity | scale | translateY | largura na tela |
|---|---|---|---|---|
| 0 | 0 | 0.5 | 150 px | 2490 |
| 0.25 | 0.796 | 0.9304 | 20.9 px | 4633.3 |
| 0.5 | 0.941 | 0.9954 | 1.4 px | 4957.2 |
| 0.75 | 0.975 | 1 | 0 px | 4980 |
| 1 | 1 | 1 | 0 px | 4980 |

**laptop-1024** (doc 3738px)

| progresso | opacity | scale | translateY | largura na tela |
|---|---|---|---|---|
| 0 | 0 | 0.5 | 150 px | 1370 |
| 0.25 | 0.799 | 0.9318 | 20.5 px | 2553.1 |
| 0.5 | 0.941 | 0.995 | 1.5 px | 2726.4 |
| 0.75 | 0.975 | 1 | 0 px | 2740 |
| 1 | 1 | 1 | 0 px | 2740 |

**tablet-768** (doc 6914px)

| progresso | opacity | scale | translateY | largura na tela |
|---|---|---|---|---|
| 0 | 0 | 0.5 | 150 px | 1796.6 |
| 0.25 | 0.797 | 0.931 | 20.7 px | 3345.2 |
| 0.5 | 0.94 | 0.9948 | 1.6 px | 3574.6 |
| 0.75 | 0.975 | 1 | 0 px | 3593.3 |
| 1 | 1 | 1 | 0 px | 3593.3 |

**mobile-390** (doc 5662px)

| progresso | opacity | scale | translateY | largura na tela |
|---|---|---|---|---|
| 0 | 0 | 0.5 | 150 px | 1496.6 |
| 0.25 | 0.794 | 0.9292 | 21.2 px | 2781.5 |
| 0.5 | 0.941 | 0.9954 | 1.4 px | 2979.4 |
| 0.75 | 0.975 | 1 | 0 px | 2993.3 |
| 1 | 1 | 1 | 0 px | 2993.3 |

**mobile-360** (doc 5574px)

| progresso | opacity | scale | translateY | largura na tela |
|---|---|---|---|---|
| 0 | 0 | 0.5 | 150 px | 1423.3 |
| 0.25 | 0.799 | 0.9317 | 20.5 px | 2652 |
| 0.5 | 0.941 | 0.9954 | 1.4 px | 2833.4 |
| 0.75 | 0.975 | 1 | 0 px | 2846.6 |
| 1 | 1 | 1 | 0 px | 2846.6 |

**A curva é idêntica nos cinco.** Mesmos `0.5 → 1`, mesmos `150px → 0`, mesmos
valores intermediários em cada marco. Só o tamanho renderizado muda. Ou seja: o
efeito **não** tem variação responsiva de parâmetro — o que a diretriz chama de
"comportamento responsivo" aqui é só o `height` de 80vh/50vh.

### Detalhe da partida

Entre progresso 0 e ~0.12 o grupo fica **parado** em `opacity 0 · scale 0.5 ·
translateY 150px`. Não é fade lento: é estado inicial estático até o gatilho.
Depois sobe rápido — aos 25% já está em `scale 0.93`, e aos 75% chegou.

`perspective: 1200px` está presente no transform inline do grupo, herdada do
mesmo valor que o appear effect declara.

### Ordem de aplicação do transform

O inline é `perspective(1200px) translateY(150px) scale(0.5)`. As funções se
aplicam da direita para a esquerda, então o `translateY` acontece **dentro do
espaço já reduzido**: 150 × 0,5 = 75px de deslocamento aparente no estado
inicial. Isso explica a medição de ≈71px feita em sessão anterior.

---

## 4. O que está PENDENTE — só o editor responde

Não preenchi porque não tenho o canvas, e a diretriz proíbe estimar:

- nome do **componente principal** de cada seção e quais propriedades estão
  expostas como property;
- nome legível das **variants** (só tenho os hashes `1g8fb3q`, `wq5psc`);
- qual **scroll section** e qual **progress range** governam o transform da
  fileira — medi o efeito, não o controle que o produz;
- **transform origin** configurado no editor (o computado é o padrão);
- `hover` e `press/tap` — não há nenhum declarado no JSON de appear; se
  existirem, estão como component interactions, que não aparecem no publicado
  de forma legível;
- **overlay do menu mobile** — não medido nesta passada.

Sticky, transições de página e `prefers-reduced-motion` foram medidos: seção 6.

---

## 5. Consequência para a execução

O critério de aceite da seção prioritária fica **objetivo**, sem comparar no
olho. Depois de publicar na duplicata:

```bash
node tools/medir.js "https://busy-buttons-865629.framer.app" depois
```

e conferir contra `medidas/medida-template.json`:

| Tem que bater | Valor |
|---|---|
| scale inicial → final | `0.5` → `1.000` |
| translateY inicial → final | `150 px` → `0` |
| opacity inicial | `0.000` |
| frame desktop | `480×720` |
| grupo desktop | `4980×720` |
| aspect-ratio das 10 | `0.666667 / 1` |
| overflow do grupo | `hidden` (nunca `auto`) |
| object-fit | `cover` nas 10 |
| erros de console | `0` |

Qualquer divergência num desses campos é a diferença visível que a diretriz
manda não aceitar.

---

## 6. Sticky, transições de página e reduced-motion

**MEDIDO** em 12/08/2026, Edge headless por CDP. Script: `tools/extras.js`.
Dados brutos em `medidas/extras-template.json`.

### 6.1 Sticky — três elementos fixos, e nenhum muda no scroll

Não existe **nenhum** `position: sticky` no template. São três `position: fixed`,
idênticos no desktop e no mobile:

| Elemento | position | top | z-index | altura | papel |
|---|---|---|---|---|---|
| `.framer-1gfj5qd-container` | `fixed` | `0` | `2` | 81 px | a barra de navegação |
| `.framer-ene9dd-container` | `fixed` | `0` | `0` | = altura da viewport | camada de fundo atrás de tudo |
| (sem classe) | `fixed` | viewport − 78 | `2147483647` | 78 px | selo "Made in Framer", canto inferior |

Medido em 4 posições de scroll (0 · 15% · 50% · 100%), nos dois viewports:

| Propriedade | 0% | 15% | 50% | 100% |
|---|---|---|---|---|
| `background-color` da nav | `rgba(0,0,0,0)` | `rgba(0,0,0,0)` | `rgba(0,0,0,0)` | `rgba(0,0,0,0)` |
| `backdrop-filter` | `none` | `none` | `none` | `none` |
| `opacity` | 1 | 1 | 1 | 1 |
| `top` na tela | 0 | 0 | 0 | 0 |

> ⚠️ **Contradiz a diretriz.** O item HEADER pede para preservar "mudança de
> fundo durante o scroll" e "mudança de contraste do logo". **Isso não existe no
> original.** A barra é permanentemente transparente, sem backdrop-filter, sem
> sombra, sem borda, do topo ao fim da página. Implementar uma mudança de fundo
> seria *criar* efeito, não preservar — e a diretriz proíbe inventar animação.
>
> O selo "Made in Framer" é do plano gratuito do Framer e não faz parte do
> design. Some quando o projeto for publicado em domínio próprio.

### 6.2 Transições de página — não existem

Busca por declaração no HTML publicado, todas com **zero** ocorrências:
`pageTransition` · `page-transition` · `framer/pageTransition` ·
`exitBeforeEnter` · `AnimatePresence` · `routeTransition` · `transitionDuration`.

Medição em runtime: cliquei num link interno real (`./sort-by/Jeans`) e amostrei
o `<body>` a cada 60 ms por 2,2 s — 36 amostras.

| tempo | path | `body` opacity | `body` transform |
|---|---|---|---|
| +0 ms | `/` | 1 | `none` |
| +71 ms | `/sort-by/Jeans` | 1 | `none` |
| +228 ms … +2,2 s | `/sort-by/Jeans` | 1 | `none` |

A rota troca em ~71 ms, por roteamento no cliente, **sem fade, sem
deslocamento, sem overlay**. O conteúdo simplesmente é substituído.

Ou seja: preservar "transições entre páginas" aqui significa **preservar a
ausência delas**. Basta manter o roteamento nativo do Framer, sem publicar como
páginas HTML soltas.

### 6.3 `prefers-reduced-motion` — o Framer já resolve, e bem

Mesma curva, mesmos 7 pontos de scroll, com a media feature emulada:

| | `no-preference` | `reduce` |
|---|---|---|
| scale no início | `0.5` | **`1`** |
| translateY no início | `150 px` | **`0`** |
| largura na tela, no início | 2490 | **4980** |
| scale no fim | `1` | `1` |
| opacity ao longo | 0 → 0,94 | 0,90 → 0,93 |

Com `reduce`, o grupo **já nasce no estado final**: escala cheia, sem
deslocamento, largura real de 4980 px, antes de qualquer rolagem. O scroll
transform simplesmente não é aplicado. A opacidade continua subindo devagar
(0,90 → 0,93), então **nada fica invisível**.

Isso atende exatamente o que a diretriz pede para acessibilidade — estado final
visível, sem deslocamento grande, hierarquia preservada — **sem precisar de
nenhuma regra CSS adicional**. É comportamento nativo do runtime.

> Consequência prática: **não escrever `@media (prefers-reduced-motion)` na mão
> para esta seção.** O pipeline antigo fazia isso (`tools/identidade.js` tem um
> bloco assim, herdado do caminho abandonado) e, sobre o runtime vivo, uma regra
> dessas só pode atrapalhar o que o Framer já faz certo.

---

## 7. Overlay do menu mobile

**MEDIDO** a 390×844, com toque emulado. Script: `tools/overlay.js`.
Dados brutos em `medidas/overlay-template.json`.

O painel **não existe no DOM** com o menu fechado. É inserido no clique e
removido no fechamento — por isso um detector por tamanho não o encontra; achei
por diferença de DOM antes/depois.

### Gatilho e estrutura

| | |
|---|---|
| Botão | `data-framer-name="Meniu"`, `.framer-cinx4f`, 24×24, em (36, 41) |
| Ícone interno | `data-framer-name="Icon"`, `.framer-1p4dw9m`, 3 filhos (as barras) |
| Painel | 390×844 em (0, 0) — tela cheia |
| Seção de links | `data-framer-name="Section "`, `.framer-1kamiw2`, 390×764 em (0, 80) |
| Itens | HOME · CONTACT · BLOG · PRODUCT · SHORT-BY · FAQ |
| Cada item | `.framer-1flvjka-container`, 324×52, variante `Variant 5` |

### Animação de entrada — só opacidade

| tempo | opacity | transform |
|---|---|---|
| +80 ms | `0.066` | `none` |
| +160 ms | `0.344` | `none` |
| +240 ms | `0.677` | `none` |
| +320 ms | `0.955` | `none` |
| +400 ms | `1` | `none` |

Fecha em **~400 ms**, curva desacelerando (os saltos caem: 0,28 → 0,33 → 0,28 →
0,05). **Sem deslizar, sem escala, sem rotação** — `transform: none` em todos os
quadros. Mesmo vocabulário do resto do template: revelação por opacidade.

### Trava de scroll

| | fechado | aberto |
|---|---|---|
| `html` overflow | `visible` | **`hidden`** |
| `body` overflow | `visible` | `visible` |
| `body` position | `static` | `static` |
| `scrollY` | 0 | 0 (preservado) |

A trava é em **`<html>`, não em `<body>`**, e não usa `position:fixed` no body.
Isso evita o pulo de scroll que a técnica do `body` costuma causar.

### Fechamento

| Ação | Resultado |
|---|---|
| **Escape** | **fecha** — painel removido do DOM, `html overflow` volta a `visible` |
| Clique no ícone com menu aberto | **fecha e reabre** — o botão é toggle |

Ambos confirmados por medição, não por leitura de código.
