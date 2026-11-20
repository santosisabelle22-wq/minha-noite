<#
    Servidor estático mínimo para testar Minha Noite sem instalar nada.
    Uso: powershell -ExecutionPolicy Bypass -File .\tools\serve.ps1 [-Port 8080]
#>
param(
  [int]$Port = 8080,
  [string]$Root = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
$rootFull = [IO.Path]::GetFullPath($Root)
$prefix = "http://127.0.0.1:$Port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.md'   = 'text/markdown; charset=utf-8'
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Minha Noite disponível em $prefix" -ForegroundColor Cyan
Write-Host 'Pressione Ctrl+C para encerrar.' -ForegroundColor DarkGray

function Write-Response($context, [int]$status, [byte[]]$bytes, [string]$contentType) {
  $context.Response.StatusCode = $status
  $context.Response.ContentType = $contentType
  $context.Response.Headers.Add('Cache-Control', 'no-cache')
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
      $candidate = [IO.Path]::GetFullPath((Join-Path $rootFull ($relative -replace '/', '\')))
      if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
        Write-Response $context 403 ([Text.Encoding]::UTF8.GetBytes('Acesso negado')) 'text/plain; charset=utf-8'
        continue
      }
      if (Test-Path $candidate -PathType Container) { $candidate = Join-Path $candidate 'index.html' }
      if (-not (Test-Path $candidate -PathType Leaf)) {
        Write-Response $context 404 ([Text.Encoding]::UTF8.GetBytes('Arquivo não encontrado')) 'text/plain; charset=utf-8'
        continue
      }
      $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $type = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($candidate)
      Write-Response $context 200 $bytes $type
    } catch {
      Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
      $context.Response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
