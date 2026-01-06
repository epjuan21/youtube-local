# YouTube Local - Plataforma de Videos Local

## 📋 Descripción General

**YouTube Local** es una aplicación de escritorio multiplataforma que permite gestionar y reproducir una biblioteca personal de videos almacenados en discos duros externos o locales, con una interfaz inspirada en YouTube. La aplicación indexa videos sin moverlos de su ubicación original, preservando estadísticas de reproducción y metadatos incluso cuando los archivos se desconectan temporalmente.

## 🎯 Objetivos del Proyecto

- Crear una plataforma estilo YouTube para gestión de videos personales
- Leer videos desde discos externos sin copiarlos ni moverlos
- Sincronizar automáticamente cambios en las carpetas de videos
- Preservar estadísticas y metadatos independientemente de la disponibilidad física de los archivos
- Proporcionar una experiencia de usuario fluida y moderna
- Soportar múltiples sistemas operativos (Windows, macOS, Linux)

## 🛠 Stack Tecnológico

### Core
- **Electron**: Framework para aplicaciones de escritorio
- **React**: Biblioteca para construcción de interfaces de usuario
- **Vite**: Herramienta de compilación rápida para desarrollo
- **Node.js**: Runtime de JavaScript para el proceso principal

### Base de Datos
- **SQLite**: Base de datos embebida ligera
- **better-sqlite3**: Driver sincrónico para SQLite

### Librerías Adicionales
- **React Router DOM**: Navegación entre vistas
- **Chokidar**: Monitor de sistema de archivos en tiempo real
- **Lucide React**: Íconos para la interfaz

## 📁 Arquitectura del Proyecto

```
youtube-local/
├── src/
│   ├── main/                    # Proceso principal de Electron (Node.js)
│   │   ├── index.js            # Punto de entrada, creación de ventanas
│   │   ├── database.js         # Configuración y esquema de SQLite
│   │   ├── scanner.js          # Escáner recursivo de videos
│   │   ├── fileWatcher.js      # Monitor de cambios en tiempo real
│   │   └── ipc/                # Comunicación entre procesos
│   │       ├── videoHandlers.js      # Operaciones CRUD de videos
│   │       └── syncHandlers.js       # Gestión de sincronización
│   │
│   ├── renderer/               # Proceso de renderizado (React)
│   │   ├── src/
│   │   │   ├── App.jsx        # Componente principal
│   │   │   ├── main.jsx       # Punto de entrada React
│   │   │   ├── components/    # Componentes reutilizables
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── VideoCard.jsx
│   │   │   │   └── SyncStatus.jsx
│   │   │   ├── pages/         # Vistas principales
│   │   │   │   ├── Home.jsx         # Página principal con grid de videos
│   │   │   │   ├── Video.jsx        # Reproductor de video
│   │   │   │   ├── Settings.jsx     # Configuración de la aplicación
│   │   │   │   └── SyncManager.jsx  # Gestión de carpetas y sincronización
│   │   │   └── styles/
│   │   │       └── global.css
│   │   ├── index.html
│   │   └── vite.config.js
│   │
│   └── preload/
│       └── index.js           # Bridge seguro entre main y renderer
│
├── thumbnails/                # Miniaturas generadas (almacenamiento local)
├── resources/                 # Iconos y recursos estáticos
├── package.json
└── electron-builder.json      # Configuración de empaquetado
```

## 🗄 Esquema de Base de Datos

### Tabla: `watch_folders`
Carpetas monitoreadas en discos externos o locales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PRIMARY KEY | Identificador único |
| folder_path | TEXT | Ruta completa de la carpeta |
| last_scan | DATETIME | Última fecha de escaneo |
| is_active | INTEGER | Si está activa (1) o no (0) |
| created_date | DATETIME | Fecha de creación |

