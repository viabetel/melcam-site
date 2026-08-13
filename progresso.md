# MELCAM — progresso da transformação do template

Arquivo de handoff. Outro agente deve conseguir retomar só lendo isto.
Última atualização: **13/08/2026 — sessão encerrada, ver o HANDOFF no fim do
arquivo. Fileira do Header animada no export; hero e Header Info fora das
internas; as 6 internas voltaram a renderizar no tablet e no mobile; vazio dos
destaques da Bee fechado; slot fantasma do ticker fora do fluxo; ticker
arrastável com o mouse; etiqueta de pendência fora dos cards da Colméia; bloco
Polen da home com conceito, 7 cores, preço e CTA; imagem partida dos cards
Polen e Sobre Nós corrigida. Estado commitado em `48dda9d` e publicado em
`https://melcam-site.vercel.app` — ver a última seção do arquivo. O hero da
/bee foi junto **inacabado**: leia o "RETOMAR POR AQUI" antes de tocar nele.**

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

---

## 🎬 SCROLLYTELLING DE "O DIFERENCIAL" — /polen — 13/08/2026

Era uma `<ul>` de nove itens. Virou nove capítulos, cada um com a cena que
comprova a vantagem. **As nove vantagens são as aprovadas, palavra por
palavra**: o `<h3>` de cada capítulo é a string que já estava em `SPECS`.
Nenhum número mexido, nenhuma especificação nova.

### Inventário: de onde vieram as cenas

Figma e Drive **não estavam disponíveis como fonte**. O MCP do Figma responde
autenticado como `israel` num time pessoal *starter* com assento de leitura, o
projeto não declara nenhum `fileKey` da Melcam em lugar nenhum
(`melcam.config.json`, `.melcam-project.json`, `README`), e não há ferramenta
de Drive nesta sessão. Sem chave de arquivo não há o que buscar, e inventar
caminho estava proibido.

A fonte usada foi o **acervo oficial entregue pelo cliente**, em
`Downloads\melcam\IMAGENS` — o mesmo de onde saiu tudo que já está no site.
Zero imagem de banco, de internet ou gerada.

| cap | vantagem | cena | origem |
|---|---|---|---|
| 01 | Experiência analógica real | pessoa fotografando com a Polen | `Landing page Polen/DSCF0246` (4000×3000) |
| 02 | Sem tela e sem distrações | traseira, superfície lisa | `Catalogo Polen/Preto/Costas` |
| 03 | Bateria recarregável | **placeholder editorial** | — |
| 04 | Dimensões 11,4 × 6,4 × 2,5 cm | packshot limpo + cotas em SVG | `Catalogo Polen/Preto/Frente_Solo` |
| 05 | Flash LED integrado | close do topo em luz baixa | `Landing page Polen/ASFOTOSDEJOAO-3` (3587×5380) |
| 06 | Resolução de 12 MP | foto feita com a Polen (MAC de Niterói) | `Landing page Polen/23c8db96…` |
| 07 | Cartão de 4 GB | o microSD que acompanha | `Catalogo Polen/Preto/Frente_Conjunto` |
| 08 | Carregamento por USB-C | o cabo oficial, duas pontas | `Catalogo Polen/Preto/Frente_Conjunto` |
| 09 | Oito filtros | as 8 oficiais, mesma foto | `melcam/img/filtros/f1..f8` |

07 e 08 saem do mesmo arquivo mas são **objetos e recortes diferentes** — não
é a mesma imagem repetida para preencher.

### O trabalho que os recortes deram

As tomadas de catálogo do cliente têm **rótulo gravado no pixel**: "LIVRE DE
TELAS", "FLASH", "ENTRADA USB-C", "CABO USB-C E CARTÃO SD INCLUSOS", com
linhas de chamada. Num scrollytelling onde o texto é HTML, isso duplicaria a
informação e derrubaria o tom para peça de marketplace.

Os recortes foram **medidos**, sobrepondo uma grade de 100px ao original. Na
`Costas`, por exemplo: corpo da câmera de x154 a x1046 e de y351 a y849, e a
linha de chamada de baixo descendo a partir de **y677** em x561 — daí o corte
fechar em y672. Tudo está em `tools/polen-story-assets.js`, com o porquê de
cada número, e o gerador é reexecutável.

Duas decisões de qualidade de imagem:

- **Cartão e cabo não foram ampliados até encher o quadro.** O microSD ocupa
  163px do original; esticar até 1440 entregaria borrão. Eles entram a 1,5x,
  centrados, e o "4GB microSDHC" continua legível.
- **O fundo é estendido com uma cópia desfocada da própria imagem**, não com
  cor chapada. Chapado foi a primeira tentativa e deixou emenda retangular
  visível: o fundo do catálogo tem vinheta e o padrão favo, então nenhuma cor
  única casa com a borda.

Todas as nove cenas saem em **3:2 (1440×960)**. Uniforme de propósito: cena
com proporção diferente mudaria a altura do palco no meio do scroll — isso é
layout shift. Medido: proporção **1,500** nas nove, e a altura da seção é
**6425px antes e 6425px depois** de todas as fotos carregarem.

### Arquitetura: uma cópia de cada cena, dois layouts

O DOM intercala **cena, passo, cena, passo…**, uma cópia só. Não há imagem
duplicada para o mobile. Quem muda é a grade:

- **abaixo de 1025** — uma coluna. A ordem do DOM já entrega figura seguida do
  texto dela. Sem sticky, sem nada absoluto.
- **1025 pra cima, sem JS** — duas colunas, cada cena na sua linha ao lado do
  passo. Lista honesta.
- **1025 pra cima, com JS** — todas as cenas vão para a mesma área de grade
  (coluna 1, todas as linhas), empilhadas e sticky. É a sobreposição que
  permite o crossfade.

Por isso **o estado sem JavaScript e o estado com movimento reduzido são o
mesmo estado**, e nenhum deles esconde imagem: o palco só existe quando o
script liga a classe.

> **`grid-row:1/-1` exige linhas explícitas.** Com grid implícito o `-1` volta
> para a linha 1 e a regra morre calada. Daí `--caps`, escrito no HTML com a
> quantidade de capítulos.

### O defeito que quase matou o sticky

`position:sticky` não engata se **qualquer** ancestral tiver `overflow:hidden`
— hidden cria caixa de rolagem e o elemento passa a grudar dentro dela, que
não rola. O template do Framer embrulha a página em dois contêineres assim.
Medido: o topo do palco ia a −546, −1230, −1914 em vez de ficar em 113.

`overflow:clip` recorta igual e **não** cria caixa de rolagem. Aplicado
escopado em `body.mel-pagina-polen`, então a home e as outras internas não são
tocadas — e o QA da fileira segue medindo o mesmo `overflow:hidden` de sempre.

### Carregamento adiado, e a rede de segurança

A cena 1 nasce com a foto; as outras esperam em `data-src`. `loading="lazy"`
sozinho não resolveria: empilhadas, as nove contam como visíveis e o navegador
buscaria todas de uma vez.

Três buracos foram fechados, cada um encontrado medindo:

1. **`<img>` sem `src` é imagem quebrada.** A auditoria acusou "6 imagens
   quebradas" e o mobile desenhou o ícone de quebrado com o texto do `alt` por
   cima. Resolvido com um GIF transparente de 1×1 embutido, sem ida à rede.
2. **A foto do `<noscript>` ficava cortada.** Com script desligado o
   `<noscript>` vira DOM e a foto passa a ser a segunda `<img>` da moldura: em
   fluxo caía embaixo do placeholder e o `overflow:hidden` a cortava. Nove
   capítulos com caixa vazia. Resolvido com `position:absolute`.
3. **Se `interacoes.js` não carregar, o `<noscript>` não ajuda** — o parser
   teve o sinalizador de script ligado, então ele continua inerte, e oito
   capítulos ficariam vazios. É a mesma armadilha do "hero em branco" já
   registrada aqui. Resolvido com seis linhas inline logo após a seção: meio
   segundo depois do `load`, se a seção não tiver sido ligada, elas trazem
   todas as fotos.

Provado nos dois cenários, com o navegador de verdade:

| cenário | como foi forçado | resultado |
|---|---|---|
| JavaScript desligado | Edge com `--blink-settings=scriptEnabled=false` | 9 capítulos, **8 fotos visíveis**, 0 cenas vazias |
| `interacoes.js` bloqueado | `Network.setBlockedURLs` | 9 capítulos, **8 fotos visíveis**, 0 pendentes |

> `Emulation.setScriptExecutionDisabled` do CDP **não serve** para testar isso:
> ele impede a execução mas não desliga o sinalizador de script do parser,
> então o `<noscript>` continua sendo tratado como texto. Foi o que escondeu o
> defeito 2 na primeira medição.

### Contraste: o apagado bonito reprovava

Capítulo inativo em `opacity:.34` ficava elegante e **reprovava em WCAG AA**.
Medido no navegador, não estimado:

| | .34 | exigido | .66 |
|---|---|---|---|
| número em mel | 2,06:1 | 4,5 | **4,70:1** |
| título | 2,94:1 | 3 | **8,13:1** |
| texto de apoio | — | 4,5 | **5,47:1** |

Capítulo inativo continua na tela, então vale WCAG igual. Em 0,66 a diferença
para o ativo continua legível — que era o pedido: mudança discreta, não apagão.

### Comportamento

Observer com faixa de ativação nos **4% centrais** da viewport
(`rootMargin:-48% 0px -48%`), limiar 0. Empate resolve pelo menor índice, o
que mantém a ordem na descida e na subida. O script **liga uma classe e troca
um atributo** — quem anima é o CSS, por `transition` de 560 ms em
`cubic-bezier(.22,.61,.36,1)`. Não há `requestAnimationFrame`, não há escrita
de `transform` e não há leitura de layout dentro de listener de scroll: o
único cálculo de geometria roda **uma vez**, na largada, para o caso de abrir
a página no meio da seção. Nada de `iniciarFileira` foi tocado.

### Resultados

| | seção | página | capítulo ativo | descida | subida | console |
|---|---|---|---|---|---|---|
| 1440×900 | 6425 px | 12859 px | 1 por vez, palco fixo em y107 nos nove | ok | ok | 0 |
| 768×1024 | 5993 px | 13899 px | fluxo sequencial | ok | ok | 0 |
| 390×844 | 3638 px | 10099 px | fluxo sequencial | ok | ok | 0 |
| 1440×900 reduzido | 5510 px | 11945 px | nenhum, por contrato | — | — | 0 |

Também conferido: **9 vantagens · 9 cenas · relação 1:1** · 1 placeholder ·
**0 elementos focáveis** dentro da seção (sticky não tem como cobrir foco) ·
0 conteúdo essencial em `aria-hidden` · 0 transbordo horizontal · 1 `<h1>` ·
0 imagens quebradas · 0 asset remoto (o único `https://` da página é o
`preconnect` de `fonts.gstatic.com`, que já vinha do template).

