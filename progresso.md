# MELCAM — progresso da transformação do template

Arquivo de handoff. Outro agente deve conseguir retomar só lendo isto.
Última atualização: **12/08/2026**.

**Pasta de trabalho:** `C:\Users\israe\Downloads\framer-teste`
**Repo (espelho publicado):** `C:\Users\israe\viabetel\melcam-site` → https://github.com/viabetel/melcam-site
**Backup intocado do template:** `_ORIGINAL\` (94 arquivos, 5,7 MB) — criado, confere
**Servidor local:** `node serve.js` → http://localhost:3030
**Produção:** https://melcam-site.vercel.app (projeto `viabetels-projects/melcam-site`)

---

## 12/08/2026 — repo corrigido e site publicado

O primeiro commit do repo tinha subido o **mockup de referência do cliente**, não
o site de verdade. Corrigido: o repo agora versiona o conteúdo desta pasta
(template Framer transformado, o que roda em `localhost:3030`). O mockup antigo
segue recuperável no histórico, no commit `62afb5b`.

Dois defeitos que só apareceriam em produção, corrigidos junto:

- `/privacidade` e `/termos` não tinham arquivo — o template exporta
  `privacy-policy.html` e `terms-and-conditions.html`, e o `rotas.js` já apontava
  a navegação pros nomes em português. O `serve.js` local escondia o problema
  porque cai no `index.html` em rota desconhecida; na Vercel seria 404.
  `tools/rotas.js` passou a gerar as cópias `privacidade.html` e `termos.html`,
  então um `node tools/aplicar.js` mantém a correção.
- `.vercelignore` mantém `_ORIGINAL/`, `tools/`, `serve.js` e os documentos de
  trabalho fora do ar — o template original não deve ficar público.

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
| 11 | Validação final: responsivo, console, contraste, OG image | **PRÓXIMA — comece por aqui** |
| 7 | LP Polen | pendente |
| 8 | LP Bee | pendente |
| 9 | Acessórios · Sobre Nós · ajuda · 404 | pendente |
| 10 | Sacola | pendente |
| 11 | SEO · acessibilidade · responsivo | pendente |
| 12 | Validação final + ASSETS_NECESSARIOS.md | pendente |

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
8. **Colméia** — eyebrow, título, texto, 3 perks e CTA.
9. **FAQ** com as 7 perguntas + **CTA final**.

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
