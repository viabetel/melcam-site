# AUDITORIA DE PALETA — MELCAM

**Data:** 13/08/2026
**Raiz auditada:** `C:\Users\israe\viabetel\melcam-site` (pré-voo limpo, header
`x-melcam-project: canonical`, SHA-256 do HTTP conferindo com o disco)
**Método:** inventário de código + estilo **computado** no navegador (Edge
headless por CDP), 9 rotas × 3 breakpoints × 2 esquemas de cor, mais os estados
de teclado, formulário, menu e `reduced-motion`.
**Commit:** nenhum.

---

## 1. Resumo executivo

A auditoria encontrou **um defeito de causa única que anulava a paleta inteira**
e, a partir dele, praticamente todos os "legados do template" listados no
escopo.

`tools/identidade.js` sobrescrevia os nove tokens de cor do template no seletor
`:root`. Só que **o template declara esses mesmos nove tokens em `body`** — e
duas vezes, uma para o esquema claro e outra dentro de
`@media (prefers-color-scheme: dark)`. Custom property herda, e herança perde
para qualquer declaração direta no próprio elemento. Resultado medido: a paleta
MELCAM valia para o `<html>` e para mais nada. Tudo dentro de `<body>` — ou
seja, o site — lia de volta o legado:

| o que aparecia | o que deveria |
|---|---|
| fundo `#0D0D0D` | carvão `#221E17` |
| texto `#DEDEDE` | papel `#FBF7EE` |
| secundário `#696969` (3,54:1 — **reprova AA**) | `#9A9083` (5,28:1) |
| superfície `#1C1C1C` | `#2B251C` |
| borda `#FFFFFF` 5% | `rgba(251,247,238,.07)` |
| overlay `#131314` 30% | `rgba(34,30,23,.35)` |

E com **`prefers-color-scheme: light`** no sistema operacional, o site abria
inteiro na *pele clara do template*: fundo `#F5F5F5`, texto `#333`, superfície
`#EAEAEA`. Isso não era hipótese — está capturado em
`tools/shots-paleta/antes-home-desktop-CLARO.png`.

A correção é de uma linha (`:root` → `:root,body`) e resolveu, de uma vez,
**1.337 das 1.390 ocorrências de cor fora da paleta que pintavam** e **63 das
67 falhas de contraste**. Sobre isso vieram nove correções pontuais.

**Números, antes → depois** (só cor que *pinta*, medida no navegador):

| | antes | depois |
|---|---|---|
| cores fora da paleta pintando | 12 valores · 1.390 ocorrências | 2 valores · 36 ocorrências |
| falhas de contraste WCAG 2.2 AA | 67 nós únicos | **0** |
| foco sem anel ou < 3:1 | 1 (campo de newsletter) | **0** |
| erros de console | 0 (+1 esperado na `/404`) | idem |
| geometria da fileira da home | 4980×720 · 3593×512 · 2993×422 | **idêntica** |
| `index.html` SHA-256 | `26606fb8d572eaee` | **`26606fb8d572eaee`** |

Nenhum HTML foi tocado. Nenhuma dimensão, animação, tipografia, espaçamento,
conteúdo ou enquadramento mudou.

---

## 2. Paleta oficial

| token | valor | papel confirmado no site |
|---|---|---|
| carvão | `#221E17` | fundo da página, wrapper, navbar, base dos scrims |
| mel | `#F2A900` | CTA, foco de teclado, item de menu atual, indicadores, eyebrow Polen |
| papel | `#FBF7EE` | texto principal sobre escuro, títulos de card, pastilhas de pagamento |
| coral | `#EE6A4D` | `.mel-remover:hover` na sacola e um ponto da régua Polen |
| verde-mar | `#5E8C7B` | selo de benefício/garantia (`box-shadow` e fundo a 16%/40%) |

Coral e verde-mar seguem **contidos e com função**, como o briefing pede: coral
só onde há ação destrutiva, verde-mar só em apoio/benefício. Nenhum dos dois
concorre com o mel como CTA. Mel não é fundo de nenhuma seção.

---

## 3. Derivações aceitas

Passaram a ser **declaradas** em `tools/identidade.js`, num vocabulário único
gerado da mesma constante que alimenta o mapa de tokens — não há duas fontes:

