# MELCAM — progresso da transformação do template

Arquivo de handoff. Outro agente deve conseguir retomar só lendo isto.
Última atualização: **13/08/2026 — sessão encerrada, ver o HANDOFF no fim do
arquivo. Fileira do Header animada no export; hero e Header Info fora das
internas; as 6 internas voltaram a renderizar no tablet e no mobile; vazio dos
destaques da Bee fechado; slot fantasma do ticker fora do fluxo; ticker
arrastável com o mouse; etiqueta de pendência fora dos cards da Colméia; bloco
Polen da home com conceito, 7 cores, preço e CTA; imagem partida dos cards
Polen e Sobre Nós corrigida. Nada commitado.**

**Pasta de trabalho:** `C:\Users\israe\Downloads\framer-teste`
**Backup intocado do template:** `_ORIGINAL\` (94 arquivos, 5,7 MB) — criado, confere
**Congelamento em git:** commit `debf362`, 320 arquivos, estado pré-correção
**Servidor local:** `node serve.js` → http://localhost:3030

---

# 🔴 CORREÇÃO DE ARQUITETURA — 12/08/2026

**Leia esta seção antes de qualquer outra. Ela invalida decisões tomadas abaixo.**

## O que estava errado

Auditoria independente apontou, e eu confirmei byte a byte: o grupo
`.framer-dtlgl4` (`data-framer-name="Header"`, a fileira de imagens logo abaixo
do hero) está **congelado no estado inicial**.

| | `style` inline |
|---|---|
| `_ORIGINAL` | `opacity:0;transform:perspective(1200px) translateY(150px) scale(0.5)` |
| build atual | `opacity:1;transform:perspective(1200px) translateY(150px) scale(0.5)` |

O pipeline corrigiu só a opacidade. O `translateY(150px) scale(0.5)` ficou de pé
para sempre — por isso as imagens aparecem com metade do tamanho e sem
movimento.

### Duas afirmações minhas neste arquivo estavam erradas

**1. "O que se perde não é perda" (seção da hidratação desligada) — FALSO.**

Conferi o JSON de appear animations. A entrada de `zfsne5` anima **só
opacidade**:

```json
"initial": { "opacity":0.001, "scale":1, "y":0 }
"animate": { "opacity":1,     "scale":1, "y":0 }
```

`scale` e `y` são idênticos nos dois estados. Ou seja: o
`translateY(150px) scale(0.5)` **não é appear animation**. É efeito do runtime
React, e `.framer-dtlgl4` **não tem `data-framer-appear-id`** nenhum. O
`animator` inline que sobreviveu nunca poderia restaurar isso. Desligar a
hidratação foi perda real e irrecuperável por aquele caminho.

**2. "Zero ocorrências de COMETICA / Blue Jeans / T-Shirt" — media só texto
visível.**

Nas camadas ocultas os termos continuam: slugs de CMS e índice de busca
(`"blue-jeans"`, `"t-shirt-green-kids"`, `"white-jeans"`) e atributos
`data-framer-name="Sneakers"` e `data-framer-name="CCOMMERCE"`, em
`index.html`, `bee.html`, `polen.html`, `acessorios.html`, `sacola.html` e
`404.html`.

### Um alarme falso, descartado

Os "19 IDs duplicados `zfsne5`" **não são defeito**. `zfsne5` é
`data-framer-name="Card Product"` — um componente reusado 19 vezes. Os 19
duplicados existem no `_ORIGINAL` **e no site publicado que funciona**. Não
mexer.

(Efeito colateral real, esse sim: o `animator` inline usa
`document.querySelector` singular por appear-id, então sem React só o primeiro
dos 19 recebe o fade. Some junto com a hidratação restaurada.)

### UTF-8: não reproduz

Zero `Ã` em qualquer arquivo do projeto, zero BOM nos 11 HTML. Já conforme.

## A arquitetura nova

**O Framer é a fonte. O export é produto derivado, nunca código-fonte autoral.**

Duplicada editável e publicada: **https://busy-buttons-865629.framer.app**
(ainda COMETICA intacto — é a base limpa).

O fluxo passa a ser:

```
canvas do Framer  ->  publicar  ->  node tools/baixar-framer.js  ->  site/
```

### `tools/baixar-framer.js` — espelho com runtime inteiro

Baixa o HTML publicado, varre recursivamente todo asset remoto
(`framerusercontent.com`, `app.framerstatic.com`, `fonts.gstatic.com`), grava em
`site/_framer/<host>/<caminho>` e reescreve as URLs para local.

**Não edita nenhum bundle.** Era essa a premissa errada que quebrava a sintaxe e
levou a arrancar a hidratação.

| Verificação | Resultado |
|---|---|
| Assets locais | **182** · 15,6 MB |
| Referências `/_framer/` que resolvem | **158 de 158**, zero faltando |
| Bundles `.mjs` com sintaxe válida | **18 de 18**, zero quebrados |
| `script_main` + `modulepreload` | presentes, apontando para local |
| `.framer-dtlgl4` | `opacity:0` + transform inicial **preservados** |
| URLs remotas restantes | 0 relevantes |

O `opacity:0` volta a ser o estado inicial legítimo, porque **quem o anima
voltou a existir**. O hack global de opacidade deixa de ser necessário —
`tools/aplicar.js` e companhia saem do caminho crítico.

Config por variável de ambiente: `FRAMER_BASE`, `FRAMER_OUT`, `FRAMER_ROTAS`.

### `serve.js` — reescrito (Passo 7, concluído)

Mapa explícito de rotas; nada fora dele vira página.

| Caso | Antes | Agora |
|---|---|---|
| `/privacidade` · `/termos` | home, 200 | `privacy-policy.html` · `terms-and-conditions.html`, 200 |
| `/404` | home, 200 | `404.html`, **HTTP 404** |
| rota desconhecida | home, 200 | `404.html`, **HTTP 404** |
| asset ausente | `index.html`, 200 | **404** `text/plain` |
| traversal codificado | servia | **403** |
| `decodeURIComponent` inválido | 200 | **400** |

Testado nos 16 casos, todos conforme.

## 🛠️ MEDIÇÃO SEM EXTENSÃO — `tools/medir.js` + `tools/cdp.js`

A extensão do Chrome nunca conectou, então o caminho é outro: **Edge headless
dirigido por CDP**, com cliente WebSocket escrito à mão em `tools/cdp.js`
(sem dependência externa, sem `npm install`).

```bash
node tools/medir.js "https://busy-buttons-865629.framer.app" duplicata 1
```

Argumentos: URL · rótulo do arquivo de saída · deslocamento da porta de debug
(use um por processo se rodar dois em paralelo).

O que ele faz, por breakpoint (1440×900, 768×1024, 390×844): navega, espera o
runtime do Framer assentar, localiza `.framer-dtlgl4`, percorre 7 posições de
scroll cobrindo a entrada do grupo, e em cada uma lê `getComputedStyle` do grupo
e dos 10 frames. Grava `medida-<rótulo>.json` e 9 capturas PNG.

Colhe também erro de console e exceção de runtime, via `Log.entryAdded` e
`Runtime.exceptionThrown`.

Binário usado: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.

⚠️ **Chame o Edge pelo Bash, não pelo PowerShell.** Pelo PowerShell o processo
sobe e não devolve nada (`--screenshot` não grava, `--dump-dom` sai vazio). Pelo
Bash, com redirecionamento normal, funciona.

Medições guardadas em `medidas/`: `medida-template.json`,
`medida-duplicata.json`, `medida-build-antigo.json`.

---

## 📏 BASELINE MEDIDA — o que a versão MELCAM tem que reproduzir

Template e duplicata publicados deram **idêntico em tudo**, nos três
breakpoints. Zero erro de console nos dois. Confirma que a duplicata no ar ainda
é o template limpo.

| Breakpoint | viewport | frame | proporção | grupo | conferência |
|---|---|---|---|---|---|
| desktop | 1440×900 | 480×720 | 0,6667 | 4980×720 | 10×480 + 9×20 |
| tablet | 768×1024 | 341×512 | 0,6660 | 3593×512 | 10×341,3 + 180 |
| mobile | 390×844 | 281×422 | 0,6659 | 2993×422 | 10×281,3 + 180 |

Nos dez frames, nos três breakpoints: `aspect-ratio` resolve `0.666667 / 1`,
`overflow: hidden`, `object-fit: cover`. Sem exceção.

### Curva da animação (desktop, 7 pontos de scroll)

| scrollY | opacity | scale | translateY | largura na tela |
|---|---|---|---|---|
| 0 | 0,000 | 0,500 | 150 px | 2490 |
| 290 | 0,000 | 0,500 | 150 px | 2490 |
| 580 | 0,722 | 0,895 | 31,4 px | 4458 |
| 870 | 0,900 | 0,989 | 3,2 px | 4927 |
| 1159 | 0,927 | 1,000 | 0 | 4980 |
| 1449 | 0,934 | 1,000 | 0 | 4980 |
| 1739 | 0,940 | 1,000 | 0 | 4980 |

**Correção de uma afirmação antiga deste arquivo:** a opacidade final **não é 1**.
Assenta perto de `0,93` e sobe devagar com o scroll. Tablet e mobile seguem a
mesma curva, com a mesma partida em `0.5 / 150px / 0`.

### A prova que encerra a dúvida sobre proporção

As imagens que o Framer serve no template **não são 2:3**. Naturais medidas:
`533×650`, `533×530`, `534×800`, `533×666`. Uma é quase quadrada. E mesmo assim
todo frame renderiza `480×720` exato.

**A proporção do arquivo de origem não afeta o layout.** Não é hipótese, é
medição. Quem quebra a fileira é ajuste de frame, nunca a foto.

### Assinatura de defeito, medida no build antigo (`localhost:3030`)

| Medida | saudável | quebrado | leitura |
|---|---|---|---|
| opacity inicial | 0,000 | 1,000 | nunca parte do zero |
| scale final | 1,000 | 0,500 | travado no inicial |
| translateY final | 0 | 150 px | travado no inicial |
| largura do grupo | 4980 | 1392 | virou faixa de rolagem |
| overflow do grupo | `hidden` | `auto hidden` | a causa da largura |
| frames | 10 × 480×720 | 10 × 480×720 | **intactos** |

Os dez frames do build antigo continuam com tamanho, proporção e `cover`
corretos. O defeito estava no grupo, não nas imagens.

Nota: no build antigo as imagens 6 a 10 aparecem sem `currentSrc` na sonda.
**Não estão faltando** — é lazy loading, porque ficam fora da viewport com o
grupo reduzido a 1392px. Os arquivos existem.

---

## 🐝 A COLMÉIA FECHA A HOME — 12/08/2026

Pedido: jogar a seção "Entre para a Colméia" (`data-framer-name="Speed On"`)
para o final da home. Feito **sem recortar DOM**, em `tools/identidade.js`.

### Por que um `order` solto não bastava

O rodapé **não é irmão da Colméia**. Ele mora dentro do
`.framer-8hdwjm-container`, junto com `mel-comunidade`, `mel-clipes` e
`mel-seguranca`. Um `order:1` na Colméia jogava ela para **depois do rodapé** —
pior do que estava. Medido e visto em captura antes de corrigir.

### A solução

O `.framer-8hdwjm-container` é wrapper puro: `display:block`, sem padding,
margem, fundo, transform, radius ou overflow (conferido por
`getComputedStyle` no navegador). Então vira `display:contents`, a caixa dele
some sem efeito visual, e os filhos sobem para o mesmo nível de flex da
Colméia. Aí a ordem é trivial:

```css
.framer-8hdwjm-container{ display:contents }
.framer-bx6rvt-container{ order:1 }        /* Colméia */
.framer-8hdwjm-container > footer{ order:2 }
```

Ordem final, conferida nos três breakpoints: comunidade · clipes · segurança ·
**Colméia** · rodapé. Larguras inalteradas (1440 / 768 / 390), sem 404.

A regra está em `tools/identidade.js` (a fonte, que faz `writeFileSync`) **e**
aplicada em `melcam/identidade.css`, para valer sem re-rodar o pipeline.

### 🖼️ CORRIGIDO — imagens quebradas e placeholder em inglês (12/08/2026)

Três referências apontavam para arquivo inexistente, o que deixava buracos no
catálogo. Corrigido na fonte (`tools/imagens.js`, `melcam.config.json`,
`tools/aplicar.js`) **e** nas 7 páginas já geradas:

| era | virou |
|---|---|
| `bee/bee-catalogo-amarela-frente.png` | `.jpg` |
| `bee/bee-catalogo-branca-frente.png` | `.jpg` |
| `/melcam/img/logo/../img/favicon.png` | `/melcam/img/favicon.png` |
| `"Your email address"` | `"Seu e-mail"` |

Conferido depois: **0 referências quebradas** nas 7 páginas, 0 ocorrência do
texto em inglês. `['Your email address', 'Seu e-mail']` entrou na tabela do
`aplicar.js` para valer nas próximas rodadas.

### 🔴 GRAVE, EM ABERTO — rótulo e imagem descolados no catálogo da home

Levantamento de todos os 41 pares (src, alt) das 7 páginas mostrou que na grade
`[data-framer-name="Header Grids"]` o texto do card e a imagem **não têm
relação nenhuma**:

| rótulo na tela | imagem servida |
|---|---|
| Polen **Verde** | `polen-branca.png` |
| Polen **Branca** | `polen-marrom.png` |
| **Bee** Branca | `polen-preto.png` |
| Polen **Branca** | `bee-catalogo-amarela-frente.jpg` |
| **Bee** Amarela | `polen-gallery-03.jpg` (foto, não produto) |
| Polen **Preta** | `polen-angulo.png` |

**Duas causas independentes que nunca se falaram:**

1. `tools/imagens.js` troca imagem **por hash do Framer**
   (`mxOD2EdPpQTvsdb7pn: [...]`), ou seja por posição no template, sem nenhuma
   noção de qual produto o card representa.
2. `tools/aplicar.js` troca **texto por string global e cega**. Daí saem
   nomes de produto como `['Promotions', 'Sobre Nós']` e
   `['Advisable', 'Sobre Nós']` — rótulo de menu virando nome de câmera.

Some ainda o fato de que preço, desconto ("50%"), estoque e "2 cores
disponíveis" desses cards são dado inventado, herdado do template.

**Correção certa:** gerar os cards da grade a partir de
`melcam.config.json > produtos`, onde `nome` e `img` já vivem no mesmo objeto e
não têm como divergir. Não foi feito porque exige decidir quais produtos entram
na grade da home e o que fazer com preço/estoque fictícios — decisão de
conteúdo, não mecânica.

### Defeito anterior encontrado de passagem, NÃO corrigido

`mel-comunidade`, `mel-clipes` e `mel-seguranca` têm altura **0 no tablet e no
mobile**. Causa: estão dentro de `.ssr-variant.hidden-1g8fb3q`, que é
`display:none` fora do desktop — foram injetadas só na variante desktop.

Confirmado que **não é regressão desta mudança**: medido com a regra valendo e
com ela anulada, o resultado é o mesmo. Fica registrado como pendência.

Também pendente: o campo da Colméia ainda mostra o placeholder em inglês
`"Your email address"`.

---

## 📐 SPEC DA FILEIRA "A câmera que vive com você." — medida no publicado

Levantada em 12/08/2026 a partir de `site/index.html`, que é o espelho da
duplicata publicada. É a referência boa: o `_ORIGINAL` é de outra versão.

### Identificação

O título `A câmera que vive com você.` está em `.framer-klb4ly`
(`data-framer-name="Header Info"`). A fileira animada é a **irmã**
`.framer-dtlgl4` (`data-framer-name="Header"`). São dois nós distintos; mexer no
título não é mexer na fileira.

### Geometria — as 10 layers são idênticas

As dez dividem **uma única regra CSS**, agrupada num só seletor:

```css
aspect-ratio: .666667;   /* 2:3 vertical, travado */
width: auto;             /* largura DERIVADA da altura x proporcao */
height: 80vh;            /* desktop */
border-radius: 4px;
flex: none;
position: relative;
overflow: hidden;        /* este e o clipping */
gap: 0;
```

Container `.framer-dtlgl4`: `flex-flow:row` · `gap:20px` ·
`width:min-content` · `height:min-content` · `overflow:hidden` ·
`align-items:flex-start` · `flex:none`.

Cada imagem é Fill, não child: um `<div style="position:absolute;inset:0">`
embrulhando um `<img>` com `width:100%;height:100%;object-fit:cover;
object-position:center`.

| # | data-framer-name | classe |
|---|---|---|
| 1 | `Image 1` | `.framer-1mlwrve` |
| 2 | `Image 2` | `.framer-1lggaqu` |
| 3 | `Image 3` | `.framer-p5dsc8` |
| 4 | `Image 4` | `.framer-zhwqt9` |
| 5 | `Image 5` | `.framer-14kqz2p` |
| 6 | `Image 6` | `.framer-vsbea7` |
| 7 | `Image 7` | `.framer-lk3zu3` |
| 8 | `Image 8` | `.framer-hz6fbf` |
| 9 | `Image 9` | `.framer-1baa5n9` |
| 10 | `Image` (sem número) | `.framer-1qo1eaf` |

### Breakpoints — estrutura única, só a altura muda

| Faixa | Regra |
|---|---|
| base (≥1440) | `height:80vh` |
| `810–1439.98px` | `height:50vh` |
| `≤809.98px` | `height:50vh` |

Mesmas 10 classes nos três. **Não há layer independente por breakpoint nesta
seção.** Se no canvas as estruturas estiverem diferentes entre desktop, tablet e
mobile, isso já é a quebra, não uma diferença a preservar.

### O que a geometria elimina como causa

`aspect-ratio` travado + `width:auto` + `object-fit:cover` torna o frame
**imune à proporção da imagem de origem**. Qualquer foto, de qualquer lado,
preenche sem deformar e sem mudar o layout.

Logo: se quebrou depois da troca, **não foi a dimensão do arquivo**. Foi o
caminho da substituição. As causas plausíveis que sobram, na ordem:

1. **Width mudou de `auto` para Fit Content**, ou o `aspect-ratio` se perdeu.
   O frame passa a herdar a proporção da foto; como o pai é `width:min-content`,
   uma foto horizontal explode a fileira inteira na largura.
2. **Imagem entrou como child layer** em vez de Fill. Não ganha o wrapper
   `position:absolute;inset:0`, vira filho de flex com `gap:0` e é recortada
   pelo `overflow:hidden`.
3. **Image Fit trocado de Cover para Fit/Contain.** Aparece faixa vazia dentro
   do frame 2:3.
4. **Frame apagado e imagem nova arrastada.** Perde aspect-ratio, radius,
   overflow e a posição na ordem das layers.

Qual das quatro foi, **só o canvas diz**. Não dá para determinar pelo publicado,
porque a publicação atual ainda é o template, sem as alterações MELCAM.

### Assets preparados — `melcam/img/header-fileira/`

16 candidatos, todos **1600×2400 (2:3 exato)**, JPEG q2, sRGB, sem EXIF
pendente, nome simples. Origem toda com ICC sRGB confirmado, então a conversão
não desloca cor. As fontes 2:3 não sofreram recorte nenhum: a composição do
fotógrafo está intacta.

Mapa sugerido, alternando Bee e Polen, produto e vida real:

| Pos | Layer | Arquivo | Conteúdo | alt |
|---|---|---|---|---|
| 1 | `Image 1` | `cards-19.jpg` | Bee amarela sobre girassóis | Câmera Bee amarela sobre girassóis |
| 2 | `Image 2` | `polen-lp-3.jpg` | Polen couro caramelo | Câmera Polen em couro caramelo |
| 3 | `Image 3` | `bee-lp-06.jpg` | pessoa com a Bee no rosto | Pessoa fotografando com a câmera Bee |
| 4 | `Image 4` | `polen-lp-1.jpg` | Polen preta na embalagem | Câmera Polen preta em sua embalagem |
| 5 | `Image 5` | `bee-lp-1169.jpg` | duas Bee, Pão de Açúcar ao fundo | Duas câmeras Bee com o Pão de Açúcar ao fundo |
| 6 | `Image 6` | `cards-01.jpg` | macro da Polen couro | Detalhe da lente da câmera Polen |
| 7 | `Image 7` | `bee-lp-0761.jpg` | Bee presa no jeans | Câmera Bee presa ao jeans como acessório |
| 8 | `Image 8` | `polen-lp-5.jpg` | Polen amarela | Câmera Polen amarela |
| 9 | `Image 9` | `bee-lp-0725.jpg` | Bee pendurada em planta | Câmera Bee pendurada por chaveiro em uma planta |
| 10 | `Image` | `bee-lp-1237.jpg` | fotografando à beira-mar | Pessoa fotografando com a câmera Bee à beira-mar |

Sobram como reserva: `bee-lp-0676` (mesa de café), `bee-lp-0689` (tela da Bee),
`bee-lp-1065` (Bee no bolso), `bee-lp-22` e `bee-lp-23` (duplas na grama),
`bee-lp-1171` (quase idêntica à `1169`, não usar junto).

### Por que 1600×2400

Frame renderiza com no máximo ~550px de largura no desktop (80vh × 0,667 numa
viewport de ~1030px de altura). Em tela 2x isso dá ~1100px. 1600×2400 cobre com
folga, é 2:3 exato e evita subir arquivo de 4000×6000 e 13 MB.

---

## ⏸️ PARADO EM 12/08/2026 — retomar por aqui

> ⚠️ **Superado em parte, 13/08/2026.** O item 1 desta lista — a animação da
> fileira — **não dependia do canvas do Framer**. Foi reproduzida no próprio
> export, a partir da curva medida, e confere com a baseline. Ver a última
> seção do arquivo. O canvas continua sendo o caminho para *identidade e troca
> de assets* na duplicada, mas deixou de ser bloqueio para o motion.

O cliente pediu para pausar; outras prioridades. **A base está pronta e provada**,
só falta o passo no Framer.

**Provas fechadas nesta sessão** (capturas em `Downloads\Captura de tela 2026-08-12
154728.png` = template publicado, e `…154805.png` = build MELCAM atual):

| Medida na imagem central da fileira | Template | MELCAM atual | Razão |
|---|---|---|---|
| Largura | ≈526 px | ≈262 px | **0,498** |
| Altura da fileira | ≈790 px | ≈398 px | **0,504** |

Escala 0,5 confirmada em pixel. O deslocamento vertical medido (≈71 px) bate com
o previsto: as funções de `transform` se aplicam da direita para a esquerda, então
`translateY(150px)` acontece dentro do espaço já reduzido — `150 × 0,5 = 75 px`.

Na captura MELCAM o **conteúdo está correto** (logo, assets Bee/Polen, texto em
português). Quebrado é só o mecanismo de animação.

**Para retomar, na ordem:**

1. No canvas da duplicada (https://busy-buttons-865629.framer.app), aplicar
   identidade MELCAM e trocar os assets do grupo abaixo do hero pelos Bee/Polen.
   **Não tocar em animação, variants nem scroll transform.**
2. Publicar no Framer.
3. `node tools/baixar-framer.js` → gera `site/` com runtime intacto.
4. Rotas, SEO e QA sobre `site/`. As specs de cada página continuam válidas nas
   seções antigas deste arquivo.

**Bloqueio das capturas: RESOLVIDO em 12/08/2026, sem extensão nenhuma.**
Ver a seção "MEDIÇÃO SEM EXTENSÃO" abaixo. A extensão do Chrome continua não
conectando (`tabs_context_mcp` dá `No group with id: …`), e deixou de importar.

**Servidores locais:** `node serve.js` → :3030 (build antigo) ·
`SERVE_ROOT=site PORT=3031 node serve.js` → :3031 (espelho com runtime).

---

## O que falta, e de quem depende

**Depende de você, no canvas do Framer:** aplicar identidade MELCAM na
duplicada — paleta, fontes, logo, textos, e trocar os assets do grupo abaixo do
hero pelos Bee/Polen, sem tocar em animação. Depois publicar.

**Depende de conexão de browser:** as capturas comparativas do Passo 12. A
extensão do Chrome não está conectada nesta sessão.

**Meu, assim que houver publicação MELCAM:** rodar o espelho, localizar assets,
gerar rotas e SEO sobre o resultado, QA e comparação.

⚠️ **`_ORIGINAL` é export de versão diferente da duplicada no ar**: a duplicada
tem um appear-id a mais (`n0ccwk`). Usar sempre a duplicada como referência.

---

## STATUS GERAL

| Fase | O que é | Status |
|---|---|---|
| 0 | Reconhecimento do template | **CONCLUÍDA** |
| 1 | Documentos obrigatórios | **CONCLUÍDA** |
| 2 | Inventário de assets | **CONCLUÍDA** |
| 3 | Backup do original | **CONCLUÍDA** |
| 4 | Pipeline de substituição (ferramenta) | **CONCLUÍDA** |
| 5 | Identidade: fontes, cores, favicon | **CONCLUÍDA** |
| 6 | Home — texto e SEO | **CONCLUÍDA** (falta mídia e seções novas) |
| 6b | Home — troca de imagens e catálogo de 2 produtos | **CONCLUÍDA** |
| 6c | Home — vídeo do hero + carrossel + ticker | **CONCLUÍDA** |
| 6d | Home — comunidade, clipes, barra de segurança | **CONCLUÍDA** |
| 7 | LP Polen (`/polen`) | **CONCLUÍDA** |
| 7b | Rotas da navegação | **CONCLUÍDA** — 174 href reapontados, 0 rota antiga |
| 8 | LP Bee (`/bee`) | **CONCLUÍDA** |
| 9 | Acessórios · Sobre Nós · 404 · Sacola | **CONCLUÍDA** |
| 10 | `robots.txt` · `sitemap.xml` · Schema.org · canonical | **CONCLUÍDA** |
| 11 | Validação final: responsivo, console, contraste, OG image | pendente |

> ⚠️ **Tudo nesta tabela vale para o caminho antigo (patch do export), que foi
> abandonado — ver "CORREÇÃO DE ARQUITETURA" no topo.** O conteúdo continua
> valendo como *spec* do que cada página precisa ter; a *implementação* migra
> para o canvas do Framer. Linhas duplicadas que marcavam as fases 7 a 12 como
> pendentes foram removidas: eram resíduo de uma versão anterior da tabela.

### Decisões do cliente em 12/08/2026

1. **Segue com o template Framer** como recipiente (não com o site conceitual).
2. **Iowan Old Style só em display**; Area assume o texto corrido. Resolve a
   falta dos outros pesos da Iowan sem pedir nada ao cliente.
3. Liberdade para decidir o resto com base no briefing.

---

## O QUE JÁ ESTÁ NO AR (rodando em localhost:3030)

### `tools/aplicar.js` — o pipeline

Reconstrói o site **sempre a partir de `_ORIGINAL/`** e reaplica tudo. Rodar de
novo é seguro e idempotente; nunca acumula edição. Um comando refaz o site:

```
node tools/aplicar.js
```

Resultado da última execução:

| Etapa | Resultado |
|---|---|
| Texto nas 3 camadas | **2.511 substituições em 53 arquivos** (312 no `index.html`, 47 no `shared-lib.mjs`, 1.883 no índice de busca) |
| Rastreio e afiliado | 15 arquivos limpos: GTM `G-RR9R4J88WR` e 21 links `dub.sh` removidos |
| Identidade | 24 `@font-face` + 9 tokens de cor |
| SEO | 14 páginas com `lang="pt-BR"`, title, description, OG e Twitter próprios |

**Verificado:** zero ocorrências de `COMETICA`, `CCommerce`, `Blue Jeans`,
`T-Shirt`, `Sneakers`, `moisegdesign`, `dub.sh`, `googletagmanager` em qualquer
camada. Zero texto em inglês no corpo da home. `<h1>` do hero = "Chegou a Bee".

### `melcam.config.json` — fonte única de verdade

Copy aprovado, paleta, produtos, navegação e o bloco `PENDENTES`. Toda mudança
de conteúdo deve entrar aqui, nunca direto no HTML.

### `tools/identidade.js` — paleta e tipografia

Sobrescreve os **9 tokens de cor** do template. É a decisão central: o template
define toda a cor em 9 custom properties, então redefinir elas troca a paleta do
site inteiro **sem tocar em uma linha de layout, espaçamento, transição ou
animação**. É o que cumpre a Regra de Ouro.

| Token original | Vira | Papel |
|---|---|---|
| `#0d0d0d` | `#221E17` carvão | fundo |
| `#1c1c1c` | `#2B251C` | superfície elevada |
| `#dedede` e `#fff` | `#FBF7EE` papel | texto principal (15,5:1) |
| `#696969` | `#9A9083` | texto secundário (**5,3:1 — AA**) |
| `#ffffff0d` | `rgba(251,247,238,.07)` | borda sutil |
| `#1313144d` | `rgba(34,30,23,.35)` | overlay |