Seletor de cores: swatch 4→6, crossfade trocou para `polen-verde.png` e a
sacola gravou `[{"nome":"Polen Verde","qtd":1}]`. FAQ com 7 itens e filtros
com 8, intactos. **Hero inalterado**: 828px, de x0 a x1440, `object-position`
`50% 57%`.

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-scrollytelling-polen` —
**4980×720 · 3593×512 · 2993×422**, `overflow:hidden`, escala **0,5 → 1**,
translateY **150 → 0**, **0 erros de console** e **0 diferenças** contra
`medidas/medida-desfile-mobile-13ago.json` nos 21 pontos de amostra.
`index.html` com o mesmo SHA-256 (`26606fb8d572eaee`) — não foi tocado.

### Pendências honestas

1. **Foto de bateria** (capítulo 3). O placeholder pede exatamente: *câmera em
   recarga pelo cabo USB-C, ou em uso com o cabo à vista*. Proporção 3:2, e a
   substituição não mexe em uma linha de layout.
2. **Cartão e cabo em close de verdade.** Hoje eles existem só dentro da
   composição 1200×1200, ocupando 163px e 668px. Dá para melhorar com um close
   dedicado.
3. **Copy de apoio dos capítulos 3 a 7.** Quatro capítulos têm linha de apoio,
   porque havia copy aprovado no FAQ e no hero desta página para reaproveitar
   verbatim. Cinco ficaram só com o título: inventar frase para emparelhar
   visualmente seria criar afirmação sobre o produto.
4. **Nenhum acesso a Figma ou Drive.** Se houver um arquivo da Melcam no
   Figma, basta a URL para eu buscar de lá.

### Arquivos

Fontes: `tools/polen.js` · `tools/polen-interacoes.js` · `tools/hero-carrossel.js`
Novos: `tools/polen-story-assets.js` (gerador das cenas) · `tools/build-polen.js`
(sincroniza os derivados sem rodar `aplicar()`) · `tools/qa-story.js`
Assets: `melcam/img/polen-story/` — 8 JPEG, 739 KB, mais `ORIGEM.txt`
Derivados: `polen.html` · `melcam/identidade.css` · `melcam/interacoes.js`
Capturas: `tools/shots-story/`

**Nenhum commit.**

---

## ↔️ LADO ALTERNADO NO SCROLLYTELLING — /polen — 13/08/2026

A pedido: o painel parado num canto só deixava a descida estática. Agora o
lado troca a cada capítulo — ímpar com a imagem à esquerda e o texto à
direita, par ao contrário.

O lado é **escrito no HTML** (`data-lado` em cada cena e em cada passo), não
deduzido por `:nth-of-type` no CSS. A grade tem `figure`, `div` e um `p`
misturados como irmãos, e contar por tipo ali é o caminho curto para o dia em
que alguém acrescentar um elemento e a alternância inverter sozinha.

### Colunas iguais, e o porquê

`1fr 1fr` em vez do `55% / 1fr` anterior. É consequência direta da
alternância: com colunas de larguras diferentes, o painel encolheria nos
capítulos pares. Em colunas iguais ele fica com o mesmo tamanho dos dois
lados — 677×451 no desktop, ou 48,6% da grade.

> **Desvio assumido do pedido original**, que pedia 50–58%. Preferi 48,6%
> simétrico a 55% que vira 45% em metade dos capítulos. Se os 50% forem
> obrigatórios, o caminho é reduzir o gap de coluna e o padding lateral da
> seção — não voltar a colunas desiguais.

### O defeito que a alternância trouxe

Quatro capítulos ficaram **inalcançáveis**: o observer ativava 1, 2, 4, 6, 8 e
nunca 3, 5, 7, 9. A seção também encolheu de 6425 para 4337px.

A causa é a auto-alocação do CSS Grid. Quando um item tem coluna definida
**menor** que a do anterior, o algoritmo pula uma linha; quando tem coluna
**maior**, ele cabe na mesma linha. Com a coluna alternando, os passos
pareavam de dois em dois: 2 e 3 na linha 2, 4 e 5 na linha 3, e assim por
diante. Dois passos com o mesmo centro vertical nunca podem estar sozinhos na
faixa de ativação, e o desempate por menor índice sempre entregava o de cima.

Corrigido cravando a linha: `--linha` sai de `tools/polen.js` com o número do
capítulo, e tanto a cena quanto o passo usam `grid-row:var(--linha)`. Cada
capítulo tem a sua linha, por construção. Seção de volta a 6425px e os nove
capítulos ativando na descida e na subida.

### Movimento

A cena passa a entrar **vindo do próprio lado**: `translateX` de 22px, para
fora, somado à escala curta de 1,025 que já existia. É o bastante para o olho
ler a direção da troca e pouco o bastante para não virar carrossel. Mesma
duração de 560 ms e mesmo easing.

O contador acompanha o painel (`data-lado-ativo` na seção, escrito pelo script
a partir do `data-lado` da cena que entrou). Sem isso ele ficaria órfão à
esquerda nos capítulos em que a imagem está à direita.

### Validação

| | seção | capítulo ativo | descida | subida | console |
|---|---|---|---|---|---|
| 1440×900 | 6425 px | 1 por vez, palco em y108 nos nove | ok | ok | 0 |
| 768×1024 | 5993 px | fluxo sequencial | ok | ok | 0 |
| 390×844 | 3638 px | fluxo sequencial | ok | ok | 0 |
| 1440×900 reduzido | 4877 px | nenhum, por contrato | — | — | 0 |

A alternância vale também **sem JavaScript** e **sob movimento reduzido**: lá
a grade não gruda nada, mas cada par continua na sua linha, trocando de lado.
Reconferido nos dois cenários de degradação — script desligado no Blink e
`interacoes.js` bloqueado: 9 capítulos, 8 fotos visíveis, 0 cenas vazias.

Contraste dos capítulos inativos remedido depois da reescrita do bloco:
número **4,70:1**, título **8,13:1**, texto **5,47:1**. Todos passam.

> Nota de método: `captureBeyondViewport` com recorte lá embaixo devolve
> moldura vazia mesmo com a imagem carregada — medido, `naturalWidth`
> 1440×960, `position:absolute`, `visibility:visible`. É artefato de captura
> de conteúdo que nunca foi pintado, não defeito. Para conferir a seção, rolar
> até ela e capturar a viewport.

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-alternancia` —
**4980×720 · 3593×512 · 2993×422**, `overflow:hidden`, **0 erros de console**,
**0 diferenças** contra `medidas/medida-desfile-mobile-13ago.json` nos 21
pontos. `index.html` com o mesmo SHA-256 (`26606fb8d572eaee`).

### Arquivos

`tools/polen.js` · `tools/polen-interacoes.js` · derivados `polen.html`,
`melcam/identidade.css`, `melcam/interacoes.js`.

**Nenhum commit.**

---

## ✂️ A COLMÉIA SAIU DA /polen E DA /bee — 13/08/2026

Removida a seção "o clube da marca / Entre para a Colméia" das duas páginas de
produto: eyebrow, título, o parágrafo da comunidade, os três perks (Acesso
antecipado · Encontros exclusivos · Desafios mensais), o CTA "Quero entrar na
Colméia" e a nota de cadastro a decidir.

### Onde ela estava, medido antes de mexer

| página | situação |
|---|---|
| /polen | **visível**, gerada por `polen.js colmeia()` |
| /bee | **visível**, gerada por `bee.js colmeia()` — mesmo bloco, mesmo código |
| home | **visível**, mas é outra coisa: a seção do template Framer (`data-framer-name="Speed On"`), que `tools/identidade.js` reordena de propósito para fechar a home |
| /sobre · /acessorios · /sacola · /404 | já estavam ocultas |

**A home não foi tocada.** Lá é outra implementação e a remoção não foi
pedida — o pedido de mais cedo neste mesmo dia foi explicitamente "não altere
a home". Se ela também tiver de sair, é decisão à parte e sai por CSS.

### O que sobrou de pé, e por quê

- **`melcam.config.json`** — a chave `colmeia` continua lá, intacta. É
  conteúdo aprovado do cliente; apagar dado do config por causa de uma remoção
  de layout é perder o texto sem precisar.
- **`tools/paginas.js`** — `.mel-colmeia` e `.mel-perks` continuam no CSS. São
  regras de sistema, não casam com nada hoje e voltam a servir se o bloco
  voltar.
- **/sobre** — o card "Comunidade" cita a Colméia em texto corrido. Não é este
  bloco e não foi pedido.
- **Nenhum handler de JS ficou órfão**: `data-mel-colmeia` não era escutado em
  lugar nenhum. Conferido.

### Consequências, incluindo uma que vale saber

`polen.js` agora fecha em `ctaFinal()` — "A última foto que você tirou valeu a
pena?" com o botão "Quero minha Polen". É o passo certo para uma página de
produto: o último bloco convida a comprar.

> **A /bee ficou sem bloco de fechamento.** Ela nunca teve `ctaFinal()`; a
> Colméia é que fazia esse papel, e agora a página termina na tabela de
> especificações. Não ficou sem caminho de compra — restam **4 CTAs visíveis**
> (a barra fixa com "Comprar" e os "Adicionar à sacola"), mas o fecho é fraco.
> Não inventei um CTA final para ela: seria copy nova sem aprovação.

| | antes | depois |
|---|---|---|
| /polen | 12859 px | **12313 px** |
| /bee | — | termina em "Filmagem e fotografia" |

### Validação

`Entre para a Colméia`, `o clube da marca` e `Quero entrar na Colméia`:
**0 ocorrências visíveis** na /polen e na /bee. `.mel-colmeia` e `.mel-perks`:
**0 nós** nas duas. Na home continua **1**, como decidido.