```css
:root,body{
  --mel-carvao:#221E17; --mel-mel:#F2A900; --mel-papel:#FBF7EE;
  --mel-coral:#EE6A4D; --mel-verde:#5E8C7B;
  --mel-superficie:#2B251C; --mel-secundario:#9A9083;
  --mel-papel-suave:#CFC6B8; --mel-borda:rgba(251,247,238,.07);
  --mel-overlay:rgba(34,30,23,.35); --mel-mel-claro:#FFC22E;
}
```

| derivação | valor | contraste sobre carvão | uso |
|---|---|---|---|
| superfície | `#2B251C` | — (é fundo) | cards, áreas elevadas |
| secundário | `#9A9083` | **5,28:1** | descrição, metadado, placeholder, links de rodapé |
| papel suave | `#CFC6B8` | **9,81:1** | texto de apoio com mais presença (/polen) |
| borda | `rgba(251,247,238,.07)` | — | hairline sobre escuro |
| overlay | `rgba(34,30,23,.35)` | — | véu sobre foto |
| mel claro | `#FFC22E` | — | **apenas** o hover de `.mel-bt-mel` |
| sombra quente | `rgba(14,12,9,α)` | — | substitui preto puro em `box-shadow` |

**Consolidação feita:** `#C9BFB0` era um segundo "papel suave" escrito com outro
valor. Virou `#CFC6B8` — um só.

---

## 4. Inventário de cores

Duas varreduras independentes, porque uma só mente:

1. **`tools/auditoria-cores.js`** — código-fonte. 152 arquivos (HTML, CSS, JS,
   MJS, JSON, SVG, XML), 144 valores distintos. O ponto decisivo dessa
   ferramenta é separar **literal** de **fallback de `var(--token-…, X)`**: o
   template escreve quase toda cor com fallback, e esses valores estão mortos.
   Sem essa separação o relatório abriria com 472 ocorrências de `#2E2E2E` que
   nunca pintaram.
2. **`tools/qa-paleta.js`** — estilo computado no navegador, que é o que
   realmente vale.

A sonda do navegador ainda descarta o que *não pinta*, e isso foi **contado, não
suposto**: `column-rule` (1.485 declarações, 0 pintando), `outline` em
pseudo-elemento (92, 0), `color` em pseudo sem texto (90 de 92), `fill` em
`<svg>`/`<g>`/`<use>` (herança ou sobrescrito pelo símbolo). Sem esse filtro o
relatório abriria com 4.004 `#000000` e 1.965 `#0000EE` que ninguém nunca viu.

> **Ressalva de método, para o revisor.** A varredura `antes` foi feita com uma
> versão anterior da sonda, que ainda contava dois falsos positivos de
> `#000000`: 21 nós `.mel-sr` (texto só para leitor de tela, recortado em 1×1) e
> 6 `<text>` de SVG lidos por `color` em vez de `fill`. Descontados, o `antes`
> de `#000000` é **15**, igual ao depois — a linha da tabela já traz o número
> corrigido. Nenhuma outra cor é afetada por essa diferença.

### Tabela — ocorrências que pintam, antes e depois