### Tabla: `videos`
Información de todos los videos indexados.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PRIMARY KEY | Identificador único |
| title | TEXT | Título del video |
| description | TEXT | Descripción |
| filename | TEXT | Nombre del archivo |
| filepath | TEXT | Ruta completa del archivo |
| file_hash | TEXT UNIQUE | Hash MD5 único (ruta + tamaño) |
| thumbnail | TEXT | Ruta de la miniatura |
| duration | INTEGER | Duración en segundos |
| views | INTEGER | Número de reproducciones |
| likes | INTEGER | Me gusta |
| dislikes | INTEGER | No me gusta |
| upload_date | DATETIME | Fecha de indexación |
| file_size | INTEGER | Tamaño en bytes |
| file_modified_date | DATETIME | Última modificación del archivo |
| last_watched | DATETIME | Última reproducción |
| watch_time | INTEGER | Tiempo total visto (segundos) |
| is_available | INTEGER | Si el archivo existe (1) o no (0) |
| watch_folder_id | INTEGER | FK a watch_folders |

### Tabla: `categories`
Categorías para clasificar videos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PRIMARY KEY | Identificador único |
| name | TEXT UNIQUE | Nombre de la categoría |
| color | TEXT | Color hexadecimal |

### Tabla: `tags`
Etiquetas para organizar videos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PRIMARY KEY | Identificador único |
| name | TEXT UNIQUE | Nombre del tag |

### Tabla: `playlists`
Listas de reproducción personalizadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PRIMARY KEY | Identificador único |
| name | TEXT | Nombre de la playlist |
| description | TEXT | Descripción |
| created_date | DATETIME | Fecha de creación |

### Tabla: `sync_history`
Historial de sincronizaciones.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PRIMARY KEY | Identificador único |
| watch_folder_id | INTEGER | FK a watch_folders |
| videos_added | INTEGER | Videos agregados |
| videos_removed | INTEGER | Videos marcados no disponibles |
| videos_updated | INTEGER | Videos actualizados |
| sync_date | DATETIME | Fecha de sincronización |

### Tablas de Relación
- `video_categories`: Relación muchos a muchos entre videos y categorías
- `video_tags`: Relación muchos a muchos entre videos y tags
- `playlist_videos`: Relación muchos a muchos entre playlists y videos (con posición)

## 🔄 Sistema de Sincronización

### Arquitectura de Sincronización

El sistema utiliza un enfoque híbrido de sincronización:

1. **Escaneo bajo demanda**: Cuando el usuario agrega una carpeta o solicita sincronización manual
2. **Monitoreo en tiempo real**: Chokidar observa cambios en las carpetas activas

### Flujo de Sincronización

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario agrega carpeta del disco externo            │
│    → /media/disco-externo/Videos                        │
└─────────────────┬───────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Sistema escanea recursivamente                       │
│    → Busca archivos con extensiones de video           │
│    → Genera hash único (ruta + tamaño)                 │
└─────────────────┬───────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Sincroniza con base de datos                         │
│    • Videos nuevos → INSERT                             │
│    • Videos existentes → UPDATE (si cambió ruta)        │
│    • Videos no encontrados → is_available = 0           │
└─────────────────┬───────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Inicia monitoreo en tiempo real (Chokidar)          │
│    • Detecta: add, unlink, change                       │
│    • Notifica a interfaz vía IPC                        │
└─────────────────────────────────────────────────────────┘
```

### Detección de Videos

**Extensiones soportadas:**
- `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.flv`, `.wmv`, `.m4v`

**Sistema de Hash:**
```javascript
hash = MD5(filepath + fileSize)
```

Este hash permite:
- Identificar videos únicos
- Detectar duplicados
- Rastrear videos aunque cambien de ubicación
- Preservar metadatos al reconectar discos

### Preservación de Datos

**Cuando un video se vuelve no disponible:**
- ❌ NO se elimina de la base de datos
- ✅ Se marca `is_available = 0`
- ✅ Se preservan: vistas, likes, tiempo de visualización, última reproducción
- ✅ Permanece en historial y estadísticas

**Cuando se reconecta el disco:**
- ✅ Sistema detecta el archivo (por hash)
- ✅ Actualiza `is_available = 1`
- ✅ Actualiza ruta si cambió
- ✅ Todas las estadísticas se restauran

## 🔌 API IPC (Inter-Process Communication)

### API de Videos

```javascript
// Obtener videos con filtros
window.electronAPI.getVideos({ 
  onlyAvailable: true,  // Solo videos accesibles
  search: 'texto'       // Búsqueda en título/descripción
})

