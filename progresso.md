# MELCAM — progresso da transformação do template

Arquivo de handoff. Outro agente deve conseguir retomar só lendo isto.
Última atualização: **12/08/2026 — spec medida da fileira do Header + assets
1600×2400 prontos em `melcam/img/header-fileira/`**.

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