| cor | antes | depois | rotas | onde pintava |
|---|---|---|---|---|
| `#FFFFFF` | 516 | **0** | 7 | fundo, texto de título de card, ícone do hambúrguer |
| `#FBF7EE` papel | 441 | **1167** | 7 | texto, fundo, pastilhas |
| `#FBF7EE@0.07` borda | 245 | **424** | 7 | hairline de card |
| `#F2A900` mel | 235 | 235 | 7 | CTA, foco, eyebrow, indicadores |
| `#DEDEDE` | 204 | **0** | 7 | h1, h2, parágrafos do hero e da grade |
| `#696969` | 192 | **0** | 7 | links do rodapé, placeholder da newsletter |
| `#FFFFFF@0.05` | 179 | **0** | 7 | borda `::after` dos cards |
| `#9A9083` secundário | 154 | **351** | 7 | descrição, metadado, placeholder |
| `#1C1C1C` | 126 | **0** | 1 | gradiente de fundo dos 4 cards da home |
| `#0D0D0D` | 105 | **0** | 7 | `body`, wrapper, navbar, `section[Shadow]` |
| `#2B251C` superfície | 80 | **206** | 5 | cards |
| `#221E17` carvão | 80 | **182** | 7 | fundo |
| `#5E8C7B` verde-mar | 42 | 42 | 2 | selo de benefício |
| `#000000` | 15 | 15 | 1 | `drop-shadow` dos packshots (mantido, §9) |
| `#6772E5` | 21 | 21 | 7 | logo Stripe (mantido, §9) |
| `#CFC6B8` papel suave | 15 | 18 | 1 | texto de apoio /polen |
| `#131314@0.3` | 15 | **0** | 1 | overlay dos cards |
| `#999999` | 3 | **0** | 1 | caret da newsletter |
| `#000000@0.42` | 3 | **0** | 1 | sombra do palco /polen |
| `#C9BFB0` | 3 | **0** | 1 | subtítulo de produto |
| `#757575` | 3 | **0** | 1 | placeholder do form /acessorios |
| `#7C7365` | 2 | **0** | 1 | contador do scrollytelling |
| `#0D0D0D@0.6 / @0.62` | 3 | **0** | 1 | base do scrim do hero /polen |
| `#0E0C09@0.42` | 0 | 3 | 1 | sombra quente nova |
| swatches Polen (7 valores) | 21 | 21 | 1 | amostrados dos packshots — §9 |
| régua Polen (`#F2C300` etc.) | 12 | 12 | 1 | amostrados dos packshots — §9 |

Os demais tons de `#221E17@α` e `#FBF7EE@α` (scrims, bordas, sombras autorais)
seguem inalterados e são todos derivações dos tokens oficiais.

---

## 5. Legados encontrados

| legado | visível? | sobrescrito por token? | tratamento |
|---|---|---|---|
| `body{--token-…}` do template (9 tokens, ×2 esquemas) | **sim — era a causa de tudo** | não (herança perdia) | corrigido: `:root,body` |
| `#0D0D0D` em `body`, wrapper e navbar | sim | passou a ser | via token |
| `#DEDEDE` em h1/h2/parágrafos | sim | passou a ser | via token |
| `#696969` em links de rodapé e placeholder | sim | passou a ser | via token |
| `#1C1C1C` + `#131314@.3` nos gradientes dos cards | sim | passou a ser | via token |
| `#FFFFFF` em fundo, títulos e ícone do menu | sim | passou a ser | via token |
| `#FFFFFF@0.05` nas bordas `::after` | sim | passou a ser | via token |
| `section[Shadow]` fechando em `rgb(13,13,13)` | sim | passou a ser | via token |
| `--framer-link-text-color: rgb(0,153,255)` | **não** | não | mantido — inline em 14 nós/página, mas nenhum `<a>` do site o consome; 0 elementos computam esse azul em 27 medições |
| `--framer-input-focused-border-color:#09f` | **sim**, no foco | não | corrigido para mel |
| `--framer-input-font-color: rgb(153,153,153)` | sim | não (inline) | corrigido para papel |
| `#2E2E2E`, `#F5F5F5`, `#555`, `#EAEAEA`, `#E0E0E0`, `#333` | não | são fallback de `var()` | mantidos — código morto do export |
| `drop-shadow(rgb(0,0,0) …)` nos packshots | sim, imperceptível | não | mantido — §9 |
| `#6772E5` (Stripe) | sim | — | mantido — §9 |
| cards `a[Sneakers]` do template na grade da home | sim | — | fora de escopo (conteúdo), citado em §10 |

---

## 6. Problemas visuais

| # | problema | rota | gravidade |
|---|---|---|---|
| 1 | Paleta inteira inativa abaixo de `<body>`; site abre na pele **clara** do template com `prefers-color-scheme: light` | todas | **crítica** |
| 2 | Título "BEE" do card da home em carvão sobre card escuro — **1,17:1, texto fantasma** | `/` | **crítica** |
| 3 | Campo de newsletter **sem indicador de foco** (`.framer-form-input:focus-visible{outline:none}` do template, e nossa regra não alcançava `input`) | `/` e todas | alta |
| 4 | Borda de foco do mesmo campo em **azul padrão do Framer** `#09f` | `/` | alta |
| 5 | Base do hero da `/polen` dissolvendo em `#0d0d0d` enquanto a página é carvão — a emenda que o gradiente existia para esconder virava faixa visível | `/polen` | média |
| 6 | Placeholder do form da `/acessorios` no cinza padrão do navegador `#757575` | `/acessorios` | média |
| 7 | Seis pastilhas de método de pagamento em **branco puro**, o ponto mais claro da página | todas | média |
| 8 | Dois "papéis suaves" com valores diferentes (`#CFC6B8` / `#C9BFB0`) | `/polen` | baixa |
| 9 | Sombras autorais em preto puro sobre página quente | `/`, `/polen` | baixa |