Mel `#F2A900` fica reservado a CTA e foco (8,25:1 sobre carvão). Coral e
verde-mar ainda não entraram: sem lugar justificado até agora, e o briefing pede
para não virar festival de cores.

**Fontes servidas localmente** de `melcam/fonts/` — 22 arquivos da Area (Hairline
a Extrablack, com itálicos), Iowan Bold e Brooklyn Semibold. Descobri o peso de
cada `.otf` lendo a tabela `name` do arquivo (`tools/fontes.js`): a Area codifica
o peso no **nome da família**, não no estilo.

Também entraram no `identidade.css`: `:focus-visible` visível (o template não
tinha) e bloco `prefers-reduced-motion`.

### `melcam/` — 100 assets oficiais, 26,9 MB

Vídeo do hero, logos SVG preto/branco nas 4 variações, pattern, fotos de card,
banners, comunidade, filtros, galeria Polen e catálogo das 7 cores da Polen e 2
da Bee. Vieram da pasta "site de referencia", que já tem tudo tratado para web.

---

## FASE 6b — IMAGENS E CATÁLOGO (concluída)

### Regra nova do cliente (12/08/2026)

> "Tudo o que ficar faltando pode colocar **a decidir**."

Implementado como `melcam/img/a-decidir.svg`: um placeholder declarado, em
carvão com moldura tracejada em mel, que diz "a decidir · arte oficial
pendente". Não é imagem genérica nem stock — comunica ao cliente exatamente
onde falta arte, em vez de esconder a falta.

### `tools/imagens.js` — troca por hash, não por posição

| Resultado | |
|---|---|
| URLs trocadas | **484** em 4 arquivos |
| `alt` reescritos | **59**, todos em pt-BR |
| Sem mapa → "a decidir" | 16 imagens, 126 URLs em 18 arquivos |
| Imagens remotas na home | **0** |
| Preloads externos | **0** |

A troca é chaveada pelo hash do arquivo remoto, então o mesmo mapa vale para
HTML, bundle e índice de busca, e nada depende da ordem do DOM. O `srcset` do
Framer é removido junto: se ficasse, o navegador voltaria a pedir o arquivo
remoto redimensionado.

