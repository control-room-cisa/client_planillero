# Planillero - Sistema de Registro de Actividades

Una aplicación web moderna para el registro y gestión de actividades laborales diarias, construida con React, TypeScript y Material-UI.

## 🚀 Características

- **Autenticación segura** con JWT
- **Interfaz responsiva** optimizada para móviles y desktop
- **Registro de actividades** diarias
- **Seguimiento del progreso** laboral
- **Navegación intuitiva** con sidebar colapsible
- **Tema personalizado** con Material-UI

## 🛠️ Tecnologías Utilizadas

- **Frontend:**
  - React 18
  - TypeScript
  - Material-UI (MUI)
  - Vite
  - Emotion (CSS-in-JS)

- **Backend:**
  - Node.js + Express
  - JWT para autenticación
  - MySQL (Prisma ORM)

## 📋 Requisitos Previos

- Node.js (versión 16 o superior)
- npm o yarn
- Servidor backend corriendo en `http://localhost:3000`

## 🔧 Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd client_planillero
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre tu navegador en `http://localhost:5173`

## 🔐 Autenticación

La aplicación utiliza un sistema de autenticación basado en JWT. Para acceder, necesitas:

1. **Credenciales de prueba** (según tu backend):
   - Email: `maria@example.com`
   - Contraseña: `MiSecreta123!`

2. **Flujo de autenticación:**
   - Login automático al iniciar la aplicación
   - Redirección a login si no hay sesión activa
   - Persistencia de sesión en localStorage
   - Logout automático en caso de token expirado

## 🎯 Funcionalidades Principales

### 📊 Dashboard Principal
- Saludo personalizado con nombre del usuario
- Navegación de fechas (anterior/siguiente/hoy)
- Progreso del día laboral (0.0/9.0 horas)
- Lista de actividades del día

### 🔄 Navegación
- **Nuevo Registro Diario**: Registro de actividades
- **Revisión Planillas**: Revisión de planillas históricas
- **Notificaciones**: Centro de notificaciones

### 👤 Gestión de Usuario
- Avatar con iniciales del usuario
- Menú de usuario con opción de logout
- Información del usuario en tiempo real

## 🏗️ Arquitectura

```
src/
├── components/          # Componentes React
│   ├── DailyTimesheet.tsx
│   ├── Layout.tsx
│   ├── Login.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # Contextos React
│   └── AuthContext.tsx
├── hooks/              # Hooks personalizados
│   └── useAuth.ts
├── services/           # Servicios HTTP
│   ├── api.ts
│   └── authService.ts
├── types/              # Tipos TypeScript
│   └── auth.ts
├── config/             # Configuración
│   └── api.ts
└── theme.ts           # Tema Material-UI
```

## 🔒 Seguridad

- Tokens JWT almacenados en localStorage
- Interceptores HTTP para manejo automático de tokens
- Redirección automática en caso de tokens expirados
- Rutas protegidas con componente ProtectedRoute

## 🎨 Personalización

### Tema
El tema se puede personalizar en `src/theme.ts`:
- Colores primarios y secundarios
- Tipografía
- Breakpoints responsive
- Componentes personalizados

### API
La configuración del API se encuentra en `src/config/api.ts`:
- URL base del backend
- Endpoints organizados por módulos
- Timeout de peticiones

## 🚀 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

### Estructura de Commits

Se recomienda usar commits descriptivos:
- `feat:` para nuevas funcionalidades
- `fix:` para corrección de bugs
- `docs:` para documentación
- `style:` para cambios de estilo
- `refactor:` para refactorización

## 📱 Responsividad

La aplicación está optimizada para:
- **Desktop**: Sidebar expandible, botones en header
- **Tablet**: Sidebar colapsible, navegación adaptada
- **Mobile**: Drawer overlay, FAB para acciones principales

## 🔄 Estado de la Aplicación

El estado se maneja mediante:
- **Context API** para autenticación global
- **useState** para estado local de componentes
- **useReducer** para lógica compleja de autenticación

## 🛣️ Próximos Pasos

- [ ] Implementar formulario de registro de actividades
- [ ] Agregar persistencia de datos
- [ ] Implementar notificaciones push
- [ ] Agregar reportes y estadísticas
- [ ] Implementar modo offline
- [ ] Agregar tests unitarios

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

---

**Desarrollado con ❤️ usando React + TypeScript + Material-UI**