**Falso positivo descartado, e vale registrar:** a primeira medição acusou
1,27:1 nas cotas "11,4 cm" do diagrama de dimensões da `/polen`. Era erro da
minha sonda — em SVG quem pinta `<text>` é `fill`, não `color`. O `fill` já
estava em papel. A sonda foi corrigida; nada foi "consertado" ali.

Da mesma forma, os 489 "focos invisíveis" da primeira passagem eram artefato de
`el.focus()` por script, que não liga `:focus-visible`. Medido com **Tab de
verdade**, o anel de mel aparece em todos: 2px sólido, offset 3px, **9,67:1**.

---

## 7. Falhas de contraste

Medidas com o fundo **efetivo** — subindo a árvore, compondo alfas, e marcando
quem cai sobre imagem ou gradiente.

### Reprovavam antes — 67 nós únicos

Distribuição: **63** eram `#696969` (resolvidos pela correção da cascata), e
**4** eram casos próprios, corrigidos um a um. O placeholder da `/acessorios`
entra à parte porque `::placeholder` não é nó de texto e foi medido em separado.

| combinação | razão | mínimo | onde |
|---|---|---|---|
| `#696969` sobre `#0D0D0D` | **3,54:1** | 4,5 | os 8 links do rodapé, em **7 rotas** (63 nós) |
| `#696969` sobre `#0D0D0D` | **3,54:1** | 4,5 | placeholder "Seu e-mail" |
| `#757575` sobre `#2B251C` | **3,29:1** | 4,5 | placeholder "seu@email.com" (`/acessorios`) |
| `#221E17` sobre card escuro | **1,17:1** | 3 | título "Bee" na grade da home |
| `#7C7365` sobre `#0D0D0D` | **4,16:1** | 4,5 | contador do scrollytelling (**3,55:1** sobre carvão) |
| `#504A42` (separador a `.6`) | **2,22:1** | 4,5 | "/" do contador (**2,77:1** sobre carvão) |
| mel a `.5` sobre superfície | **2,97:1** | 3 | número do placeholder editorial |
| mel a `.66` sobre carvão | **4,36:1** | 4,5 | número do capítulo inativo |

> A última merece nota: `0,66` fora calibrado em sessão anterior contra o fundo
> `#0d0d0d` e dava 4,70:1. Com a paleta valendo de fato, o fundo ficou **mais
> claro** (carvão) e o mesmo `0,66` caiu para 4,36:1. Corrigir a cascata
> *criou* essa falha — por isso a auditoria remediu tudo depois, em vez de
> confiar nos números antigos.

### Aprovam agora

| combinação | razão | mínimo | |
|---|---|---|---|
| papel sobre carvão | **15,51:1** | 4,5 | texto |
| papel sobre superfície | **14,19:1** | 4,5 | texto |
| papel suave `#CFC6B8` sobre carvão | **9,81:1** | 4,5 | texto |
| carvão sobre mel (CTA) | **8,25:1** | 4,5 | texto |
| mel (anel de foco) sobre carvão | **8,25:1** | 3 | componente |
| mel (anel de foco) sobre superfície | **7,55:1** | 3 | componente |
| coral sobre carvão (`.mel-remover:hover`) | **5,37:1** | 4,5 | texto |
| coral sobre superfície | **4,92:1** | 4,5 | texto |
| secundário `#9A9083` sobre carvão | **5,28:1** | 4,5 | texto |
| secundário sobre superfície `#2B251C` | **4,83:1** | 4,5 | texto |
| mel a `.70` sobre carvão | **4,72:1** | 4,5 | texto |
| verde-mar sobre carvão | **4,35:1** | 3 | componente — ver nota |
| verde-mar sobre superfície | **3,98:1** | 3 | componente — ver nota |
| mel a `.60` sobre superfície | **3,64:1** | 3 | texto grande (38px) |

