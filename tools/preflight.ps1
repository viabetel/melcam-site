# Atalho para o pré-voo. A validação de verdade mora em tools/preflight.js —
# este arquivo só garante que ela rode a partir da pasta certa, mesmo que o
# terminal esteja em outro lugar.
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try { node (Join-Path $raiz 'tools\preflight.js'); exit $LASTEXITCODE }
finally { Pop-Location }