As duas páginas seguem íntegras: 1 `<h1>`, 0 transbordo horizontal, 0 imagens
quebradas. QA da /polen nos três breakpoints e nos dois modos de movimento:
tudo ok. Scrollytelling intacto — 9 capítulos, palco em y108, descida e subida
certas, 0 erros de console.

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-remocao-colmeia` —
**4980×720 · 3593×512 · 2993×422**, `overflow:hidden`, **0 erros**, **0
diferenças** contra `medidas/medida-desfile-mobile-13ago.json`. `index.html`
com o mesmo SHA-256 (`26606fb8d572eaee`).

### Arquivos

`tools/polen.js` · `tools/bee.js` · derivados `polen.html` e `bee.html`.

`tools/build-polen.js` virou **`tools/build-produtos.js`**: passou a regerar as
duas páginas de produto, porque o bloco removido era o mesmo nas duas e
sincronizar só uma deixaria a outra fora de passo com a fonte. Os títulos e
descrições usados são os mesmos de `paginas.aplicar()` — divergir ali viraria
SEO diferente do build oficial.

**Nenhum commit.**

---

## 🎨 AUDITORIA DE PALETA — 13/08/2026

Relatório completo em **`AUDITORIA_PALETA.md`**. Aqui fica o resumo e o que o
próximo precisa saber.

### Escopo

Todo o site, contra a paleta aprovada: código-fonte, arquivos gerados, estados
interativos, responsividade, acessibilidade, SVG e ícones, e as 9 rotas de
`serve.js` (`/`, `/polen`, `/bee`, `/acessorios`, `/sobre`, `/sacola`, `/404`,
`/privacidade`, `/termos`) em 1440×900, 768×1024 e 390×844 — **e nos dois
esquemas de cor do sistema**, que era justamente onde estava o pior defeito.

### 🔴 O achado que explica todos os outros

**A paleta MELCAM nunca chegou a pintar nada abaixo de `<body>`.**

`tools/identidade.js` sobrescrevia os nove tokens em `:root`. O template
declara os mesmos nove em **`body`** — duas vezes, uma por esquema de cor:

```css
body{ --token-3e6ec15f:#f5f5f5; --token-e5fd1d2d:#333; ... }
@media (prefers-color-scheme:dark){ body{ --token-3e6ec15f:#0d0d0d; ... } }
```

Custom property herda, e **herança perde para qualquer declaração direta no
próprio elemento** — não é especificidade nem ordem. Então o valor MELCAM valia
para o `<html>` e para mais nada; tudo dentro de `<body>` lia o legado de volta.

Isso corrige o que este arquivo afirmava desde a FASE 6: a tabela dos "9 tokens
sobrescritos" descrevia a intenção, não o que o navegador fazia. Medido:

| token | dizia | pintava (escuro) | pintava (claro) |
|---|---|---|---|
| fundo | `#221E17` | `#0d0d0d` | `#f5f5f5` |
| texto | `#FBF7EE` | `#dedede` | `#333` |
| secundário | `#9A9083` | `#696969` | `#555` |
| superfície | `#2B251C` | `#1c1c1c` | `#eaeaea` |
| borda | `rgba(251,247,238,.07)` | `#ffffff0d` | `#0000000d` |

Com `prefers-color-scheme: light` no sistema, o site abria **inteiro na pele
clara do template**. Capturado em `tools/shots-paleta/antes-home-desktop-CLARO.png`.

A correção é `:root` → `:root,body`. Empata em especificidade (0,0,1) com o
template e vence por ordem de fonte, porque `identidade.css` entra depois do
`<style>` do export em todas as páginas. O `@media` do template perde pelo mesmo
motivo — `@media` não soma especificidade.

### Principais legados

Além do acima, que resolveu `#0D0D0D`, `#DEDEDE`, `#696969`, `#1C1C1C`,
`#131314`, `#FFFFFF` e `#FFFFFF@.05` de uma vez:

- **Título "BEE" da grade da home invisível.** A regra do selo da Bee em
  `identidade.js` tinha um braço `.framer-text:first-child:not(h1):not(h2)`,
  escrito para um eyebrow que aquele card não tem. O primeiro `.framer-text`
  dele é o `<h3>` do título — e `h3` não estava nas exceções. Saía em carvão
  sobre card escuro: **1,17:1**. O braço saiu; a pílula "Novidade" nunca
  dependeu dele (ela pinta a própria cor no `::before`).
- **Campo de newsletter sem foco visível e com borda de foco azul.** O template
  traz `.framer-form-input:focus-visible{outline:none}` e
  `--framer-input-focused-border-color:#09f`. Nossa regra de foco só alcançava
  `a`, `button` e `[tabindex]`.
- **Base do hero da /polen fechando em `#0d0d0d`.** O comentário no código
  afirmava que esse era "o fundo da página, cravado em `.framer-vrbx7h` pelo
  template" — e não era: aquele nó lê o fundo do token. O gradiente que existia
  para esconder a emenda estava criando uma.
- **Placeholder do form da /acessorios** no cinza padrão do navegador `#757575`.
- **Seis pastilhas de método de pagamento em branco puro**, escritas inline pelo
  export.

### Correções

Todas na fonte **e** no build. `tools/aplicar.js` não foi executado.

| fonte | build |
|---|---|
| `tools/identidade.js` | `melcam/identidade.css` |
| `tools/polen-interacoes.js` | `melcam/identidade.css` |
| `tools/demais.js` | `melcam/identidade.css` |
| `tools/paginas.js` | `melcam/identidade.css` |
| `tools/hero-carrossel.js` | `melcam/interacoes.js` |

Além do token: seletor da Bee corrigido; campo de newsletter em papel com anel
de foco em mel; pastilhas de pagamento em papel; scrim da /polen em carvão nos
dois layouts; `#C9BFB0` unificado em `#CFC6B8`; `#7C7365` → `#9A9083`;
`opacity:.6` do separador removida; capítulo inativo `.66` → `.70`; número do
placeholder editorial `.5` → `.6`; `::placeholder` declarado na /acessorios;
sombras autorais de preto puro para `rgba(14,12,9,α)`.

Entraram também os **tokens de derivação** (`--mel-superficie`,
`--mel-secundario`, `--mel-papel-suave`, `--mel-borda`, `--mel-overlay`,
`--mel-mel-claro`), gerados da mesma constante que alimenta o `MAPA_TOKEN` — um
vocabulário, não dois.

### Contraste

**De 67 nós reprovando para 0**, nas 9 rotas × 3 breakpoints, medido com o
fundo efetivo (subindo a árvore e compondo alfas), não estimado.

Uma sutileza que vale guardar: **corrigir a cascata criou uma falha nova**. O
`opacity:.66` do capítulo inativo do scrollytelling fora calibrado contra
`#0d0d0d` e dava 4,70:1. Com o fundo virando carvão — mais claro — o mesmo
`.66` caiu para 4,36:1. Por isso tudo foi remedido depois da correção, em vez de
confiar nos números das sessões anteriores. Está em `.70`, dando 4,72:1.

O foco de teclado foi medido com **Tab de verdade pelo protocolo**, não com
`el.focus()`: `el.focus()` não liga `:focus-visible` em link e botão, e a
primeira passagem acusou 489 focos invisíveis que não existiam. Com Tab real:
anel de mel 2px, offset 3px, **9,67:1**.

### Rotas testadas

As 9. Todas com 1 `<h1>`, navbar, rodapé, 0 imagens quebradas, 0 transbordo
horizontal e 0 erros de console — **exceto `/privacidade` e `/termos`**, que
estão em branco (ver pendências).

Altura do documento **idêntica antes e depois em todas as rotas**, que é a prova
de que a auditoria de cor não mexeu em geometria.

### QA da home

`node tools/medir.js "http://localhost:3030/" pos-auditoria-paleta` —
**4980×720 · 3593×512 · 2993×422**, `overflow:hidden`, escala 0,5 → 1,
translateY 150 → 0, **0 erros de console**, **0 diferenças** contra
`medidas/medida-desfile-mobile-13ago.json` nos 21 pontos. `index.html` com o
mesmo SHA-256 (`26606fb8d572eaee`) — nenhum HTML foi tocado.

Também conferidos: menu suspenso aberto (fundo carvão, item atual em mel),
sacola vazia e cheia, seletor das 7 cores, scrollytelling nos 9 capítulos, e
`prefers-reduced-motion: reduce` (fileira em estado final, vídeo pausado e
visível).

### Ferramentas novas

| arquivo | o que faz |
|---|---|
| `tools/auditoria-cores.js` | inventário do código-fonte, separando literal de **fallback** de `var(--token-…)` — sem isso o relatório vira 472 falsos positivos de `#2e2e2e` |
| `tools/qa-paleta.js` | varredura de estilo **computado** no navegador: 9 rotas × 3 breakpoints, contraste com fundo efetivo, regras de estado no CSSOM, foco, saúde da rota |
| `tools/resumo-paleta.js` | resume o JSON: cor fora da paleta **que pinta**, contraste, foco, saúde |
| `tools/inspecionar.js` | avalia uma expressão numa rota. `--tab N` (teclado real), `--shot`, `ESQUEMA=light\|dark`, `MOVIMENTO=reduce` |

Duas armadilhas de medição que custaram tempo e valem para quem continuar:

1. **`CSSRuleList` não é iterável neste motor.** `for..of` devolve lista vazia
   *sem erro* — a varredura dizia "0 regras de estado" num site que tem 40. Use
   índice.
2. **Em SVG quem pinta `<text>` é `fill`, não `color`.** Ler `color` acusou
   1,27:1 nas cotas do diagrama de dimensões da /polen, que estão em papel. Quase
   "consertei" o que estava certo.

### Pendências

1. 🔴 **`/privacidade` e `/termos` renderizam em branco.** `#main` com 0 filhos,
   0 `<h1>`, sem navbar e sem rodapé, nos três breakpoints. São páginas Framer
   que dependem da hidratação React, desligada por decisão de arquitetura. Não é
   defeito de cor, mas é defeito — e os textos jurídicos estão em `PENDENTES`,
   então não dá para inventá-los. **Precisa de decisão.**
2. **Logo da Stripe no rodapé** (`#6772E5`, 21 ocorrências em 7 rotas). O
   `melcam.config.json` diz que o gateway está a decidir e o checkout é
   demonstrativo. Mantido: recolorir marca de terceiro não se faz, e removê-la é
   mudança de conteúdo.
3. **CTA "Quero entrar na Colméia" em papel, não em mel.** Está dentro da paleta
   e passa contraste com folga, então não é defeito — é decisão de design.
   Deixado como estava de propósito.
4. `drop-shadow(rgb(0,0,0) …)` nos packshots da home: mantido. São cinco
   deslocamentos diferentes em classes hasheadas, e sobre carvão é
   imperceptível.
5. `.mel-menu` herda `color:#000` do user-agent. Hoje não pinta nada porque todo
   filho declara a própria cor, mas qualquer texto solto ali sai preto.
6. **Divergência de posição fonte↔build**: `identidade.js` emite as regras de
   ordenação da Colméia, e o build as traz mais adiante no arquivo, postas por
   outro gerador. Anterior a esta auditoria, sem efeito visual. As 52 regras que
   a fonte emite existem todas no build — conferido.
7. **`tools/edge-cdp-*`**: 17 mil arquivos de perfil do Edge que `tools/cdp.js`
   deixa dentro de `tools/`. Afogam qualquer varredura da árvore. Valem uma
   linha no `.gitignore` e uma limpeza.

**Nenhum commit.**

---

## 🖼️ IMAGENS AUSENTES NO DEPLOY DA VERCEL — 13/08/2026

### Sintoma

No local, tudo carregava. No deploy da Vercel, a hero da `/polen` abria sem a
fotografia, e os cards de cabeçalho das sete páginas apareciam com buracos.
Parecia defeito de código — o CSS, o HTML e o caminho estavam idênticos nos dois
ambientes.

### Causa

`.vercelignore` excluía a pasta inteira:

```
# 9,4 MB de assets preparados para subir no canvas do Framer.
# Não são usados por nenhuma página; só pesariam o build.
melcam/img/header-fileira/
```

**O comentário estava errado.** Três arquivos daquela pasta são referenciados
pelas sete páginas publicadas. O arquivo existia, estava versionado, o caminho
estava certo e a caixa batia — ele simplesmente nunca era enviado.

Nada no `tools/preflight.js` pegava isso: todas as verificações olhavam o disco
e o `localhost`, e nos dois o arquivo estava perfeito. Faltava conferir o que o
**deploy** recebe.

### Assets afetados

| URL | tamanho | onde é usada | citada em |
|---|---|---|---|
| `/melcam/img/header-fileira/polen-lp-1.jpg` | 682.897 B | **hero da `/polen`** | 7 páginas (59 ocorrências) |
| `/melcam/img/header-fileira/bee-lp-06.jpg` | 653.411 B | card do cabeçalho | 7 páginas (57 ocorrências) |
| `/melcam/img/header-fileira/bee-lp-1237.jpg` | 474.721 B | card do cabeçalho | 7 páginas (57 ocorrências) |

**Correção factual do enunciado do pedido:** a *fileira* da home **não** usa
esta pasta, apesar do nome dela. As 10 fotos do desfile vêm de `card-*.jpg`,
`bee-lifestyle-*`, `polen-gallery-*` e `lifestyle-*` — medido em
`tools/shots/medida-pos-assets-vercel.json`. Quem usa `header-fileira/` é a hero
da Polen e os dois cards de cabeçalho.

Dos 16 arquivos da pasta, **3 são usados**. Os outros 13 (~7,5 MB) continuam sem
referência.

### Correção

A regra saiu, e o comentário falso foi substituído por um que explica por que
ela não pode voltar.

A **pasta inteira** sobe, e não só os três arquivos. Exceção parcial
(`!melcam/img/header-fileira/polen-lp-1.jpg`) quebraria de novo no dia em que um
quarto arquivo fosse usado, e o custo de mandar os 13 restantes são 9,5 MB num
deploy estático. Se um dia valer a pena podar, o certo é apagar os arquivos não
usados da pasta — não recriar a regra.

Deploy antes: 223 arquivos, 36,0 MB. Depois: **239 arquivos, 45,2 MB**.

### Validação automática criada

**`tools/verificar-assets-deploy.js`** — extrai toda URL de asset do HTML, CSS e
JS *publicados* e, para cada uma, confere quatro coisas:

1. existe no disco;
2. **a caixa bate segmento a segmento** — a Vercel é case-sensitive e o Windows
   não é, então um `Polen-LP-1.jpg` abriria local e daria 404 no ar. `existsSync`
   não serve aqui: só listar o diretório e comparar o nome resolve;
3. está versionado (`git ls-files`);
4. **não é excluído por `.vercelignore`** — implementa o subconjunto das regras
   do gitignore que a Vercel aplica, com negação, curinga e prefixo de
   diretório.

Ignora, de propósito: URL externa, `data:`, `blob:`, âncora e rota de página
(sem extensão, ou `.html`, que aqui são páginas servidas por rota).

Sai com código != 0 e não edita nada.

O parser do `.vercelignore` foi testado contra 21 casos conhecidos (11 que devem
subir, 10 que devem ficar de fora): **21/21**. A checagem de caixa foi testada
com `Polen-LP-1.jpg` e `melcam/IMG/...`, os dois com `existsSync=true` no Windows
e reprovados corretamente.

**Integrado ao `tools/preflight.js`** como verificação nº 7. Provado que reprova:
reintroduzindo a regra antiga, o pré-voo sai com código 1 e nomeia os três
arquivos e a regra que os exclui.

**`tools/qa-rede.js`** — complemento dinâmico: abre cada rota no Edge headless e
registra **toda** requisição que falhou, não só imagem. Fonte que dá 404 não
deixa imagem quebrada nenhuma; sem isto passaria despercebida.

### Testes locais

`node tools/verificar-assets-deploy.js`:

| grupo | antes | depois |
|---|---|---|
| OK | 90 | **93** |
| ignorado pela Vercel | **3** | 0 |
| arquivo ausente | 0 | 0 |
| diferença de caixa | 0 | 0 |
| não versionado | 0 | 0 |
| referência inválida | 0 | 0 |

`node tools/qa-rede.js` nas 7 rotas: **0 requisições falhas, 0 imagens
quebradas, 0 erros de console**, 95 fontes carregadas, vídeo presente, 1 `<h1>`
por página. (A `/404` registra um 404 de console: é o próprio documento
respondendo HTTP 404, por projeto do `serve.js`.)

### Simulação do deploy — o teste que fecha o argumento

Não bastava conferir que o arquivo existe no disco. Foi montada uma cópia com
**exatamente** o que a Vercel receberia (`git ls-files` menos `.vercelignore`) e
servida numa porta separada, com o mesmo `cleanUrls` do `vercel.json`.

| | cópia com a regra ANTIGA | cópia com a correção |
|---|---|---|
| arquivos | 223 (36,0 MB) | **239 (45,2 MB)** |
| `/melcam/img/header-fileira/polen-lp-1.jpg` | **HTTP 404** | **200 · image/jpeg · 682.897 B** |
| home | **3 imagens quebradas**, 3 req-falhas | 0 e 0 |
| /polen | **hero quebrada**, 1 req-falha | 0 e 0 |

A cópia com a regra antiga **reproduz o sintoma relatado exatamente**. É a prova
de que a causa era o `.vercelignore` e não o código.

### Testes no deploy

O deploy foi feito em duas etapas, e a segunda precisou de autorização
explícita. Fica o registro da sequência, porque ela explica por que a produção
carregou mais coisa do que o assunto desta seção.

**1. Preview.** `npx vercel deploy --yes` →
`https://melcam-site-5sorhrojj-viabetels-projects.vercel.app`
(`dpl_DwT5cyJGQJfP3Byzm8JStVFu7WUf`, `target: preview`), 241 arquivos enviados.

**2. Proteção da Vercel barrou o QA.** Toda URL do preview respondeu **302 para
`vercel.com/sso-api`**, inclusive os assets. A proteção **não foi desativada** —
desligar proteção de projeto não estava autorizado.

**3. O defeito, confirmado no ar.** A produção (`melcam-site.vercel.app`) é
pública — a proteção vale só para preview. Medido ANTES da promoção, na produção
então vigente:

| URL | resposta |
|---|---|
| `/` e `/polen` | 200 |
| `/melcam/img/card-polen.jpg` | 200 · image/jpeg · 1149×1600 |
| `/melcam/img/header-fileira/polen-lp-1.jpg` | **404, devolvendo o HTML da 404** |

Ou seja: o sintoma relatado estava vivo em produção, e os demais assets
funcionavam. Prova final de que a causa era o `.vercelignore`.

**4. Promoção a produção — autorizada explicitamente.** `vercel deploy --prod`
→ `dpl_BUAFJj4MzpzJqw2NZHB7XqjJtVYS`, `target: production`, servida em
**`https://melcam-site.vercel.app`**.

> ⚠️ **A promoção levou junto a auditoria de paleta.** A produção anterior era
> de antes dela (`identidade.css` com 67.082 B e sem `:root,body{`, contra
> 73.449 B locais). Isso foi dito ao cliente antes de promover e autorizado por
> ele. Consequência: a paleta corrigida está no ar **sem ter passado pela
> revisão do Codex**. Se a revisão pedir mudança, ela volta por um novo deploy.

### URL validada — `https://melcam-site.vercel.app`

| URL | status | content-type | bytes | dimensões |
|---|---|---|---|---|
| `/melcam/img/header-fileira/polen-lp-1.jpg` | **200** | image/jpeg | 682.897 | **1600×2400** |
| `/melcam/img/header-fileira/bee-lp-06.jpg` | **200** | image/jpeg | 653.411 | 1600×2400 |
| `/melcam/img/header-fileira/bee-lp-1237.jpg` | **200** | image/jpeg | 474.721 | 1600×2400 |
| `/melcam/identidade.css` | 200 | text/css | 73.844 | — |
| `/melcam/interacoes.js` | 200 | application/javascript | 54.523 | — |
| `/melcam/video/hero.mp4` | 200 | video/mp4 | 5.062.856 | — |
| `/melcam/fonts/area/51683.otf` | 200 | font/otf | 189.896 | — |
| `/melcam/logo/symbol-preto.svg` | 200 | image/svg+xml | 5.960 | — |
| `/` `/polen` `/bee` `/acessorios` `/sobre` `/sacola` `/404` | 200 | text/html | — | — |

As dimensões não foram deduzidas do `content-type`: são lidas do marcador SOF do
próprio JPEG recebido. É o que separa "200 com a foto" de "200 com HTML de
login" — o teste que a produção anterior reprovava.

`node tools/qa-rede.js --base https://melcam-site.vercel.app` nas 7 rotas:
**0 requisições falhas, 0 imagens quebradas, 0 erros de console**, 95 fontes,
vídeo presente, 1 `<h1>` por página.

Conferido no navegador contra a produção: hero da `/polen` completa
(`1440×828`, foto nativa `1600×2400`) e grade da home inteira, com os cards em
superfície `#2B251C` e os títulos em papel — as duas correções, a de asset e a
de paleta, no ar. Capturas em `tools/shots-paleta/producao-polen-hero.png` e
`producao-home-grade.png`.

**Divergência anotada, fora do escopo desta tarefa:** na Vercel a rota `/404`
responde **HTTP 200**, enquanto o `serve.js` local responde 404. É o `cleanUrls`
servindo `404.html` como rota comum. Já era assim antes desta correção. Para
alinhar seria preciso configurar `routes`/`notFound` no `vercel.json` — não
mexi, porque não foi pedido e mexer em roteamento de produção sem pedido é
maior que o problema.

### Regressão da home

`node tools/medir.js "http://localhost:3030/" pos-assets-vercel` —
**4980×720 · 3593×512 · 2993×422**, `overflow:hidden`, escala 0,5 → 1,
translateY 150 → 0, **0 erros de console**, **0 diferenças** contra
`medidas/medida-desfile-mobile-13ago.json` nos 21 pontos. `index.html` com o
mesmo SHA-256 (`26606fb8d572eaee`).

Nenhum HTML, CSS, JS de site, imagem ou caminho foi alterado. A única mudança de
comportamento está em `.vercelignore`.

### Arquivos

`.vercelignore` · `tools/preflight.js` · novos `tools/verificar-assets-deploy.js`
e `tools/qa-rede.js`.

`AUDITORIA_PALETA.md` entrou na lista de exclusão junto com `progresso.md` e
`MOTION_SPEC.md` — é documento de trabalho, não conteúdo do site.

**Nenhum commit.**

---

## 🐝 HERO NOVO DA /bee — EM ANDAMENTO, INTERROMPIDO — 13/08/2026

> **LEIA ESTE BLOCO INTEIRO ANTES DE TOCAR EM QUALQUER ARQUIVO.**
> A sessão foi interrompida com as **fontes à frente dos builds**. O site
> servido em `localhost:3030` mostra a penúltima versão do hero, não a que
> está em `tools/`. O primeiro passo de quem continuar está em
> "RETOMAR POR AQUI", mais abaixo.

### O pedido

Hero nova, criativa e premium para `/bee`, **clara**, com personalidade
própria em relação à Polen: mais leve, mais jovem, portátil, ligada a moda e
acessório, marcada pelo mel. Escopo restrito à abertura da `/bee`, à transição
para a seção seguinte e à animação do hero. Sem commit.

Direção confirmada pelo cliente na abertura da tarefa: **papel como base, uma
grande forma em mel, e as Bees branca e amarela em camadas.**

### 🔴 A MEDIÇÃO QUE DEFINIU A COMPOSIÇÃO

Antes de compor, os oito PNG de `melcam/img/bee/` foram decodificados (zlib +
desfiltragem, sem dependência, mesma técnica do `corDoTile()` da Polen). Dois
achados mudaram tudo:

**1. Os packshots da Bee têm recorte de verdade — e os da Polen não tinham.**

| arquivo | dimensões | tipo | alfa=0 | alfa parcial |
|---|---|---|---|---|
| `bee-amarela-frente.png` | 683×339 | RGBA 8 | 27,4% | 3,3% |
| `bee-branca-frente.png` | 685×340 | RGBA 8 | 27,6% | 3,3% |
| `bee-amarela-angulo-corrente.png` | 1072×620 | RGBA 8 | 71,7% | 2,3% |
| `bee-branca-angulo-corrente.png` | 1090×550 | RGBA 8 | 69,1% | 2,6% |
| `bee-*-caixa.png` | ~745×595 | RGBA 8 | ~15,6% | 2,3% |

Isso liberou a composição gráfica que a `/polen` não pôde ter — lá os 7
packshots são RGB **sem** canal alfa, com o fundo da variante embutido, e por
isso o palco quadrado virou a solução. Aqui a câmera flutua de verdade.

> **Ressalva registrada, não corrigida:** a borda parcial carrega o verde do
> fundo de estúdio original (rgb ~17,65,32; 19% a 26% dos pixels de borda são
> distintamente esverdeados). Sobra um fio escuro de 1–2 px em volta do
> recorte. Sobre mel é imperceptível; sobre papel lê como contorno fino, e no
> tamanho usado não incomoda. **O arquivo oficial não foi retocado** — isso
> seria gerar asset, que o pedido proíbe.

**2. Nenhuma das duas Bees pode deitar sobre o mel.**

Cor dominante do corpo, amostrada por moda quantizada dos pixels opacos:

| | corpo | vs papel | vs mel | vs carvão |
|---|---|---|---|---|
| Bee amarela (frente) | `#CDBA29` | 1,84:1 | **1,02:1** | 8,41:1 |
| Bee branca (frente) | `#B5B5B4` | 1,92:1 | **1,02:1** | 8,08:1 |
| Bee amarela (ângulo) | `#B9AA0A` | 2,23:1 | **1,19:1** | 6,96:1 |
| Bee branca (ângulo) | `#ADB4B4` | 1,97:1 | **1,05:1** | 7,87:1 |

Luminância praticamente igual à do mel. A composição óbvia — produto grande
sobre o plano amarelo — sumiria. Daí as três decisões de arte, todas
consequência do número e todas registradas no cabeçalho do CSS:

1. cada Bee tem **sombra de contato própria** (`drop-shadow` duplo em marrom
   quente derivado do carvão, nunca preto puro). É o que separa objeto de
   fundo quando a luminância não separa. Não é glow: tem deslocamento
   vertical e não circunda a peça;
2. a **amarela** — o foco — fica majoritariamente sobre o papel, e a
   correntinha dela desenha a linha de movimento do conjunto;
3. a **branca** atravessa a curva do plano de mel: o encontro das duas cores
   de fundo vira assunto da composição em vez de acidente.

### Conceito visual

"Uma câmera para levar junto." Papel `#FBF7EE` de base; um grande plano em
`#F2A900` sangrando no topo e na direita, com o **canto inferior esquerdo
arredondado** — é esse raio que faz a divisão papel/mel ser curva e orgânica,
não uma reta. Sobre o plano, o **pattern do favo tom sobre tom**, desenhado em
SVG data-URI dentro do próprio CSS (hexágono de topo plano, a mesma orientação
impressa na frente da câmera, conferida nas fotos; circunraio 42, ladrilho
126×72,75, traço `#DE9E04`). Não é imagem: nada é baixado, nada vira asset.

### Diferença intencional em relação à hero da Polen

| | /polen | /bee |
|---|---|---|
| pele | carvão | papel e mel |
| imagem | 1 fotografia sangrando canto a canto | 2 packshots recortados, em camadas |
| leitura do texto | scrim de 3 gradientes por cima da foto | fundo chapado, sem véu nenhum |
| divisão | tela cheia, texto sobreposto | assimétrica, curva, ~46/54 |
| altura | 92svh | 80svh |
| CTA | mel sobre carvão | **carvão sobre papel** |
| scroll | paralaxe de −18px na foto | **nenhum** — nada se move depois da entrada |
| eyebrow | mel | carvão |

O CTA mudou de cor de propósito: numa página cuja assinatura já é um grande
plano amarelo, o botão de mel se dissolveria no assunto. Carvão sobre papel dá
15,51:1 e é o elemento mais escuro da dobra.

### Copy — e a correção factual que ela exigiu

- Eyebrow: **BEE**
- Título (`<h1>`): **Pequena o bastante para ir junto.**
- Texto: **"Sem peso, sem cerimônia. Uma câmera digital retrô feita para
  fotografar e continuar vivendo o momento."**
- CTA: **ESCOLHA SUA BEE** → `#modelos`, a seção real de seleção
- Apoio: **2 cores · foto e vídeo · filtros retrô** — o "2" é
  `BEE.cores.length`, derivado; "foto e vídeo" sai de `SPECS_BEE`
  ("Fotos" e "Vídeo Full HD 1080p e 720p"); "filtros retrô" sai de
  "Filtros criativos" mais o bloco "Filtros e estética retrô" da própria
  página. Nenhum número novo, nenhuma spec nova.

> 🔴 **O texto sugerido no pedido começava com "Sem tela, sem distrações" — e
> isso é FALSO para a Bee.** A Bee tem tela: `SPECS_BEE` traz "Tela LCD TFT de
> 0,96\"" nesta mesma página, e a tela aparece ligada, escrito "Goodbye", na
> foto oficial `header-fileira/bee-lp-22.jpg`. "Sem tela" é argumento da
> **Polen**, e lá está correto. A frase foi trocada preservando o ritmo
> ("Sem X, sem Y.") e o resto do período pedido. "Sem peso" apoia-se em
> "Aproximadamente 26 g", que é spec documentada.

> 🟡 **Duplicação de manchete resolvida com uma troca de copy fora do hero.**
> O `<h2>` de "Destaques" já era, palavra por palavra, "Pequena o bastante
> para ir junto" — a mesma frase que o pedido escolheu para o `<h1>`. Manter
> as duas repetiria a manchete na mesma página, o defeito que já foi corrigido
> na `/polen`. O `<h2>` passou a **"O que cabe em 26 gramas"**, derivado de
> spec aprovada logo abaixo dele. Está comentado no `tools/bee.js`.
> **Se o cliente preferir a frase antiga em Destaques, quem muda é o hero.**

### Assets escolhidos, todos abertos antes

| uso | arquivo | por quê |
|---|---|---|
| foco | `bee/bee-amarela-angulo-corrente.png` | único par do acervo com a **correntinha e o mosquetão** — a alça é a linha de movimento pedida, sem desenhar linha nenhuma |
| segundo plano | `bee/bee-branca-frente.png` | silhueta chapada, diferente da outra de propósito: duas câmeras no mesmo ângulo leriam como repetição |

Descartados, e por quê:

- `bee-branca-angulo-corrente.png` — espelha a amarela: mesma pose, mesma
  direção de corrente. Juntas viravam duas fotos iguais em cores diferentes.
- `bee-lifestyle-acessorio.jpg` — a melhor foto de "acessório" do acervo (Bee
  amarela pendurada na passante do jeans), mas **já é** a imagem do bloco
  "Câmera como acessório" desta mesma página. No hero seria a mesma foto duas
  vezes em `/bee`.
- `header-fileira/bee-lp-1169.jpg` — as duas Bees na mão contra o mar do Rio.
  Solar e perfeita de conceito, mas azul de ponta a ponta: dominaria uma
  página cuja assinatura é o mel, e azul não pertence à paleta.
- `header-fileira/bee-lp-22.jpg` — as duas amarelas sobre musgo; fundo verde
  escuro, o oposto de uma página clara.
- `*-caixa.png` e `*-traseira.png` — embalagem e verso não abrem uma página.

### Animação

Só CSS, com `both`: roda sozinha e termina no estado final mesmo se o script
não carregar — a lição do "hero em branco". Ao JS não sobrou animação nenhuma.

| peça | de | duração · atraso |
|---|---|---|
| plano de mel | `opacity 0` · `translateX 72px` | 900 ms · 0 |
| Bee branca | `opacity 0` · `translate(-22,16)` · `rotate(-15°)` | 780 ms · 200 ms |
| Bee amarela | `opacity 0` · `translate(34,24)` · `rotate(2,5°)` · `scale .965` | 860 ms · 320 ms |
| copy (5 peças) | `opacity 0` · `translateY 16px` | 620 ms · 80/170/270/360/440 ms |
| legenda de cores | idem | 620 ms · 520 ms |

Fecha em **1.180 ms**, dentro da faixa de 900–1300 pedida. Sem loop, sem
partícula, sem animação por letra, sem botão de repetir, sem biblioteca, sem
falso giro 3D. As rotações de repouso (−8° na branca, −2° na amarela) são
composição, não movimento: continuam valendo em reduced-motion.

Escalonar o plano de mel foi descartado — `scaleX` distorceria o raio de 320px
do canto, que é justamente o que desenha a curva.

### Transição para a seção seguinte

O hero termina em **papel na largura inteira** (a base do plano de mel para
antes do fim do hero, de propósito), e a seção `#modelos` da Bee passou a ser
**clara** — papel, cards em `#F3EDE0`, títulos em carvão, botão de mel de
volta porque ali o fundo é papel. De "Destaques" em diante a página volta ao
editorial escuro do site; essa volta é uma divisão declarada.

> 🔴 **A COSTURA DE 10 px — achado que vale para qualquer bloco claro futuro.**
> O stack do template (`header.framer-vrbx7h`) é flex column com **`gap:10px`
> e fundo carvão**. Esse vão existe entre TODAS as seções do site e nunca se
> viu, porque os dois lados sempre foram carvão. Entre o hero de papel e a
> seção de papel ele virou **uma linha escura atravessando a página** —
> exatamente a "mudança brusca para preto" que o pedido proíbe.
> Corrigido pintando o vão com `#modelos::before` (`top:-10px; height:10px`),
> **não** com margem negativa: puxar a seção mudaria a geometria da página
> inteira por causa de um problema de cor.

### Acessibilidade

- 1 `<h1>` por página, medido nos três breakpoints;
- `alt` informativo nas duas imagens (58 e 102 caracteres), nenhuma `<img>`
  sem `alt` na página;
- a legenda de cores traz o **nome escrito** ("Amarela · Branca"), então a
  informação não viaja só na cor da bolinha; as bolinhas são `aria-hidden`;
- **não é seletor**: o seletor funcional são os dois cards logo abaixo, e o
  pedido é explícito em não criar um segundo;
- CTA de 44 px de altura nos três breakpoints;
- foco de teclado em **carvão** nas duas zonas claras. A regra global desenha
  o anel em mel, calibrado contra o carvão (9,67:1 na auditoria); sobre papel
  o mel dá 1,88:1 e o anel praticamente some;
- eyebrow de `#modelos` em `#8A6A12` (4,73:1 no papel) — mel puro sobre papel
  reprova.

### Resultados medidos — desktop 1440×900 (versão v3, a que está servida)

| | valor |
|---|---|
| hero | 1440×720, x=0 (sangria cheia) |
| `#modelos` começa em | y=799 · **101 px de dobra** |
| título | **2 linhas**, 433 px e 289 px |
| CTA | 44 px, destino `#modelos`, alvo existe |
| transbordo horizontal | não |
| imagens quebradas | 0 |
| `<img>` sem alt | 0 |
| `<h1>` | 1 |
| animações rodando depois de assentar | **0** |
| elementos com opacidade < 1 | **0** |
| erros de console | **0** |

### 🔴 RETOMAR POR AQUI

**As fontes estão à frente dos builds.** O último ajuste (reordenar o DOM e
mover a forma de mel para dentro do palco) foi gravado em `tools/` e **não**
foi sincronizado. Estado conferido em disco:

| build | estado |
|---|---|
| `melcam/interacoes.js` | ✅ sincronizado (idêntico a `hero-carrossel.js.js()`) |
| `bee.html` | ⚠️ tem o hero, mas com a **ordem antiga do DOM** (palco antes do texto) |
| `melcam/identidade.css` | ⚠️ tem o CSS da v3, sem a reestruturação do palco |

**Passo 1 — consertar `tools/sincronizar-bee.js` antes de rodá-lo.**
Ele localiza o trecho a trocar pela constante `ABRE`, que ainda aponta para a
abertura ANTIGA (`<section class="mel-sec mel-abertura mel-bee-abertura"`).
Essa string não existe mais em `bee.html`, então o script vai reprovar com
"abertura antiga não encontrada". `ABRE` precisa aceitar também
`\n<section class="mel-bh"`, que é o marcador atual. O `FIM`
(`</ul>\n  </div>\n</section>`) continua válido. O script não grava nada se
qualquer verificação falhar, então rodá-lo por engano é inofensivo.

**Passo 2 — `node tools/sincronizar-bee.js`** e conferir as três linhas de
saída mais o "bee.html contém conteudo() da fonte, 1x".

**Passo 3 — `node tools/preflight.js`** (tem de sair limpo, CSS balanceado).

**Passo 4 — `node tools/qa-bee.js`** e reler tablet e mobile: foi justamente
o defeito do retrato que motivou a reestruturação, e **ele ainda não foi
revalidado**. O que estava errado antes da correção, medido:

- em 768 e 390 o plano de mel media a altura contra o hero inteiro e saía com
  **633 px** (tablet) e **582 px** (mobile) onde cabiam ~190;
- o palco vinha ANTES do texto no DOM, então o retrato abria pelo produto em
  vez da manchete;
- a manchete quebrava em **três linhas** nos dois retratos, com "junto."
  órfão — causado por um `max-width:14ch` no bloco de retrato, já trocado por
  `22ch`.

### O que ainda NÃO foi feito

1. **Revalidar tablet 768×1024 e mobile 390×844** depois da sincronia (é o
   item mais importante e o motivo da interrupção).
2. **`MOVIMENTO=reduce node tools/qa-bee.js`** — o CSS de reduced-motion está
   escrito e desliga todas as `animation` mantendo as rotações de repouso, mas
   **não foi medido no navegador**.
3. **QA da home:** `node tools/medir.js "http://localhost:3030/" pos-hero-bee`.
   Aceite: 4980×720 · 3593×512 · 2993×422, `overflow:hidden`, escala 0,5→1,
   translateY 150→0, 0 erros de console, 0 diferenças contra
   `medidas/medida-desfile-mobile-13ago.json`, e `index.html` com o mesmo
   SHA-256 `26606fb8d572eaee`.
4. **`node tools/verificar-assets-deploy.js`** — o hero trocou
   `bee-amarela-frente.png` por `bee-amarela-angulo-corrente.png`. O pré-voo
   seguiu marcando 93 assets publicáveis (um saiu, um entrou), mas a
   verificação dedicada não foi rodada depois da última mudança.
5. **Regressão da `/polen` e das demais internas** — nada foi tocado fora de
   `body.mel-pagina-bee`, mas não foi medido.
6. **Capturas de entrega** (desktop, tablet, mobile, transição, reduced-motion).
   Há capturas parciais em `tools/shots-bee/`.
7. **Sacola, navbar e menu** — não foram tocados, não foram reconferidos.

### 🟡 DUAS DECISÕES QUE PRECISAM DO CLIENTE

**1. A barra "Bee · Modelos · Destaques · R$ 299,00 · Comprar".**
O pedido manda avaliar e **não remover sem confirmação**. A avaliação:
ela repete os dois defeitos que tiraram a barra equivalente da `/polen` em
13/08 — duplica a navbar logo abaixo dela, e o "Comprar" dela compete com o
"Escolha sua Bee" do hero, que é o próximo passo certo. Medida: 555×59 px,
`position:sticky`, começando em y=0, com o hero empurrado para y=69.

Fica um agravante novo: ela é um bloco de largura de conteúdo (555 px)
centralizado dentro da faixa carvão da navbar. Enquanto a página era escura
isso não aparecia; contra um hero de papel, aparece.

Foi **mantida**, e recebeu pele clara escopada em `body.mel-pagina-bee`
(fundo papel a 86%, texto carvão) para não ficar uma faixa carvão translúcida
colada em cima de um hero de papel. **Se a decisão for remover, é o mesmo
procedimento da Polen:** tirar `barra()` de `conteudo()` e do arquivo em
`tools/bee.js`, e nesse caso as regras `body.mel-pagina-bee .mel-barra*` em
`tools/bee-interacoes.js` saem junto. O CSS `.mel-barra` em `tools/paginas.js`
só é usado pela Bee — se ela sair, ele fica órfão.

**2. O `<h2>` de Destaques**, descrito acima.

### Arquivos

**Fontes**

| arquivo | o que mudou |
|---|---|
| `tools/bee-interacoes.js` | **novo** — `css()` e `js()` do hero, o pattern do favo, a pele clara de `#modelos`, o foco de teclado das zonas claras, a pele clara da barra |
| `tools/bee.js` | `abertura()` → `hero()`; markup novo; `<h2>` de Destaques; `conteudo()` |
| `tools/paginas.js` | saiu o CSS da abertura antiga (`.mel-bee-*` e os keyframes `mel-bee-gira` / `mel-bee-revela`); entrou a injeção do `css()` da Bee |
| `tools/hero-carrossel.js` | injeta o `js()` da Bee e chama `iniciarHeroBee()` |

**Ferramentas novas**

| arquivo | o que faz |
|---|---|
| `tools/sincronizar-bee.js` | sincronia cirúrgica dos builds, com fronteiras verificadas, chaves balanceadas e `new Function` como guarda de sintaxe. Idempotente. Não grava nada se qualquer verificação falhar. **Precisa do conserto do Passo 1.** |
| `tools/qa-bee.js` | QA do hero nos 3 breakpoints: altura, dobra, quebra do título por `Range` (linhas de verdade), CTA, transbordo, imagens, `<h1>`, animações vivas, opacidades, console. `MOVIMENTO=reduce` para o outro cenário. Grava JSON e capturas em `tools/shots-bee/`. |

**Builds** — `bee.html`, `melcam/identidade.css`, `melcam/interacoes.js`
(estado exato na tabela do "RETOMAR POR AQUI").

### Armadilhas desta passagem, para o próximo não cair

1. **`melcam/identidade.css` é 100% CRLF; os geradores emitem LF.** Todo texto
   novo tem de entrar convertido, senão a folha vira mista e qualquer diff
   futuro fica ilegível. `bee.html` é misto de propósito (CRLF do template,
   LF no conteúdo injetado) e `melcam/interacoes.js` é 100% LF.
2. **Guarda de varredura não pode casar com o próprio registro.** A checagem
   "sobrou seletor da abertura antiga" reprovava o comentário que documenta a
   remoção, porque ele cita `.mel-bee-l1, .mel-bee-palco, …` — com vírgula. A
   varredura passou a rodar na folha **sem comentário**.
3. **`getClientRects()` no elemento devolve a caixa, não as linhas.** Para
   contar linhas de uma manchete é preciso `Range.selectNodeContents(el)` e
   ler os rects do Range. Contar por `offsetHeight / line-height` erra quando
   a fonte de display tem métrica própria.
4. **`elementFromPoint` não enxerga pseudo-elemento.** Testar se o `::before`
   fechou a costura de 10px por ali dá falso negativo; a prova é a captura.
5. **Posicionamento absoluto resolve contra o ancestral posicionado mais
   próximo.** Deixar a forma de mel filha do hero e as câmeras filhas do palco
   funcionou no desktop e quebrou no retrato, onde as duas caixas passam a ter
   alturas diferentes. Um sistema de coordenadas só.

**Nenhum commit. Nenhum deploy.**

---

## 📦 COMMIT E PUBLICAÇÃO DESTE ESTADO — 13/08/2026

A pedido, tudo o que estava na árvore de trabalho foi commitado e enviado,
**inclusive o hero da /bee interrompido**. O "RETOMAR POR AQUI" acima continua
valendo palavra por palavra: as fontes seguem à frente dos builds, e o que está
publicado é o `bee.html` com a ordem antiga do DOM.

| item | valor |
|---|---|
| commit | `48dda9d` — "Paleta aplicada abaixo do body, assets do deploy corrigidos e hero da /bee" |
| push | `origin/main`, 22 arquivos, +3820 −168 |
| preview | `melcam-site-lchnxuak8-viabetels-projects.vercel.app` (feito antes do commit, da mesma árvore) |
| produção | `melcam-site-cs9aip2dp-…`, **automática**, disparada pelo push |
| URL pública | `https://melcam-site.vercel.app` — 200 em `/`, `/polen` e `/bee` |

**O repositório está conectado à Vercel: push em `main` publica em produção
sozinho.** Não é preciso rodar `vercel deploy --prod`, e não dá para commitar em
`main` sem publicar. Quem for retomar o hero da Bee decide antes se trabalha em
branch.

**Proteção da Vercel:** segue **ligada**. As URLs de preview respondem 302 para
`vercel.com/sso-api`; só o domínio de produção abre sem login. Desligar de vez é
o toggle *Settings → Deployment Protection → Vercel Authentication → Disabled*,
que ninguém virou até aqui.

Antes de subir: raiz canônica conferida pelo `.melcam-project.json` e
`node tools/verificar-assets-deploy.js` — 93 assets publicáveis, 241 arquivos no
deploy, nenhum asset referenciado caindo no `.vercelignore`. Isso fecha o item 4
da lista "O que ainda NÃO foi feito". Os itens 1, 2, 3, 5, 6 e 7 continuam
abertos, e as duas decisões do cliente continuam pendentes.

---

## ✅ RETOMADA: SINCRONIA FECHADA, RETRATO REVALIDADO E A BARRA REMOVIDA — 13/08/2026, tarde

Retomado exatamente pelo "RETOMAR POR AQUI" acima. As fontes deixaram de estar
à frente dos builds, os itens 1, 2, 3, 5 e 7 da lista de pendências foram
fechados, e a **decisão 1 do cliente chegou no meio da passagem: a barra sai.**

### Passo 1 — o conserto do `tools/sincronizar-bee.js`

A constante `ABRE` apontava só para a abertura pré-hero, que não existia mais em
`bee.html`; o script reprovava sem gravar. Agora ela tem **três formas** e o
script escolhe pela que está no arquivo:

| forma | quando serve |
|---|---|
| `<div class="mel-barra" data-mel="barra-produto">` | a barra saiu da fonte e ainda está no build |
| `<section class="mel-sec mel-abertura mel-bee-abertura"` | build anterior ao hero novo |
| `<section class="mel-bh"` | build já com o hero |

> 🔴 **A ordem das três importa, e é por isso que a barra vem primeiro.**
> O corte antigo começava no hero e reinjetava `conteudo()` a partir do hero, de
> propósito ("a barra fica onde está"). Com a barra fora da fonte, esse mesmo
> corte gravaria um build **que ainda contém a barra** — e a prova final diria
> `[OK]`, porque `conteudo()` estaria lá, inteiro e uma vez só, com a barra
> sobrando por cima dele. Foi acrescentada uma segunda prova, lida do disco:
> `[OK] bee.html sem a barra de produto`. Prova que só confirma o que você
> espera achar não é prova.

### Passo 2 — builds sincronizados

| build | de → para |
|---|---|
| `melcam/interacoes.js` | 57.492 → 57.492 (já estava) |
| `bee.html` | 424.977 → 425.223 |
| `melcam/identidade.css` | 88.863 → 88.049 · chaves 437/437 |

Finais de linha conferidos depois de gravar, que é a armadilha 1 da passagem
anterior: `identidade.css` 100% CRLF, `interacoes.js` 100% LF, `bee.html` misto
(412 CRLF do template, 105 LF do conteúdo injetado). Pré-voo limpo.

### Passo 3 — o retrato, que era o motivo da interrupção

Revalidado nos três breakpoints, com e sem `prefers-reduced-motion`:

| | desktop 1440 | tablet 768 | mobile 390 |
|---|---|---|---|
| hero | 1440×720 | 768×721 | 390×674 |
| `#modelos` começa em | y=730 | y=731 | y=684 |
| dobra | 170 px | 293 px | 160 px |
| título | 2 linhas | 2 linhas | 2 linhas |
| plano de mel | 777×666 | **400×240** | **312×181** |
| CTA | 44 px | 44 px | 44 px |
| animações vivas · opacidade < 1 · console | 0 · 0 · 0 | 0 · 0 · 0 | 0 · 0 · 0 |

Os três defeitos do retrato morreram: o plano de mel media **633 px** (tablet) e
**582 px** (mobile) contra os 240 e 181 de agora; o palco vinha antes do texto no
DOM e agora o retrato abre pela manchete; o título quebrava em três linhas com
"junto." órfão e agora quebra em duas.

**Reduced-motion medido, não deduzido:** geometria idêntica à do movimento
normal, opacidade 1 em todas as peças, 0 animações em execução e as rotações de
repouso preservadas (−8° na branca, −2° na amarela). Capturas em
`tools/shots-bee/hero-*-reduzido.png`.

### A BARRA DE PRODUTO SAIU — decisão do cliente, 13/08 à tarde

O pedido foi direto: *"Bee / Modelos / Destaques / R$ 299,00 / Comprar tira
isso"*. Removida pelo mesmo procedimento da Polen. Os dois motivos já
registrados valiam (duplicava a navbar; o "Comprar" dela competia com o "Escolha
sua Bee" do hero), e a medição desta passagem trouxe **um terceiro, que ninguém
tinha visto**:

> 🔴 **Em 390px a barra cobria o botão "Abrir menu" — no celular não havia como
> abrir o menu do site a partir da /bee.**
> A barra é `sticky`, `z-index:40`, e em 390 mede 366 px começando em x=12; o
> abridor fica em x=24..48 · y=29..53, dentro dela. Teste de acerto na /bee em
> 390: `document.elementFromPoint` no centro do abridor devolvia
> `DIV.mel-barra-in`, não o abridor. Em 768 não colidia (a barra fica centrada,
> em x=201) e nas outras rotas a barra não existe — o defeito era exclusivo da
> /bee no retrato estreito. **Nenhuma captura mostrava isso**, porque a barra
> parecia só mais uma faixa no topo, e nenhum console acusava: clique que cai no
> elemento errado não é erro, é clique.

O que saiu, em fonte e build:

| arquivo | o que saiu |
|---|---|
| `tools/bee.js` | `barra()` e a chamada dela em `conteudo()` |
| `tools/bee-interacoes.js` | as 5 regras `body.mel-pagina-bee .mel-barra*` (a pele clara) |
| `tools/paginas.js` | o bloco `.mel-barra*` inteiro e as 3 linhas do breakpoint de retrato — **a Bee era o último usuário** |
| `bee.html` · `melcam/identidade.css` | zero ocorrências de `mel-barra` nos dois |

Duas referências ficaram apontando para um lugar que não existe mais, e foram
corrigidas junto — não são cosméticas:

- **`tools/mover-conteudo-interno.js`** ancorava a /bee em
  `<div class="mel-barra" data-mel="barra-produto">`. Se ele rodasse depois da
  remoção, não acharia a âncora da /bee. Passou a `<section class="mel-bh"
  data-mel="bee-hero"`, a mesma troca que a Polen já tinha feito.
- **`tools/qa-bee.js`** media `barraExiste`. Virou `barraSobrou`, com o sentido
  invertido: se algum gerador trouxer a barra de volta, o QA acusa. Voltar não é
  detalhe de composição, é o menu do celular de novo bloqueado.

### Depois da remoção, remedido

| | desktop | mobile |
|---|---|---|
| menu abre | sim | **sim** |
| painel | 168×212 em (24,81), fundo `#221E17` opaco | idêntico |
| pior contraste do painel | 8,25:1 | 8,25:1 |
| fecha com Escape | sim | sim |
| ícone do abridor | 15,51:1 | 15,51:1 |
| console | 0 | 0 |

`/sacola` conferida na mesma passagem: 1 `<h1>` ("Sacola", 15,51:1), sem
transbordo, 0 imagens quebradas, abridor de menu presente.

### Ferramenta nova

**`tools/qa-navegacao-bee.js`** — navbar, menu e sacola medidos, que é o item 7
do handoff. Ele nasceu errado três vezes, e as três estão comentadas dentro do
arquivo porque qualquer sonda futura vai tropeçar nelas:

1. **O abridor não é `<button>`.** É `div[role="button"]` com
   `aria-label="Abrir menu"` e `data-framer-name="Meniu"` (a grafia é do
   template). Procurar `nav button` acha só a lupa e conclui, errado, que a
   página não tem menu.
2. **`.click()` não abre.** O Framer escuta pointer events; o clique tem de ser
   despachado por coordenada com `Input.dispatchMouseEvent`.
3. **Existem DOIS abridores no DOM, um por variante do template.** Abaixo de
   810px o primeiro colapsa para 0×0 e quem aparece é o segundo. `querySelector`
   devolve o primeiro, então clicar nele no mobile clica em (0,0) e o painel não
   abre. Isso quase virou o laudo "no mobile não há como sair da /bee" — que
   estava certo no efeito e errado na causa. Medido em 7 larguras × 6 rotas: o
   abridor visível existe sempre. A sonda escolhe o que **tem caixa**.

E uma quarta, sobre medir contraste em vez de olhar: **pular fundo translúcido e
usar o do ancestral dá número falso.** A barra tinha papel a 86% sobre carvão;
ignorar o alfa devolvia 1:1 (carvão sobre carvão) e acusava uma falha
inexistente. A sonda **compõe** as camadas até o primeiro fundo opaco. Ícone sem
texto é medido pelo desenho (o `background` das barrinhas), porque a lupa do
template tem `color` com alfa 0 — medir `color` ali é medir nada.

> 🟡 **Pisei na armadilha da crase que o próprio AGENTS.md documenta.** Um
> comentário citando a propriedade `color` entre crases, dentro de um template
> literal, quebrou o arquivo em `SyntaxError`. A guarda existe, o registro
> existe, e ainda assim aconteceu. O comentário hoje escreve o nome da
> propriedade por extenso, sem crase.

### Home e demais rotas — sem regressão

`node tools/medir.js "http://localhost:3030/" pos-hero-bee`, duas corridas,
contra `medidas/medida-desfile-mobile-13ago.json`: **620 chaves comparadas, 2
diferenças**, e nenhuma é regressão:

- `rotulo` — é o nome da medição.
- `telas.mobile.filhos.3.imgNatural` — `914x685` → `565x423`, mesma
  `polen-gallery-01.jpg`, mesmo `layoutW`, `telaW`, `proporcao`, `objectFit` e
  `radius`. É **qual candidato do `srcset` o navegador escolheu**, não o que a
  página desenha: o arquivo em disco tem 1200×900 e as duas entradas do
  `srcset` (512w e 828w) apontam para ele. `naturalWidth` vem corrigido pela
  densidade — 1200 ÷ (512/390) = 914; 1200 ÷ (828/390) = 565. Os dois números
  descrevem o mesmo pixel na tela. `index.html` continua com o SHA-256
  `26606fb8d572eaee`, o valor de aceite.

`node tools/qa-polen.js`: 6 cenários ok. `node tools/qa-story.js`: 9 capítulos,
subida e descida casadas, 0 erros. `node tools/qa-rede.js`: 7 rotas, 0 imagens
quebradas, 0 falhas de requisição (o único console é o 404 esperado da /404).
`node tools/verificar-assets-deploy.js`: 93 publicáveis, 241 arquivos.

> 🟡 **Tons da /bee fora da lista oficial, de propósito e ainda não registrados
> em `AUDITORIA_PALETA.md`:** `#8A6A12` (eyebrow, 4,73:1 no papel), `#F3EDE0`
> (card), `#6B6254`, `#4A4236`, `#4A340A`. Todos derivados para dar contraste
> sobre papel, todos escopados em `body.mel-pagina-bee`. O `qa-paleta.js` os
> lista como "não oficiais" porque a lista não os conhece — não porque estejam
> errados. **Quem for mexer na paleta registra os cinco antes**, senão a próxima
> auditoria vai "corrigir" o que foi decidido aqui.

### O que continua aberto

1. **Capturas de entrega** — há `tools/shots-bee/hero-{desktop,tablet,mobile}
   [-reduzido].png`, `nav-menu-{desktop,mobile}.png` e `sacola-desktop.png`.
   Falta a captura dedicada da transição hero → `#modelos`.
2. **O `<h2>` de Destaques** — a decisão 2 do cliente segue pendente. Hoje é
   "O que cabe em 26 gramas"; a frase antiga ("Pequena o bastante para ir
   junto") é o `<h1>` do hero, e as duas não podem coexistir na mesma página.
3. **Registrar os cinco tons da Bee** em `AUDITORIA_PALETA.md`.

**Nenhum commit. Nenhum deploy.** Lembrando o que já está escrito acima: o
repositório está conectado à Vercel e **push em `main` publica em produção
sozinho**.

---

## 👤 CONTA NA NAVBAR, ACESSO LOCAL E A NAVBAR DA /bee — 13/08/2026, noite

Quatro pedidos numa passagem: menu de perfil retrátil, login e criação de conta,
ligar o "Carrinho" ao que já existe, e achar a causa real do defeito da navbar
no mobile da /bee. Nada de reformulação visual: tudo reusa a paleta, as fontes,
as curvas de movimento e os padrões que já estavam no projeto.

### 1. O QUE JÁ EXISTIA, e por isso não foi reinventado

Antes de escrever qualquer coisa, a varredura respondeu três perguntas:

| pergunta | resposta encontrada |
|---|---|
| há autenticação (Supabase, Firebase, API)? | **não.** Site 100% estático, sem servidor. O próprio `melcam.config.json` lista em PENDENTES que nem o gateway de pagamento existe |
| há carrinho? | **sim, inteiro.** `iniciarSacola()` em `tools/hero-carrossel.js`: chave `melcam:sacola` no localStorage, página `/sacola` com lista, quantidade, subtotal e `aria-live`, e um checkout que declara não estar integrado |
| como se abre um menu neste projeto? | `iniciarMenu()`: painel criado no clique, entrada por smoothstep de 400 ms (MOTION_SPEC §7), Escape, clique fora, fecha no resize, foco devolvido ao botão |

Então: o carrinho **não foi criado**, foi **ligado**. E o menu de perfil nasceu
com a mesma curva, a mesma âncora e o mesmo vocabulário do menu que já havia —
dois painéis vizinhos com entradas diferentes se notam na hora.

### 2. Menu de perfil

`tools/perfil.js` (novo), `css()` + `js()`, injetado por `paginas.js` e
`hero-carrossel.js` como os módulos de página. Um botão de 44×44 na ponta
direita da navbar, ícone Phosphor de 24px — a mesma família da lupa que o
template já trazia, não biblioteca nova.

| estado | o que o painel mostra |
|---|---|
| desconectado | Entrar · Criar conta · Carrinho |
| conectado | nome e e-mail no topo · Carrinho · Sair |

O pedido pedia "Entrar, Carrinho, Sair". **"Sair" só aparece conectado**, como o
próprio pedido autorizou: sair sem sessão é um botão que não faz nada.

Teclado: `aria-haspopup`, `aria-expanded`, `role="menu"`/`menuitem`, seta para
baixo abre, setas andam, Home e End vão às pontas, Escape fecha e devolve o foco
ao botão, Tab fecha em vez de deixar foco preso em painel invisível. Hover,
focus e active têm estados próprios; todo item tem 44px de altura.

> 🔴 **OS DOIS MENUS NÃO PODEM CONVIVER, e a coordenação é por evento.**
> O hambúrguer e o perfil ficam a 44px um do outro. Abertos juntos em 320px,
> cobrem a tela inteira. Quem abre emite `mel:fechar-menus` com o próprio nome;
> quem escuta e não é o autor, fecha. São 4 ocorrências no build (2 emissores +
> 2 ouvintes) e o `sincronizar-perfil.js` conta as quatro — se alguém apagar um
> lado, a sincronia reprova.

### 3. Acesso: o que é, e o que está escrito na tela

Sem servidor, isto é **demonstração local** — e o código foi escrito para não
mentir sobre isso em lugar nenhum:

- **senha nunca é guardada.** Fica PBKDF2-SHA-256, 210.000 iterações, sal
  aleatório de 16 bytes por conta, pelo WebCrypto. O QA prova por busca literal:
  a senha digitada não aparece em nenhum byte do `localStorage`;
- **sem WebCrypto, o cadastro é recusado** com a razão na tela. Guardar senha
  fraca "só para funcionar" seria pior do que não funcionar;
- **o rodapé do cartão diz** que a conta vale só naquele navegador, que nada é
  enviado a lugar nenhum e que a senha não pode ser recuperada do que ficou;
- **e-mail inexistente e senha errada dizem a MESMA frase.** Diferenciar entrega
  quais e-mails têm conta.

Validação: nome, e-mail (regex com @ e domínio), senha (8+, letras e números),
confirmação. Erro por campo com `aria-invalid` e `aria-describedby`, mais um
aviso `role="alert"` no topo. Validação no `blur`, nunca a cada tecla: acusar
e-mail inválido na terceira letra é hostil com quem ainda digita. Estado de
carregamento com giro e texto, trava dupla contra envio repetido (`enviando` +
`disabled`), `autocomplete` que muda com o modo (`new-password` ao criar,
`current-password` ao entrar), foco preso no cartão, Escape e clique fora
fechando, rolagem travada em `<html>` e devolvida ao fechar. Sessão em
`melcam:sessao`, que sobrevive ao recarregar; Sair limpa e a interface reage na
hora, sem recarregar — e **não apaga a sacola**.

**O que falta para virar autenticação de verdade** está no cabeçalho de
`tools/perfil.js`, em cinco itens: contas no servidor, hash no servidor, sessão
em cookie httpOnly+Secure+SameSite, limite de tentativas, verificação de e-mail
e recuperação de senha. As duas portas de dados (`Contas` e `Sessao`) são as
únicas a reescrever quando houver backend.

### 4. 🔴 A NAVBAR DA /bee NO MOBILE — a causa real

**Causa.** A navbar do template é `position:fixed` com 81px de altura, portanto
**fora do fluxo**. Nas páginas internas o primeiro bloco começa em y=0 — na
/bee, `section.mel-bh`, o hero. Medido: `navFixa y=0 h=81` e `mel-bh y=0`. Na
home isso não acontece porque o stack começa em y=844, depois do vídeo. Na
/polen acontece igual e **ninguém vê: carvão sobre carvão**. Na /bee, cujo hero
é papel, a mesma faixa vira uma tarja escura atravessando uma composição clara.

Não é ordem de pilha: `z-index` não tem nada a ver, e empilhar z-index aqui
esconderia o sintoma sem tocar na causa. Também não é `transform` em ancestral
— a sonda procurou containing block de `fixed` (transform, filter, perspective,
will-change, contain, opacity) acima da faixa e **não achou nenhum**, nas cinco
larguras.

**Solução.** A faixa veste a pele da página, escopada em `body.mel-pagina-bee`:
papel no fundo, carvão no desenho. Os 81px deixam de ser tarja e passam a ser o
alto do hero. Empurrar o hero para baixo com `padding-top:81px` foi descartado:
resolveria a sobreposição criando uma tira de papel morta sob a faixa, um hero
81px mais alto e a dobra medida fora do lugar.

**Por que funciona.** O problema nunca foi a sobreposição em si — barra fixa
sobrepõe conteúdo por definição, e o hero não perde nada visível por baixo de
uma faixa opaca. O problema era a faixa ser de outra página. Vestindo papel, ela
passa a pertencer à composição, e o hero lê como uma folha só.

> 🔴 **SÃO DUAS `<nav>`, COM NOMES DIFERENTES — e a primeira tentativa da
> correção falhou exatamente aí.** O template traz
> `data-framer-name="Navigation Color"` (desktop) e `"Navigation Mobile Coor"`
> (mobile, truncado assim mesmo no export). Escopei pela primeira: no mobile a
> faixa continuou carvão **e as barrinhas do ícone já tinham virado carvão**.
> Resultado pior que o defeito original: hambúrguer e perfil invisíveis em
> 390px, ainda clicáveis. Um QA que só medisse clique passaria — foi a captura
> que mostrou. O seletor agora casa pelo **prefixo** do nome.

> 🔴 **O LOGO É UM SÍMBOLO SÓ, COM CINCO `<use>` NA MESMA PÁGINA.**
> Com a faixa clara, o logo sumiu: ele tinha `fill="#FBF7EE"` cravado pelo
> `tools/logo.js`, papel sobre papel. Recolorir o símbolo apagaria o logo do
> rodapé, que segue em carvão. A saída foi `fill="currentColor"`: cada `<use>`
> pinta com a cor do seu contexto. Papel é o padrão (`tools/identidade.js`),
> carvão só na navbar da /bee. **Sem a regra de `color`, o logo herda o azul de
> link do navegador** — foi o que apareceu na home antes de a regra entrar na
> folha construída.

**Validação em mobile.** `tools/qa-navbar-mobile.js` (novo) mede /bee, /polen e
/ em **320, 375, 390, 430 e 768**: posição e altura da faixa, containing block
de `fixed` em todos os ancestrais, transbordo horizontal, quem recebe o clique
no centro de cada controle, alvo de toque, conteúdo coberto pela faixa, o painel
abrindo na frente do conteúdo e dentro da tela, comportamento ao rolar para
baixo e a volta ao rolar para cima, e erros de console.

### 5. Três defeitos que a medição achou de quebra

> 🔴 **Em 320px o botão de perfil nascia com o centro FORA DA TELA — meu.**
> O slot de ícones do template (`Section Icon`) tem largura fixa de 136px vinda
> do Framer: em 320 ele começa em x=226 e termina em 362. Um botão anexado ali
> nascia em x=318, com o centro em 340 numa tela de 320. Não havia transbordo
> horizontal para denunciar, porque a faixa recorta. Corrigido ancorando o botão
> na **linha** da navbar (o pai do slot), que é flex com `space-between` e
> respeita o padding de 24px em qualquer largura.

> 🟡 **A lupa do template é um botão invisível que recebia foco de teclado.**
> `color:rgba(51,51,51,0)`, 20×20, sem ação nenhuma — quem navega por Tab parava
> num controle que não existe na tela. Agora leva `aria-hidden`, `tabindex="-1"`
> e `pointer-events:none`. Continua no DOM, como manda a casa.

> 🟡 **O link da marca era `aria-hidden="true"` e focável ao mesmo tempo.**
> Achado por acidente: depois de filtrar controles inertes, a contagem da sonda
> caiu de 4 para 2 e o link do logo foi junto — ele carregava `aria-hidden` no
> export. A combinação é proibida: o leitor de tela não anuncia nada e o Tab
> para ali mesmo assim, num link anônimo. Como ele **é** o caminho para a home,
> a correção foi dar nome ("MELCAM, ir para a página inicial") e tirar o
> `aria-hidden` — não esconder mais.

### 6. Arquivos

**Novos** — `tools/perfil.js` (menu, acesso e sessão), `tools/qa-perfil.js`
(33 verificações por largura), `tools/qa-navbar-mobile.js` (5 larguras × 3
rotas), `tools/qa-navegacao-bee.js`, `tools/sincronizar-perfil.js`,
`tools/sincronizar-logo.js`.

**Alterados** — `tools/paginas.js` e `tools/hero-carrossel.js` (injeção +
`iniciarPerfil()` + coordenação dos menus + evento `mel:sacola-mudou`),
`tools/bee-interacoes.js` (pele clara da navbar da /bee),
`tools/identidade.js` (cor do logo), `tools/logo.js` (`currentColor`).

**Builds** — `melcam/interacoes.js`, `melcam/identidade.css` e os sete HTML que
carregam o símbolo do logo.

> 🔴 **ORDEM DENTRO DA FOLHA É REQUISITO, NÃO ESTÉTICA.**
> `sincronizar-bee.js` corta do marcador da Bee até o **fim do arquivo** e
> reescreve. Qualquer bloco depois dele seria apagado na próxima sincronia da
> Bee, em silêncio, com o script ainda dizendo `[OK]`. Por isso o bloco do
> perfil entra **antes** do bloco da /polen, e `sincronizar-perfil.js` prova a
> posição no fim: `[OK] bloco do perfil antes de /polen e /bee`.

### 7. Testes

| comando | resultado |
|---|---|
| `node tools/preflight.js` | limpo, CSS balanceado (507/507), SHA-256 do que a porta serve conferindo com o disco |
| `node tools/qa-perfil.js` | **66/66** (33 verificações × 1440 e 390) |
| `LARGURAS=320 node tools/qa-perfil.js` | **33/33** |
| `node tools/qa-navbar-mobile.js` | 3 rotas × 5 larguras (320·375·390·430·768): 3/3 controles recebendo clique, 0 transbordo, 0 erro de console, nenhuma falha |
| `node tools/qa-bee.js` (+ `MOVIMENTO=reduce`) | 3 breakpoints × 2 cenários, 0 animação viva, 0 opacidade < 1, `barraSobrou:false` |
| `node tools/qa-navegacao-bee.js` | menu abre nos dois tamanhos, pior contraste 8,25:1, Escape fecha, `/sacola` íntegra |
| `node tools/qa-polen.js` | 6 cenários ok |
| `node tools/qa-rede.js` | 7 rotas, 0 imagem quebrada, 0 falha de requisição |
| `node tools/qa-story.js` | 9 capítulos, subida e descida casadas, 0 erro |
| `node tools/medir.js` (home) | 620 chaves, 2 diferenças, nenhuma real |
| `node tools/verificar-assets-deploy.js` | 93 publicáveis, 241 arquivos |

Não há suíte de testes nem lint no projeto (site estático, sem build): o que faz
esse papel são os `tools/qa-*.js` e o `preflight.js`, e todos foram rodados.

> 🟡 **O SHA-256 de aceite da `index.html` MUDOU, e é esperado.**
> Era `26606fb8d572eaee`, agora é `259a2fc52065f2f7`. A causa é única e
> conhecida: o símbolo do logo passou a `fill="currentColor"` nos sete HTML que
> o carregam. A medição da home continua batendo com
> `medidas/medida-desfile-mobile-13ago.json` em 620 chaves — o layout não se
> moveu. **Quem for conferir a home daqui para a frente usa o SHA novo.**

### 8. Limitações que ficam

1. **Não há backend.** A conta vale por navegador. Os cinco passos para
   autenticação real estão no cabeçalho de `tools/perfil.js`.
2. **Não há recuperação de senha nem verificação de e-mail** — as duas exigem
   servidor de e-mail.
3. **O checkout continua declarando que não está integrado**, como já estava.
4. **Sem limite de tentativas**: qualquer trava feita no cliente o usuário
   remove pelo console. Fica para o servidor.
5. `:has()` é usado numa regra de conveniência (o recorte do realce do botão).
   Em navegador sem `:has()` o botão continua clicável, só perde o arredondado
   do hover nas bordas.
6. **As páginas jurídicas e as de contato/FAQ não têm navbar** —
   `privacidade`, `termos`, `privacy-policy`, `terms-and-conditions`, `contact`
   e `faq` são documentos próprios (`tools/rotas.js`), carregam a
   `identidade.css` mas não a `interacoes.js` e nunca tiveram nav, logo nem
   menu. Então também não têm o controle de conta. Isso é anterior a esta
   passagem e não foi alterado; se o cliente quiser navegação nelas, é um
   pedido separado, e o `iniciarPerfil()` já sai limpo quando não acha navbar.

**Nenhum commit. Nenhum deploy.** O repositório está ligado à Vercel: push em
`main` publica em produção sozinho.