> **Nota sobre o verde-mar.** `#5E8C7B` sobre carvão dá 4,35:1, abaixo dos 4,5
> exigidos para texto normal. Conferi onde ele é usado: **em lugar nenhum ele é
> cor de texto**. As 42 ocorrências são todas fundo — o ponto antes de cada
> item da lista de especificações (39) e um ponto da régua de cores da Polen
> (3). Como elemento gráfico, o mínimo é 3:1 e ele passa com folga. Fica
> registrado que, **se um dia ele virar cor de texto, reprova** e precisará de
> um tom derivado mais claro.

**Total: 0 nós abaixo do mínimo, nas 9 rotas × 3 breakpoints.**

Texto sobre imagem foi tratado à parte: os scrims do hero da `/polen` e a tira
do card Polen são **scrims funcionais**, não enfeite — é deles que vem o piso de
contraste sobre a fotografia. Nenhum foi enfraquecido.

---

## 8. Correções aplicadas

Todas na **fonte geradora e no build**, como manda o `AGENTS.md`. `tools/aplicar.js`
não foi executado.

| # | correção | fonte | build |
|---|---|---|---|
| 1 | tokens passam a ser declarados em `:root,body` | `tools/identidade.js` | `melcam/identidade.css` |
| 2 | vocabulário de derivações (`--mel-superficie`, `--mel-secundario`, `--mel-papel-suave`, `--mel-borda`, `--mel-overlay`, `--mel-mel-claro`) | `tools/identidade.js` | idem |
| 3 | removido o braço `.framer-text:first-child:not(h1):not(h2)` que pintava o `<h3>` "Bee" de carvão | `tools/identidade.js` | idem |
| 4 | campo de newsletter: texto e caret em papel, borda de foco em mel, anel de foco para `input`/`textarea`/`select` | `tools/identidade.js` | idem |
| 5 | pastilhas de pagamento de branco puro para papel | `tools/identidade.js` | idem |
| 6 | scrim do hero `/polen` fecha em carvão (desktop e retrato) | `tools/polen-interacoes.js` | idem |
| 7 | `#C9BFB0` → `#CFC6B8`; `#7C7365` → `#9A9083`; separador do contador sem `opacity:.6` | `tools/polen-interacoes.js` | idem |
| 8 | capítulo inativo `.66` → `.70`; número do placeholder `.5` → `.6` | `tools/polen-interacoes.js` | idem |
| 9 | `::placeholder` declarado no form da `/acessorios` | `tools/demais.js` | idem |
| 10 | sombras autorais de `rgba(0,0,0,α)` para `rgba(14,12,9,α)` | `tools/paginas.js`, `tools/polen-interacoes.js`, `tools/hero-carrossel.js` | `melcam/identidade.css`, `melcam/interacoes.js` |

**Prova de sincronia fonte↔build:** rodando `gerarIdentidade()` com o
`writeFileSync` interceptado, as **52 regras** que a fonte emite existem todas no
build. (Achado colateral: o build traz as regras de ordenação da Colméia numa
posição diferente da fonte, porque outro gerador as reemite mais adiante no
arquivo. Divergência **anterior** a esta auditoria, sem efeito visual — anotada
em §10.)

---

## 9. Cores mantidas, e por quê

| cor | ocorrências | por que fica |
|---|---|---|
| `#6772E5` | 21, em 7 rotas | Roxo institucional da **Stripe**, num logo de terceiro. Marca de terceiro não se recolore. Ver pendência em §10. |
| `#000000` em `drop-shadow` | 15, na home | Sombra do template nos packshots, com **cinco deslocamentos diferentes** e classes hasheadas que mudam a cada export. Sobre carvão é imperceptível; recolorir exigiria replicar os cinco offsets e o ganho visual é nulo. |
| `#F2C300`, `#7A5A44`, `#1A1714`, `#E8A0AE` | 12 | Régua de 7 pontos da Polen — **amostradas dos packshots**. |
| `#F4B233`, `#DADADA`, `#EF6C29`, `#5F2D0B`, `#2B2B2B`, `#FBBAB6`, `#303F1C` | 21 | Swatches das 7 cores da Polen — **amostradas dos packshots**. São o produto: recolori-las seria mentir sobre a cor da câmera que a pessoa vai receber. |
| `#FFF9EB` | 4 arquivos | Branco oficial dos SVG de logo `-branco`. É o asset da marca, não uma escolha de página. |
| `#2E2E2E`, `#F5F5F5`, `#333`, `#555`, `#EAEAEA`, `#E0E0E0`, `#E3E3E3` | ~700 | **Fallback** de `var(--token-…)`. Com os tokens definidos, é código morto. Removê-los significaria editar HTML gerado de 400 KB sem ganho nenhum. |
| `rgb(0,153,255)` | 118 | `--framer-link-text-color` inline. Nenhum `<a>` do site consome essa variável — **0 elementos** computaram esse azul em 27 medições. Fica como legado inerte. |
| Fotografias | — | Nenhuma foto foi recolorida, reenquadrada ou filtrada. |

