<#
.SYNOPSIS
  Sobe o Dashboard de Argamassas localmente, do zero.

.DESCRIPTION
  Confere os pré-requisitos, prepara o .env, sobe o banco, cria as tabelas,
  popula com dados de exemplo e inicia a API e o frontend.

  Cada etapa para com uma mensagem clara se algo faltar, em vez de seguir e
  falhar mais adiante.

.EXAMPLE
  .\subir.ps1
  .\subir.ps1 -PularSeed      # não repopula o banco
  .\subir.ps1 -SomenteBanco   # só prepara o banco, não inicia a aplicação
#>

[CmdletBinding()]
param(
  [switch]$PularSeed,
  [switch]$SomenteBanco
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Passo([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Ok([string]$texto)    { Write-Host "    OK  $texto" -ForegroundColor Green }
function Aviso([string]$texto) { Write-Host "    !   $texto" -ForegroundColor Yellow }

function Parar([string]$titulo, [string[]]$linhas) {
  Write-Host "`nPAROU AQUI: $titulo" -ForegroundColor Red
  foreach ($l in $linhas) { Write-Host "  $l" }
  Write-Host ''
  exit 1
}

function TemComando([string]$nome) {
  $null -ne (Get-Command $nome -ErrorAction SilentlyContinue)
}

# --- 1. Node --------------------------------------------------------------
Passo 'Verificando o Node.js'
if (-not (TemComando 'node')) {
  Parar 'Node.js não encontrado' @(
    'Instale a versão LTS em https://nodejs.org e abra um terminal novo.'
  )
}
$versaoNode = (node -v).TrimStart('v')
$maiorNode = [int]($versaoNode.Split('.')[0])
if ($maiorNode -lt 20) {
  Parar "Node.js $versaoNode é antigo demais" @(
    'O projeto precisa do Node 20 ou mais novo.'
    'Baixe a versão LTS em https://nodejs.org'
  )
}
Ok "Node.js $versaoNode"

# --- 2. Arquivo .env ------------------------------------------------------
Passo 'Verificando o arquivo .env'
if (-not (Test-Path '.env')) {
  if (-not (Test-Path '.env.example')) {
    Parar '.env.example não encontrado' @('Você está na pasta certa do projeto?')
  }
  Copy-Item '.env.example' '.env'
  Ok '.env criado a partir do .env.example'
} else {
  Ok '.env já existe'
}

$linhaUrl = Select-String -Path '.env' -Pattern '^\s*DATABASE_URL\s*=' | Select-Object -First 1
if (-not $linhaUrl) {
  Parar 'O .env não define DATABASE_URL' @('Compare o seu .env com o .env.example.')
}
$databaseUrl = ($linhaUrl.Line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'", ' ')

# --- 3. Banco de dados ----------------------------------------------------
Passo 'Verificando o PostgreSQL'

$porta = 5432
if ($databaseUrl -match ':(\d+)\/') { $porta = [int]$Matches[1] }

function BancoRespondendo {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $conectou = $c.ConnectAsync('127.0.0.1', $porta).Wait(1500)
    $c.Close()
    return $conectou
  } catch { return $false }
}

function ContainerDoProjetoNoAr {
  if (-not (TemComando 'docker')) { return $false }
  $nomes = docker ps --filter 'name=argamassas-db' --format '{{.Names}}' 2>$null
  return ($LASTEXITCODE -eq 0 -and $nomes -match 'argamassas-db')
}

if (ContainerDoProjetoNoAr) {
  Ok "O container argamassas-db já está no ar na porta $porta"
} elseif (BancoRespondendo) {
  # Porta aberta, mas não é o container do projeto. Pode ser um PostgreSQL
  # próprio (caminho legítimo) ou outro serviço qualquer ocupando a porta —
  # e nesse segundo caso o erro só apareceria adiante, na migração.
  Ok "Usando o PostgreSQL que já responde na porta $porta"
  Aviso 'Este não é o container do projeto. Se a migração falhar com erro de'
  Aviso 'autenticação, é conflito de porta: defina outra em DB_PORT e na'
  Aviso 'DATABASE_URL do .env (ex.: 5433) e rode este script de novo.'
} elseif (TemComando 'docker') {
  Aviso "Nada na porta $porta — subindo o PostgreSQL pelo Docker"
  docker compose up -d
  if ($LASTEXITCODE -ne 0) {
    Parar 'O Docker não conseguiu subir o banco' @(
      'O Docker Desktop está aberto e rodando?'
      'Abra o Docker Desktop, espere ficar verde e rode este script de novo.'
      ''
      "Se o erro acima falar em porta em uso, a $porta já está ocupada:"
      'defina outra em DB_PORT e na DATABASE_URL do .env (ex.: 5433).'
    )
  }

  Write-Host '    aguardando o banco aceitar conexões...' -NoNewline
  $pronto = $false
  foreach ($tentativa in 1..40) {
    Start-Sleep -Seconds 2
    Write-Host '.' -NoNewline
    if (BancoRespondendo) { $pronto = $true; break }
  }
  Write-Host ''
  if (-not $pronto) {
    Parar 'O banco subiu mas não respondeu a tempo' @(
      'Veja o que aconteceu com:  docker compose logs db'
    )
  }
  Ok "PostgreSQL no ar na porta $porta"
} else {
  Parar 'Nenhum PostgreSQL disponível' @(
    "Nada respondeu na porta $porta e o Docker não está instalado."
    ''
    'Escolha um caminho:'
    '  a) Instale o Docker Desktop (https://docker.com/products/docker-desktop)'
    '     e rode este script de novo — ele sobe o banco sozinho.'
    '  b) Instale o PostgreSQL 16 (https://postgresql.org/download/windows/),'
    '     crie um banco chamado "argamassas" e ajuste a DATABASE_URL no .env.'
  )
}

# --- 4. Dependências ------------------------------------------------------
Passo 'Instalando as dependências'
# Roda sempre: o npm é rápido quando já está tudo certo, e assim uma dependência
# nova adicionada ao projeto nunca fica faltando por o node_modules já existir.
if (-not (Test-Path 'node_modules')) {
  Aviso 'Primeira instalação — isso pode demorar alguns minutos'
}
npm install
if ($LASTEXITCODE -ne 0) { Parar 'npm install falhou' @('Veja o erro acima.') }
Ok 'Dependências em dia'

# --- 5. Tabelas -----------------------------------------------------------
Passo 'Criando as tabelas'
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
  Parar 'As migrações falharam' @(
    'Veja a mensagem acima.'
    ''
    "Se ela fala em autenticação, quem responde na porta $porta é outro"
    'PostgreSQL, não o do projeto. Defina outra porta em DB_PORT e na'
    'DATABASE_URL do .env (ex.: 5433) e rode este script de novo.'
  )
}
Ok 'Tabelas criadas'

# --- 6. Dados de exemplo --------------------------------------------------
if ($PularSeed) {
  Passo 'Dados de exemplo'
  Aviso 'Pulado (-PularSeed)'
} else {
  Passo 'Populando com dados de exemplo'
  npm run db:seed
  if ($LASTEXITCODE -ne 0) { Parar 'O seed falhou' @('Veja a mensagem acima.') }
  Ok '64 formulações gravadas'
}

if ($SomenteBanco) {
  Write-Host "`nBanco pronto. Para subir a aplicação:  npm run dev" -ForegroundColor Green
  exit 0
}

# --- 7. Subir a aplicação -------------------------------------------------
Passo 'Subindo a API e o frontend'
Write-Host ''
Write-Host '  Frontend:  http://localhost:3000' -ForegroundColor Green
Write-Host '  API:       http://localhost:3333/api' -ForegroundColor Green
Write-Host ''
Write-Host '  Para parar: Ctrl+C' -ForegroundColor DarkGray
Write-Host ''

npm run dev
