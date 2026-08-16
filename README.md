# Melcam — novo site

Site da Melcam, marca de câmeras digitais retrô. Plataforma multi-produto: Home
como hub da marca + uma landing page por produto (Polen e Bee).

Site estático (HTML/CSS/JS puro), sem build. Deploy na Vercel.

## Como o site é construído

O site nasce de um **template Framer exportado**, guardado intocado em
`_ORIGINAL/`. O pipeline original era `tools/aplicar.js`, que reconstruía as
páginas a partir de `_ORIGINAL/` aplicando o `melcam.config.json` (copy, paleta,
tipografia, imagens, rotas, SEO).

> ### Não rode `node tools/aplicar.js`
>
> Ele deixou de ser idempotente. Desde 12/08/2026 o site recebeu etapas que o
> `aplicar.js` não reaplica: `grade.js`, `mover-secoes.js`,
> `mover-conteudo-interno.js`, a animação da fileira, o arrasto do ticker, o
> bloco Polen e tudo o que veio depois. Rodar hoje volta as páginas para um
> estado anterior e apaga esse trabalho. Só volta a valer depois que alguém
> provar que ele reaplica todas as etapas.

Na prática, hoje: `tools/*.js` é a fonte, e `melcam/*.css` mais os `.html` são
derivados que **não podem ser regerados em massa**. Mudança de verdade é feita
no módulo de `tools/` correspondente **e** no arquivo derivado, na mesma
passagem, para os dois não separarem.

O passo a passo da transformação, fase por fase, está em `progresso.md`, e as
armadilhas herdadas (crase dentro de `js()`, `\s` em sonda, `object-position`
inline) estão no `AGENTS.md`. Leia os dois antes da primeira alteração.

## Páginas

| Arquivo | Rota | O que é |
| --- | --- | --- |
| `index.html` | `/` | Home / hub da marca |
| `polen.html` | `/polen` | LP da Polen (câmera clássica) |
| `bee.html` | `/bee` | LP da Bee (mini câmera-chaveiro) |
| `acessorios.html` | `/acessorios` | Acessórios |
| `sobre.html` | `/sobre` | Sobre Nós (+ `#contato`, `#rastreio`) |
| `sacola.html` | `/sacola` | Sacola |
| `privacidade.html` | `/privacidade` | Política de privacidade |
| `termos.html` | `/termos` | Termos e condições |
| `404.html` | `/404` | Página de erro |
| `melcam/` | — | Imagens, vídeo do hero, logo, fontes, `identidade.css` |
| `js/`, `sort-by/` | — | Bundles do runtime do Framer |

`privacy-policy.html` e `terms-and-conditions.html` são os nomes que o template
exporta; `tools/rotas.js` gera as cópias `privacidade.html` e `termos.html`, que
são as rotas usadas na navegação.

## Rodar localmente

```bash
node tools/preflight.js   # confere a cópia antes de abrir a porta
node serve.js             # http://localhost:3030
```

No Windows, `.\tools\servir.ps1` faz os dois num passo só e não sobe o servidor
se o pré-voo reprovar.

O `serve.js` resolve URLs limpas (`/polen` → `polen.html`). Abrir o `index.html`
por `file://` não funciona: os caminhos dos assets são absolutos (`/melcam/…`).

### Primeira vez numa máquina nova: declare a sua raiz

O `serve.js` valida a pasta **antes** de abrir a porta e recusa qualquer cópia
que não esteja declarada. Depois de clonar, acrescente o caminho do seu clone à
lista `canonicalRoots` do `.melcam-project.json` e commite essa linha:

```json
"canonicalRoots": [
  "C:\\Users\\israe\\viabetel\\melcam-site",
  "C:\\Users\\Nicácio\\Desktop\\melcam-site",
  "<o caminho do seu clone>"
]
```

Acrescente uma raiz; **nunca troque** o caminho de outra pessoa pelo seu, que é
o que gera conflito a cada `pull`. A guarda existe porque em 13/08/2026 um
`serve.js` foi iniciado dentro de uma cópia velha do projeto: `localhost:3030`
passou a mostrar uma animação quebrada, e horas foram gastas caçando um defeito
que não existia nos arquivos certos. O endereço `localhost` não diz de qual
pasta veio o conteúdo. O `AGENTS.md` conta o caso inteiro.

## Deploy

Projeto Vercel `viabetels-projects/melcam-site` → https://melcam-site.vercel.app

**Push na `main` não publica.** Não há integração com o Git: o deploy é manual,
pela CLI, e é um passo separado do commit.

```bash
vercel link --yes --project melcam-site --scope viabetels-projects   # só na 1ª vez
vercel deploy --prod --yes
```

O `.vercelignore` mantém `_ORIGINAL/`, `tools/` e os documentos de trabalho fora
do que vai pro ar, e `node tools/verificar-assets-deploy.js` reprova antes do
deploy se algum asset referenciado por uma página estiver excluído de lá.

Para conferir que o que subiu é o que está no disco, compare o SHA-256 do
arquivo local com o que a produção devolve **tirando os `\r`**: o repositório
alterna CRLF e LF, e a comparação byte a byte crua acusa diferença onde o
conteúdo é idêntico.

## Identidade

Paleta: carvão `#221E17`, mel `#F2A900`, papel `#FBF7EE`, coral `#EE6A4D`,
verde-mar `#5E8C7B`. Fontes: area-extended (texto) e iowan-old-style-bt
(display), servidas localmente em `melcam/fonts/`.

## Material do cliente

Briefing v2.1, copy deck aprovado, catálogos de imagens e checklist de
e-commerce ficam fora do repo (≈1 GB), em `Downloads/melcam`. O que ainda falta
o cliente entregar está em `ASSETS_NECESSARIOS.md`.
