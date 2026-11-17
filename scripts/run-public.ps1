# Chạy LinguaViet bản production trên máy này và mở ra Internet qua Cloudflare Tunnel (HTTPS).
# Dùng:  powershell -ExecutionPolicy Bypass -File H:\LangApp\scripts\run-public.ps1
# Dừng:  Ctrl+C (tự tắt cả server).
param(
  [int]$Port = 3201,
  [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root 'data'
New-Item -ItemType Directory -Force $data | Out-Null

# Chuỗi bí mật đăng nhập: tạo một lần, lưu trong data\jwt_secret.txt (không đưa lên git)
$secretFile = Join-Path $data 'jwt_secret.txt'
if (-not (Test-Path $secretFile)) {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [System.IO.File]::WriteAllText($secretFile, ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLower())
}

if (-not $SkipBuild) {
  Write-Host '>> Build giao diện...' -ForegroundColor Cyan
  Push-Location $root; npm run build | Out-Null; Pop-Location
}

$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
if (-not (Test-Path $cloudflared)) { $cloudflared = (Get-Command cloudflared -ErrorAction Stop).Source }

$env:NODE_ENV = 'production'
$env:API_PORT = "$Port"
$env:DB_PATH = Join-Path $data 'langapp.db'
$env:JWT_SECRET = (Get-Content $secretFile -Raw).Trim()
$env:VAPID_SUBJECT = 'https://github.com/Duongfill/LinguaViet'

Write-Host ">> Khởi động server tại http://localhost:$Port ..." -ForegroundColor Cyan
$server = Start-Process node -ArgumentList 'server/src/index.js' -WorkingDirectory $root -PassThru -NoNewWindow `
  -RedirectStandardOutput (Join-Path $data 'server.log') -RedirectStandardError (Join-Path $data 'server.err.log')
try {
  for ($i = 0; $i -lt 30; $i++) {
    try { Invoke-RestMethod "http://localhost:$Port/api/health" -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep 1 }
  }
  Write-Host '>> Mở Cloudflare Tunnel — tìm dòng có https://....trycloudflare.com bên dưới và mở trên điện thoại.' -ForegroundColor Green
  & $cloudflared tunnel --no-autoupdate --url "http://localhost:$Port"
}
finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  Write-Host '>> Đã tắt server.' -ForegroundColor Yellow
}
