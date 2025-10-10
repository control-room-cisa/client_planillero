# Script para iniciar Vite con acceso de red
# Permite que otros dispositivos en la misma red accedan al servidor de desarrollo

# Cambiar al directorio del proyecto
Set-Location -Path "C:\Users\CARLOS BUEZO\Documents\Dev\client_planillero"

# Mostrar la IP local
Write-Host "=== Configuración de Red ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tu IP local:" -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
Write-Host $ip -ForegroundColor Green
Write-Host ""
Write-Host "Otros dispositivos pueden acceder en:" -ForegroundColor Yellow
Write-Host "http://${ip}:5173" -ForegroundColor Green
Write-Host ""
Write-Host "=== Iniciando Vite ===" -ForegroundColor Cyan
Write-Host ""

# Iniciar Vite con host 0.0.0.0
npm run dev

