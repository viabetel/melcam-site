# Melcam — novo site

Site da Melcam, marca de câmeras digitais retrô. Plataforma multi-produto: Home
como hub da marca + uma landing page por produto (Polen e Bee).

Site estático (HTML/CSS/JS puro), sem build. Deploy na Vercel.

## Como o site é construído

O site nasce de um **template Framer exportado**, guardado intocado em
`_ORIGINAL/`. Nada é editado à mão nas páginas: `tools/aplicar.js` reconstrói
tudo a partir de `_ORIGINAL/` aplicando o `melcam.config.json` (copy, paleta,
tipografia, imagens, rotas, SEO). Rodar de novo é idempotente:

```bash
node tools/aplicar.js
```

Conteúdo novo entra no `melcam.config.json` ou nos módulos de `tools/`, **nunca
direto no HTML** — a próxima execução do pipeline sobrescreveria.

O passo a passo da transformação, fase por fase, está em `progresso.md`.

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
node serve.js   # http://localhost:3030
```

O `serve.js` resolve URLs limpas (`/polen` → `polen.html`). Abrir o `index.html`
por `file://` não funciona: os caminhos dos assets são absolutos (`/melcam/…`).

## Deploy

Projeto Vercel `viabetels-projects/melcam-site` → https://melcam-site.vercel.app
Push na `main` publica. O `.vercelignore` mantém `_ORIGINAL/`, `tools/` e os
documentos de trabalho fora do que vai pro ar.

## Identidade

Paleta: carvão `#221E17`, mel `#F2A900`, papel `#FBF7EE`, coral `#EE6A4D`,
verde-mar `#5E8C7B`. Fontes: area-extended (texto) e iowan-old-style-bt
(display), servidas localmente em `melcam/fonts/`.

## Material do cliente

Briefing v2.1, copy deck aprovado, catálogos de imagens e checklist de
e-commerce ficam fora do repo (≈1 GB), em `Downloads/melcam`. O que ainda falta
o cliente entregar está em `ASSETS_NECESSARIOS.md`.