// Obtener video por ID (incrementa vistas automáticamente)
window.electronAPI.getVideoById(videoId)

// Actualizar información del video
window.electronAPI.updateVideo(videoId, {
  title: 'Nuevo título',
  description: 'Nueva descripción',
  likes: 10,
  dislikes: 2
})

// Actualizar tiempo de visualización
window.electronAPI.updateWatchTime(videoId, segundos)

// Obtener estadísticas generales
window.electronAPI.getVideoStats()
// Retorna: { total, available, unavailable, totalViews, totalWatchTime }
```

### API de Sincronización

```javascript
// Agregar carpeta para monitorear
const folder = await window.electronAPI.addWatchFolder('/ruta/disco/videos')

// Obtener todas las carpetas monitoreadas
const folders = await window.electronAPI.getWatchFolders()

// Eliminar carpeta (marca videos como no disponibles)
await window.electronAPI.removeWatchFolder(folderId)

// Escanear carpeta específica
const stats = await window.electronAPI.scanFolder(folderId)
// Retorna: { added, updated, removed, unchanged, totalFound }

// Escanear todas las carpetas activas
const results = await window.electronAPI.scanAllFolders()

// Obtener historial de sincronizaciones
const history = await window.electronAPI.getSyncHistory()

// Seleccionar carpeta mediante diálogo
const path = await window.electronAPI.selectFolder()

// Verificar si un archivo existe
const exists = await window.electronAPI.checkVideoExists(filepath)
```

### Eventos en Tiempo Real

```javascript
// Escuchar progreso de sincronización
const unsubscribe = window.electronAPI.onSyncProgress((data) => {
  console.log(data.type);      // 'found', 'added', 'updated', 'unavailable'
  console.log(data.filename);  // Nombre del archivo
  console.log(data.total);     // Total procesado
});

// Escuchar finalización de sincronización
window.electronAPI.onSyncComplete((data) => {
  console.log(data.stats);     // Estadísticas del escaneo
});

// Escuchar cambios en archivos (Chokidar)
window.electronAPI.onFileChanged((data) => {
  console.log(data.type);      // 'added', 'removed', 'modified', 'restored'
  console.log(data.video);     // Datos del video afectado
});

