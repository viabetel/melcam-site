# MELCAM — raiz canônica obrigatória

Antes de qualquer ação:

1. Execute `Get-Location`.
2. Execute `git rev-parse --show-toplevel`.
3. A raiz precisa ser exatamente:
   `C:\Users\israe\viabetel\melcam-site`
4. Execute `node tools/preflight.js`.
5. Se qualquer verificação falhar, pare.
6. Nunca trabalhe em:
   `C:\Users\israe\Downloads\framer-teste`
7. Nunca assuma que `localhost:3030` serve a cópia atual.
8. Confirme o header `X-Melcam-Project: canonical`.
9. Não rode `tools/aplicar.js` indiscriminadamente.
10. Não edite `_ORIGINAL`.
11. Não faça commit sem solicitação.
12. Preserve alterações existentes.

---

## Por que estas regras existem

Em 13/08/2026 havia duas cópias do projeto. Um `node serve.js` foi iniciado
dentro de `Downloads\framer-teste`, a cópia antiga. O navegador em
`localhost:3030` passou a mostrar a animação da fileira quebrada, e isso foi
lido como regressão do projeto — mas os arquivos corretos estavam intactos o
tempo todo na cópia oficial. Horas de trabalho foram gastas investigando um
defeito que não existia na fonte.

**O endereço `localhost` não diz de qual pasta o conteúdo veio.** Responder 200
não prova nada. Prova é: o caminho da raiz, o header de identidade e o SHA-256
do que a porta serve contra o arquivo em disco. É isso que
`tools/preflight.js` verifica, e é por isso que ele vem antes de tudo.

## Como subir o servidor

```
cd C:\Users\israe\viabetel\melcam-site
node tools/preflight.js
node serve.js
```

Ou, num passo só (o pré-voo roda antes e o servidor não sobe se reprovar):

```
.\tools\servir.ps1
```

O `serve.js` valida a raiz **antes** de abrir a porta: exige
`.melcam-project.json` com `project="melcam-site"` e `role="canonical"`, e
confere que a pasta é a mesma declarada em `canonicalRoot`. Quem determina a
raiz servida é `__dirname` (a pasta do `serve.js`), não o `cwd` do terminal.
`SERVE_ROOT` continua livre dentro da raiz canônica e é bloqueado se apontar
para fora.

## Assinatura da cópia arquivada

Se encontrar qualquer um destes, você está na cópia errada:

- `function iniciarReveal` em `melcam/interacoes.js`
  (o correto é `function iniciarFileira`)
- `width:100%`, `overflow-x:auto` ou `scroll-snap` na regra `.framer-dtlgl4`
  (o correto é `width:max-content` e `overflow:hidden`)
- grupo congelado em `scale(0.5)` com `translateY(150px)` permanente
- `melcam/interacoes.js` com 27.562 bytes (o correto tem 38.073)

## Cuidados herdados do handoff de 13/08

- **`node tools/aplicar.js` não pode ser executado.** Ele reconstrói o site a
  partir de `_ORIGINAL/` e apaga o trabalho de 12 e 13/08: `grade.js`,
  `mover-secoes.js`, `mover-conteudo-interno.js`, a animação da fileira, o
  arrasto do ticker e o bloco Polen. Só rode depois de provar que ele reaplica
  todas essas etapas.
- **Editar a fonte E o build.** `tools/*.js` é a fonte; `melcam/*.css` e os
  `.html` são derivados que hoje não podem ser regerados em massa.
- **Crase em comentário dentro de `js()`** ou do CSS gerado quebra o build: o
  conteúdo mora em template literal. A guarda `new Function(src)` pega antes de
  gravar.
- **`\s` dentro de sonda em template literal vira `s`.** Regex ali precisa de
  `\\s`.
- **O template traz `object-position` inline no `<img>`**: regra de folha só
  vence com `!important`. Conferir na medição, não no olho.

## Medição

A curva da fileira é medida, não estimada. A baseline aprovada é
`medidas/medida-melcam-13ago.json`. Para revalidar:

```
node tools/medir.js "http://localhost:3030/" <rotulo>
```

Não "corrija" a curva se a medição já estiver conforme a baseline.
