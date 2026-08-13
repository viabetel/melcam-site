# Sobe o servidor MELCAM, mas só depois do pré-voo passar.
#
# Existe para o caminho feliz ser o caminho seguro: quem digita "servir" recebe
# a validação de raiz de graça, em vez de precisar lembrar de rodar o preflight
# antes. Se o pré-voo reprovar, o servidor não sobe.
#
#   .\tools\servir.ps1
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
  node (Join-Path $raiz 'tools\preflight.js')
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'pre-voo reprovou. Servidor NAO foi iniciado.' -ForegroundColor Red
    exit $LASTEXITCODE
  }
  Write-Host ''
  node (Join-Path $raiz 'serve.js')
}
finally { Pop-Location }
