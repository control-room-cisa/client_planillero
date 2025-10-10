# Acceso de Red Local al Servidor de Desarrollo

## Configuración Actual

El proyecto está configurado para permitir acceso desde otros dispositivos en la misma red local.

### Configuración de Vite (`vite.config.ts`)

```typescript
server: {
  host: "0.0.0.0", // Escucha en todas las interfaces
  port: 5173,
  strictPort: true,
  // No se especifica hmr.host para permitir conexiones desde cualquier IP
}
```

## Cómo Iniciar el Servidor con Acceso de Red

### Opción 1: Script PowerShell (Recomendado)

```powershell
.\start-network.ps1
```

Este script mostrará automáticamente tu IP local y la URL completa.

### Opción 2: Comando Manual

```powershell
npm run dev -- --host 0.0.0.0
```

## Obtener tu IP Local

```powershell
ipconfig
```

Busca la sección "Adaptador de LAN inalámbrica Wi-Fi" o "Adaptador de Ethernet", según tu conexión.

La IP estará en la línea "Dirección IPv4" (ejemplo: `172.17.10.101`).

## Acceder desde Otros Dispositivos

1. Asegúrate de que el servidor está ejecutándose
2. En otro dispositivo en la misma red, abre un navegador
3. Navega a: `http://TU_IP_LOCAL:5173`
   - Ejemplo: `http://172.17.10.101:5173`

## Verificar que el Servidor Está Escuchando

```powershell
netstat -ano | Select-String "5173.*LISTENING"
```

Deberías ver una línea como:
```
TCP    0.0.0.0:5173    0.0.0.0:0    LISTENING    [PID]
```

## Solución de Problemas

### 1. Verificar Firewall

El puerto 5173 debe estar permitido. Verifica con:

```powershell
netsh advfirewall firewall show rule name=all | Select-String -Pattern "5173" -Context 5,5
```

Si no hay regla, créala:

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private,Public
```

### 2. Verificar Conectividad

Desde otro dispositivo (si tiene PowerShell):

```powershell
Test-NetConnection -ComputerName 172.17.10.101 -Port 5173
```

Debería mostrar `TcpTestSucceeded: True`.

### 3. Problemas Comunes

**No puedo conectarme desde otro dispositivo:**

- ✅ **Misma red**: Ambos dispositivos deben estar en la misma red Wi-Fi/Ethernet
- ✅ **No usar red de invitados**: Las redes de invitados suelen tener aislamiento de clientes
- ✅ **Desactivar VPN**: Las VPNs pueden interferir con el acceso a red local
- ✅ **Aislamiento de AP**: Verifica que tu router no tenga "AP Isolation" o "Client Isolation" activado
- ✅ **Firewall del otro dispositivo**: El firewall del dispositivo cliente también puede bloquear la conexión

**El servidor no inicia:**

```powershell
# Verificar si el puerto está en uso
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

# Si está en uso, detener el proceso
$pid = (Get-NetTCPConnection -LocalPort 5173).OwningProcess
Stop-Process -Id $pid -Force
```

### 4. Verificar Configuración de Router

Si nada funciona, verifica en la configuración de tu router:

- **AP Isolation / Client Isolation**: Debe estar **desactivado**
- **Guest Network**: No uses redes de invitados
- **Firewall del Router**: Verifica que no bloquee tráfico entre dispositivos en la red local

## Estado de la Configuración

- ✅ Vite configurado para escuchar en `0.0.0.0`
- ✅ Puerto 5173 permitido en Windows Firewall
- ✅ Configuración HMR optimizada para acceso remoto
- ✅ IP local detectada: `172.17.10.101`

## Uso en Producción

Esta configuración es **solo para desarrollo**. En producción:

1. Usar `npm run build`
2. Servir desde un servidor web apropiado
3. Configurar HTTPS y certificados válidos
4. Usar dominio y reverse proxy si es necesario