// Limpiar listeners
unsubscribe();
```

## 🎨 Interfaz de Usuario (Fase 2 - Pendiente)

### Diseño Inspirado en YouTube

**Componentes principales:**
- **Header**: Barra de búsqueda, logo, controles de usuario
- **Sidebar**: Navegación principal, playlists, categorías
- **VideoCard**: Tarjeta con miniatura, título, estadísticas
- **VideoPlayer**: Reproductor con controles completos
- **SyncStatus**: Indicador de estado de sincronización

**Páginas:**
- **Home**: Grid de videos con filtros y ordenamiento
- **Video**: Reproductor con información y recomendaciones
- **Settings**: Configuración de carpetas y preferencias
- **SyncManager**: Gestión de carpetas y sincronización manual

## 📊 Funcionalidades Implementadas (Fase 1)

### ✅ Core
- [x] Configuración de Electron + React + Vite
- [x] Esquema de base de datos SQLite
- [x] Sistema IPC de comunicación
- [x] Estructura de carpetas profesional

### ✅ Sincronización
- [x] Escáner recursivo de directorios
- [x] Detección de videos por extensión
- [x] Sistema de hash único
- [x] Sincronización inteligente (agregar/actualizar/marcar no disponible)
- [x] Monitoreo en tiempo real con Chokidar
- [x] Preservación de metadatos y estadísticas
- [x] Historial de sincronizaciones
- [x] Soporte para múltiples carpetas

### ✅ Gestión de Videos
- [x] Indexación sin mover archivos
- [x] Registro de vistas automático
- [x] Sistema de likes/dislikes
- [x] Tracking de tiempo de visualización
- [x] Última fecha de reproducción
- [x] Detección de videos no disponibles

## 🚀 Funcionalidades Planificadas

### Fase 2: Interfaz de Usuario
- [ ] Componentes visuales estilo YouTube
- [ ] Grid de videos con miniaturas
- [ ] Reproductor de video integrado
- [ ] Barra de búsqueda funcional
- [ ] Sistema de filtros y ordenamiento
- [ ] Panel de sincronización

### Fase 3: Funcionalidades Avanzadas
- [ ] Generación automática de miniaturas
- [ ] Extracción de metadatos de video (duración, resolución)
- [ ] Sistema de categorías y tags
- [ ] Creación y gestión de playlists
- [ ] Recomendaciones de videos
- [ ] Modo oscuro/claro

### Fase 4: Optimización
- [ ] Cache de miniaturas
- [ ] Lazy loading de videos
- [ ] Búsqueda full-text
- [ ] Exportación de datos
- [ ] Backup de base de datos
- [ ] Performance optimizations

### Fase 5: Características Premium
- [ ] Subtítulos
- [ ] Marcadores de tiempo
- [ ] Notas por video
- [ ] Compartir clips
- [ ] Estadísticas avanzadas
- [ ] Gráficos de visualización

## 🔧 Instalación y Uso

### Requisitos Previos
- Node.js 16+ 
- npm o yarn

### Instalación

```bash
# Clonar o crear directorio del proyecto
mkdir youtube-local
cd youtube-local

# Inicializar proyecto
npm init -y

# Instalar dependencias principales
npm install electron electron-builder react react-dom sqlite3 better-sqlite3 chokidar

# Instalar dependencias de desarrollo
npm install --save-dev @vitejs/plugin-react vite electron-vite concurrently wait-on cross-env

# Instalar dependencias adicionales
npm install react-router-dom lucide-react
```

### Desarrollo

```bash
# Iniciar en modo desarrollo
npm run dev

# La aplicación se abrirá automáticamente
# Hot reload habilitado para cambios en React
```

### Construcción

```bash
# Build de la aplicación
npm run build

# Empaquetar para distribución
npm run build:electron
```

## 🔐 Seguridad

### Context Isolation
- ✅ `contextIsolation: true` habilitado
- ✅ `nodeIntegration: false` por seguridad
- ✅ API expuesta solo a través de preload script
- ✅ Validación de rutas de archivos

### Protección de Datos
- ✅ Base de datos local (no en la nube)
- ✅ Sin recopilación de datos personales
- ✅ Archivos permanecen en su ubicación original
- ✅ Sin subida automática de contenido

## 📝 Notas de Desarrollo

### Consideraciones Importantes

1. **No mover archivos**: Los videos permanecen en su ubicación original, solo se indexan
2. **Hash único**: Identifica videos por ruta + tamaño, no por contenido completo
3. **Soft delete**: Videos no disponibles se marcan, no se eliminan
4. **Sincronización híbrida**: Manual + automática para balance entre rendimiento y actualización
5. **Thumbnails locales**: Se almacenan en carpeta local, no junto al video

### Limitaciones Conocidas

- El hash actual no detecta videos duplicados con diferente nombre/ubicación
- Chokidar puede tener problemas con redes lentas o muchos archivos
- No hay validación de integridad de archivos de video
- Miniaturas deben generarse manualmente (Fase 3)

### Optimizaciones Futuras

- Implementar hash de contenido para mejor detección de duplicados
- Pool de workers para escaneo paralelo
- Cache de metadatos de video
- Índices de base de datos para búsquedas rápidas
- Compresión de miniaturas

## 🤝 Contribución

Este es un proyecto personal en desarrollo activo. Las fases se implementarán progresivamente según la planificación establecida.

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles

---

**Última actualización**: Enero 2026  
**Versión actual**: 1.0.0 (Fase 1 completa)  
**Estado**: En desarrollo activo