**Achado colateral:** os `alt` do template estavam em **romeno** ("Tricou negru
cu print", "Fotografie editorial de moda"). Todos reescritos.

### Catálogo de dois produtos — a decisão de design

O template foi feito para vitrine de muitos SKUs. A MELCAM tem duas linhas, e
dois cards iguais lado a lado achatariam as duas. Em vez de diferenciar por
tamanho (que criaria hierarquia falsa entre produtos que o briefing trata como
pares), **cada uma ganha um destaque de natureza diferente**, ancorado no
argumento real de venda:

| | Argumento | Tratamento |
|---|---|---|
| **Polen** | **escolha** — linha madura, 7 cores | régua das 7 cores como assinatura visual, no canto inferior; moldura em papel, que puxa o olho primeiro |
| **Bee** | **novidade** — lançamento, 2 cores, de levar junto | selo "Novidade" em mel no canto superior, borda viva |

Os dois encolhem juntos abaixo de 810px para não cobrir a foto. As regras estão
em `tools/identidade.js`, comentadas com o porquê, e usam só `::before` /
`::after` — nenhum nó do DOM do template foi alterado.

### Dependência externa restante

Sobram `@font-face` da Inter apontando para o CDN e o `app.framerstatic.com` do
runtime. As `@font-face` são preguiçosas (o navegador só baixa se usar) e a Area
assumiu o corpo, então na prática não são buscadas. Os `preload` e `preconnect`,
que forçavam o pedido, foram removidos.

---

## FASE 6c — PRÓXIMO PASSO CONCRETO

Texto e imagem da home já são MELCAM. Falta:

1. Vídeo do hero: `<video>` com autoplay/muted/loop/playsinline + poster
   `hero-poster.jpg` + fallback, dentro do bloco de hero existente.
3. Blocos Bee | Polen clicáveis (bloco inteiro é link, sem texto de CTA).
4. Carrossel de 3 banners com setas, indicadores, swipe, teclado e pausa.
5. Comunidade: 15 fotos, legenda neutra (`[USUÁRIO E CIDADE A CONFIRMAR]`).
6. Clipes: placeholders coerentes, espaço e animação preservados.
7. Barra de segurança com os 4 textos exatos.

Depois disso: LP Polen, LP Bee, Acessórios, Sobre Nós, sacola, 404,
`robots.txt`, `sitemap.xml`, Schema.org.

**Pendência técnica anotada:** as 9 rotas `sort-by/` do template continuam de pé
(`/sort-by/Jeans` etc.). São da loja de roupa e precisam sair ou virar filtro de
produto MELCAM.

---

## 🔴 DECISÃO DE ARQUITETURA — a hidratação React fica DESLIGADA

**Isto substitui o plano anterior de editar os bundles. Leia antes de tudo.**

### O que aconteceu

A primeira tentativa editou os bundles `.mjs` minificados para que a hidratação
não trouxesse o texto em inglês de volta. **Resultado: a página ficou
completamente em branco.**

Causa: no JS minificado, palavras curtas não são só texto de tela. `Stock`,
`Product`, `Promotions`, `Contact` são também identificadores, chaves de rota e
nomes de campo. A substituição solta invalidou **5 bundles**
(`Unexpected identifier 'Nós'`, `Octal literals are not allowed`), o runtime do
Framer estourou e limpou o DOM.

Tentar remendar com "só troca entre aspas" + guarda de sintaxe ainda deixou 4
bundles quebrados. O problema não era a técnica, era a premissa.

### A solução

Remover do HTML:
- `<script type="module" data-framer-bundle="main" src="js/script_main…mjs">`
- os 17 `<link rel="modulepreload">`
- `js/rerouter.js`

**Os bundles nunca mais são tocados.** `tools/aplicar.js`, `tools/imagens.js` e
`tools/a-decidir.js` agora escrevem **só em `.html`**.

### O que sobrevive (verificado)

Os scripts inline `[3]` (o `animator` de 10,8 KB), `[4]`
(`__framer__appearAnimationsContent`), `[5]` (`__framer__breakpoints`) e `[6]`
**não têm nenhum `import`**. Continuam funcionando:

- animações de entrada, com os timings e easings originais
- os 165 KB de CSS inline: grid, espaçamento, tipografia, hover, transições
- os 3 breakpoints e todo o comportamento responsivo

### O que se perde, e por que não é perda

As interações que o React dirigia: carrossel, menu mobile, sacola. **As três
precisavam ser reescritas para a MELCAM de qualquer jeito** — o carrossel do
template tem 1 slide de roupa e o nosso tem 3 banners; a sacola precisa de Bee e
Polen. Vão em JS próprio, respeitando os timings originais.

### Verificação

| | |
|---|---|
| Bundles com sintaxe inválida | **0 de 74** |
| `script_main` / `modulepreload` / `rerouter` no HTML | removidos |
| `animator` + appear config inline | presentes |
| Conteúdo servido | 3.757 chars de texto visível, "Chegou a Bee" no lugar |

O desbalanço de 1 `</div>` no `index.html` **já existe no `_ORIGINAL`** — é do
export do Framer, não da edição.

---

## FASE 10 — SEO TÉCNICO (concluída)

`tools/seo.js`. Tudo derivado de `melcam.config.json → site.baseUrl`.

⚠️ **O domínio ainda é pendência.** Hoje está `https://www.melcam.com.br`.
**Trocar essa única linha** no config regenera `robots.txt`, `sitemap.xml`,
canonical, Open Graph e todo o Schema de uma vez.

### `robots.txt` e `sitemap.xml`

`Disallow: /sacola` e `/404`. Sitemap com **5 URLs** indexáveis, namespace
correto, `lastmod`, `changefreq` e `priority`. Sacola e 404 ficam de fora e
levam `<meta name="robots" content="noindex,follow">`.

### Schema.org — e o que foi deixado de fora de propósito

| Página | Grafo |
|---|---|
| `/` | Organization, WebSite |
| `/polen` · `/bee` | Organization, WebSite, **Product**, BreadcrumbList |
| `/acessorios` · `/sobre` · `/sacola` | Organization, WebSite, BreadcrumbList |
| `/404` | Organization, WebSite |

**A decisão que importa:** `Organization` **não** declara `sameAs`, `address`,
`telephone` nem `taxID`, e `Offer` **não** declara `availability` nem `seller`.
Não é esquecimento — esses dados são pendência, e dado falso em Schema é pior
que ausência, porque o Google usa para montar painel de conhecimento e rich
result. Entram quando o cliente confirmar.

O que é afirmado é verdade: nome, logo, e-mail do briefing, descrição de cada
produto a partir das specs oficiais, e preço (`399.00` e `299.00` BRL).

Cada página ganhou `canonical`, `og:url`, `og:type`, `og:locale` e
`og:site_name`.

### Falta ainda

Imagem de Open Graph própria (**1200 × 630**) — hoje a metatag aponta para o
placeholder. Está no `ASSETS_NECESSARIOS.md`.

---

## FASE 9 — ACESSÓRIOS, SOBRE, 404 E SACOLA (concluída)

`tools/demais.js` + o mesmo gerador. **7 rotas no ar**, todas 200:
`/` · `/polen` · `/bee` · `/acessorios` · `/sobre` · `/sacola` · `/404`.
406 href reapontados em 7 páginas. **Um `<h1>` em cada uma.**

### `/acessorios` — "em breve" honesto

Categoria futura, sem produto inventado. Mantém nav, design, animações e SEO.
Formulário de aviso de lançamento que **não mente**: guarda no navegador e diz
exatamente isso — "Anotado neste navegador. O cadastro ainda não tem servidor,
então o e-mail não foi enviado a ninguém." O pattern oficial entra aqui como
elemento de apoio, a 13% de opacidade.

### `/sobre` — só o comprovado

Lead + 3 cards: fotografia intencional, estética vintage, comunidade. Nada além
do que o material da marca sustenta. **Data de fundação, equipe, número de
clientes e história da empresa não foram inventados.** O texto está marcado como
pendente de aprovação na própria página.

Traz as âncoras `#contato` e `#rastreio`, que é para onde as rotas antigas
`./contact` e `./blog` passaram a apontar. Na tabela de contato, só o e-mail do
briefing é publicado; WhatsApp, endereço, CNPJ e redes aparecem como
**a decidir**.

### `/sacola`

Escolher modelo/cor, alterar quantidade, remover, subtotal, persistência em
`localStorage`, contador no header, estado vazio e `aria-live` a cada mudança.

**Não simula pagamento.** O botão diz, ao ser clicado: "Checkout ainda não
integrado. Nenhuma cobrança foi feita e nenhum pedido foi criado."

### `/404`

Página de verdade, "Essa foto não saiu", com saídas para home, Polen e Bee.

### Verificação

`interacoes.js` 15 KB, **sintaxe OK** · CSS 238/238 chaves ·
div dif 1 (igual ao original) · `<section>` balanceadas · 1 `<h1>` por página.

---

## 🔴 O HERO SUMINDO — `display:none` em vídeo (resolvido)

Sintoma: hero em branco, só o fundo escuro. **Não era o DOM** — a estrutura
estava íntegra em todas as conferências (`<h1>` 1/1, divs 696/697 igual ao
original, `<video>` presente, markup do hero intacto).

Era CSS. O `identidade.css` trazia:

```css
@media (prefers-reduced-motion:reduce){ video[autoplay]{ display:none } }
```

Essa regra fazia sentido quando eu injetava um bloco próprio com `<img>` de
fallback atrás. Ao passar a usar o `<video>` do template, o fallback saiu — mas
a regra ficou. Com "reduzir movimento" ligado no sistema, o vídeo sumia e
sobrava o fundo.

**Regra:** nunca `display:none` em `<video>`. Vídeo pausado **já mostra o
próprio poster**; o `interacoes.js` chama `pause()` com reduced-motion e a
imagem fica. Esconder é desnecessário e destrutivo.

Falso alarme investigado no caminho: as `<section>` "The first section" e
"Shadow" aparecem **vazias**, mas já são vazias no `_ORIGINAL` (78 e 68 chars).
O hero de verdade mora em `framer-1da55c7` / `Header Section`.

Guarda nova: o pipeline agora checa o balanço de chaves do `identidade.css`
(198/198) e se alguma regra esconde vídeo.

---

## FASE 8 — LP BEE (concluída) · `/bee`

`tools/bee.js` + o mesmo gerador de `paginas.js`.

Seções: barra fixa (Modelos · Destaques) → abertura → escolha sua Bee (2 cards
lado a lado, cada um com título em cima, foto grande, preço e botão próprio,
como o briefing exige) → destaques **na hierarquia obrigatória** (1º acessório /
item fashion, 2º filtros e estética retrô, 3º filmagem e fotografia com as 13
specs) → Colméia.

### A escolha entre opção 1 e opção 2 — decidida, com motivo

O briefing deixava as duas em aberto. Escolhi a **opção 1** (a Bee branca
balança da direita para a esquerda, gira e vira amarela).

Motivo técnico, não estético: a opção 1 se apoia em `transform` de um elemento
único, que é o que dá para fazer bem em CSS puro. A **opção 2** (a página
mergulha no mel durante o scroll) depende de *scroll-linked animation*, que
morreu junto com a hidratação do Framer. Fazer a 2 agora seria uma imitação
pobre. As duas **não foram misturadas**, como o briefing pede.

A entrega usa os packshots oficiais; o render 3D segue **a decidir**. A troca
branca→amarela acontece na metade do giro, com a câmera de perfil, onde a
emenda não aparece. Com `prefers-reduced-motion` o giro não roda e a página
entrega direto a Bee amarela, que é o estado final.

---

## FASE 7b — ROTAS (concluída)

`tools/rotas.js`. As rotas de roupa do template morreram:

| Antes | Agora |
|---|---|
| `./sort-by/Polen` · `./sort-by/Bee` | `/polen` · `/bee` |
| `./sort-by/Sneakers` · `./sort-by/Sobre Nós` | `/acessorios` · `/sobre` |
| `./blue-jeans`, `./shirt-*`, `./t-shirt-*` (16 rotas) | `/polen` |
| `./Acessórios-white/black/blue` | `/bee` |
| `./contact` · `./blog` · `./faq` | `/sobre#contato` · `/sobre#rastreio` · `/polen#faq` |

**174 href reapontados em 3 páginas. Zero rota antiga restante.**
O item ativo do menu recebe `aria-current="page"` conforme a rota do arquivo.

⚠️ `/acessorios` e `/sobre` **ainda não existem** — os links já apontam para lá.
É a próxima fase.

---

## FASE 7 — LP POLEN (concluída) · `/polen`

`tools/polen.js` (conteúdo) + `tools/paginas.js` (gerador e CSS).

### Como a página nasce

**Cópia do `index.html` já transformado.** Herda nav, rodapé, os 165 KB de CSS
inline, o `animator` e os 3 breakpoints. O que é só da home some por CSS, via
`body class="mel-interna"`:

```
body.mel-interna [data-framer-name="The first section"],
body.mel-interna [data-framer-name="Speed On"],
body.mel-interna .mel-carrossel, .mel-comunidade, .mel-clipes, .mel-seguranca
  { display:none !important }
```

Nada é recortado do DOM. É o mesmo método que vai servir para `/bee`,
`/acessorios` e `/sobre`: chamar `paginas.gerar(arquivo, classe, título,
descrição, conteúdo)`.

### As 9 seções, na ordem do briefing

1. **Barra fixa** estilo Apple — `position:sticky`, nome, âncoras Modelos ·
   Filtros · FAQ, preço e CTA Comprar. No mobile o preço some e as âncoras
   rolam na horizontal.
2. **Abertura** — cartão de alerta "Memória cheia" em coral, as duas linhas do
   copy, headline "A Polen guarda as que importam.", CTA e a câmera.
   O render 3D é **a decidir**; a composição usa os packshots oficiais e a nota
   declara isso.
3. **Escolha sua Polen** — as **7 cores** com os subtítulos oficiais, preço,
   condição, CTA e nota. A divergência Coral/Laranja está declarada na página.
4. **Barra de benefícios** — os 7 textos aprovados.
5. **Galeria** — "Feitas com a Polen", 8 fotos.
6. **Filtros** — "Uma foto. 8 filtros", com as 8 pills e troca animada.
7. **O diferencial** — "Analógica por fora, digital por dentro" + 9 tópicos.
8. **FAQ** com as 7 perguntas + **CTA final**.
9. **Colméia** — eyebrow, título, texto, 3 perks e CTA. **Fecha a página.**

> Ordem alterada em 12/08/2026, a pedido: a Colméia saiu do meio (entre o
> diferencial e o FAQ) e passou a ser a última seção, depois do CTA final.
> Fica igual à Bee, onde já era a última. A mudança é uma linha em
> `tools/polen.js` (`conteudo()`); a Bee não precisou de nada.
>
> Para regenerar só a Polen, sem re-rodar o pipeline inteiro:
>
> ```js
> const paginas = require('./tools/paginas.js');
> const polen   = require('./tools/polen.js');
> paginas.gerar('polen.html', 'mel-interna mel-pagina-polen', titulo, descricao, polen.conteudo());
> ```
>
> ⚠️ Não chame `paginas.aplicar()` para isso: ele faz `appendFileSync` em
> `melcam/identidade.css` e **duplica o CSS a cada execução**.

Seções que o briefing mandou não criar ("O que vem na caixa", "Fotografia de
verdade") **não foram criadas**.

### Interações novas em `interacoes.js`

- **Troca de filtro** sem recarregar: pré-carrega a imagem e só então faz o
  crossfade — sem pré-carga a transição pisca em branco. Setas ← → navegam
  entre as pills, e `aria-live` anuncia o filtro aplicado.
- **FAQ** com `aria-expanded` / `hidden`.
- **Sacola** em `localStorage`, com contador e `aria-live`.
  **Não simula pagamento**: sem gateway, o site não afirma compra concluída.

### Um `<h1>` por página

O template trazia 4 `<h1>` na home e 5 na Polen. Escondido por CSS **ainda conta
no outline** e para o leitor de tela. Agora o primeiro fica e os demais viram
`<h2>` — troca de nome de tag, nada abre ou fecha a mais.

| | |
|---|---|
| `index.html` | 1 h1 — "Chegou a Bee" |
| `polen.html` | 1 h1 — "A Polen guarda as que importam." |

### Verificação

7 cores · 8 pills · 8 fotos de galeria · 7 FAQ · 7 botões de sacola ·
`<section>` 20/20 · div dif 1 (igual ao original) · `/polen` e `/polen.html`
respondem 200.

---

## FASE 6d — COMUNIDADE, CLIPES E SEGURANÇA (concluída)

`tools/comunidade.js`. As três entram **antes do `<footer>`**, na ordem do
briefing: hero → blocos → carrossel → comunidade → clipes → segurança.

### Comunidade

Eyebrow "Por onde a Melcam passou", título "Memórias da Colméia", tag
"Marque @melcam para aparecer aqui." Grade de 4 / 3 / 2 colunas nos três
breakpoints do template.

São **8 fotos**, não 15. Só 8 estão tratadas para web na pasta de referência.
Os 15 originais existem em `Downloads\melcam\IMAGENS\Por onde a MELCAM passou`
mas em 4000×3000 — precisam ser tratados.

Legenda: `[USUÁRIO E CIDADE A CONFIRMAR]` nas 8, como o prompt determinou.
Nenhum @usuário ou cidade foi inventado. Aparece no hover, e **sempre visível no
mobile**, onde hover não existe.

Nota honesta ao pé da seção: "8 de 16 a 20 fotos previstas no briefing."

### Clipes

Os vídeos não existem. O briefing proíbe vídeo de banco, então o espaço e a
proporção ficam **reservados**: 3 caixas 9:16 com o placeholder "a decidir",
borda tracejada em mel e a especificação visível — `1080 × 1920 · 8 a 20 s`.

### Barra de segurança

Os 4 textos **exatos**, com ícone SVG próprio cada: escudo, balão, seta de
retorno e cadeado. Grade 4 / 2 / 1 coluna.

### Guarda nova no pipeline

A etapa 8 do `aplicar.js` agora **confere a integridade do DOM a cada build** e
imprime o resultado: diferença abre/fecha de `<div>` contra a do `_ORIGINAL`, e
balanço de `<section>`. Se desbalancear, aparece `<<< DESBALANCEADO`.

### `ASSETS_NECESSARIOS.md` criado

Na raiz do projeto. Cada falta com página, seção, finalidade, nome sugerido,
dimensão exata, proporção, formato, fundo, margem segura, direção de arte, se
pode conter texto, prioridade e o temporário que está no ar.

---

## FASE 6c — VÍDEO DO HERO, CARROSSEL E TICKER (concluída)

`tools/hero-carrossel.js` gera três coisas e injeta no `index.html`.

### Vídeo do hero — o template já tinha o slot

> **⚠️ REGRA APRENDIDA — procurar o elemento existente antes de criar um novo.**
> Perdi duas tentativas injetando um `<video>` novo (primeiro como fundo da
> `Header Section`, depois dentro do bloco `Header`). **O template já tem um
> `<video>`** — um único, no bloco `Shadow` dentro de `The first section`, que é
> a faixa do topo. Apontava para um preview do Envato.
>
> Era só trocar o `src`. O elemento já vem posicionado e estilizado pelo
> template (`width/height:100%`, `object-fit:cover`), então o vídeo aparece no
> tamanho e no lugar certos de graça.
>
> Antes de injetar qualquer coisa, procure: `<video>`, `<img>`, o `<symbol>` do
> logo. O template tem mais slots prontos do que parece.

O que foi feito: `src` → `/melcam/video/hero.mp4`, `preload` → `metadata`, e os
atributos que faltavam — `autoplay poster muted playsinline loop`. O template
deixava `preload="none"` e sem `autoplay` porque quem dava play era o runtime do
Framer; com a hidratação desligada, precisa estar no atributo.

Se o navegador bloquear o autoplay, o `poster` assume sozinho. Com
`prefers-reduced-motion`, o `interacoes.js` dá `pause()` e fica o poster.

A fileira de 10 imagens do template **continua no lugar**, agora com fotos
lifestyle da MELCAM. Não há mais CSS escondendo nada.

> **⚠️ REGRA APRENDIDA — não recortar DOM por regex.**
> A tentativa de remover a fileira de imagens com
> `(<div…"Header">)([\s\S]*?)(</div></div><div…"Header Info")` cortava no meio
> de uma estrutura: o miolo saía com 27 aberturas e 26 fechamentos, e o
> documento ficava desbalanceado (2 `</div>` sobrando contra 1 do original).
>
> **A ferramenta só INSERE.** O que precisa sumir sai por CSS:
> `[data-framer-name="Header"] > div:not(.mel-hero-video){ display:none }`.
> É reversível e não tem como quebrar a árvore. Os 9 nós de imagem ficam no DOM
> de propósito.
>
> Conferência obrigatória depois de qualquer injeção: a diferença
> abre/fecha de `<div>` tem que continuar **1**, que é a do `_ORIGINAL`.

### Carrossel de 3 banners

Os três do briefing: "Conheça a Bee", "Conheça a Polen", "Todo o site em até 3x
sem juros". O texto é **HTML de verdade**, não embutido na imagem — o briefing
pede isso explicitamente.

Tem tudo que foi exigido: setas, indicadores, swipe, teclado (← →), pausa
acessível, `aria-live` anunciando a troca, `aria-roledescription="carrossel"` e
`aria-hidden` nos slides fora de vista. Pausa sozinho no hover, no foco e com a
aba escondida. Com `prefers-reduced-motion` **não roda sozinho** — mover sem o
usuário pedir contraria a preferência.

Transição de 520ms em `cubic-bezier(.22,.61,.36,1)`, que é a leitura do spring
do template (damping 100 / stiffness 200). Altura generosa: `24/10` no desktop,
`4/5` no mobile.

### Ticker de produtos revivido

O ticker do template era movido pelo runtime do Framer e tinha parado com a
hidratação desligada. Voltou em `requestAnimationFrame` a **40 px/s**, com os
itens clonados para o laço ficar contínuo. Para no hover, no foco e com a aba
escondida; não roda com `prefers-reduced-motion`.

Tudo em `melcam/interacoes.js` (7 KB), carregado com `defer`.

| Verificação | |
|---|---|
| `<video>` autoplay/muted/loop/playsinline | sim |
| Slides / setas / dots / pausa / aria-live | 3 / 2 / 3 / sim / sim |
| `<section>` balanceadas | 8 / 8 |
| Assets servindo | vídeo 5,1 MB + 3 banners + poster, todos 200 |

---

## HERO E CARDS EM BRANCO — o placeholder de SSR

Depois de desligar a hidratação, a página carregava mas **hero e cards ficavam
invisíveis**; só o rodapé aparecia.

Causa: o Framer marca os nós com `style="…opacity:0.001…"` e `opacity:0` como
**placeholder de pré-hidratação**. Quem apaga isso é o React ao assumir a
árvore. Sem React, ficam invisíveis para sempre.

Confirmado por inspeção: dos 13 nós em `opacity:0`, **11 eram o conteúdo** — o
badge "Novo", o `<h1>`, a grade de imagens do header, "DESTAQUES", os
`Header Grid` (os cards) e os itens do ticker. Só os 2 chamados **`Glow`** são
zero por design (brilho de hover).

Correção em `tools/aplicar.js`: `opacity:0` e `opacity:0.001` viram `opacity:1`
em atributos `style`, **exceto** nos nós `data-framer-name="Glow"`.

O JSON `__framer__appearAnimationsContent` **não é tocado** (lá o valor está
como `"opacity":0.001`, com aspas, e precisa continuar). Dos 20 atributos
`data-framer-appear-id`, há **1 id único** (`zfsne5`) com entrada no JSON — esse
segue animando, porque o `animator` aplica o `initial` a partir do JSON e não
depende do style inline.

Achado junto: mais um texto em inglês que escapou, **"We give you more"**, agora
"Analógica por fora, digital por dentro."

| Verificação final | |
|---|---|
| Nós de conteúdo invisíveis | **0** (só os 2 `Glow`, por design) |
| JSON de animação | intacto |
| `COMETICA` / inglês | 0 / 0 |
| Imagens locais na home | 59 |

---

## O LOGO ERA VETOR, NÃO TEXTO

Depois de zerar todas as ocorrências textuais, o lettering **COMETICA** ainda
aparecia na navbar e no rodapé. Motivo: não é texto, é um `<symbol>` SVG
(`id="svg11961625616"`, viewBox `0 0 178 27`) referenciado por `<use>` em três
lugares. Varredura de string nunca ia achar.

`tools/logo.js` troca o conteúdo do símbolo **mantendo o mesmo `id`**, então
todos os `<use>` passam a desenhar a MELCAM sem que uma linha de layout mude.
A proporção muda (178×27 → 1398×275.89), mas o `<use>` honra o
`preserveAspectRatio` padrão: encaixa por dentro, **sem distorcer** — o briefing
proíbe alterar a proporção do logo.

### Bug meu, corrigido na mesma passada

Os ícones sociais tinham virado `href="/ LTDA"`. Vinha de encadear duas trocas:
`dub.sh/moisegdesign` → `/moisegdesign` → `/Melcam LTDA`.

Como redes sociais são **PENDENTE** e o briefing proíbe link falso, os 21 ícones
agora são `href="#" aria-disabled="true" title="a decidir"` — sem destino
inventado.

| Verificação | |
|---|---|
| `COMETICA` no HTML | **0** |
| Símbolo do logo | `viewBox="0 0 1398.02 275.89"`, 8 paths, fill papel |
| `href` quebrado | **0** |
| Links marcados "a decidir" | 21 |
| Imagens remotas | **0** |
| Hidratação / animator | off / on |

---

## ⚠️ O ACHADO QUE DECIDE A ABORDAGEM (leia antes de tocar em qualquer arquivo)

O template é um **export de site publicado do Framer**, não um projeto-fonte.
Cada texto visível existe em **três lugares ao mesmo tempo**:

| Camada | Arquivo | Quando aparece |
|---|---|---|
| 1. SSR | `index.html` (body 264 KB) | pintado antes do JS |
| 2. Componente | `js/*.mjs` (minificado) | depois que o React hidrata |
| 3. Catálogo | `js/*.framercms` (binário) | dados de produto |

**Testado e confirmado:** as strings `"Elevating Your Style Game"`, `"COMETICA"`,
`"Blue Jeans"`, `"Full-Stock"` estão nos bundles, não só no HTML.

**Consequência:** editar só o HTML **não funciona**. O React hidrata, encontra
divergência e repinta com o conteúdo do bundle. O texto velho volta na tela.

**Portanto toda substituição tem que ser aplicada nas 3 camadas de uma vez.**
É por isso que a Fase 4 é construir a ferramenta antes de editar conteúdo.

### O que sobrevive sem o React (boa notícia)

O `index.html` traz **inline**:
- `<script>` nº 3: um `animator` autônomo de 10,8 KB — motor de animação próprio
- `<script type="framer/appear" id="__framer__appearAnimationsContent">` — as animações de entrada em JSON, por `data-framer-appear-id`
- `<script type="framer/appear" id="__framer__breakpoints">` — os 3 breakpoints
- 165 KB de CSS em 4 blocos `<style>`

Ou seja: **as animações de entrada rodam do HTML estático**, sem depender do
bundle React. Preservá-las exige apenas manter intactos: as classes hasheadas
(`framer-*`), a estrutura do DOM e os atributos `data-framer-*`.

### Rotas novas (/polen, /bee) — restrição real

`contact.html`, `faq.html` e as 9 de `sort-by/` têm **body vazio** (3 divs, zero
texto). São cascas montadas no cliente pelo bundle. **Não dá para criar rota
nova pelo caminho do Framer** — os componentes de página são código compilado.

**Caminho viável:** cada página MELCAM nasce como **cópia do `index.html`**
(que carrega CSS + animator + appear config + header + footer) e é recomposta a
partir dos blocos de DOM que já existem lá. Preserva design, grid, animação de
entrada e responsivo. Interações React (carrossel, menu, sacola) precisam ser
reimplementadas em JS próprio, respeitando os timings originais.

---

## FASE 0 — ANATOMIA DO TEMPLATE

Marca original: **`CCommerce`** nas metatags, **`COMETICA`** no texto visível.
Loja de roupas: jeans, t-shirts, shirts, sneakers.

| | |
|---|---|
| `index.html` | 432 KB — head 168 KB, body 264 KB |
| páginas internas | 29 KB, cascas vazias |
| `js/framer.bjxirb0y.mjs` | 486 KB, runtime |
| `js/motion.psarc4_w.mjs` | 147 KB, framer-motion |
| `js/react.di4y5kvy.mjs` | 141 KB |
| `js/*.framercms` | 92 + 93 KB, catálogo binário |

**Breakpoints:** `≥1440px` · `810–1439.98px` · `≤809.98px`. São 3 variantes de
DOM, não só media query.

**Formato do `.framercms`:** binário próprio. Campos como
`0x0C` + uint32(len) + bytes UTF-8. Editável, mas exige recalcular tamanhos.

### Dependências externas a resolver

| Host | Ocorrências | Ação |
|---|---|---|
| `framerusercontent.com` | 277 (144 únicos: 127 PNG + 17 woff2) | baixar e reapontar para local |
| `app.framerstatic.com` | 35 | runtime, avaliar |
| `dub.sh` | 21 | **remover** (afiliado do autor do template) |
| `fonts.gstatic.com` | 18 | trocar pelas fontes MELCAM |
| `googletagmanager.com` | 1 (`G-RR9R4J88WR`) | **remover**, é a conta do autor |
| `video-previews.elements.envatousercontent.com` | 1 | trocar pelo vídeo oficial |

O site **não abre offline** hoje.

---

## FASE 1 — DOCUMENTOS (lidos integralmente)

- `briefing-melcam-v2.pdf` — v2.1, julho/2026, 3 páginas. Extraído com script
  próprio (é "salvar como PDF" do Chrome, fontes subsetadas; o extrator está em
  `scratchpad/pdftext2.js`, resolve as tabelas ToUnicode).
- `melcam-textos-finais.md` — copy deck aprovado em call de 23/07/2026.
- Checklist e SITES CONCORRENTES: **ainda não lidos** (.docx, pendente).

### Do briefing, além do que o prompt já trazia

- Paleta confirmada: carvão `#221E17` · mel `#F2A900` · papel `#FBF7EE` · coral `#EE6A4D` · verde-mar `#5E8C7B`
- Fontes vêm do Adobe/Typekit do site atual: `area-extended`, `iowan-old-style-bt`, `brooklyn-heritage-script`
- Referências: menu **Zerezes** · cards **Dobra** · banner **ASICS** · barra de produto **Apple (apple.com/ipad-air)**
- Concorrentes para estudo: Festival FV, Camp Snap, That One Street
- `rascunho.html` é o wireframe com anotações azuis numeradas = spec de cada seção
- A LP Polen **absorveu** a seção "Fotografia de verdade" na animação de abertura — não repetir
- Packshots brutos da Bee têm **fundo verde**, são base para modelagem 3D

---

## FASE 2 — ASSETS DA MARCA

`C:\Users\israe\Downloads\melcam\IMAGENS\`

| Pasta | Arquivos | Uso |
|---|---|---|
| `VIDEO HERO` | 1 | `video-hero_1.mp4`, 1920×1080, ~9,56 s — hero da Home |
| `Fotos cards home (Bee + Polen)` | 2 | blocos clicáveis da Home |
| `Banner Home page (...)` | 3 | carrossel (2× 4000×6000, 1× 6000×4000) |
| `Por onde a MELCAM passou` | 15 | comunidade (**briefing pede 16–20 → faltam 1 a 5**) |
| `Catalogo Polen` | 35 | 7 cores × 5 tomadas, 1200×1200 |
| `Catalogo Bee` | 10 | 2 cores × 5 tomadas, 1200×1200 |
| `Packshot` / `Packshot (Bruto)` | 10 / 14 | Bee; o bruto tem fundo verde, é base do 3D |
| `Landing page Polen` | 16 | galeria "Feitas com a Polen" |
| `Landing page Bee` | 11 | verticais 4000×6000, destaques |
| `Variedade dos filtros` | 8 | os 8 filtros, 4000×3000 |
| `Toolkit (Logo, fontes, estampa))` | 50 | ver abaixo |

### Logo — SVG prontos (usar estes)

`Toolkit\Logo\SVG\Black\` e `\White\`, cada uma com:
`MELCAM_Logo_Horizontal.svg` · `_Symbol.svg` · `_Type.svg` · `_Vertical.svg`
Também há PNG e PDF das mesmas 8. Pattern: `Pattern\MELCAM_Pattern.svg`.

### Fontes — ⚠️ DIVERGÊNCIA REAL ENCONTRADA

`Toolkit\Fonts\`:
- `Apoio - Area\` — **22 arquivos .otf** (família completa)
- `Principal - Iowan Old Style\` — **só `Iowan Old Style BT Bold.otf`**
- `Polen - Brooklin\` — **só `Brooklyn Heritage Script Semi Bold.otf`**

**A fonte principal só existe em Bold.** Não há Regular/Italic para texto
corrido. Ou se pede o resto da família ao cliente, ou o corpo de texto usa Area
e a Iowan fica só em display. **Decisão pendente — não inventar.**
Os `.otf` precisam virar `.woff2` para a web.

### Site de referência já montado (achado importante)

`melcam\TEXTOS\melcam-novo-site-briefing 3\site (baixar e abrir index no pc) site de referencia\`

É um **site conceitual completo e funcional**, com `index.html`, `polen.html`,
`bee.html`, `bee2.html`, `rascunho.html`, mais `assets/` com tudo já nomeado
semanticamente e tratado para web: `video-hero.mp4` (4,9 MB), `logo.png`,
`fonts.css`, `site.css` (48 KB), `site.js` (42 KB), `polen-{cor}.png` (7 cores),
`bee/bee-*`, `community-01..08`, `filter-f1..f8`, `banner-*`, `lifestyle-*`,
`polen-gallery-01..08`.

**Use esta pasta como fonte de assets já otimizados** em vez de reprocessar os
originais de 4000×6000. E `site.js`/`site.css` mostram como as animações
conceituais foram feitas — é a spec viva de timing.

---

## FASE 4 — O QUE FAZER AGORA (próximo passo concreto)

Construir `tools/aplicar.js`, um pipeline que aplica um mapa de substituição
nas 3 camadas de uma vez:

1. **HTML** — texto visível, `alt`, metatags, URLs de imagem
2. **`.mjs`** — as mesmas strings, como literais dentro do bundle minificado
   (substituição de string literal é segura: não muda a estrutura do código)
3. **`.framercms`** — registros do catálogo, recalculando o uint32 de tamanho

O mapa vive num `melcam.config.json` com: textos, cores, rotas, produtos e o
bloco `PENDENTES` (o que não pode ser inventado). Regra: nada de valor fictício;
o que falta fica marcado.

Ordem sugerida depois disso: identidade (fontes/cores/logo) → Home → Polen →
Bee → demais páginas → sacola → SEO/a11y → validação.

---

## PENDÊNCIAS QUE NÃO PODEM SER INVENTADAS

CNPJ · endereço · WhatsApp de suporte · redes sociais · links de rastreio ·
texto final de Sobre Nós · textos jurídicos (Privacidade, Termos, Trocas) ·
gateway de pagamento · transportadora · estoque · SKUs · autorização e
identificação (@usuário · cidade) das fotos de comunidade · 2–3 clipes verticais
1080×1920 · render 3D final da Polen · render/opção 3D final da Bee ·
1 a 5 fotos extras de comunidade · **família completa da Iowan Old Style**.

Divergência a confirmar com o cliente: a pasta de catálogo usa **"Coral"**, o
copy aprovado usa **"Laranja"**. Tratados como a mesma variante por ora.

---

## COMO RETOMAR

1. `cd C:\Users\israe\Downloads\framer-teste; node serve.js` → localhost:3030
2. Ler este arquivo inteiro, em especial o bloco "O ACHADO QUE DECIDE A ABORDAGEM".
3. Restaurar o template limpo, se precisar: copiar de `_ORIGINAL\`.
4. Começar pela Fase 4.

---

## 🍔 NAVBAR FUNCIONAL — 12/08/2026

Antes: a navbar tinha **zero links** (só dois âncoras vazios do logo) e um
hambúrguer morto. Sem hidratação React, o componente de menu do Framer nunca
monta. Confirmado por medição: clicar no ícone não criava elemento nenhum e não
travava o scroll.

**Dois defeitos, não um.** Além da hidratação, `iniciarMenu()` procurava
`[data-framer-name*="Menu"]` — mas o botão do template se chama **"Meniu"**
(romeno). Nunca casava, então a função saía no primeiro `if`.

### O que foi feito, em `tools/hero-carrossel.js` (gerador do `interacoes.js`)

Menu próprio, replicando o comportamento **medido** no template original
(`MOTION_SPEC.md`, seção 7):

| Comportamento | Original | MELCAM |
|---|---|---|
| painel | criado no clique, removido ao fechar | igual |
| entrada | só opacidade, ~400 ms, curva em S | igual, `smoothstep` |
| transform | `none` | `none` |
| trava de scroll | `html { overflow:hidden }` | igual |
| Escape | fecha | fecha |
| ícone | toggle | toggle |

Links vindos de `melcam.config.json > navegacao`, os cinco do cliente:
Home · Polen · Bee · Acessórios · Sobre Nós. A página atual sai em mel
(`#F2A900`) com `aria-current="page"`.

Acessibilidade: `role`, `tabindex`, `aria-expanded`, `aria-label` que alterna,
foco vai para o primeiro link ao abrir e volta ao botão ao fechar, Enter e Espaço
acionam. Com `prefers-reduced-motion`, aparece direto no estado final.

### Duas correções durante a implementação

1. **Ligava só no primeiro botão.** Cada breakpoint tem sua variante de nav com
   seu próprio botão, e só a ativa renderiza — o `querySelector` pegava o do
   desktop, oculto no mobile. Passou a ligar em todos.
2. **A curva estava errada.** Usei ease-out, que dá `0.504` aos 80 ms; o
   original dá `0.066`. Trocado por `smoothstep` (`k*k*(3-2k)`), que dá `0.112`
   e acompanha o S do original de perto.

### Conferido

Desktop 1440 e mobile 390: painel aparece, opacidade 0.112 → 0.438 → 0.741 →
0.980 → 1.000 nos mesmos marcos do original, `html overflow` trava e destrava,
os 5 links com href certo, foco em "Home", Escape fecha.

`js` foi exportado em `tools/hero-carrossel.js` para dar para regerar só o
`interacoes.js`:

```js
require('./tools/hero-carrossel.js').js()   // e gravar em melcam/interacoes.js
```

---

## 🛒 GRADE DA HOME CORRIGIDA — 12/08/2026 · `tools/grade.js`

Fecha a pendência grave registrada acima (rótulo e imagem descolados).

### A regra que guiou a correção

A raiz do card é `<a class="framer-a0g3Z" data-framer-appear-id="zfsne5"
data-framer-name="Card Produtos">` — **o card É o elemento animado**, o único
com appear animation declarada em todo o template (`MOTION_SPEC.md`, seção 1).

Por isso o card **não foi substituído**. `tools/grade.js` reescreve só o
conteúdo de dentro: `src`, `srcset`, `alt`, `<h5>`, `<h6>` e os `<p>`. A `<a>`,
suas classes, o `appear-id` e o `will-change` ficam intactos.

### Fonte única

Cada card passa a ser preenchido a partir de **um objeto** de
`melcam.config.json > produtos`. Nome, imagem, preço e contagem de variantes
saem do mesmo lugar, então não têm como divergir. São 9 produtos reais:
7 cores de Polen (R$ 399,00) e 2 Bee (R$ 299,00).

### O que saiu, e por quê

Três campos do card eram **dado inventado**, herdado do template COMETICA. Nada
disso existe no briefing:

| Campo | Era | Virou |
|---|---|---|
| selo | "Em estoque" / "Esgotado" / "Sobre Nós" | a linha do produto: `Polen` ou `Bee` |
| desconto | "50%" / "25%" | vazio |
| preço riscado | "R$ 399,00" tachado | vazio |
| preço | fictício | o real do config |
| "N cores" | sempre "2 cores" | 7 para Polen, 2 para Bee |

Estoque, promoção e preço antigo continuam em `PENDENTES`: quando houver dado
de verdade, é aqui que ele entra.

### Conferido

19 cards por página, em 7 páginas. Cada um internamente coerente — nome, foto,
preço e contagem do mesmo produto. Desktop 1440 e mobile 390. **0 erros de
console.** O `appear-id` `zfsne5` segue presente em todos.

### Só os 9, sem repetir (pedido de 12/08/2026)

Eram 19 posições no template para 9 produtos reais. Os 10 excedentes recebem
`display:none` e `data-mel-excedente="1"` — **escondidos, não recortados**: o
card é o elemento com `data-framer-appear-id="zfsne5"`, e remover mexeria na
estrutura que o MOTION_SPEC manda preservar. Quando o catálogo crescer, os slots
estão lá.

Na medição aparecem **18** cards visíveis, e isso está certo: são os 9 mais 9
clones que o `iniciarTicker` cria com `cloneNode(true)` para o loop da marquise
parecer infinito. É o mecanismo do ticker, não repetição de catálogo — sem o
clone o carrossel daria um salto ao voltar ao início.

Rodar de novo: `node tools/grade.js` (idempotente).

---

## 📱 SEÇÕES SUMIDAS E BOTÃO HAMBÚRGUER — 12/08/2026

### 1. Comunidade, clipes e segurança voltaram no tablet e mobile

**Causa:** `tools/comunidade.js` injetava com `s.replace(/(<footer)/)`, que pega o
**primeiro** dos três `<footer>` — e esse mora dentro de
`<div class="ssr-variant hidden-1g8fb3q">`, que é `display:none` fora do
desktop. As três seções ficavam com altura **0** no tablet e no mobile. Passou
despercebido porque no desktop aparecia tudo certo.

**Correção:** `tools/mover-secoes.js` recorta as três com contagem equilibrada
de tags e recoloca como filhas diretas do stack da home (o
`<header class="framer-vrbx7h">`, flex column), **depois de todas as variantes**.
Fora de variante, renderiza nos três breakpoints. O gerador foi corrigido junto,
com o aviso para nunca voltar ao `<footer>`.

| | desktop | tablet | mobile |
|---|---|---|---|
| `.mel-comunidade` | 1114 px | **1803** | **1009** |
| `.mel-clipes` | 1192 px | **2136** | **2098** |
| `.mel-seguranca` | 130 px | **218** | **212** |

Antes, tablet e mobile eram `0` nas três. Ordem visual conferida depois da
mudança: Colméia continua sendo a última seção, o rodapé continua por último,
nos três breakpoints. Tags balanceadas (`section` 11/11, `header` 1/1). 0 erros
de console.

### 2. Botão hambúrguer com menu suspenso (o overlay saiu)

Pedido do cliente. O ícone do template é um frame com três filhos chamados `1`,
`2` e `3` — barras de 14×2, 10×2 e 14×2.

| barra | fechado | aberto |
|---|---|---|
| 1 | — | `translateY(+6px) rotate(45deg)` |
| 2 | — | `opacity 0`, `scaleX(.2)` |
| 3 | — | `translateY(-6px) rotate(-45deg)` |

Os deslocamentos são **medidos no DOM**, não cravados: cada barra tem seu
`offsetTop` dentro do ícone e o alvo é o centro. Se o template mudar o
espaçamento, continua fechando o X.

O `×` separado que existia dentro do painel **saiu**: é um botão só, com dois
estados. Para dar para clicar de novo com o painel aberto, a barra fixa da nav
sobe de `z-index: 2` para `2147483001` enquanto durar, e volta ao fechar.

Transição de 400 ms com `cubic-bezier(.4,0,.2,1)`, a mesma duração do painel.
Com `prefers-reduced-motion`, troca sem transição.

Conferido no desktop e no mobile: abre, vira X, `html overflow` trava, segundo
clique no ícone fecha tudo e as barras voltam a `transform: none`.

### Atualização: o overlay de tela cheia saiu

Pedido do cliente. O painel deixou de ser `position:fixed; inset:0` sobre a
página inteira e virou **menu suspenso ancorado na barra**.

| | antes | agora |
|---|---|---|
| forma | overlay de tela cheia | caixa de 168×212, ancorada |
| posição | `inset: 0` | `top` = base da nav, `left` = do próprio botão |
| trava de scroll | `html { overflow:hidden }` | **nenhuma** — a página continua rolável |
| fundo | chapado sobre tudo | painel com borda e sombra, página à vista |
| fechar | ícone, Escape | ícone, Escape, **clique fora**, resize |

A ancoragem é lida do DOM na abertura (`getBoundingClientRect` da barra fixa e
do botão), não cravada — funciona em qualquer breakpoint sem número mágico.
Se a janela mudar de tamanho com o menu aberto, ele fecha em vez de ficar solto
no lugar errado.

O `elevarNav` foi removido: existia só para o ícone ficar clicável por cima do
overlay. Sem overlay, o menu nasce abaixo da barra e não cobre nada.

Entrada: opacidade 0→1 mais `translateY(-6px)→0`, 400 ms, mesma `smoothstep`.
Com `prefers-reduced-motion`, aparece direto.

Conferido no desktop e no mobile: caixa em (24, 81) de 168×212, **não é tela
cheia**, `html overflow` continua `visible`, os 5 links, hambúrguer vira X,
clique fora fecha e as barras voltam. 0 erros de console.

---

## 🎈 NAV RETRÁTIL — 12/08/2026

Pedido: rolou, a barra some; o mouse chegando perto do topo, ela volta.
Em `tools/hero-carrossel.js`, função `iniciarNavRetratil()`.

| Situação | Barra |
|---|---|
| topo da página (`scrollY ≤ 80`) | sempre visível |
| rolando abaixo disso | some, `translateY(-100%)`, 300 ms |
| mouse a ≤ 90 px do topo da janela | volta |
| menu aberto | **fica**, mesmo rolando |
| sem mouse (toque) | volta ao rolar **para cima** |

Três guardas em cima do pedido cru, todas por um motivo:

1. **Zona segura de 80 px no topo.** Sem ela a home abriria já sem navegação.
2. **Não some com o menu aberto.** O X sumiria junto e o menu ficaria órfão.
3. **No toque, volta ao rolar para cima.** `mousemove` nunca dispara em celular;
   sem essa regra a barra ficaria inalcançável depois do primeiro scroll.
   Detectado com `matchMedia('(hover: hover) and (pointer: fine)')`.

### O defeito que quase passou

A barra **já tem transform próprio** do template — um `translateX` de
centralização, medido em `matrix(1, 0, 0, 1, -720, 0)` no desktop. Escrever
`transform: translateY(-100%)` direto **apagava esse X**, e a barra escorregava
720 px de lado enquanto subia.

A correção lê o transform de origem no início e compõe em cima:
`base + ' translateY(-100%)'`. Depois disso o valor escondido é
`matrix(1, 0, 0, 1, -720, -81)` — só o Y mudou, como tem que ser.

### Conferido

Topo visível · scroll 60 visível · scroll 900 some · mouse a 40 px volta · rola
de novo e some · menu aberto continua visível em 1500 e 2500 · fecha o menu e
volta a sumir. 0 erros de console.

---

## 🎞️ A FILEIRA VOLTOU A SE MEXER — 13/08/2026

Fecha o defeito que abre este arquivo: o grupo `.framer-dtlgl4` estava
congelado em `opacity:1; transform:perspective(1200px) translateY(150px)
scale(0.5)`, metade do tamanho e parado, porque quem o animava era o runtime
React, desligado desde a decisão de arquitetura.

**Não precisou do canvas do Framer.** A seção "PARADO EM 12/08" dava esse passo
como dependente da duplicada publicada. Não era: a curva já estava medida em
`medidas/`, e medição é o bastante para reproduzir.

### O achado que destravou

Sozinhas, as duas campanhas de medição pareciam discordar — `scale 0.930` numa
e `0.895` na outra, em posições de scroll parecidas. Rodaram em páginas de
altura diferente, então o progresso da página não servia como eixo comum.

Elas colapsam numa curva só quando o eixo é **quanto o topo do grupo já subiu,
medido em alturas de janela**:

```
s = (alturaJanela − topoDoGrupoNaJanela) / alturaJanela
```

Com esse eixo, desktop, tablet e mobile dão os mesmos números:

| s | escala | translateY | s medido (desktop · tablet · mobile) |
|---|---|---|---|
| ~0,11 | 0,500 | 150 px | 0,107 · 0,130 · 0,104 |
| ~0,42 | 0,895–0,899 | 30–31 px | 0,429 · 0,428 · 0,415 |
| ~0,73 | 0,989–0,990 | 3,1–3,2 px | 0,751 · 0,727 · 0,724 |
| ~1,04 | 1,000 | 0 | 1,072 · 1,024 · 1,033 |

O efeito **não tem parâmetro responsivo**. O que muda entre breakpoints é só a
altura dos frames (80vh acima de 810px, 50vh abaixo).

### A curva implementada

Ajuste por mínimos quadrados sobre os 12 pontos medidos:

```
u = clamp((s − 0,13) / (1,40 − 0,13))
e = 1 − (1 − u)^6

escala     = 0,5 + 0,5·e
translateY = 150·(1 − e)
```

RMS de **0,004** no progresso — erro máximo de 0,005 na escala e 3 px no
translateY. `0,13`, `1,40` e o expoente `6` são **ajuste**; `0,5`, `150 px` e os
pontos da tabela são **medição**. As constantes estão nomeadas em
`tools/hero-carrossel.js` com essa distinção anotada.

### O que eu tinha deixado passar: o arrasto horizontal

A primeira implementação passou em escala, translateY e opacidade — e ainda
estava errada. Foi a medição que pegou: o template **também desliza a fileira
para a esquerda**, e o total é uma constante.

| progresso da página | translateX |
|---|---|
| 0,25 | −250 px |
| 0,50 | −500 px |
| 0,75 | −750 px |
| 1,00 | **−1000 px** |

Exato, e **idêntico nos cinco viewports** — não é derivado da largura da fileira
nem da janela. É o parâmetro do efeito. Cabe na sobra: a fileira transborda
~1770 px de cada lado no desktop e ~1300 no mobile, então 1000 px de arrasto
nunca descobrem a borda.

Lição registrada: **a leitura da seção 2 do MOTION_SPEC listava só
`opacity/scale/translateY`.** A coluna `translateX` da matriz não tinha sido
extraída, e o que não se extrai não se reproduz.

### A opacidade tem dois donos

Ela não para quando a geometria chega. Assenta perto de 0,89 e continua subindo
com o progresso da **página** até 1 no rodapé:

```
opacidade = 0,889·e + 0,111·p
```

Os dois coeficientes saem do ajuste conjunto das duas campanhas, que concordam
nisso apesar das alturas de página diferentes.

### Duas armadilhas resolvidas dentro do código

1. **O topo do grupo é lido pela cadeia de `offsetTop`, nunca por
   `getBoundingClientRect`.** O rect já vem com o transform aplicado, e o
   transform é justamente o que se está calculando — daria realimentação, o
   grupo perseguindo a própria posição. `offsetTop` é posição de layout e ignora
   transform. Foi também o que fez as três medições baterem entre si.
2. **A ordem `translate` antes de `scale`.** As funções se aplicam da direita
   para a esquerda, então o translate acontece **fora** da escala: os 150 px são
   150 px de layout, não 150 já encolhidos. É o que faz a matriz bater — em
   `scrollY 580` o template dá `matrix3d(0.895277, …, −134.632, 31.417, 0, 1)`,
   com a translação crua ao lado da diagonal escalada. Trocar a ordem move em
   dobro.

### O carrossel de swipe saiu

A fileira tinha virado tira rolável (`width:100%`, `overflow-x:auto`,
`scroll-snap`) para contornar o "parece miniatura". **A miniatura não vinha da
largura do container** — vinha do `scale(0.5)` congelado. Com a causa resolvida
o remendo passou a ser a divergência: a medição do build antigo dava grupo de
1392 px e `overflow: auto hidden` contra os 4980 px e `hidden` do template.

Junto saíram:

| saiu | por quê |
|---|---|
| `overflow-x:auto` + `scroll-snap` | o template tem `overflow:hidden` nos dois eixos |
| `width:100%` → `max-content` | mesmo número (4980 = 10×480 + 9×20), sem o colapso do `min-content` |
| `height:78svh` no mobile → `50vh` | é o que o template declara; 78svh era da fase de carrossel |
| reveal por `IntersectionObserver` nos 10 filhos | MOTION_SPEC §3: "sem movimento individual". Quem se move é o grupo |

`max-content` em vez do `min-content` do template é escolha deliberada: o número
é o mesmo, porque os filhos têm altura fixa e `aspect-ratio`, mas `min-content`
colapsa para o tamanho intrínseco da foto se a regra de altura não vencer — e
era esse colapso o "parece miniatura" original. `max-content` não tem esse modo
de falha.

⚠️ **Consequência a declarar:** sem o swipe, no celular só a primeira foto e um
pedaço da segunda ficam ao alcance — as outras oito vivem fora do recorte, como
faixa decorativa. É exatamente o que o template faz, e a tabela de aceite exige
`overflow:hidden`. Se o cliente quiser as dez acessíveis no celular, isso é
mudança de design em cima do template, não conserto.

### Conferido — a tabela de aceite do MOTION_SPEC §5, inteira

`node tools/medir.js "http://localhost:3030/" melcam-13ago` — resultado
guardado em `medidas/medida-melcam-13ago.json`.

| Critério | Exigido | Medido |
|---|---|---|
| escala inicial → final | 0,5 → 1,000 | **0,5000 → 1,0000** ✓ |
| translateY inicial → final | 150 px → 0 | **150,0 → 0,0** ✓ |
| opacidade inicial | 0,000 | **0,000** ✓ |
| frame desktop | 480×720 | **480×720** ✓ |
| grupo desktop | 4980×720 | **4980×720** ✓ |
| `aspect-ratio` das 10 | 0.666667 / 1 | **0.666667 / 1** ✓ |
| overflow do grupo | `hidden`, nunca `auto` | **hidden** ✓ |
| `object-fit` | `cover` nas 10 | **cover** ✓ |
| erros de console | 0 | **0** ✓ |

Tablet e mobile também batem na geometria: **3593×512** com frame 341×512, e
**2993×422** com frame 281×422 — os números do template.

No rodapé, onde o progresso é 1 nos dois, o estado final é idêntico:

| | escala | x | y | opacidade |
|---|---|---|---|---|
| desktop | 1,0000 | **−1000,0** | 0,0 | 1,0000 |
| tablet | 1,0000 | **−1000,0** | 0,0 | 1,0000 |
| mobile | 1,0000 | **−1000,0** | 0,0 | 1,0000 |

**Divergência conhecida e esperada:** no meio do caminho o `x` e a opacidade da
MELCAM ficam atrás do template em px absolutos — a −42 px onde o template está a
−67, por exemplo. Não é erro de curva: os dois termos andam com o progresso da
**página**, e a home da MELCAM é mais longa (6845 px roláveis contra os ~4308 do
template na campanha comparada). A mesma fração de página dá o mesmo valor nos
dois, e é isso que o efeito parametriza.

Varredura das 7 rotas no desktop, depois da mudança: **1 `<h1>` em cada, fileira
4980×720 `hidden`, nav presente, 0 imagens quebradas, 0 erros de console.** O
único erro que aparece é o 404 de rede em `/404`, que é o status HTTP correto da
rota.

### `prefers-reduced-motion`

Escreve escala 1 / y 0 / opacidade 1 direto, sem passar pelo caminho do meio — é
o que o MOTION_SPEC §6.3 mede no template.

### Como regerar

```js
require('./tools/hero-carrossel.js').js()   // e gravar em melcam/interacoes.js
```

A regra de CSS está em `tools/hero-carrossel.js` e `tools/identidade.js` (as
fontes) **e** aplicada em `melcam/identidade.css`, para valer sem re-rodar o
pipeline. Chaves conferidas: 251/251.

---

## 🔴 ACHADO NOVO, EM ABERTO — as páginas internas abrem com o hero da home

Encontrado durante a varredura das 7 rotas. **Não é regressão desta mudança** —
é anterior, e só ficou visível agora que a fileira voltou ao tamanho real.

`/polen` começa assim, antes de qualquer conteúdo de Polen:

- o título **"CHEGOU A BEE"**, que é a manchete da home;
- a fileira de 10 fotos, ocupando 80vh.

A fileira começa a **198 px** do topo da página. Vale para `/polen`, `/bee`,
`/acessorios`, `/sobre`, `/sacola` e `/404` — em todas o grupo mede 4980×720.

**Causa:** o mecanismo `body.mel-interna` esconde
`[data-framer-name="The first section"]`, `"Speed On"`, `.mel-carrossel`,
`.mel-comunidade`, `.mel-clipes` e `.mel-seguranca` — mas **não**
`"Header Section"`, que é onde moram o título do hero e a fileira. As LPs foram
escritas com abertura própria ("Memória cheia", na Polen), então esse bloco fica
por cima da abertura de cada uma.

**Correção, uma linha** em `tools/paginas.js`, junto das outras:

```css
body.mel-interna [data-framer-name="Header Section"]{ display:none !important }
```

Captura do antes em `medidas/polen-hero-da-home.png`.

> ✅ **APLICADO ainda em 13/08/2026, a pedido.** `"Header Section"` entrou no
> `SO_HOME` de `tools/paginas.js` e na regra já gerada em
> `melcam/identidade.css`. Ver a seção seguinte — e o que a aplicação
> desenterrou embaixo.

---

## 🧹 HERO FORA DAS INTERNAS — e o que apareceu embaixo — 13/08/2026

Pedido: esconder o `Header Section` nas internas. Feito — e a aplicação
desenterrou um defeito bem maior, que estava escondido justamente por ele.

### 1. O hero saiu

`'[data-framer-name="Header Section"]'` entrou no `SO_HOME` de
`tools/paginas.js`, e a regra já gerada em `melcam/identidade.css` recebeu o
seletor junto dos outros. Um nó por página, conferido.

Nas 6 internas, nos dois breakpoints medidos: **hero oculto, fileira oculta,
1 `<h1>`, 0 imagens quebradas, 0 erros de console.** A home segue com hero e
fileira visíveis e altura inalterada.

### 2. 🔴 O que estava embaixo: as internas estavam VAZIAS fora do desktop

Ao tirar o hero, sobrou nav e rodapé — e nada mais — no tablet e no mobile.
O hero da home vinha enchendo a tela e escondendo isso desde sempre.

A medição não deixa dúvida. Altura das seis internas no mobile, **antes**:

| rota | desktop | mobile |
|---|---|---|
| `/polen` | 9852 | **3995** |
| `/bee` | 7346 | **3995** |
| `/acessorios` | 3141 | **3995** |
| `/sobre` | 3936 | **3995** |
| `/sacola` | 2654 | **3995** |
| `/404` | 2681 | **3995** |

Seis páginas de conteúdos completamente diferentes com a **mesma altura ao
pixel** é a assinatura de conteúdo que não renderiza. 3995 px é a página sem
nada além do cromo.

**Causa, medida na cadeia de ancestrais do `/polen` no mobile:**

```
div.mel-barra                              display:block     h=0
div.framer-8hdwjm-container                display:contents  h=0
div.ssr-variant hidden-1g8fb3q hidden-...  display:NONE      h=0
header.framer-vrbx7h                       display:flex      h=3995
```

`tools/paginas.js` injetava com `s.replace(/(<footer)/)`, que pega o
**primeiro** dos três `<footer>` do template — e esse mora dentro de uma
`ssr-variant` que é `display:none` fora do desktop.

**É o mesmo defeito, na mesma linha de código, que o `mover-secoes.js` já
tinha corrigido na home.** O `tools/comunidade.js` cometeu o erro com as
seções de comunidade/clipes/segurança; o `tools/paginas.js` cometeu com o
conteúdo inteiro das seis internas, e ninguém conferiu tablet e mobile nas
internas porque no desktop estava tudo certo.

### 3. A correção

**`tools/mover-conteudo-interno.js`** (novo). Recorta o bloco injetado e
recoloca como filho direto do stack — o `<header class="framer-vrbx7h">`,
flex column — depois de todas as variantes. Fora de variante, renderiza nos
três breakpoints.

Âncora por página, porque o conteúdo não bate mais com o gerador: `rotas.js` e
`imagens.js` reescreveram `href` e `src` depois da geração, então
`indexOf(conteudo())` falha nas seis. O que sobreviveu intacto foi a **tag de
abertura**, e ela é única no arquivo em todas:

| página | âncora | movido |
|---|---|---|
| `polen.html` | `<div class="mel-barra" data-mel="barra-produto">` | 15 589 chars · div 25/25 · section 9/9 |
| `bee.html` | idem | 5 011 · div 14/14 · section 4/4 |
| `acessorios.html` | `<section class="mel-sec mel-embreve" …>` | 1 227 · div 2/2 · section 1/1 |
| `sobre.html` | `<section class="mel-sec" aria-labelledby="mel-sob-tit">` | 2 460 · div 0/0 · section 3/3 |
| `sacola.html` | `<section class="mel-sec" aria-labelledby="mel-sac-tit">` | 1 158 · div 4/4 · section 1/1 |
| `404.html` | `<section class="mel-sec mel-404" …>` | 548 · div 1/1 · section 1/1 |

Três guardas antes de gravar, pela regra de "não recortar DOM por regex":
o bloco recortado tem que estar balanceado em `div` e `section`; o documento
inteiro tem que manter o mesmo balanço de antes; e o tamanho do arquivo tem
que ser idêntico — mover não pode criar nem perder um byte. Se qualquer uma
falhar, a página não é gravada. É idempotente.

**O gerador foi corrigido junto**, senão o próximo `paginas.aplicar()`
reintroduziria tudo. `gerar()` ganhou `fimDoStack()` e insere ali, com um
aviso explícito de nunca voltar ao `replace(/(<footer)/)`. Se o stack não for
encontrado, agora **lança erro** em vez de inserir no lugar errado em silêncio.

### 4. Conferido

Altura das internas no mobile, **depois** — e o desktop, que não podia mudar:

| rota | desktop (antes = depois) | mobile antes | mobile depois |
|---|---|---|---|
| `/polen` | 9852 | 3995 | **11 010** |
| `/bee` | 7346 | 3995 | **8 392** |
| `/acessorios` | 3141 | 3995 | **4 701** |
| `/sobre` | 3936 | 3995 | **5 898** |
| `/sacola` | 2654 | 3995 | **4 248** |
| `/404` | 2681 | 3995 | **4 392** |

Ordem visual conferida em `/polen`, `/bee` e `/sobre` nos **três**
breakpoints — o rodapé nunca sobe acima do conteúdo:

| | conteúdo | rodapé |
|---|---|---|
| desktop | 1837 → 9432 | 9452 |
| tablet | 4222 → 13 398 | 13 418 |
| mobile | 2957 → 9963 | 9983 |

Nas 7 rotas × 2 breakpoints: 1 `<h1>` cada, 0 imagens quebradas, nav presente,
**0 erros de console**.

### 5. Os dois irmãos do `Header Section` — decidido

O `Header Section` não era o único bloco de hero. Medido no `/polen` desktop,
antes do conteúdo da Polen ainda vinham dois **irmãos** dele (não filhos, por
isso a regra não os alcançava):

| bloco | altura | o que é | decisão de 13/08 |
|---|---|---|---|
| `Header Info` | 112 px | "A CÂMERA QUE VIVE COM VOCÊ." + subtítulo da home | **escondido** |
| `Header Grid` | 882 px | os blocos POLEN · BEE · ACESSÓRIOS · SOBRE NÓS | **fica** |

`Header Info` era manchete da home numa página de produto — sai pelo mesmo
motivo do "Chegou a Bee". O `Header Grid` fica porque numa interna funciona
como navegação entre as linhas. A decisão está anotada no próprio `SO_HOME`,
com o aviso de não incluir o `Header Grid` sem novo pedido.

Conferido nas 7 rotas × **3** breakpoints: `Header Info` e `Header Section`
ausentes nas 6 internas e presentes na home, `Header Grid` presente em todas,
fileira só na home, 1 `<h1>` por página, rodapé sempre abaixo do conteúdo,
0 imagens quebradas, **0 erros de console**. Cada interna encolheu os 112 px
do `Header Info` e nada mais — `/polen` 9852 → 9740 no desktop.

O conteúdo próprio de cada interna passou a começar a **1725 px** no desktop,
**4131** no tablet e **2803** no mobile — o topo é o `Header Grid`, como
decidido.

### 6. Um susto que não era nada

No meio da conferência, a sonda passou a devolver `"Sem tela ,  em di traçõe "`
— todo `s` minúsculo sumido, em todas as páginas. Não era o site: eu tinha
escrito `/\s+/g` **dentro de uma template literal**, e aí o JS reduz `\s` a
`s`, então o navegador rodou `/s+/g` e trocou cada `s` por espaço.

Relendo com sonda sem regex, o texto está inteiro: *"Sem telas, sem distrações
— apenas o momento. A câmera que devolve a fotografia ao lugar de sempre: a
memória."*

Regra para a próxima: **regex dentro de sonda em template literal precisa de
`\\s`**, ou melhor, não usar regex ali — `split`/`join` resolve sem escape.

### 7. Como regerar

```
node tools/mover-conteudo-interno.js     # idempotente
```

---

## 🕳️ O VAZIO NOS DESTAQUES DA BEE — 13/08/2026

Relatado: "nos destaques tem um espaço vazio". Confirmado e medido em
`/bee #destaques`.

### A conta que explica o buraco

`.mel-dest` é grid de `1fr 1fr` com `align-items:center`. A foto tinha
`aspect-ratio:4/5` e `width:100%`, então a altura da linha era **ditada pela
foto**:

| | desktop 1440 |
|---|---|
| coluna | 668 px |
| foto (4/5 de 668) | **835 px** |
| texto ao lado | **135 px** |
| sobra, centralizada | ~350 px acima **e** ~350 px abaixo |

Duas linhas assim, mais o cabeçalho e as specs: seção de **2503 px** com cerca
de **1400 px em branco**. Mais da metade.

Não era imagem faltando nem placeholder: as duas fotos carregam
(`bee-lifestyle-acessorio.jpg` e `bee-lifestyle-tela.jpg`, naturais 933×1400,
`object-fit:cover`). O vazio era de layout.

### A correção

Um teto na altura da foto, em vez de trocar o enquadramento:

```css
.mel-dest-img img{
  width:100%; aspect-ratio:4/5; max-height:clamp(380px,32vw,460px);
  object-fit:cover; display:block;
}
```

Acima de ~1150px de tela a foto para de crescer e a linha encolhe junto; abaixo
disso o 4/5 ainda cabe dentro do teto e continua valendo sozinho. O `cover`
recorta, então nenhuma foto deforma e o enquadramento das duas continua o
mesmo.

**Em uma coluna o teto sai** (`max-height:none` dentro do
`@media (max-width:809.98px)`). Ali o texto fica **embaixo** da foto, não ao
lado — não existe vazio, e o retrato alto é justamente o que se quer no
celular. Era erro provável aplicar o teto nos dois.

### Conferido

| | antes | depois |
|---|---|---|
| foto, desktop | 668×**835** | 668×**460** |
| linha `.mel-dest` | 835 px | 460 px |
| seção `#destaques` | 2503 px | **1753 px** |
| página `/bee` desktop | 7234 px | **6484 px** |
| foto, mobile | 358×448 | **358×448** (inalterada) |
| seção, mobile | 2400 px | **2400 px** (inalterada) |

O texto segue centralizado na linha, agora com ~162 px de respiro de cada lado
em vez de 350 — passa a ler como ar, não como buraco.

Varredura das 7 rotas × 3 breakpoints depois da mudança: 1 `<h1>` por página,
rodapé sempre abaixo do conteúdo, 0 imagens quebradas, **0 erros de console**.
Home, `/polen` e as demais com altura inalterada — `.mel-dest` só existe na
`/bee`, conferido por contagem nas 7 páginas.

---

## 👻 O SLOT FANTASMA DO TICKER — 13/08/2026

### Sintoma

Um card invisível no ticker da home (`[data-framer-name="Our products"]`):
espaço ocupado sem nada dentro, viajando junto com a fileira.

### Causa — confirmada por medição, com correção nos números do relato

`tools/grade.js` esconde o slot que sobra marcando **só o `<a>`**:

```
data-mel-excedente="1"  style="…;display:none"
```

Quem ocupa lugar na linha, porém, é o `<li>` em volta — e esse ficava. Medido
antes da correção, idêntico nos três breakpoints:

| | |
|---|---|
| `<li>` excedente | **252 × 0 px** — altura zerada pelo `<a>`, largura inteira |
| clonado pelo `cloneNode(true)`? | **sim** |
| soma no `<ul>` ativo | **504 px** (1 original + 1 clone) |
| focáveis dentro dele | **0** — o `display:none` já o tirava da tabulação |

**Duas correções ao enunciado do problema**, ambas medidas:

1. **No `<ul>` do ticker são 10 posições: 9 reais + 1 excedente.** Os "19 slots
   / 10 excedentes" do registro de 12/08 são da **grade**, não do ticker. A
   página tem **duas** raízes `Our products` (variantes SSR): a ativa com 10
   slots, a outra com 9 — todos excedentes. Daí os 10 excedentes da página.
2. **O loop NÃO saltava.** `medir()` somava os mesmos 10 `<li>` que estavam no
   layout, então a conta fechava e o clone caía no lugar certo. O ciclo media
   2720 px em vez de 2448 — 272 deles de nada. O defeito era o **buraco
   viajando** pela fileira, uma vez por cópia, não um tranco no reinício.

### Arquivos alterados

| arquivo | o que mudou |
|---|---|
| `tools/hero-carrossel.js` | `iniciarTicker()` — a fonte |
| `melcam/interacoes.js` | regerado a partir dela |

`tools/grade.js` **não** foi tocado: os slots excedentes continuam no HTML, com
`data-framer-appear-id="zfsne5"` intacto, para quando o catálogo crescer.

### Solução

`iniciarTicker()` passa a separar os `<li>` antes de qualquer outra coisa. O que
contém `[data-mel-excedente="1"]` sai do fluxo com `hidden = true`,
`style.display = 'none'` e `aria-hidden="true"`; o resto vai para `itens`, e só
`itens` é clonado e medido.

A marca é o `data-mel-excedente`, **nunca a posição** — `:nth-child(10)`
quebraria no dia em que entrar o décimo produto.

A limpeza acontece **antes** da saída por `prefers-reduced-motion`, de
propósito: ali não há clone nem animação, mas o vão continuaria ocupando lugar.
Isso também é o que faz a segunda raiz (a variante com 9 slots, todos
excedentes) ser limpa — nela `itens` fica vazio e a função sai logo depois.

### Medições — antes e depois

`<ul>` ativo da home, nos três breakpoints (números idênticos em 1440×900,
768×1024 e 390×844):

| | antes | depois |
|---|---|---|
| `<li>` no `<ul>` | 20 (10 + 10 clones) | **19** (10 + 9 clones) |
| `<li>` visíveis | 19 | **18** (9 reais + 9 clones) |
| excedentes clonados | **1** | **0** |
| caixa do `<li>` excedente | 252 × 0 px | **0 × 0** |
| largura residual somada | **504 px** | **0 px** |
| largura do ciclo | 2720 px | **2448 px** (9 × 272) |
| emenda (1º clone − 1º original) | 2720 | **2448 = largura do ciclo** |

A emenda bater com a largura do ciclo é o que garante que o clone cai
exatamente onde o original estava: **loop sem salto**, agora sem o vão.

Com `prefers-reduced-motion: reduce`, nos três breakpoints: **10 `<li>`, nenhum
clone, 9 visíveis, excedente com caixa 0 × 0**.

### Testes executados

- `node --check` em `tools/hero-carrossel.js` e `melcam/interacoes.js` — válidos;
  a geração passa por `new Function(src)` antes de gravar.
- Sonda CDP no `<ul>`, medindo `getBoundingClientRect()` de cada `<li>` —
  não só contagem de DOM.
- Movimento normal × 3 breakpoints; `prefers-reduced-motion` × 3 breakpoints.
- Varredura de **7 rotas × 3 breakpoints** (o `Header Grid` existe nas internas):
  em todas, **2 tickers, 28 `<li>`, 18 visíveis, 10 excedentes com caixa 0 e
  largura somada 0 px, 0 focáveis dentro deles, 0 erros de console**, 1 `<h1>`
  por página, 0 imagens quebradas. Alturas idênticas às da medição anterior —
  nenhuma regressão.
- Links dos 9 reais conferidos: 7 × `/polen` + 2 × `/bee`, que são as 7 cores da
  Polen e as 2 Bee.
- `data-framer-appear-id="zfsne5"`: 18 no ticker (9 + 9 clones) e 28 na página,
  contando os 10 excedentes preservados.

### Divergência restante

Nenhuma no ticker. Fica registrado, como observação e não como defeito, que a
segunda variante SSR de `Our products` carrega 9 slots todos excedentes — é
estrutura do template, e agora ela também sai do fluxo.

### Complemento — arrastar o ticker com o mouse (13/08/2026)

Pedido no mesmo lote. **Estritamente aditivo:** aparência, medidas,
espaçamentos, ritmo de 40 px/s, sentido, links, hover, foco e `reduced-motion`
ficam byte a byte o que eram. Não há nenhuma indicação visual de que o ticker é
arrastável — a única mudança perceptível acontece durante o gesto.

#### Como funciona

Tudo dentro do `iniciarTicker()` já existente, em `tools/hero-carrossel.js`;
`melcam/interacoes.js` regerado a partir dele.

- **Só mouse.** `pointerdown` sai fora se `pointerType !== 'mouse'` ou se não for
  o botão principal. Quem arrasta com o dedo espera rolar a página, e sequestrar
  isso quebraria a rolagem vertical. Por isso também **não existe `touch-action`
  nenhum** aqui: no celular o comportamento é o de antes.
- **Limiar de 6 px** separa clique de arrasto. Abaixo dele nada acontece.
- **Pointer capture** ao cruzar o limiar, com `try/catch` — se o navegador não
  tiver, o arrasto segue sem ele.
- **Um transform só.** O ponteiro escreve no **mesmo `x`** da animação. Durante o
  gesto o `passo()` fica parado por um flag, e quem pinta é o `pointermove`; ao
  soltar, o `passo()` retoma **do `x` que ficou**. Não há segundo transform nem
  volta à posição anterior.
- **Normalização** a cada movimento: `x = x % largura; if (x > 0) x -= largura;`
  traz `x` para `(-largura, 0]`. O conteúdo se repete a cada `largura`, então é a
  mesma emenda que a animação usa — sem isso, arrastar para a direita levaria
  `x` acima de 0 e apareceria borda vazia.
- **`largura` continua saindo só dos 9 produtos reais** — o slot
  `[data-mel-excedente="1"]` já saiu de `itens` na correção acima.
- **Proteção do link:** depois de um arrasto real, um ouvinte de `click` em fase
  de captura engole **aquele** clique e se remove. Um `setTimeout` de 300 ms é a
  rede de segurança para quando o gesto termina fora de um link e clique nenhum
  chega — senão o ouvinte ficaria armado e comeria o próximo clique bom. Não há
  `preventDefault` em `pointerdown`.
- **Sem arrasto nativo:** `draggable = false` nas `img` e nas `a` do ticker.
- **Sem sujeira permanente:** `user-select:none` entra ao começar o gesto e é
  restaurado ao soltar. Em repouso o `style` do `<ul>` fica vazio.
- Sem inércia, sem setas, sem scrollbar — nada disso foi pedido nesta tarefa.

#### Validação — mouse dirigido por CDP, nos três breakpoints

| | 1440×900 | 768×1024 | 390×844 |
|---|---|---|---|
| curso arrastado | 1320 px | 648 px | 270 px |
| Δx para a **esquerda** | **−1320,0** | **−648,0** | **−270,7** |
| Δx para a **direita** | **+1320,0** | **+648,0** | **+270,0** |
| salto ao soltar | **0,0 px** | **0,0 px** | **0,0 px** |
| retoma ao sair do hover | 33,3 px/0,8 s | 32,6 px/0,8 s | 33,3 px/0,8 s |
| `x` em `(−2448, 0]` | sim | sim | sim |
| clique curto abre o link | `/` → `/polen` | `/` → `/polen` | `/` → `/polen` |
| arrasto sobre o card **não** abre | ok | ok | ok |
| clique **depois** do arrasto volta a abrir | `/polen` | `/polen` | (ver nota) |
| scroll vertical sobre o ticker | 3519→3919 | 6148→6548 | 4141→4541 |
| excedente ao final | 0 × 0 | 0 × 0 | 0 × 0 |
| erros de console | 0 | 0 | 0 |

Os 40 px/s conferem: ~33 px em 0,8 s. E o `Δ` bate com o curso do mouse ao
décimo de pixel, nos dois sentidos.

**Toque**, com `hasTouch` ligado nos três breakpoints: um arrasto de 200 px por
`touchStart/touchMove/touchEnd` move `x` em **~25 px**, que é exatamente a
deriva da própria animação no tempo decorrido. O toque **não** arrasta o
ticker — comportamento anterior preservado.

**`prefers-reduced-motion: reduce`**, nos três: 10 `<li>`, **0 clones**,
excedente 0 × 0, `transform` estático do template. Os ouvintes de arrasto nem
chegam a ser instalados, porque a função retorna antes deles.

**7 rotas × 3 breakpoints** depois do complemento: 2 tickers, 28 `<li>`,
18 visíveis, 10 excedentes com caixa 0 e largura somada 0 px, 0 focáveis dentro
deles, 1 `<h1>` por página, 0 imagens quebradas, **0 erros de console**, alturas
idênticas às da varredura anterior.

`node --check` passa em `tools/hero-carrossel.js` e `melcam/interacoes.js`.

#### Duas notas honestas

1. **O arrasto começa ao pressionar sobre a fileira, não sobre o respiro lateral
   da seção.** Descoberto medindo: em 390 px, `x = 360` cai em
   `DIV.framer-v6zu36`, fora do `<ul>`, e o `pointerdown` não chega ao ticker.
   Os ouvintes estão no `<ul>` de propósito — pendurá-los na seção inteira faria
   o título e as margens virarem alça de arrasto. Fica registrado como
   comportamento, não como defeito.
2. **Em 390 px o teste "clique depois do arrasto" não rodou:** depois de
   arrastar, nenhum card ficou inteiro dentro da viewport de 390 px, e a sonda
   exige um alvo inteiramente visível para clicar com segurança. O caso está
   provado em 1440 e 768, e o mecanismo não depende da largura da tela.

#### Armadilha reencontrada

Escrever crase em comentário dentro do `js()` **quebra o build** — o JS inteiro
mora num template literal e a crase fecha a string. Já estava anotado para o CSS
em `tools/identidade.js`; agora vale para os dois. Custou dois `SyntaxError`
antes de a guarda `new Function(src)` pegar, que é justamente para isso.

---

## 🏷️ A ETIQUETA SAIU DOS CARDS DA COLMÉIA — 13/08/2026

Pedido: tirar `[USUÁRIO E CIDADE A CONFIRMAR]` de dentro dos cards de "Memórias
da Colméia".

### O que saiu

O `<figcaption class="mel-com-cap">` de cada uma das 8 fotos — uma tarja com
gradiente que aparecia no hover (e sempre visível no mobile, onde hover não
existe). **8 legendas × 7 páginas = 56 nós removidos.**

De quebra some um `<figcaption>` que vivia **fora de um `<figure>`**: o card
sempre foi `<li>`, nunca `<figure>`, então o markup era inválido.

### O que NÃO saiu, de propósito

**A pendência continua declarada no site.** A nota ao pé da seção segue dizendo,
palavra por palavra:

> 8 de 16 a 20 fotos previstas no briefing. As demais, e a identificação de cada
> autor, estão **a decidir**.

O que saiu foi a etiqueta repetida oito vezes por cima das fotos, não o aviso de
que falta dado. Isso mantém a regra que rege o projeto desde o começo: nada de
usuário ou cidade inventado, e nada de pendência escondida.

### Arquivos alterados

| arquivo | o que mudou |
|---|---|
| `tools/comunidade.js` | o `<figcaption>` sai do gerador; as regras `.mel-com-cap` (base e media query) saem junto |
| `melcam/identidade.css` | as mesmas regras, no CSS já emitido |
| as 7 páginas | 8 `<figcaption>` removidos em cada |

A remoção nas páginas passou por guarda: só grava se sumirem exatamente 8
legendas **e** as contagens de `<div>`, `<li>`, `<img>` e `<section>` ficarem
idênticas. Nas 7, todas as condições bateram.

### Conferido

| | 1440×900 | 768×1024 | 390×844 |
|---|---|---|---|
| fotos na grade | 8 | 8 | 8 |
| caixa de cada foto | 339×339 | 364×364 | 175×175 |
| altura da seção | 1114 | 1803 | 1009 |
| `<figcaption>` | **0** | **0** | **0** |
| `.mel-com-cap` no DOM | **0** | **0** | **0** |
| texto "CONFIRMAR" na seção | **não** | **não** | **não** |
| imagens quebradas | 0 | 0 | 0 |
| erros de console | 0 | 0 | 0 |

Alturas idênticas às de antes da mudança — a legenda era sobreposta, não
ocupava fluxo, então nada se moveu.

`grep` nas 7 páginas: **0** ocorrências de `figcaption` e de `CONFIRMAR`.
CSS com 249/249 chaves, e `.mel-com-cap` não aparece mais em nenhum seletor —
só no comentário que registra a saída.

Captura em `medidas/colmeia-sem-etiqueta.png`.

---

## 🎞️ BLOCO POLEN DA HOME — 13/08/2026

### Pedido

Aprimorar o bloco da home que apresenta a Polen e leva para `/polen`, com o
argumento **escolha** (7 cores), sem redesenhar a LP.

### Interpretação adotada

O bloco não foi reconstruído. Ele já existia, já era link e já tinha moldura em
papel e régua de 7 pontos. Faltavam quatro coisas concretas do pedido do
cliente: o conceito aprovado como título, as cores em **produto** (havia só
pontos abstratos), o **preço real** e um **CTA**. A mudança entrega exatamente
isso, dentro do `<a>` que já existe.

### Estrutura anterior — o que a inspeção achou

```
<a data-framer-name="Polen" href="/polen">      ← já era link, 0 links aninhados
  <div RichTextContainer><h3>Polen</h3></div>
  <div>…<p>Sem telas, sem distrações…</p></div>  ← DUAS vezes, uma por variante SSR
  <img src="/melcam/img/card-polen.jpg">
</a>
```

- **8** nós com `data-framer-name="Polen"` por página: **4 `<a>`** (dois cards —
  um grande com parágrafo e um pequeno só com título — cada um em duas variantes
  de breakpoint) e 4 rótulos de rich text. **2 `<a>` visíveis** por vez.
- Fonte do texto: `tools/aplicar.js`. Da imagem: `tools/imagens.js` (por hash).
  Do preço e das cores: `melcam.config.json > produtos.polen`. Do CSS:
  `tools/identidade.js`.
- **A estrutura é compartilhada com as internas** — o Header Grid ficou lá por
  decisão de 13/08. Por isso tudo é escopado em `body:not(.mel-interna)`, e a
  ferramenta escreve **só em `index.html`**.

⚠️ **`tools/aplicar.js` não foi executado**: ele reconstrói o site a partir de
`_ORIGINAL/` e apagaria `grade.js`, `mover-secoes.js`,
`mover-conteudo-interno.js`, a animação da fileira e o resto de 12–13/08. A
mudança entra por ferramenta estreita, como `grade.js` já faz.

### Decisão de design

| | |
|---|---|
| eyebrow | **Polen**, em mel, fora do fluxo no canto superior — espelha a posição do selo da Bee, mas **sem pílula**: lá o argumento é novidade e pede etiqueta; aqui é escolha e pede rótulo seco |
| título | **7 cores. Uma decisão.** no `<h3>` que já existia |
| cores | **7 miniaturas dos packshots oficiais**, de `produtos.polen.cores`. Cada uma é a câmera sobre o próprio fundo de cor: mostra produto e cor ao mesmo tempo, e é asset oficial, não amostra inventada |
| preço | **R$ 399,00**, em Iowan, direto do config |
| CTA | **Escolha sua Polen**, em mel e sublinhado — **`<span>`, não `<a>`**: o bloco inteiro já é o link |

Os 7 pontos em CSS **saem apenas onde a miniatura entra** (`:has(.mel-polen-tira)`).
Dois indicadores da mesma coisa seria ruído. No card pequeno e nas internas a
régua continua valendo.

Nenhuma cor, fonte, sombra, gradiente decorativo ou ícone novo. O único gradiente
é o scrim atrás do preço e do CTA, e ele é **funcional**: é o que garante
contraste sobre a foto.

### Assets — escolhidos vendo, não pelo nome

- `melcam/img/polen/polen-{amarela,branca,coral,marrom,preto,rosa,verde}.png` —
  800×800, câmera frontal sobre fundo da própria cor com padrão de favo.
  **Escolhidos.**
- `polen-conjunto.png` — **descartado**: não é o conjunto das sete, é um "o que
  vem na caixa" com o texto *"CABO USB-C E CARTÃO SD INCLUSOS"* chapado na
  imagem. O briefing manda não criar essa seção, e texto dentro de imagem não é
  aceitável.
- `card-polen.jpg` — **mantido** como foto principal do card. É macro de couro
  marrom, muito retrô e coerente com a linguagem do site. A história de cor fica
  com as miniaturas.

### Arquivos alterados

| arquivo | o quê |
|---|---|
| `tools/bloco-polen.js` | **novo** — a ferramenta, idempotente, com guardas |
| `tools/identidade.js` | CSS do bloco (fonte) |
| `melcam/identidade.css` | o mesmo CSS, sincronizado no build |
| `index.html` | 2 variantes do card grande enriquecidas |

Guardas da ferramenta antes de gravar: `<a>` e `<section>` inalterados, exatamente
`+1 div` e `+7 img` por variante, e balanço de `<div>` preservado. Se qualquer
uma falhar, não grava.

### Duas correções durante a implementação

1. **Tira em fluxo dava 0×0 no desktop.** O card tem **altura fixa** e o packshot
   sangra em `absolute`. Conteúdo novo em fluxo era simplesmente cortado — a
   altura da página não mudava um pixel. Passou para `position:absolute` no
   rodapé do card, o lugar que a régua já ocupava.
2. **Pendurei a tira no container do parágrafo, que tem duas variantes SSR.**
   Peguei a que fica oculta no desktop: 0×0 em 1440, 27×27 em 768 e 390. Passou a
   ser **filho direto do `<a>`**, fora de qualquer variante.

### 🟡 Divergência declarada — o parágrafo saiu deste card

O pedido incluía "texto curto ligado à fotografia intencional e à experiência sem
tela". **Não coube.** O card mede 437×486 no desktop, com altura fixa. Com
eyebrow + título de duas linhas + tira, o parágrafo em fluxo era cortado; com o
eyebrow fora do fluxo, ele reaparecia **atrás da foto**, ilegível. Entregar texto
por baixo de imagem é pior do que não entregar, então ele foi suprimido nesse
card, com a regra escopada e comentada.

O recado continua na home, no subtítulo logo acima da grade: *"Câmeras digitais
retrô da Melcam. Fotografia intencional, filtros vintage embutidos e menos
distração."* Trazer o parágrafo de volta exige mexer na **altura do card**, que é
estrutura do template — decisão que não cabia nesta tarefa. Fica para revisão.

### Comportamento responsivo e medições

Geometria **idêntica** antes e depois, nos três breakpoints — a tira é absoluta e
não empurra nada:

| | 1440×900 | 768×1024 | 390×844 |
|---|---|---|---|
| card grande | 437×486 (=) | 720×802 (=) | 342×381 (=) |
| topo → fim do card | 2086→2572 (=) | 1960→2762 (=) | 1753→2134 (=) |
| Header Grid | 1440×1094 (=) | 768×3509 (=) | 390×2245 (=) |
| foto | 394×394 `cover` (=) | 706×706 (=) | 290×290 (=) |
| altura da página | 7745 (=) | 12584 (=) | 9844 (=) |
| overflow horizontal | não | não | não |

Mobile: uma coluna, foto acima da tira, CTA acionável, 7 miniaturas legíveis a
1,7 rem, nada inacessível na horizontal.

### Testes

- 3 breakpoints na home, com captura: `tools/shots/polen-final-*.png`.
- `/polen` conferida nos 3: título ainda **"POLEN"**, parágrafo presente, sem
  tira, card 437×486, página 9740 — **as internas não mudaram em nada**.
- 1 `<h1>` por página · **0 links aninhados** dentro do card · 0 imagens
  quebradas · nenhum asset remoto novo (as 7 miniaturas são locais) ·
  **0 erros de console** nos 3 breakpoints.
- CSS 268/268 chaves; `tools/identidade.js` carrega sem erro.
- Bee, Acessórios, Sobre Nós, ticker, navbar e rodapé: intocados — nenhum
  seletor novo os alcança, e a geometria da grade não mudou.

---

## 🧩 IMAGEM PARTIDA NOS CARDS POLEN E SOBRE NÓS — 13/08/2026

### Sintoma

Na grade sob "A câmera que vive com você", as fotos de **Polen** e **Sobre Nós**
apareciam partidas: iam até a metade do card e continuavam do outro lado. Bee e
Acessórios, não.

### Causa confirmada — e NÃO era CSS

O card "Sobre Nós" do template tem **dois slots de imagem**, cada um num wrapper
absoluto que sangra para fora do card — um pela borda de cima, outro pela de
baixo. Medido no desktop, card em `953,2086 437x782`:

| wrapper | retângulo | arquivo |
|---|---|---|
| A | 953,**1860** 437×437 | community-03.jpg |
| B | 953,**2658** 437×437 | community-03.jpg — **a mesma** |

O `overflow:hidden` do card corta os dois: sobra o pé de uma no topo e a cabeça
da outra embaixo. A sonda devolveu `mesmaImagemDuasVezes: true`.

**A raiz é a atribuição de asset, não o layout.** `tools/imagens.js` troca por
**hash** do arquivo remoto, e os dois slots do template usam o **mesmo hash**
(`E60m9ySte60CtImTqU`). A troca fez o correto; quem repete é o template. Idem na
Polen: `card-polen.jpg` atendia **3 slots**, e dois deles caem em cards vizinhos
separados por 15 px — que também lê como uma imagem partida.

**Por que Bee e Acessórios escapam:** cada um tem **um** slot visível
(`img 1/1 | wrapper 1/1`). Não há segundo slot para repetir.

Descartados por medição, não por suposição: `clip-path` e `mask` = none;
`overflow` do card = hidden; `position` = relative; `object-fit` = cover;
`object-position` = 50% 50%; nenhum `background-image` CSS; nenhuma
`.ssr-variant` visível duplicada; bitmaps íntegros, sem imagem duplicada dentro
do próprio arquivo. O CSS estava certo o tempo todo — inclusive as regras novas
do bloco Polen, que não têm relação com o defeito.

### Correção

`tools/desduplicar-cards.js` (novo): dá asset próprio ao 2º slot de cada card. É
troca de `src`, `srcset` e `alt` — nada de CSS, layout, tamanho, posição, texto,
link, hover ou ticker. `tools/imagens.js` ganhou a nota da causa no topo, para
que um rebuild não recrie o defeito.

| card | 1º slot | 2º slot |
|---|---|---|
| Sobre Nós | community-03.jpg | **community-05.jpg** |
| Polen (card pequeno) | — | **header-fileira/polen-lp-1.jpg** |

Aplicado nas 7 páginas: o Header Grid vive nas internas por decisão de 13/08, e
o mesmo defeito estava lá. A correção é troca de asset, então não altera nada
da estrutura delas.

### Um erro meu, corrigido

A primeira regra era "o card de índice 0 mantém a foto". Errado: são 4 `<a>` —
dois cards × duas variantes de breakpoint. Em 1440 os visíveis são [0] e [1]; em
768 e 390, [2] e [3]. A regra salvou o card grande só no desktop e trocou a foto
dele nos outros dois. Passou a distinguir pelo **parágrafo**: o card grande tem,
o pequeno não. A ferramenta repara sozinha se o card grande estiver trocado.

### Medições — geometria externa idêntica

| | 1440×900 | 768×1024 | 390×844 |
|---|---|---|---|
| Polen (grande) | 437×486 (=) | 720×802 (=) | 342×381 (=) |
| Polen (pequeno) | 437×280 (=) | 720×462 (=) | 342×220 (=) |
| Sobre Nós | 437×782 (=) | 720×620 (=) | 342×620 (=) |
| Bee | 437×280 (=) | 720×462 (=) | 342×220 (=) |
| mesma imagem 2× | **false** | **false** | **false** |
| altura da página | 7745 (=) | 12584 (=) | 9844 (=) |

### Sem regressão

7 rotas × 3 breakpoints: 1 `<h1>` por página, **0 imagens quebradas**, **0 erros
de console**, ticker com 28 `<li>` / 18 visíveis / excedentes com caixa 0,
alturas idênticas às da varredura anterior. A tira da Polen (eyebrow, "7 cores.
Uma decisão.", 7 miniaturas, R$ 399,00, CTA) segue íntegra e o card inteiro
clicável. A correção é de asset, então independe de `prefers-reduced-motion`.

Capturas em `medidas/cards-antes-1440.png`, `cards-depois-1440.png` e
`cards-depois-390.png`.

### Complemento — as duas fotos do Sobre Nós trocadas (13/08/2026)

Pedido: assets mais condizentes com o card. As de `comunidade/` são paisagem de
viagem — assunto da **Colméia** ("por onde a Melcam passou"), não de quem faz a
marca.

| slot | era | virou | por quê |
|---|---|---|---|
| superior | community-05 (fitas coloridas) | **header-fileira/bee-lp-06.jpg** | pessoa segurando a Bee **nas cores do Brasil**, com "MELCAM · Bee" legível — diz "marca brasileira" na imagem |
| inferior | community-03 | **header-fileira/bee-lp-1237.jpg** | pessoa **fotografando** à beira-mar — fotografia intencional e comunidade |

Par sem redundância: uma mostra a marca, a outra a prática. As duas em
**1600×2400**, cobrem 437×437 em tela 2× com folga.

`lifestyle/*` foi descartada por **resolução**: 600×800 não cobre 2× num slot de
437 px. Decisão por medição, não por gosto.

**Enquadramento.** Os slots são quadrados e as fotos 2:3, então o `cover` corta
uma faixa. Com o padrão `50% 50%` a faixa caía no meio e o card — que só revela a
parte de baixo do wrapper sangrado — mostrava dedo e boca, com a câmera fora.
Corrigido para `object-position:50% 18%`, ancorado em
`a[data-framer-name="Sobre Nós"] img`, que **não alcança a fileira do hero**,
onde as mesmas duas fotos aparecem com `center` por spec.

Precisou de `!important`: o template traz `object-position` **inline** no `<img>`,
e inline vence folha de estilo. Sem isso a regra não pegava — conferido na
medição, que continuava devolvendo `50% 50%`.

Geometria do card inalterada nos três breakpoints (437×782 · 720×620 · 342×620),
`mesma imagem 2×: false`, 0 erros de console. Captura em
`medidas/sobrenos-depois-1440.png`.

---

## 🤝 HANDOFF — fim da sessão de 13/08/2026

Outro terminal continua daqui. Nada foi commitado: **29 arquivos** entre
modificados e novos no working tree.

### Estado

Servidor local: `node serve.js` → http://localhost:3030 (estava de pé).
`melcam/identidade.css` com 269/269 chaves. 7 rotas × 3 breakpoints com
**0 erros de console** na última varredura.

### Ferramentas novas desta sessão, todas idempotentes

```
node tools/mover-conteudo-interno.js   # tira o conteúdo das internas das ssr-variant
node tools/bloco-polen.js              # eyebrow, conceito, 7 cores, preço e CTA na home
node tools/desduplicar-cards.js        # asset próprio por slot nos cards do Header Grid
require('./tools/hero-carrossel.js').js()   # regera melcam/interacoes.js
```

⚠️ **`node tools/aplicar.js` NÃO pode ser executado.** Ele reconstrói o site a
partir de `_ORIGINAL/` e apagaria tudo de 12 e 13/08: `grade.js`,
`mover-secoes.js`, `mover-conteudo-interno.js`, a animação da fileira, o arrasto
do ticker e o bloco Polen. Se precisar rodar o pipeline amplo, primeiro provar
que ele reaplica todas essas etapas.

### Regras aprendidas que valem para quem continuar

1. **Crase em comentário dentro de `js()` ou do CSS gerado quebra o build** — o
   conteúdo mora em template literal. A guarda `new Function(src)` pega antes de
   gravar; usar sempre.
2. **`\s` dentro de sonda em template literal vira `s`.** Regex ali precisa de
   `\\s`, ou usar `split`/`join`. Custou um falso alarme de "sumiram todos os s
   do site".
3. **Não usar índice de documento para separar cards.** São 4 `<a>` por produto:
   dois cards × duas variantes de breakpoint. Em 1440 os visíveis são [0] e [1];
   em 768 e 390, [2] e [3]. Separar por conteúdo (o card grande tem parágrafo).
4. **O template traz `object-position` inline no `<img>`** — regra de folha só
   vence com `!important`. Conferir na medição, não no olho.
5. **Editar sempre a fonte E o build.** `tools/*.js` é a fonte; `melcam/*.css` e
   os `.html` são derivados que não podem ser regerados em massa hoje.

### Pendências em aberto, na ordem em que eu pegaria

1. **Parágrafo do card Polen da home** — suprimido por não caber no card de
   altura fixa. Está documentado como divergência declarada; trazer de volta
   exige mexer na altura do card, que é estrutura do template.
2. **`Header Grid` nas internas** — decisão de 13/08 foi mantê-lo como navegação.
   O `Header Info` e o `Header Section` já saem de lá; o Grid continua.
3. **No celular a fileira do hero mostra só a primeira foto** — é o que o
   template faz e o que a tabela de aceite exige (`overflow:hidden`). Se o
   cliente quiser as dez acessíveis, é mudança de design, não conserto.
4. **Fase 11 do STATUS GERAL** segue pendente: validação final de contraste e
   imagem de Open Graph própria (1200×630).
5. **Domínio** ainda é `https://www.melcam.com.br` no config — trocar essa linha
   regenera robots, sitemap, canonical, OG e Schema.

### O que NÃO fazer sem pedido explícito

Commit, push ou deploy. Nada disso foi feito nesta sessão.

---

## 🧭 DUAS CÓPIAS DO PROJETO — CONSOLIDAÇÃO — 13/08/2026

Fecha um defeito que não estava no código: estava na **pasta**.

### O que estava acontecendo

Existiam duas cópias do projeto:

| | caminho | estado |
|---|---|---|
| **oficial** | `C:\Users\israe\viabetel\melcam-site` | correta, é esta |
| arquivada | `C:\Users\israe\Downloads\framer-teste` | implementação antiga da animação |

Um `node serve.js` foi iniciado **dentro da cópia arquivada**. O navegador em
`localhost:3030` passou a mostrar a fileira quebrada, e isso foi lido como
regressão do projeto — enquanto os arquivos corretos seguiam intactos aqui, sem
nunca terem sido tocados.

**O endereço `localhost` não diz de qual pasta o conteúdo veio.** Foi essa
lacuna que custou a sessão.

### Diagnóstico do servidor incorreto

`CommandLine` do processo era só `node serve.js`, sem revelar o diretório. A
prova veio por SHA-256 do conteúdo servido contra os arquivos em disco:

| arquivo | HTTP :3030 | oficial | arquivada |
|---|---|---|---|
| `melcam/interacoes.js` | `51e9b647…` | `16541796…` | **`51e9b647…`** |
| `melcam/identidade.css` | `8b097f88…` | `1d264382…` | **`8b097f88…`** |

Batia byte a byte com a cópia arquivada. O motor servido era `iniciarReveal`,
não `iniciarFileira`. Processos encerrados: **PID 32344** (porta 3030) e
**PID 41556** (porta 3031), os dois da cópia arquivada.

### Assinatura da regressão, medida

| | arquivada | oficial |
|---|---|---|
| motor | `iniciarReveal()` | `iniciarFileira()` |
| largura do grupo | `width:100%` | `width:max-content` |
| overflow | `overflow-x:auto` + `scroll-snap` | `overflow:hidden` |
| grupo | congelado em `scale(0.5)`, `translateY(150px)` | 0,5 → 1 e 150 → 0 |
| arrasto horizontal | ausente | presente |
| `melcam/interacoes.js` | 27.562 bytes | 38.073 bytes |
| `melcam/identidade.css` | 31.967 bytes | 39.212 bytes |

### Proteções adicionadas

1. **`.melcam-project.json`** na raiz oficial — marcador de identidade
   (`project`, `role`, `canonicalRoot`). **Não existe na cópia arquivada**, de
   propósito.
2. **Guarda no `serve.js`**, antes do `listen()`: exige o marcador, valida
   `project`/`role`, compara o caminho com `canonicalRoot` (case-insensitive no
   Windows) e bloqueia `SERVE_ROOT` que aponte para fora. Quem determina a raiz
   é `__dirname`, não `process.cwd()`; divergência de `cwd` vira aviso, não
   bloqueio. `SERVE_ROOT=site` dentro da raiz continua liberado. Roteamento,
   status HTTP e proteção de traversal ficaram intactos.
3. **Headers de identidade**: `X-Melcam-Project: canonical` e
   `X-Melcam-Root: melcam-site`. O caminho absoluto **não** vai no header.
4. **`tools/preflight.js`** — diagnóstico puro, sai != 0 ao reprovar. Não
   escreve arquivo nem mata processo.
5. **`tools/servir.ps1`** e **`tools/preflight.ps1`** — o caminho feliz passa
   pelo pré-voo. Não foi criado `package.json`: o projeto não tem um.
6. **`AGENTS.md`** na raiz, com a regra de raiz obrigatória e a assinatura da
   cópia arquivada.
7. **`PROJETO-ARQUIVADO-NAO-USAR.md`** dentro de
   `C:\Users\israe\Downloads\framer-teste`. **Nada foi apagado, movido ou
   sobrescrito lá** — só esse aviso foi criado, depois de confirmar que não
   existia.

Guarda testada nos dois cenários de fuga: `SERVE_ROOT=../../Downloads/framer-teste`
e cópia do `serve.js` para pasta sem marcador. As duas abortam antes de abrir a
porta.

### Comando oficial

```
cd C:\Users\israe\viabetel\melcam-site
node tools/preflight.js
node serve.js
```

### Resultado do pré-voo

```
[OK]   marcador do projeto
[OK]   raiz canônica  (C:\Users\israe\viabetel\melcam-site)
[OK]   arquivos obrigatórios
[OK]   motor iniciarFileira
[OK]   CSS da fileira
[OK]   CSS balanceado  (269/269)
[OK]   sintaxe JavaScript  (4 arquivos)
[OK]   index.html referencia CSS e JS
[OK]   servidor canônico  (x-melcam-project: canonical, x-melcam-root: melcam-site)
[OK]   conteúdo HTTP sincronizado  (SHA-256 confere)
```

### Resultado do QA — `node tools/medir.js "http://localhost:3030/" consolidado`

**0 erros de console** nos três breakpoints. Nos dez frames, nos três:
`object-fit:cover` e `aspect-ratio: 0.666667 / 1`, sem exceção.

| | grupo | frames | overflow | escala | translateY |
|---|---|---|---|---|---|
| desktop 1440×900 | 4980×720 | 480×720 | `hidden` | 0,5 → 1 | 150 → 0 |
| tablet 768×1024 | 3593×512 | 341×512 | `hidden` | 0,5 → 1 | 150 → 0 |
| mobile 390×844 | 2993×422 | 281×422 | `hidden` | 0,5 → 1 | 150 → 0 |

O transform varia nos 7 pontos de scroll (7 valores distintos de 7) — não fica
congelado. Nenhum `overflow: auto hidden`. Nenhuma largura 1392, 720 ou 342.

Comparado com `medidas/medida-melcam-13ago.json`: **idêntico valor por valor**,
incluindo o arrasto horizontal (−254,1 desktop · −158,6 tablet · −174,2 mobile).
A curva já estava conforme e **não foi tocada**.

### O que esta passagem não fez

Nenhuma alteração visual, funcional ou editorial. Nenhum arquivo copiado da
cópia arquivada para cá. Nenhuma pasta apagada. Nenhum commit.

---

## 📱 O DESFILE DA FILEIRA NO CELULAR — 13/08/2026

Fecha a pendência 3 do handoff ("no celular a fileira mostra só a primeira
foto"). A leitura de lá estava incompleta: **não era a primeira foto, era o
meio da fileira.**

### O que estava acontecendo

O grupo tem 2993px numa janela de 390. O pai (`section.framer-1da55c7`, flex
column com `align-items:center`) centralizava, então a fileira abria em
`left −1301` — no meio dela. Media: **2 frames visíveis, o da esquerda cortado
ao meio**, e o arrasto de `−1000·p` só empurrava para o fim. As fotos **1 a 4
não apareciam nunca**, em nenhuma posição de scroll.

Não lia como fileira: lia como recorte acidental.

### O que mudou

Escolha do cliente entre três opções: **começar na foto 1 e desfilar**,
mantendo o tamanho das fotos, `overflow:hidden` e sem swipe manual.

**CSS** (`tools/identidade.js` + `melcam/identidade.css`), dentro do
`@media (max-width:809.98px)` que já existia:

```css
.framer-dtlgl4{
  align-self:flex-start !important;
  transform-origin:0 50% !important;
}
```

`align-self` solta só o grupo — título e resto da coluna seguem centralizados.
`transform-origin` na borda esquerda é o **par obrigatório**: com a origem no
centro, o `scale(0.5)` da entrada puxaria a borda esquerda 748px para dentro e
a foto 1 sairia de vista justamente no começo da animação.

**Motor** (`tools/hero-carrossel.js` → `melcam/interacoes.js`, `iniciarFileira`):
abaixo de 810px o `translateX` deixa de sair do progresso da página e passa a
sair da **passagem do grupo pela janela**:

```
d = alturaJanela − (topoDoGrupo − scrollY)
q = d / (alturaJanela + alturaDoGrupo)     // 0 ao encostar embaixo, 1 ao sair por cima
x = −(larguraDoGrupo − larguraDaJanela) · q
```

Percorre exatamente o próprio transbordo enquanto cruza a tela.

### Medido

**As dez fotos aparecem**, na ordem, ao longo da passagem:

| q | 0 | 0,2 | 0,4 | 0,6 | 0,8 | 1 |
|---|---|---|---|---|---|---|
| `left` | +24 | −496 | −1016 | −1539 | −2059 | −2579 |
| fotos na tela | 1,2,3 | 3,4 | 4,5 | 6,7 | 7,8,9 | 9,10 |

Entra mostrando a foto 1 na esquerda, sai mostrando a 10 na direita.
`prefers-reduced-motion`: estático em escala 1, opacidade 1, fotos 1 e 2 — sem
desfile, como manda a preferência.

**0 erros de console** nos três breakpoints.

### ⚠️ O tablet mudou junto, e é intencional

O 768 do medidor está **abaixo de 810px**, ou seja, cai no mesmo bucket de CSS
do celular — o template tem um único breakpoint aí (`80vh` acima, `50vh`
abaixo). O mesmo defeito existia em 768: centralizado, abria em `left −1412`.

Como é o mesmo bucket e o mesmo defeito, a correção vale para os dois. Criar um
terceiro breakpoint só para separar 768 de 390 inventaria uma quebra que o
design não tem. Em 768 ficam 4 fotos na tela.

**Desktop está intacto**, conferido transform a transform contra
`medidas/medida-melcam-13ago.json`: os 7 pontos de scroll batem exatamente,
incluindo o `translateX` de −254,1.

| | grupo | overflow | escala | translateY | translateX final |
|---|---|---|---|---|---|
| desktop 1440 | 4980×720 | `hidden` | 0,5 → 1 | 150 → 0 | −254,1 (**igual à baseline**) |
| tablet 768 | 3593×512 | `hidden` | 0,5 → 1 | 150 → 0 | −2825 (era −158,6) |
| mobile 390 | 2993×422 | `hidden` | 0,5 → 1 | 150 → 0 | −2603 (era −174,2) |

A baseline aprovada **não foi sobrescrita**. A medição nova está em
`medidas/medida-desfile-mobile-13ago.json`, ao lado dela.

### Ferramenta

Entrou `tools/sonda.js` — roda uma expressão numa URL e imprime o retorno, com
viewport por env (`LARG`/`ALT`), `REDUCED=1` para emular
`prefers-reduced-motion` e captura PNG opcional. Só lê; não altera arquivo.

Nenhum commit.

---

## 🟡 NOVA ABERTURA DA /polen — HERO PREMIUM E SELEÇÃO DE CORES — 13/08/2026

### O pedido

Reconstruir a abertura da `/polen` em duas partes: um hero cinematográfico
específico da Polen e, logo abaixo, uma seção de produto com **seleção**
funcional das sete cores. Substituir os sete cards, preservar o resto da LP.

### Conceito visual, e o achado que o definiu

**Os 7 packshots são PNG 800×800 RGB SEM canal alfa.** Cada um traz o próprio
fundo já na cor da variante, com o padrão favo — não existe recorte disponível.
Descoberto abrindo os arquivos, não pelo nome.

Isso mata a composição óbvia (câmera flutuando no carvão) e entrega outra,
melhor: **o quadrado vira palco declarado**, com raio e sombra, e trocar de cor
passa a trocar a cor do palco inteiro. O seletor ganha uma consequência visual
grande sem inventar arte que não existe.

O hero usa o packshot **Preto**, cujo fundo (`#2B2B2B`, medido) é o mais próximo
do carvão `#221E17`: a cena fecha em carvão, o mel fica só no CTA e no eyebrow.
A seção de produto abre na mesma cor, então a passagem de uma para a outra não
dá salto.

Descartados: `polen-angulo.png` e `polen-conjunto.png` têm **texto embutido na
imagem** ("FLASH", "ENTRADA USB-C", "CABO USB-C E CARTÃO SD INCLUSOS") — o
briefing pede texto em HTML, não em bitmap.

### Nada de render 3D inventado

O render 3D da Polen segue em `PENDENTES` e continua não sendo inventado. A
diferença é que a página deixou de exibir a nota "animação 3D a decidir" como
espera: o hero se apoia no packshot oficial tratado como peça editorial.

### As cores dos swatches são AMOSTRADAS, não escolhidas

`tools/polen-interacoes.js` traz `corDoTile()`, que decodifica o PNG (zlib +
desfiltragem, sem dependência) e lê o pixel do canto — que é exatamente a cor
daquela variante. Se o cliente reenviar um packshot noutro tom, o swatch
acompanha sozinho.

| Amarela | Branca | Laranja | Marrom | Preta | Rosa | Verde |
|---|---|---|---|---|---|---|
| `#F4B233` | `#DADADA` | `#EF6C29` | `#5F2D0B` | `#2B2B2B` | `#FBBAB6` | `#303F1C` |

### Estrutura criada

```
barra (Produto · Filtros · FAQ)
  -> hero      data-mel="polen-hero"     eyebrow · h1 · texto · CTA único · apoio
  -> produto   data-mel="polen-produto"  palco + info + radiogroup de 7 + CTA
  -> benefícios · galeria · filtros · diferencial · FAQ · CTA final · Colméia
```

Ordem medida na página: barra 1725 · hero 1794 · produto 2604 · benefícios 3569
· galeria 3942 · filtros 4969 · specs 6317 · FAQ 6618 · CTA final 7385 ·
Colméia 7824 · rodapé 8380. **Nada duplicado, nada fora de ordem.**

O apoio do hero — `7 cores · 8 filtros · até 1000 fotos` — é derivado:
`POLEN.cores.length`, `POLEN.filtros.length` e as 1000 fotos que já estavam nas
specs e no FAQ (cartão de 4 GB). Nenhum número novo.

### Animação, medida

Entrada da câmera, amostrada desde o load:

| ms | 0 | 221 | 353 | 476 | 602 |
|---|---|---|---|---|---|
| escala | 0,956 | 0,972 | 0,990 | 0,997 | **1** |
| translateY | 16,3 | 10,4 | 3,7 | 1,0 | **0** |
| opacidade | 0,26 | 0,53 | 0,83 | 0,95 | **1** |

Curva `smoothstep` sobre 900 ms, de `scale .94 / y 22 / opacity 0`. Só
`transform` e `opacity`.

Paralaxe do scroll: 0 → **−26 px**, seis valores distintos de seis amostras, com
o hero ainda visível.

> Ajuste registrado: a primeira versão dividia o progresso por `altura + vh` e o
> paralaxe parava em −12 px de 26 — metade da faixa acontecia com o hero já fora
> da tela. Passou a dividir pela altura do próprio hero.

**Um único escritor por `transform`:** entrada (tempo) e paralaxe (scroll) se
compõem dentro de `pintar()`. `agendar()` não faz nada enquanto a entrada roda,
então nunca há dois loops de `requestAnimationFrame` ao mesmo tempo. Geometria
lida em `medir()`, fora do loop.

O stagger do texto é **animação de CSS**, não de JS, de propósito: se o script
falhar, o texto aparece do mesmo jeito. É a lição do "hero em branco". Cada peça
tem classe própria e atraso próprio — nada de `nth-child`.

### Reduced-motion

Medido nos três breakpoints com `prefers-reduced-motion: reduce`: câmera em
`matrix(1,0,0,1,0,0)` e opacidade 1 — estado final direto, sem paralaxe, sem
`display:none` em nada. O stagger do texto e o crossfade também desligam.

### Seletor das sete cores

`role="radiogroup"` com sete `role="radio"`, `aria-checked` e **roving
tabindex** (conferido: sempre exatamente 1 botão com `tabIndex 0`).

Teclado medido: `→` Rosa → Verde · `←` Rosa · `End` Verde · `Home` Amarela, com
o foco acompanhando. Enter e Espaço vêm de graça por ser `<button>`.

Troca conferida em Amarela, Verde, Rosa e Laranja: imagem, nome, subtítulo,
`alt` e `data-mel-add` atualizam juntos. **Crossfade de duas camadas com estado
explícito** — em repouso só uma tem opacidade 1, a outra fica em 0 e com
`aria-hidden`; a variável `ativo` diz qual é qual. Pré-carrega e só troca depois,
com um token `pedido` para o último clique vencer se a rede inverter a ordem.

As cores **não vivem no JavaScript**: cada botão carrega `data-nome`,
`data-sub` e `data-img`, escritos por `tools/polen.js` a partir de
`melcam.config.json`. Não há segunda lista.

Coral/Laranja continua como está no config, com a nota de divergência na
página. Não foi criada uma oitava cor.

### Sacola

Sem segundo sistema: o CTA é um `[data-mel-add]` como qualquer outro, e o que
muda é o **valor do atributo**, lido no clique por `iniciarSacola()`. Medido:
selecionar Marrom e clicar grava `[{"nome":"Polen Marrom","qtd":1}]`; depois
Branca, os dois. Recarregando em `/sacola` os dois aparecem, a R$ 399,00.

### Acessibilidade

1 `<h1>` na página · radiogroup nomeado por `aria-labelledby` · nome acessível
em cada opção por texto `sr-only` (não depende da cor) · `aria-live` polido
anunciando "Polen Laranja. Vibrante como o pôr do sol." · `alt` dinâmico com
acento · `:focus-visible` em mel · CTA e swatches com **44 px** de alvo ·
`scroll-margin-top` nas âncoras para a barra fixa não cobrir o título.

### Resultados por breakpoint

| | hero | produto @ | palco | CTA | transborda | h1 | console |
|---|---|---|---|---|---|---|---|
| desktop 1440×900 | 800 px | 2604 | 617×617 | 44 px | não | 1 | 0 |
| tablet 768×1024 | 852 px | 5057 | 480×480 | 44 px | não | 1 | 0 |
| mobile 390×844 | 779 px | 3657 | 343×343 | 44 px | não | 1 | 0 |

Zero imagem quebrada, zero `<img>` sem `alt`, 7 swatches e exatamente 1
selecionado em todos.

> Defeito corrigido no caminho: a camada B do crossfade nascia **sem `src`**, o
> que conta como imagem quebrada e pode desenhar o ícone de quebrado. Passou a
> nascer com a mesma imagem da camada A — mesmo arquivo, cache.

### QA de regressão da home

`node tools/medir.js "http://localhost:3030/" pos-polen` — **0 erros de
console**, e transform a transform **idêntico** à baseline nos três:

| | grupo | overflow | escala | translateY |
|---|---|---|---|---|
| desktop | 4980×720 | `hidden` | 0,5 → 1 | 150 → 0 |
| tablet | 3593×512 | `hidden` | 0,5 → 1 | 150 → 0 |
| mobile | 2993×422 | `hidden` | 0,5 → 1 | 150 → 0 |

`object-fit:cover` e `aspect-ratio 0.666667/1` nas dez imagens, nos três.
O `index.html` **não mudou um byte**: SHA-256 `26606fb8d572eaee` antes e depois.
`/bee` conferida: 1 `<h1>`, 2 cards, abertura intacta, zero vazamento de
`data-mel="polen-*"`.

### Arquivos

| arquivo | o que |
|---|---|
| `tools/polen-interacoes.js` | **novo** — `js()`, `css()` e `corDoTile()` |
| `tools/polen.js` | `abertura()`→`hero()`, `modelos()`→`produto()`, âncoras |
| `tools/hero-carrossel.js` | injeta o `js()` da Polen e chama os dois `iniciar*` |
| `tools/paginas.js` | injeta o `css()` da Polen no fim da folha das internas |
| `tools/qa-polen.js` | **novo** — QA da abertura nos 3 breakpoints |
| `tools/sonda.js` | `ESPERA=0` para medir animação de entrada |
| `melcam/interacoes.js` · `melcam/identidade.css` · `polen.html` | builds |

Nada foi removido do CSS: `.mel-abertura`, `.mel-cores` e `.mel-cor*`
continuam porque **`tools/bee.js` também usa** essas classes.

### Armadilha em que eu caí, para o próximo não cair

Escrevi um abre-interpolação **dentro de um comentário** do `js()` — que mora em
template literal. O `require` estourou com `Invalid or unexpected token` e o
build não foi gravado. A regra do handoff vale para comentário também, e não só
para crase.

### Pendências

1. **A barra da Polen começa em y≈1725.** Acima dela fica o `Header Grid`, que a
   decisão de 13/08 manteve nas internas como navegação. Não foi tocado, mas é
   bastante rolagem antes do hero — vale rever com o cliente.
2. **`[data-mel-contador]` não existe em nenhuma página.** `iniciarSacola()`
   atualiza esse alvo e ele nunca foi renderizado, então o contador do header
   nunca aparece. É anterior a esta passagem; criar exigiria mexer na navbar,
   fora do escopo.
3. Render 3D, imagem de Open Graph 1200×630 e domínio seguem pendentes.

Nenhum commit.

---

## 🧽 O QUE SOBRAVA DA HOME NAS INTERNAS — 13/08/2026

Pedido: tirar da página de produto o que é da home. **Reverte a decisão de
13/08** registrada em `tools/paginas.js`, que mandava não incluir estes dois na
lista sem novo pedido — o pedido veio.

### O que saiu

| bloco | altura | por quê |
|---|---|---|
| `Header Grid` | 982 px | os blocos Polen · Bee · Acessórios · Sobre Nós. Na `/polen` o bloco Polen repetia palavra por palavra o que a página diz logo abaixo: o título "7 cores. Uma decisão." é o mesmo da seção de produto e o parágrafo é o mesmo do hero. |
| `Header Grids` | 723 px | a faixa "DESTAQUES" com os cards e o ticker. É vitrine de home; numa página de produto compete com o produto. |

Somados, **1.705 px antes da barra da Polen**. A `/polen` agora abre com a
barra em y=0 e o hero em y=69.

A navegação entre as linhas não se perdeu: continua na navbar e no rodapé, os
dois presentes em todas as páginas.

### Como

Duas entradas em `SO_HOME` (`tools/paginas.js`), o mesmo mecanismo das outras:
`body.mel-interna <sel>{ display:none }`. **Nada é recortado do DOM.** Sincronizado
à mão em `melcam/identidade.css`, que não pode ser regerado em massa.

Vale para as **seis internas**, não só a `/polen` — é o mesmo defeito na mesma
posição, e corrigir só uma deixaria as outras cinco divergentes.

### Guarda nova no ticker

`iniciarTicker()` agora sai cedo quando o elemento não está sendo renderizado
(`offsetParent` nulo). Sem isso ele media larguras de 0 e mantinha um
`requestAnimationFrame` vivo movendo uma fileira invisível, em cinco páginas.

### Conferido

| rota | primeiro bloco | altura | sobrou da home | h1 | transborda |
|---|---|---|---|---|---|
| `/polen` | `mel-barra` | 6.635 | 0 | 1 | não |
| `/bee` | `mel-barra` | 4.759 | 0 | 1 | não |
| `/acessorios` | `mel-sec` | 1.304 | 0 | 1 | não |
| `/sobre` | `mel-sec` | 2.099 | 0 | 1 | não |
| `/sacola` | `mel-sec` | 1.060 | 0 | 1 | não |
| `/404` | `mel-sec` | 900 | 0 | 1 | não |

**Home intacta:** `index.html` com o mesmo SHA-256 (`26606fb8d572eaee`), os dois
`Header Grid` e o `Header Grids` continuam visíveis lá, e o ticker segue andando
(transform mudou entre duas amostras). Medição da fileira **idêntica à baseline**
nos três breakpoints, 0 erros de console.

Nenhum commit.

---

## 🎬 HERO DA /polen, SEGUNDA VERSÃO — REFERÊNCIA VISUAL — 13/08/2026

### Referência e interpretação

Captura enviada pelo cliente: fundo escuro, texto editorial à esquerda,
fotografia grande da Polen na embalagem à direita, colagem de fotos criando
profundidade, CTA em mel.

Seguida na composição. **Três coisas foram deliberadamente diferentes**, porque
a referência era mockup e não peça final:

| na referência | aqui | por quê |
|---|---|---|
| eyebrow "A CLÁSSICA" | `POLEN` | "clássica" não está comprovado em documento nenhum do projeto |
| CTA "COMPRAR AGORA" | `ESCOLHA SUA COR` | o próximo passo real é escolher a variante, não comprar |
| botão "REPETIR ANIMAÇÃO" | não existe | é controle de desenvolvimento, não de interface |

### Copy final

- Eyebrow: **POLEN**
- Título: **A _Polen_ guarda as que importam.**
- Texto: "Sem tela para conferir, apagar ou repetir. Você fotografa o momento e
  segue vivendo. O resto você descobre depois."
- CTA: **ESCOLHA SUA COR** → `#produto`
- Apoio: `7 cores · 8 filtros · até 1000 fotos` — derivado de
  `POLEN.cores.length`, `POLEN.filtros.length` e das specs/FAQ da página.

A palavra "Polen" no título sai em **Brooklyn Heritage**, que o
`melcam.config.json` declara como "assinatura Polen". É o único lugar da página
onde ela entra — exatamente o papel documentado.

### Assets, todos abertos antes de escolher

**Principal:** `header-fileira/polen-lp-1.jpg`, 1600×2400 — a Polen preta dentro
da caixa oficial em mel, com padrão favo e etiqueta "Polen". É a única foto do
acervo que mostra produto **e** marca na mesma cena, e o mel da embalagem
entrega o acento da identidade sem enfeite nenhum. `object-position:50% 46%`
escolhido por medição: a câmera ocupa de ~25% a ~67% da altura do arquivo e o
recorte tira ~200px de topo e base, então ela nunca é cortada.

**Colagem, 4 camadas:** `galeria-polen/` 07 (arquitetura escura), 01 (pôr do sol),
02 (praia em P&B), 05 (pessoa usando a Polen). São fotos **feitas com** a Polen
— o fundo do hero passa a ser a memória que a câmera guardou, não textura.
Rotações entre −3,2° e +3,6°, escalas diferentes, opacidade de .20 a .34.

Descartados: `polen-angulo.png` e `polen-conjunto.png` têm texto embutido no
bitmap.

### Composição

Quatro camadas: colagem (z0) · foto (z1) · scrim (z2) · texto (z3).

A borda esquerda da foto é dissolvida por **máscara**, não só escurecida: o
scrim sozinho deixava a emenda como linha reta. A máscara faz a fotografia
virar carvão de verdade, que é o que a referência mostra.

Desktop: foto ocupa 52% à direita, colagem entre 22% e 62%, texto em
`min(46%, 30rem)`. Tablet: colagem cai para 2 camadas. Mobile: uma coluna,
**texto primeiro**, foto abaixo em 1:1 com máscara no topo.

### Animação

Entrada só em **CSS**, com `both`: roda sozinha e termina no estado final mesmo
se o script não carregar — a lição do "hero em branco". Duração total ~1.060 ms.

| peça | de | duração · atraso |
|---|---|---|
| foto | `opacity 0` · `scale 1.04` · `translateX 18px` | 1000 ms · 0 |
| colagem (4) | `opacity 0` · `scale .94` | 760 ms · 120/200/280/360 ms |
| texto (5) | `opacity 0` · `translateY 16px` | 620 ms · 60/150/250/340/420 ms |

Ao JS sobrou só: paralaxe discreto (foto −18px, colagem −34px, velocidades
diferentes) e a rolagem suave do CTA. Geometria lida fora do loop, um escritor
de `transform` por elemento, um único `requestAnimationFrame`. Medido depois de
assentar: **0 animações em execução**.

Reduced-motion: todas as `animation` desligadas, sem paralaxe, rolagem do CTA
instantânea. Conferido nos três breakpoints — estado final, sem mudança de
layout.

### 🔴 O QUE ESTE HERO DESENTERROU

Ao subir para o topo da página, ele revelou **dois restos da home** que estavam
escondidos atrás do `Header Grid` e que ninguém tinha visto:

1. **`[data-framer-name="Shadow"]`** — faixa de 1440×900 com gradiente até
   `#0d0d0d` e `z-index:1`. Não é filha de "The first section", é elemento de
   topo, então nenhuma regra anterior a alcançava. Como tinha z maior que o
   hero, **lavava o título, o parágrafo e o CTA** — o mel do botão renderizava
   como oliva. Levou três medições para achar: os estilos computados estavam
   todos corretos e o `elementFromPoint` não a via, porque ela tem
   `pointer-events:none`.
2. **O vídeo do hero da home**, num container `position:fixed` de 1440×900,
   **baixando e tocando os 5 MB em toda página interna**, atrás do conteúdo.
   Medido: `paused=false` na `/polen`.

Os dois entraram no `SO_HOME`. O container do vídeo não tem `data-framer-name`,
só classe hasheada, então foi ancorado em `:has(> video[data-mel="hero-video"])`.
`iniciarTicker` e o autoplay ganharam guarda de "não está sendo renderizado" —
esconder por CSS não impede o play, só o `pause()` impede.

### Resultados por breakpoint

| | hero | produto @ | CTA | transborda | h1 | quebradas | console |
|---|---|---|---|---|---|---|---|
| 1440×900 | 828 px | 907 | 44 px | não | 1 | 0 | 0 |
| 768×1024 | 1103 px | 1178 | 44 px | não | 1 | 0 | 0 |
| 390×844 | 777 px | 852 | 44 px | não | 1 | 0 | 0 |

No mobile o hero cabe numa tela (777 de 844) e o seletor começa em 852.

Conferido: "A clássica" não aparece · não há botão de repetir animação · CTA
aponta para `#produto` e rola até lá · rodapé abaixo de tudo.

> Dois defeitos corrigidos no caminho: perdi o campo `corInicial` ao reescrever
> o objeto `HERO`, e nenhum swatch nascia marcado; e no mobile a foto virou
> item de flex, onde `min-height:auto` fazia a altura natural da imagem (585px)
> vencer o `aspect-ratio` e abrir um vão.

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-hero-polen` — **0 erros de
console** e transform a transform **idêntico à baseline** nos três:
desktop 4980×720 · tablet 3593×512 · mobile 2993×422, `overflow:hidden`,
escala 0,5→1, translateY 150→0. `index.html` com o mesmo SHA-256
(`26606fb8d572eaee`).

### Arquivos

`tools/polen.js` (markup e escolha de assets) · `tools/polen-interacoes.js`
(CSS e comportamento) · `tools/paginas.js` (SO_HOME) ·
`tools/hero-carrossel.js` (guarda do autoplay) · `tools/qa-polen.js` (sonda
apontada para o alvo novo) · builds `polen.html`, `melcam/identidade.css`,
`melcam/interacoes.js`.

Nenhum commit.

---

## 🔧 REFINO DO HERO DA /polen — 13/08/2026

Sete correções pedidas a partir de captura do cliente. A ideia, a fotografia, o
copy, o CTA e a animação foram preservados — nada foi reconstruído.

### 1. A barra fixa da Polen saiu

Era a faixa sticky com Polen · Produto · Filtros · FAQ · preço · Comprar.
Removida **na fonte** (`tools/polen.js`): saiu de `conteudo()`, do `module.exports`
e a própria função foi apagada.

Duas razões, as duas visíveis na captura: ela criava uma segunda barra logo
abaixo da navbar principal, e o CTA "Comprar" competia com o "Escolha sua cor"
do hero, que é o próximo passo certo.

- **A Bee não foi afetada:** ela tem a própria `barra()` em `tools/bee.js`.
  Conferido: `mel-barra` aparece 0 vezes em `polen.html` e 5 em `bee.html`.
- O CSS `.mel-barra` em `tools/paginas.js` **fica**, porque é a Bee quem usa.
- Nenhum link órfão: `#produto` segue sendo destino do CTA do hero e do CTA
  final; `#filtros` e `#faq` continuam existindo como seções.
- `tools/mover-conteudo-interno.js` tinha a barra como âncora da `polen.html`;
  passou a ancorar no hero, que é o primeiro bloco agora.
- `scroll-margin-top` das âncoras caiu de `clamp(72px,9vw,96px)` para `96px`
  fixo — o único elemento que pode cobrir uma âncora agora é a navbar, medida
  em 81px.

### 2. Hero em largura cheia

Antes: 983px dentro de uma janela de 1440, com calhas pretas de 228px de cada
lado. Agora: **0 a 1440**, medido.

A sangria é calculada em JS, não em CSS:

```
largura = document.documentElement.clientWidth   /* NAO inclui a scrollbar */
margemEsquerda = -hero.getBoundingClientRect().left
```

`100vw` seria errado: inclui a barra de rolagem e criaria transbordo
horizontal. Sem JS o hero fica na largura do container — mais estreito, nunca
quebrado.

> Defeito corrigido no caminho: eu media a posição **antes** de aplicar a
> largura. O pai é flex column com `align-items:center`, então alargar o filho
> já o recentra sozinho — medir antes deslocava em dobro. Dava `-195..1245`.
> A largura vai primeiro, a medição depois.

### 3. Quebra do título

De três linhas ("A Polen / guarda as / que importam.") para **duas**:
**"A Polen guarda as / que importam."**

Feito com `max-width:16ch` no título e o bloco de texto em `min(44%, 34rem)`.
A fonte não encolheu — Iowan Old Style em `clamp(2.2rem, 4.4vw, 3.6rem)`.

`text-wrap:balance` foi **removido**: ele reequilibrava as linhas e devolvia a
quebra em três.

### 4. Colagem limpa

De 4 camadas para **3 no desktop**, 2 no tablet e 2 no mobile. Saíram da faixa
do texto e foram para a zona entre o texto e a foto (47%–74%), onde parte delas
fica sob a borda mascarada da fotografia — o que lê como profundidade.

Opacidades subiram (`.42 / .34 / .28` contra `.34 / .27 / .24`): no valor
anterior elas não liam como fotografia, liam como retângulo chapado, que foi
exatamente a reclamação. Rotações discretas, entre −3° e +3,4°. Nenhuma cruza
as letras: o texto termina em 46% e a colagem começa em 46%.

### 5. Conteúdo reequilibrado

Hero de 738px no desktop (era 828), `min-height:clamp(660px, 82svh, 900px)` —
82svh de 900 dá 738, mais a navbar de 81 fecha em 819, então **cabe em
1440×900 sem scroll inicial**. Bloco de texto centralizado verticalmente pelo
`align-items:center` do hero. Parágrafo em `44ch`, mais estreito que o título.

### 6. Fotografia

Mantida. Painel de `min(52%, 940px)`, `object-position:52% 48%`, chegando à
borda direita da janela. A lente e o corpo continuam inteiros nos três
breakpoints.

### 7. Emenda com o fundo da página

O fundo abaixo do hero é `rgb(13,13,13)`, cravado em `.framer-vrbx7h` pelo
template e **não tokenizado** — por isso a correção de paleta nunca o alcançou.
O hero em carvão contra ele deixava um degrau visível.

O hero passou a dissolver no fim
(`linear-gradient(180deg, carvão 0%, carvão 88%, transparent 100%)`), o que
apaga a emenda sem cravar aqui a cor de baixo, que muda de valor no dia em que
aquele fundo for corrigido.

### Defeito do tablet, achado na validação

Em 768 o hero dava 1138px: a foto em 1:1 ocupava 768px e o scrim, dimensionado
em 58% **do hero**, crescia junto e invadia o topo dela — era a mancha escura.
Duas correções: teto em px no scrim e na colagem (`min(58%, 420px)`) e
`aspect-ratio:16/10` para a foto entre 560 e 810. Hero passou a 850px.

### Resultados por breakpoint

| | hero | produto @ | título | transborda | h1 | quebradas | console |
|---|---|---|---|---|---|---|---|
| 1440×900 | 738 px | 748 | 2 linhas | não | 1 | 0 | 0 |
| 768×1024 | 850 px | 860 | 2 linhas | não | 1 | 0 | 0 |
| 390×844 | 777 px | 787 | 2 linhas | não | 1 | 0 | 0 |

Conferido no navegador: barra da Polen ausente · navbar presente e o hero
começa em y=0, sem faixa vazia · CTA do hero rola até o seletor · seletor de
cores troca (Verde) · sacola grava `[{"nome":"Polen Verde","qtd":1}]` ·
**0 animações em execução** depois de assentar · reduced-motion em estado final
nos três.

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-refino-polen` — **0 erros de
console** e transform a transform **idêntico à baseline**: desktop 4980×720 ·
tablet 3593×512 · mobile 2993×422, `overflow:hidden`, escala 0,5→1, translateY
150→0. `index.html` com o mesmo SHA-256 (`26606fb8d572eaee`).

### Arquivos

`tools/polen.js` · `tools/polen-interacoes.js` · `tools/mover-conteudo-interno.js`
· builds `polen.html`, `melcam/identidade.css`, `melcam/interacoes.js`.

Nenhum commit.

---

## 🧹 REFINO FINAL DO HERO DA /polen — 13/08/2026

### 1. A colagem saiu inteira

Ela nunca chegou a ler como fotografia — em toda tentativa virava retângulo
escuro sobre a foto principal. Removida dos quatro lugares, não escondida:

| onde | o que saiu |
|---|---|
| `tools/polen.js` | o array `HERO.colagem`, o `map()` que gerava as camadas e a `<div class="mel-ph-colagem">` |
| `tools/polen-interacoes.js` (CSS) | `.mel-ph-colagem`, `.mel-ph-cam*`, o keyframe `melPhCam` e as sobras em tablet e mobile |
| `tools/polen-interacoes.js` (JS) | a variável `colagem`, a constante `COLAGEM_MAX` e o segundo escritor de `transform` |
| assets | o hero não referencia mais nenhuma foto da galeria |

Medido na página: **0** elementos `.mel-ph-cam` / `.mel-ph-colagem` no DOM,
**0** imagens de `galeria-polen` dentro do hero, e o hero passou a ter
**1 imagem só** — a fotografia principal. A seção "Feitas com a Polen" continua
usando a galeria normalmente; ela nunca foi tocada.

Nenhuma tentativa nova de opacidade, blur ou máscara: o pedido foi explícito, e
a fotografia principal se sustenta sozinha.

### 2. Enquadramento da câmera

Painel de `min(52%, 940px)` para `min(48%, 880px)` e `object-position` de
`52% 48%` para `50% 42%`.

O painel mais estreito **baixa a escala do `cover`**: como a fonte é 2:3 e o
painel é mais largo que alto, quem manda no fator de escala é a largura. Menos
largura, menos zoom, mais altura da foto visível. O `42%` sobe o enquadramento
para o corpo não encostar na base. Lente, flash, visor e a marca continuam
inteiros; a caixa amarela segue como contexto. A foto não mudou.

### 3. O vazio inferior

`min-height` de `clamp(660px, 82svh, 900px)` para `clamp(480px, 62svh, 700px)`.

A altura passou a ser dirigida pelo **conteúdo**, e o respiro é o padding de
`.mel-ph-in`, deliberado, em vez de sobra de `svh`. Medido em 1900×950 antes:
779px de hero para 584px de conteúdo, ou seja **195px de vazio preto**. Agora o
respiro abaixo do texto é de 87px no desktop.

| | antes | depois |
|---|---|---|
| hero desktop 1440×900 | 738 px | **558 px** |
| início de "Escolha sua Polen" | 748 | **568** |
| quanto dela aparece na dobra | 152 px | **332 px** |

### 4. Integração com a página

O hero já sangrava de 0 a 1440; a caixa que aparecia na captura vinha de
`sangrar()` ter medido antes das imagens, quando a página ainda não tinha barra
de rolagem. Passou a rodar também no `load`, com a barra já definida. Continua
sem `100vw` — `clientWidth` não inclui a scrollbar; `100vw` incluiria e criaria
transbordo.

### 5. Hierarquia preservada

Eyebrow, título nas mesmas duas linhas, copy, CTA, linha de características,
tipografia, cores, navbar e destino do CTA: **nada mudou**. A barra
"Polen · Produto · Filtros · FAQ" não voltou.

> Defeito achado na validação: no mobile o `padding-top` de 56px era **menor que
> a navbar**, que tem 81px e fica por cima — o eyebrow e a primeira linha do
> título entravam debaixo dela. Passou a 104px. Conferido: eyebrow em y=104 no
> mobile e y=87 no desktop, os dois livres.

### 6. Animação simplificada

Sobraram duas: fotografia (`opacity` + `scale 1.04→1` + `translateX`, 1000 ms) e
copy (`opacity` + `translateY 16px`, 620 ms com atrasos de 60 a 420 ms). Total
~1.040 ms. O paralaxe do scroll ficou só na foto, com um escritor de `transform`
e um `requestAnimationFrame`. Medido depois de assentar: **0 animações em
execução**. Reduced-motion entrega o estado final nos três breakpoints.

### 7. Resultados

| | hero | produto @ | h1 | quebradas | transborda | console |
|---|---|---|---|---|---|---|
| 1440×900 | 558 px | 568 | 1 | 0 | não | 0 |
| 768×1024 | 898 px | 908 | 1 | 0 | não | 0 |
| 390×844 | 845 px | 855 | 1 | 0 | não | 0 |

Seletor de cores funcional (troquei para Laranja e a sacola gravou
`[{"nome":"Polen Laranja","qtd":1}]`).

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-limpeza-colagem` — **0 erros
de console**, geometria **4980×720 · 3593×512 · 2993×422**, `overflow:hidden`,
escala 0,5→1, translateY 150→0, transform a transform **idêntico à baseline**.
`index.html` com o mesmo SHA-256 (`26606fb8d572eaee`).

### Arquivos

`tools/polen.js` · `tools/polen-interacoes.js` · builds `polen.html`,
`melcam/identidade.css`, `melcam/interacoes.js`.

Nenhum commit.

---

## ✅ VERIFICAÇÃO DO HERO DA /polen — 13/08/2026, 12h

### O pedido já estava atendido em disco

O pedido de ajuste chegou com uma captura de `11:37:52`. O build de
`polen.html` é de `11:45`. A captura mostra o estado **anterior** ao refino —
o navegador do pedido estava com a página velha em cache. Nada foi
reconstruído: medi o que está servido e confirmei item por item.

| pedido | estado medido |
|---|---|
| 1. remover a colagem | **0** nós `.mel-ph-colagem` / `.mel-ph-cam*` no DOM · **0** ocorrências em `polen.html`, `identidade.css` e `interacoes.js` · o hero tem **1 imagem**, a principal |
| 2. enquadramento | painel `min(48%, 880px)` = 691×558 · `object-fit:cover` · `object-position:50% 42%` · lente, flash, visor, marca e etiqueta inteiros |
| 3. vazio inferior | hero **558 px**, `padding-bottom:0`, respiro de **87 px** abaixo do texto — dentro da faixa pedida |
| 4. integração | hero de x=0 a x=1440, sem margem lateral, sem borda, sem `100vw` |
| 5. hierarquia | eyebrow, título em 2 linhas, copy, CTA, linha de características · **0** barra "Polen · Produto · Filtros · FAQ" |
| 6. animação | foto (opacidade + escala + translateX, 1000 ms) e copy (opacidade + translateY, 620 ms) · **0** animações rodando depois de assentar · reduced-motion em `transform:none` nos três |
| 7/8. validação | ver tabela abaixo |

### O que mudou de fato nesta passada

Um comentário órfão. O cabeçalho do bloco `/polen — hero premium` ainda
descrevia **quatro camadas incluindo a colagem** — e, por morar dentro do
template literal de `css()`, era servido em `melcam/identidade.css` para todo
visitante. Reescrito na fonte (`tools/polen-interacoes.js`) e no build
(`melcam/identidade.css`), agora com três camadas e o registro de que a
colagem saiu e por quê. Nenhuma regra de CSS, nenhum seletor, nenhum byte de
layout mudou.

### Medições

| | hero | produto @ | dobra 900 | h1 | swatches | transborda | quebradas | console |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 558 px | 568 | 332 px visíveis | 1 | 7 | não | 0 | 0 |
| 768×1024 | 898 px | 908 | — | 1 | 7 | não | 0 | 0 |
| 390×844 | 845 px | 855 | — | 1 | 7 | não | 0 | 0 |

Reduced-motion medido nos três: `transform:none`, `opacity:1`. CTA de 44 px
nos três. Seletor de cores conferido pelo crossfade real: clique no swatch 1
moveu a seleção de 4→1, a camada B trocou para `polen-branca.png` com
`opacity:1` e a sacola gravou `[{"nome":"Polen Branca","qtd":1}]`.

Capturas em `tools/shots-hero/atual-{desktop,tablet,mobile}.png` e
`tools/shots-polen/`.

### QA da home — e uma correção de baseline

`node tools/medir.js "http://localhost:3030/" verificacao-hero-polen`:
geometria **4980×720 · 3593×512 · 2993×422** com `overflow:hidden` nos três,
**0 problemas de console**.

> **Atenção para quem vier depois:** a entrada anterior diz que a curva ficou
> "idêntica à baseline `medida-melcam-13ago.json`". Isso só vale no **desktop**.
> Em tablet e mobile o `translateX` diverge muito daquele arquivo (ex.: tablet
> passo 6, −158,56 contra −2825) — não é regressão, é o **desfile mobile**
> implementado às 10h18. A baseline correta para tablet e mobile passou a ser
> `medidas/medida-desfile-mobile-13ago.json`, e contra ela o estado atual é
> **idêntico transform a transform, 0 diferenças nos 21 pontos de amostra**.

Home intacta: `index.html` não foi tocado.

### Arquivos

`tools/polen-interacoes.js` · `melcam/identidade.css` (só o comentário).

Nenhum commit.

---

## 🖼️ HERO DA /polen EM TELA CHEIA, COMO O DA HOME — 13/08/2026, 12h30

### O que estava errado no meu entendimento

A passada anterior mediu o hero como "sangrando de 0 a 1440" e deu por
resolvido. Estava certo na largura do **bloco** e errado no que importava: a
**fotografia** ocupava um painel de `min(48%, 880px)` à direita, com carvão
chapado à esquerda. Ou seja, a página sangrava; a imagem não. É a "caixa" que
o pedido recusou duas vezes.

O parâmetro correto era o hero da home, e ele foi medido, não suposto:

| | home (`<video>`) | /polen antes | /polen agora |
|---|---|---|---|
| 1440×900 | 1440×900 @0,0 | 691×558 à direita | **1440×900 @0,0** |
| 768×1024 | viewport | 768×480, bloco abaixo do texto | **768×1024 @0,0** |
| 390×844 | 390×844 @0,0 | 390×390, bloco abaixo do texto | **390×844 @0,0** |

`object-fit:cover` nos três, como a home. Canto a canto, ponta a ponta.

### O que mudou

- **`.mel-ph`** — `min-height` de `clamp(480px,62svh,700px)` para `100svh`, a
  altura do hero da home. Fundo passa a ser cor chapada sob a foto; o
  gradiente de saída saiu de `background` e virou a terceira camada do scrim.
- **`.mel-ph-foto`** — de `inset:0 0 0 auto; width:min(48%,880px)` para
  `inset:0; width:100%`. **A máscara horizontal saiu**: ela existia só para
  dissolver a borda esquerda do painel contra o carvão, e não há mais painel.
- **`.mel-ph-scrim`** — reescrito em três gradientes com tarefas separadas:
  90deg para a coluna de leitura (termina em `.08`, não em carvão chapado —
  nada aqui pode virar retângulo de novo), 180deg para assentar a navbar, e
  0deg fechando em `#0d0d0d` para emendar na seção de produto.
- **`melPhFoto`** — `translateX(18px)` removido do keyframe. Ele fazia a foto
  entrar deslizando pela direita, movimento que só fazia sentido em painel
  lateral. Sobrou opacidade + `scale(1.04→1)`, 1000 ms.
- **Retrato (≤810)** — a quebra em coluna com a foto virando bloco `aspect-ratio:1`
  depois do texto **saiu inteira**, junto com a máscara de topo e o
  `aspect-ratio:16/10` de 560–810. Era o oposto de sangrar. Em retrato o cover
  inverte de eixo (a tela é 0,462 e a fonte é 0,667, então quem manda é a
  altura): a foto aparece inteira de cima a baixo e o corte vai para as
  laterais, onde só há caixa. O scrim vira vertical ali, porque o texto ocupa
  a largura toda e um gradiente horizontal apagaria a foto.

### O enquadramento, e o preço dele

`object-position:50% 57%` no desktop. Medido: em 1440 o cover escala
1440/1600 = 0,9, a foto renderiza 1440×2160 e a janela mostra 900/2160 =
**41,7%** da altura. A câmera ocupa de 30,5% a 78% do arquivo — **47,5%**,
maior que a janela.

> **Com esta foto, tela cheia e câmera inteira não coexistem no desktop.** A
> fonte é 2:3 e o hero é 16:10; sangrar na largura fixa a escala em 0,9 e não
> há enquadramento que caiba os 47,5%. Testei hero de 1030px: a câmera cabe,
> mas passa a ocupar a altura toda e o hero fica mais alto que a viewport.
> Não há foto da Polen em paisagem no acervo — as 16 de `header-fileira` são
> 1600×2400 e `banner-3x.jpg`, a única paisagem, é da Bee.

Escolhi centrar a janela na câmera: o corte cai nas sobras (topo da aba da
caixa e sombra da base) e ficam inteiros lente, flash, visor, a marca MELCAM e
a caixa amarela no canto. Em tablet e mobile a câmera aparece **inteira** —
lá o eixo do cover inverte e sobra altura.

### Resultados

| | hero | produto @ | h1 | swatches | transborda | quebradas | console |
|---|---|---|---|---|---|---|---|
| 1440×900 | 900 px | 910 | 1 | 7 | não | 0 | 0 |
| 768×1024 | 1024 px | 1034 | 1 | 7 | não | 0 | 0 |
| 390×844 | 844 px | 854 | 1 | 7 | não | 0 | 0 |

O hero passou a ter exatamente a altura da viewport nos três — igual à home.
**Consequência assumida:** a próxima seção não espia mais na dobra. Era um
requisito do pedido anterior e é incompatível com "igual à home", porque o
hero da home também toma a tela inteira. Se a espiada valer mais que a
paridade, o ajuste é `min-height:92svh`.

Reduced-motion em estado final nos três. 0 animações rodando depois de
assentar. 0 nós da colagem. CSS balanceado 338/338.

### QA da home

`node tools/medir.js "http://localhost:3030/" hero-tela-cheia`: **4980×720 ·
3593×512 · 2993×422**, `overflow:hidden`, **0 erros de console**, e
**0 diferenças** contra `medidas/medida-desfile-mobile-13ago.json` nos 21
pontos de amostra. `index.html` não foi tocado.

### Como o build foi sincronizado

`aplicar()` **apenda** CSS — rodá-lo duplicaria `identidade.css`. Troquei só o
bloco `/polen` por substituição com fronteiras verificadas (marcador de início
único, marcador de fim conferido também na saída do `css()`, contagem de bytes
dos quatro pedaços, chaves balanceadas). 13.543 bytes saíram, 13.407 entraram,
0 bytes fora do bloco tocados.

### Arquivos

`tools/polen-interacoes.js` · `melcam/identidade.css`. Capturas em
`tools/shots-hero/novo-{desktop,tablet,mobile}.png` e `tools/shots-polen/`.

Nenhum commit.

---

## 📐 HERO EM 92svh — 13/08/2026, 12h50

A pedido: o hero cede 8% da tela para a próxima seção espiar.

### E um defeito que só apareceu medindo a dobra

`92svh` sozinho **não entregou o que o pedido queria**. Em 1440×900 o hero
passou a 828 e a seção a 838, ou seja 62px de dobra — mas o
`padding-top:clamp(40px,5.5vw,72px)` da emenda jogava o eyebrow para **y=910,
dez pixels abaixo do corte**. O que espiava era uma faixa preta de 62px, sem
conteúdo nenhum: pior que não espiar, porque lê como vão esquecido, que é
exatamente o defeito que o pedido de 11h mandou eliminar.

Padding para `clamp(32px,3.4vw,48px)`. O eyebrow "ESCOLHA SUA POLEN" caiu para
**886**, com base em 901 — aparece inteiro na dobra. E 48px é o piso do
respiro pedido (48–80px), então a emenda não ficou apertada.

| | hero | seção @ | eyebrow @ | espia | dobra |
|---|---|---|---|---|---|
| 1440×900 | 828 px | 838 | 886 | **14 px de texto** | 900 |
| 768×1024 | 942 px | 952 | 984 | 40 px | 1024 |
| 390×844 | 776 px | 786 | 818 | 26 px | 844 |

A foto continua sangrando nos quatro lados nos três breakpoints — o `svh`
mudou a altura da janela, não o eixo do `cover`, que é fixado pela largura.

### Validação

QA nos três: 0 erros de console, 1 `<h1>`, 7 swatches, 0 imagens quebradas,
0 transbordo, CTA de 44px, reduced-motion em estado final. CSS 338/338.

QA da home: `node tools/medir.js "http://localhost:3030/" hero-92svh` —
**4980×720 · 3593×512 · 2993×422**, `overflow:hidden`, 0 erros, **0
diferenças** contra `medida-desfile-mobile-13ago.json`. `index.html` com o
mesmo SHA-256 (`26606fb8d572eaee`), intacto.

Capturas: `tools/shots-hero/final-{desktop,tablet,mobile}.png`.

### Arquivos

`tools/polen-interacoes.js` · `melcam/identidade.css`. Nenhum commit.