---

## 10. Pendências

Coisas que a auditoria **encontrou** e que não cabia a ela resolver:

1. 🔴 **`/privacidade` e `/termos` estão em branco.** `#main` com 0 filhos, 0
   `<h1>`, sem navbar e sem rodapé, nos três breakpoints. São páginas Framer que
   dependem da hidratação React, desligada por decisão de arquitetura. Não é
   defeito de cor — mas é defeito, e os textos jurídicos estão em `PENDENTES`,
   então não dá para inventá-los. **Precisa de decisão.**
2. **Logo da Stripe no rodapé.** O `melcam.config.json` diz que o gateway está
   a decidir e o checkout é demonstrativo. Um logo de gateway afirma um fato
   que ainda não é verdade. Remover é mudança de **conteúdo**, fora do escopo
   desta auditoria.
3. **CTA "Quero entrar na Colméia" em papel, não em mel.** Está *dentro* da
   paleta e passa contraste com folga, então não é defeito. Mas é o único CTA
   primário do site que não é mel. **Decisão de design**, não de auditoria —
   deixei como está de propósito. A regra, se for para mudar, é uma linha.
4. **Card `a[Sneakers]` do template** ainda na grade da home, rotulado
   "Acessórios". Cor correta; nome do nó é legado. Cosmético e interno.
5. **`.mel-menu` herda `color: rgb(0,0,0)`** do user-agent. Hoje não pinta nada
   (todos os filhos declaram a própria cor), mas qualquer texto solto que entre
   ali sai preto. Vale declarar papel no contêiner numa próxima passagem.
6. **Divergência de posição fonte↔build** nas regras de ordenação da Colméia
   (§8). Anterior a esta auditoria; some quando o pipeline puder ser regerado.
7. **`tools/edge-cdp-*`**: 17 mil arquivos de perfil do Edge deixados por
   `tools/cdp.js` dentro de `tools/`. Afogam qualquer varredura da árvore. Valem
   uma linha no `.gitignore` e uma limpeza.

---

## 11. Resultados por rota

| rota | `<h1>` | navbar | rodapé | img quebradas | console | cor fora da paleta | contraste |
|---|---|---|---|---|---|---|---|
| `/` | 1 | ok | ok | 0 | 0 | Stripe + drop-shadow | **0 falhas** |
| `/polen` | 1 | ok | ok | 0 | 0 | Stripe + swatches | **0 falhas** |
| `/bee` | 1 | ok | ok | 0 | 0 | Stripe | **0 falhas** |
| `/acessorios` | 1 | ok | ok | 0 | 0 | Stripe | **0 falhas** |
| `/sobre` | 1 | ok | ok | 0 | 0 | Stripe | **0 falhas** |
| `/sacola` | 1 | ok | ok | 0 | 0 | Stripe | **0 falhas** |
| `/404` | 1 | ok | ok | 0 | 1 (o próprio HTTP 404, por projeto) | Stripe | **0 falhas** |
| `/privacidade` | **0** | **não** | **não** | 0 | 0 | — | — (página vazia, §10) |
| `/termos` | **0** | **não** | **não** | 0 | 0 | — | — (página vazia, §10) |

`contact.html` e `faq.html` existem em disco mas **não têm rota** em `serve.js`;
`privacy-policy.html` e `terms-and-conditions.html` são os nomes-espelho do
template. Todos herdam a mesma camada de identidade.

---

## 12. Resultados por breakpoint

Altura do documento — **idêntica antes e depois em todas as rotas**, que é a
prova de que a auditoria de cor não mexeu em geometria:

| rota | 1440×900 | 768×1024 | 390×844 | transbordo horizontal |
|---|---|---|---|---|
| `/` | 7745 px | 12584 px | 9844 px | não |
| `/polen` | 12313 px | 13470 px | 9536 px | não |
| `/bee` | 4213 px | 5841 px | 4871 px | não |
| `/acessorios` | 1304 px | 1760 px | 1744 px | não |
| `/sobre` | 2099 px | 2742 px | 2941 px | não |
| `/sacola` | 900 px | 1302 px | 1291 px | não |
| `/404` | 900 px | 1329 px | 1435 px | não |

---

## 13. QA de regressão

### Estados testados

| estado | resultado |
|---|---|
| normal | ok nas 9 rotas × 3 breakpoints |
| `:hover` | 40 regras de estado lidas no CSSOM; todas em cor de paleta |
| `:focus-visible` **com Tab real** | anel mel 2px, offset 3px — **9,67:1** em link/botão, **7,55:1** no campo |
| `:active` / `[aria-selected]` / `[aria-checked]` / `[aria-current]` | mel sobre carvão |
| `::placeholder` | `#9A9083` nos dois formulários |
| menu suspenso aberto (390) | fundo carvão, item atual em mel, demais em papel |
| sacola vazia e preenchida | ok; `.mel-remover:hover` em coral |
| seletor das 7 cores da Polen | ok; anel de seleção em mel |
| scrollytelling (9 capítulos) | ok; ativo em mel, inativo a `.70` |
| `prefers-reduced-motion: reduce` | fileira em estado final (escala 1, y 0, opacidade 1), vídeo pausado e **visível** |
| `prefers-color-scheme: light` | **idêntico ao escuro** — era o defeito, agora não é |

### QA obrigatório da home

```
node tools/medir.js "http://localhost:3030/" pos-auditoria-paleta
```

| verificação | exigido | medido |
|---|---|---|
| grupo desktop | 4980×720 | **4980×720** ✅ |
| grupo tablet | ~3593×512 | **3593×512** ✅ |
| grupo mobile | ~2993×422 | **2993×422** ✅ |
| overflow | `hidden` | **`hidden`** ✅ |
| escala | 0.5 → 1 | **0.5 → 1** ✅ |
| translateY | 150 → 0 | **150 → 0** ✅ |
| erros de console | 0 | **0** ✅ |

Contra a baseline aprovada `medidas/medida-desfile-mobile-13ago.json`:
**21 pontos comparados, 0 diferenças.**
`index.html` com o mesmo SHA-256 `26606fb8d572eaee`.

---

## 14. Capturas antes/depois

Em `tools/shots-paleta/`:

| assunto | antes | depois |
|---|---|---|
| home, esquema **claro** (o defeito mais grave) | `antes-home-desktop-CLARO.png` | `depois-home-desktop-CLARO.png` |
| grade da home (card "BEE" fantasma) | `antes-home-grade.png` | `depois-home-grade.png` |
| rodapé (links a 3,54:1, pastilhas brancas) | `antes-home-rodape.png` | `depois-home-rodape.png` |
| foco de teclado no campo de newsletter | — | `depois-campo-foco-teclado.png` |
| emenda do hero da `/polen` | — | `depois-polen-emenda.png` |
| menu mobile aberto | — | `depois-menu-mobile.png` |
| 9 rotas × 3 breakpoints | `antes-*.png` (27) | `final-*.png` (27) |

---

## Ferramentas criadas

Ficam no repositório, reexecutáveis:

| arquivo | o que faz |
|---|---|
| `tools/auditoria-cores.js` | inventário do código-fonte, separando literal de fallback de token |
| `tools/qa-paleta.js` | varredura de estilo **computado** no navegador: 9 rotas × 3 breakpoints, contraste com fundo efetivo, regras de estado no CSSOM, foco, saúde |
| `tools/resumo-paleta.js` | resume o JSON da varredura: cor fora da paleta que pinta, contraste, foco, saúde |
| `tools/inspecionar.js` | avalia uma expressão numa rota, com `--tab N` (teclado real), `--shot`, `ESQUEMA=light\|dark`, `MOVIMENTO=reduce` |

---

**Nenhum commit foi feito.**
