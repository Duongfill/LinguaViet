# Chạy LinguaViet bản production trên máy này (cổng 3201).
# Link công khai cố định do Tailscale Funnel cung cấp: https://theduong.taild0b5c4.ts.net
#   (Funnel bật một lần bằng: tailscale funnel --bg 3201 — tự chạy lại sau khi khởi động máy)
# Dùng:  powershell -ExecutionPolicy Bypass -File H:\LangApp\scripts\start-server.ps1
# Dừng:  Ctrl+C
param(
  [int]$Port = 3201,
  [switch]$Build
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

# Build giao diện khi được yêu cầu hoặc khi chưa có bản build
if ($Build -or -not (Test-Path (Join-Path $root 'client\dist\index.html'))) {
  Write-Host '>> Build giao diện...' -ForegroundColor Cyan
  Push-Location $root; npm run build | Out-Null; Pop-Location
}

# Đã có server chạy ở cổng này thì thôi
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  Write-Host ">> Server đã chạy sẵn ở cổng $Port." -ForegroundColor Yellow
  exit 0
}

$env:NODE_ENV = 'production'
$env:API_PORT = "$Port"
$env:DB_PATH = Join-Path $data 'langapp.db'
$env:JWT_SECRET = (Get-Content $secretFile -Raw).Trim()
$env:VAPID_SUBJECT = 'https://github.com/Duongfill/LinguaViet'

Write-Host ">> LinguaViet chạy tại http://localhost:$Port  —  link công khai: https://theduong.taild0b5c4.ts.net" -ForegroundColor Green
Set-Location $root
node server/src/index.js 2>&1 | Tee-Object -FilePath (Join-Path $data 'server.log') -Append
