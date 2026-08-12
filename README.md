# Melcam — novo site

Site da Melcam, marca de câmeras digitais retrô. Plataforma multi-produto: Home
como hub da marca + uma landing page por produto (Polen e Bee).

Site estático (HTML/CSS/JS puro), sem build. Deploy na Vercel.

## Páginas

| Arquivo | O que é |
| --- | --- |
| `index.html` | Home / hub da marca |
| `polen.html` | LP da Polen (câmera clássica) |
| `bee.html` | LP da Bee (mini câmera-chaveiro) — opção A |
| `bee2.html` | LP da Bee — opção B, em avaliação |
| `rascunho.html` | Wireframe anotado do briefing (referência interna) |
| `assets/` | Imagens, vídeo do hero, fontes, `site.css`, `site.js` |

## Rodar localmente

Qualquer servidor estático na raiz do repo, por exemplo:

```bash
npx serve .
```

Abrir direto o `index.html` pelo `file://` também funciona, mas o vídeo do hero
e as fontes podem se comportar diferente.

## Identidade

Paleta: carvão `#221E17`, mel `#F2A900`, papel `#FBF7EE`, coral `#EE6A4D`,
verde-mar `#5E8C7B`. Fontes Adobe/Typekit: area-extended, iowan-old-style-bt,
brooklyn-heritage-script.

## Material do cliente

Briefing v2.1, copy deck aprovado, catálogos de imagens e checklist de
e-commerce ficam fora do repo (≈1 GB), em `Downloads/melcam`.
