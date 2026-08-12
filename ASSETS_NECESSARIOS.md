# MELCAM — assets necessários

O que falta para o site sair do "a decidir". Cada item traz página, seção,
finalidade, nome sugerido, dimensão exata, formato, fundo, direção de arte,
prioridade e qual asset temporário está no ar hoje.

Gerado durante a transformação do template. Última atualização: 12/08/2026.

---

## PRIORIDADE ALTA — bloqueiam a validação com o cliente

### 1. Clipes da comunidade

| | |
|---|---|
| **Página · seção** | Home · "A Melcam por aí", logo abaixo da comunidade |
| **Finalidade** | 2 a 3 vídeos curtos da marca, pedidos no briefing |
| **Nome sugerido** | `clipe-01.mp4` · `clipe-02.mp4` · `clipe-03.mp4` |
| **Desktop / mobile** | mesmo arquivo nos dois |
| **Dimensão** | **1080 × 1920** |
| **Proporção** | 9:16, vertical |
| **Formato** | MP4 (H.264) e, se possível, WebM |
| **Duração** | 8 a 20 s |
| **Fundo** | livre |
| **Margem segura** | 12% em cima e embaixo, para a legenda não cobrir |
| **Direção de arte** | fotografia real, sem estética de banco de imagem |
| **Pode conter texto?** | **não** — nada essencial embutido, o texto vai em HTML |
| **Poster** | obrigatório, 1 por vídeo, **1080 × 1920**, JPG |
| **Temporário no ar** | `melcam/img/a-decidir.svg` em 3 caixas 9:16 |

### 2. Fotos de comunidade que faltam

| | |
|---|---|
| **Página · seção** | Home · "Memórias da Colméia" |
| **Finalidade** | fechar as 16 a 20 fotos previstas no briefing |
| **Situação** | **8 no ar**, tratadas para web. Faltam **8 a 12** |
| **Nome sugerido** | `community-09.jpg` … `community-20.jpg` |
| **Dimensão** | **1200 × 1200** (quadrada) ou 1200 × 1500 (vertical) |
| **Formato** | JPG qualidade 82, ou WebP |
| **Fundo** | fotografia real |
| **Direção de arte** | fotos de clientes, feitas com Bee ou Polen, sem edição |
| **Prioridade** | alta |
| **Observação** | há **15 originais** em `Downloads\melcam\IMAGENS\Por onde a MELCAM passou`, em 4000×3000 e afins. Podem ser tratados para fechar boa parte da conta |

### 3. Identificação e autorização das fotos de comunidade

Sem isso a legenda fica `[USUÁRIO E CIDADE A CONFIRMAR]`, como está hoje nas 8.
Necessário por foto: **@usuário** · **cidade** · autorização de uso de imagem.
Não será inventado.

### 4. Render 3D da Polen

| | |
|---|---|
| **Página · seção** | LP Polen · animação de abertura "Memória cheia" |
| **Finalidade** | a animação culmina visualmente na câmera Polen |
| **Nome sugerido** | `polen-3d-desktop.*` · `polen-3d-mobile.*` |
| **Desktop** | **1920 × 1080** |
| **Mobile** | **1080 × 1350** |
| **Fundo** | transparente quando possível |
| **Enquadramento** | câmera centralizada, **margem segura de 15%** |
| **Formato** | sequência WebP/AVIF, ou GLB otimizado, ou MP4/WebM |
| **Prioridade** | alta |
| **Temporário** | composição com os packshots oficiais 1200×1200 |

### 5. Render 3D da Bee + escolha da abertura

Mesmas dimensões do item 4. **Falta antes a decisão entre as duas opções** do
briefing: (1) Bee branca balança e gira virando amarela; (2) a página mergulha
no mel e a Bee vira amarela ao entrar. Analisar `bee.html` e `bee2.html`.

---

## PRIORIDADE ALTA — dados, não arte

Nada disto pode ser inventado. Hoje aparece como **a decidir** no site.

| Dado | Onde aparece |
|---|---|
| **CNPJ** | rodapé |
| **Endereço** | rodapé |
| **WhatsApp de suporte** | barra de segurança, ajuda, Fale conosco |
| **Redes sociais** | rodapé — os 21 ícones estão com `href="#"` e `title="a decidir"` |
| **Links reais de rastreio** | rodapé · Ajuda |
| **Texto final de Sobre Nós** | página Sobre Nós |
| **Textos jurídicos** | Privacidade, Termos, Trocas e devoluções |
| **Gateway de pagamento** | sacola — o fluxo é demonstrativo até existir |
| **Transportadora e prazos** | "Envio em 24h" e "Envio para todo o Brasil" precisam de confirmação |
| **Estoque real e SKUs** | catálogo |
| **Bandeiras de pagamento** | rodapé — hoje o símbolo da marca com alt "Meio de pagamento a decidir". Sem gateway definido, não se afirma bandeira |

---

## PRIORIDADE MÉDIA

### 6. Família completa da Iowan Old Style

O toolkit entrega **só `Iowan Old Style BT Bold.otf`**. Não há Regular nem
Itálico.

Decisão do cliente em 12/08/2026: **Iowan fica só em display**, e a Area assume
o texto corrido. Está implementado assim. Se um dia a família completa chegar,
dá para reavaliar — mas **não** é bloqueio.

### 7. Banners da home em proporção de banner

Os três arquivos entregues são **4000 × 6000** (dois) e **6000 × 4000** (um) —
proporções de foto, não de banner. Hoje o CSS recorta para `24/10` no desktop e
`4/5` no mobile.

Ideal receber cortes dedicados: **2400 × 1000** desktop e **1080 × 1350**
mobile, com o produto fora da faixa onde entra o texto (esquerda, 60% da
largura).

### 8. Open Graph

| | |
|---|---|
| **Finalidade** | prévia ao compartilhar o link |
| **Nome sugerido** | `og-melcam.jpg` |
| **Dimensão** | **1200 × 630** |
| **Formato** | JPG |
| **Direção de arte** | produto + marca, legível em miniatura |
| **Temporário** | hoje a metatag aponta para o placeholder |

---

## O QUE JÁ ESTÁ RESOLVIDO

Não pedir de novo:

- **Vídeo do hero** — `video-hero.mp4`, 1920×1080, ~9,56 s, no ar
- **Logo** — SVG nas 4 variações, preto e branco, no ar
- **Pattern** — `MELCAM_Pattern.svg`, disponível
- **Fontes** — Area completa (Hairline a Extrablack, com itálicos), Iowan Bold, Brooklyn Semibold, servidas localmente
- **Catálogo Polen** — 7 cores × 5 tomadas, 1200×1200
- **Catálogo Bee** — 2 cores × 5 tomadas, 1200×1200
- **Filtros** — as 8 imagens da mesma foto, 4000×3000
- **Galeria Polen** — 8 fotos tratadas
- **Lifestyle** — 8 fotos tratadas
