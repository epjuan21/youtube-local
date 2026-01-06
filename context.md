# 📚 CONTEXTO DEL PROYECTO - YouTube Local Manager

**Última actualización:** 06 de Enero de 2025  
**Versión:** 0.2.0 (Fase 2 Completada)  
**Estado:** En Desarrollo Activo

---

## 📋 Resumen Ejecutivo

**YouTube Local Manager** es una aplicación de escritorio desarrollada con Electron, React y Vite que permite gestionar, organizar y reproducir videos locales almacenados en el disco duro del usuario. La aplicación indexa automáticamente carpetas de videos, extrae metadatos, genera thumbnails y proporciona una interfaz moderna similar a YouTube para navegar y reproducir el contenido.

### Objetivo Principal
Proporcionar una experiencia similar a YouTube pero completamente local y privada, sin necesidad de subir videos a la nube, permitiendo al usuario mantener control total sobre su contenido multimedia.

---

## 🎯 Características Principales

### ✅ Implementadas (Fase 1 y 2)

#### Gestión de Videos
- ✅ Indexación automática de carpetas de videos
- ✅ Detección de cambios en archivos (agregar/eliminar/mover)
- ✅ Soporte para múltiples carpetas monitoreadas
- ✅ Base de datos SQLite para almacenamiento de metadatos
- ✅ Sistema de sincronización manual y automática

#### Interfaz de Usuario
- ✅ Navegación por carpetas y subcarpetas
- ✅ Vista Grid y Lista de videos
- ✅ Tarjetas de video con thumbnails
- ✅ Búsqueda en tiempo real (título, descripción, ruta)
- ✅ Sistema de filtros y ordenamiento (12 opciones)
- ✅ Paginación "Load More" para rendimiento
- ✅ Skeleton loaders durante carga

#### Reproductor de Video
- ✅ Reproductor HTML5 nativo
- ✅ Controles personalizados completos
- ✅ Guardado automático de posición de reproducción
- ✅ Velocidad de reproducción variable
- ✅ Atajos de teclado
- ✅ Contador de vistas automático
- ✅ Registro de última visualización

#### Generación de Thumbnails
- ✅ Extracción automática con FFmpeg
- ✅ Generación en segundo plano
- ✅ Widget de progreso visual
- ✅ Almacenamiento local

#### Sistema de Notificaciones
- ✅ Toast notifications (Success, Error, Warning, Info)
- ✅ Animaciones profesionales
- ✅ SyncStatus widget mejorado
- ✅ Historial de sincronizaciones
- ✅ Barra de progreso en tiempo real

### ⏳ Planificadas (Fases 3-7)

#### Fase 3: Funcionalidades Avanzadas
- Sistema de categorías
- Sistema de tags/etiquetas
- Playlists personalizadas
- Editor de metadatos
- Sistema de favoritos

#### Fase 4: Estadísticas y Analytics
- Dashboard de estadísticas
- Historial de reproducción completo
- Sistema de recomendaciones
- Exportación de datos

#### Fase 5: Optimización
- Virtualización del grid
- Workers para tareas pesadas
- Caché inteligente
- Testing completo

#### Fase 6: Características Premium (Opcional)
- Marcadores de tiempo
- Clips y extractos
- Subtítulos y transcripciones
- Modo oscuro/claro

#### Fase 7: Distribución
- Instaladores multiplataforma
- Auto-actualización
- Documentación completa

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

#### Frontend
- **React 18** - Biblioteca de UI
- **React Router DOM** - Navegación
- **Lucide React** - Iconos
- **Context API** - Gestión de estado global

#### Backend (Electron Main Process)
- **Electron** - Framework de aplicaciones de escritorio
- **better-sqlite3** - Base de datos SQLite
- **chokidar** - File watcher para detección de cambios
- **fluent-ffmpeg** - Procesamiento de video y generación de thumbnails

#### Build Tools
- **Vite** - Build tool y dev server
- **Electron Builder** - Empaquetado (futuro)

### Estructura de Directorios

```
youtube-local/
├── src/
│   ├── main/                      # Proceso principal de Electron
│   │   ├── index.js              # Punto de entrada
│   │   ├── database.js           # Gestión de SQLite
│   │   ├── fileWatcher.js        # Monitoreo de archivos
│   │   ├── thumbnailGenerator.js # Generación de thumbnails
│   │   └── ipc/                  # Handlers IPC
│   │       ├── videoHandlers.js
│   │       ├── folderHandlers.js
│   │       └── thumbnailHandlers.js
│   │
│   ├── preload/                   # Scripts preload
│   │   └── index.js              # API expuesta al renderer
│   │
│   └── renderer/                  # Proceso renderer (React)
│       └── src/
│           ├── components/        # Componentes React
│           │   ├── Header.jsx
│           │   ├── Sidebar.jsx
│           │   ├── VideoCard.jsx
│           │   ├── VideoPlayer.jsx
│           │   ├── FilterBar.jsx
│           │   ├── SyncStatus.jsx
│           │   ├── ToastNotifications.jsx
│           │   ├── SkeletonLoaders.jsx
│           │   └── PaginationComponents.jsx
│           │
│           ├── pages/             # Páginas principales
│           │   ├── Home.jsx
│           │   ├── FolderView.jsx
│           │   ├── SearchPage.jsx
│           │   ├── Video.jsx
│           │   ├── Settings.jsx
│           │   └── SyncManager.jsx
│           │
│           ├── context/           # Context API
│           │   └── SearchContext.jsx
│           │
│           ├── hooks/             # Custom hooks
│           │   └── usePagination.js
│           │
│           ├── utils/             # Utilidades
│           │   ├── videoGrouping.js
│           │   └── videoSortFilter.js
│           │
│           └── styles/            # Estilos globales
│               └── global.css
│
├── data/                          # Datos de la aplicación
│   ├── database.db               # Base de datos SQLite
│   └── thumbnails/               # Thumbnails generados
│
├── package.json
├── vite.config.js
└── electron.vite.config.js
```

---

## 💾 Base de Datos

### Esquema de Tablas

#### `watch_folders`
Carpetas monitoreadas por la aplicación.

```sql
CREATE TABLE watch_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_path TEXT NOT NULL UNIQUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_scan DATETIME,
    is_active INTEGER DEFAULT 1
);
```

#### `videos`
Información de cada video indexado.

```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watch_folder_id INTEGER NOT NULL,
    filepath TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    title TEXT,
    description TEXT,
    duration INTEGER,
    file_size INTEGER,
    thumbnail TEXT,
    watch_time INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_viewed DATETIME,
    is_available INTEGER DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (watch_folder_id) REFERENCES watch_folders(id)
);
```

#### Índices
```sql
CREATE INDEX idx_videos_folder ON videos(watch_folder_id);
CREATE INDEX idx_videos_available ON videos(is_available);
CREATE INDEX idx_videos_filepath ON videos(filepath);
```

---

## 🔄 Flujos de Trabajo Principales

### 1. Agregar Nueva Carpeta

```
Usuario → Settings → Agregar Carpeta
    ↓
Electron Main Process → Validar ruta
    ↓
Database → Insertar en watch_folders
    ↓
File Watcher → Iniciar monitoreo
    ↓
Escaneo inicial → Indexar videos existentes
    ↓
UI → Actualizar lista de carpetas
```

### 2. Sincronización de Videos

```
Usuario/Auto-Sync → Trigger sincronización
    ↓
File Scanner → Escanear carpetas monitoreadas
    ↓
Para cada archivo de video:
    ↓
    ├─ Nuevo → Agregar a BD + Generar thumbnail
    ├─ Existente → Verificar cambios
    └─ No encontrado → Marcar como no disponible
    ↓
Notificación → Toast con resultado
    ↓
UI → Actualizar vista de videos
```

### 3. Reproducción de Video

```
Usuario → Click en VideoCard
    ↓
Navigate → /video/:id
    ↓
Load Video Data → Obtener de BD
    ↓
VideoPlayer → Cargar archivo local
    ↓
Durante reproducción:
    ├─ Guardar posición cada 10s
    ├─ Incrementar view_count (una vez)
    └─ Actualizar last_viewed
    ↓
Al salir → Guardar posición final
```

### 4. Búsqueda de Videos

```
Usuario → Escribe en SearchBar
    ↓
SearchContext → Actualizar searchTerm
    ↓
Navigate → /search
    ↓
SearchPage → Cargar todos los videos
    ↓
Filter → Por término de búsqueda
    ↓
Sort → Aplicar ordenamiento actual
    ↓
Paginate → Mostrar primeros 24
    ↓
UI → Renderizar resultados
```

---

## 🎨 Patrones de Diseño Utilizados

### Component Composition
Los componentes se componen de manera modular y reutilizable.

```javascript
<FolderView>
  <FilterBar />
  <VideoGrid>
    {videos.map(video => (
      <VideoCard key={video.id} video={video} />
    ))}
  </VideoGrid>
  <LoadMoreButton />
</FolderView>
```

### Context API para Estado Global
```javascript
<SearchProvider>
  <App>
    <Header />      {/* Usa SearchContext */}
    <SearchPage />  {/* Usa SearchContext */}
  </App>
</SearchProvider>
```

### Custom Hooks
```javascript
// Hook reutilizable de paginación
const pagination = usePagination(videos, 24);

// Uso en cualquier componente
<LoadMoreButton
  onLoadMore={pagination.loadMore}
  hasMore={pagination.hasMore}
  {...}
/>
```

### IPC (Inter-Process Communication)
```javascript
// Renderer → Main
const videos = await window.electronAPI.getVideos();

// Main → Renderer (eventos)
window.electronAPI.onSyncProgress((data) => {
  console.log(data);
});
```

---

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

---

## ⚡ Rendimiento

### Optimizaciones Implementadas

#### Paginación
- Carga inicial: 24 videos
- Load More: +24 videos por click
- Reduce componentes renderizados de 1000+ a ~24-48

#### Skeleton Loaders
- Mejora percepción de velocidad
- Feedback visual inmediato
- Reduce sensación de espera

#### Generación de Thumbnails
- Procesamiento en segundo plano
- No bloquea UI principal
- Sistema de cola

#### File Watcher
- Eventos debounced
- Batch updates
- Detección eficiente de cambios

### Métricas Aproximadas
- **Carga inicial:** ~500ms (24 videos)
- **Load More:** ~50ms (24 videos adicionales)
- **Búsqueda:** ~100ms (filtrado client-side)
- **Reproducción:** Instantánea (archivo local)

---

## 📱 Compatibilidad

### Sistemas Operativos Soportados
- ✅ Windows 10/11
- ✅ macOS (10.14+)
- ✅ Linux (Ubuntu, Debian, Fedora)

### Formatos de Video Soportados
- MP4, MKV, AVI, MOV, WMV, FLV
- Cualquier formato soportado por FFmpeg

### Requisitos del Sistema
- **RAM:** Mínimo 4GB (Recomendado 8GB)
- **Disco:** 100MB para app + espacio para thumbnails
- **CPU:** Dual-core o superior
- **Node.js:** 16+ (para desarrollo)

---

## 🐛 Limitaciones Conocidas

### Actuales (Fase 2)
1. **Hash de videos:** Identifica por ruta + tamaño, no por contenido
   - No detecta duplicados con diferente nombre/ubicación
   
2. **Chokidar:** Puede tener problemas con:
   - Redes lentas
   - Muchos archivos simultáneos
   - Discos externos que se desconectan

3. **Thumbnails:** 
   - Deben generarse manualmente (botón en UI)
   - No se regeneran automáticamente si se eliminan

4. **Sin validación de integridad:** 
   - No verifica si el archivo de video está corrupto

5. **Transiciones entre páginas:** 
   - Cambios instantáneos (sin animación)

6. **Sin subtítulos:** 
   - Soporte de .srt no implementado aún

### Limitaciones de Diseño
- Videos permanecen en ubicación original (no se mueven)
- Soft delete (videos no disponibles se marcan, no se eliminan)
- Sincronización híbrida (manual + automática)
- Thumbnails locales separados del video

---

## 📈 Roadmap de Desarrollo

### Corto Plazo (Fase 3)
- Sistema de categorías
- Sistema de tags
- Playlists
- Editor de metadatos

### Mediano Plazo (Fase 4-5)
- Dashboard de estadísticas
- Sistema de recomendaciones
- Optimizaciones de rendimiento
- Testing completo

### Largo Plazo (Fase 6-7)
- Características premium
- Instaladores multiplataforma
- Sistema de auto-actualización
- Documentación completa

---

## 🤝 Contribución y Desarrollo

### Comandos Principales

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build de producción
npm run build

# Empaquetar aplicación
npm run build:electron
```

### Flujo de Desarrollo
1. Desarrollar en rama feature
2. Probar localmente con `npm run dev`
3. Verificar build con `npm run build`
4. Actualizar documentación
5. Actualizar Fases.md y CONTEXTO.md

---

## 📝 Versionado

### Versión Actual: 0.2.0

**Formato:** MAJOR.MINOR.PATCH

- **MAJOR:** Cambios incompatibles en API
- **MINOR:** Nueva funcionalidad compatible
- **PATCH:** Correcciones de bugs

### Historial de Versiones

#### v0.2.0 (06/01/2025)
- ✅ Fase 2 completada al 100%
- ✅ Sistema de filtros y ordenamiento
- ✅ Paginación Load More
- ✅ Vista Grid y Lista
- ✅ Skeleton Loaders
- ✅ Sistema de notificaciones Toast
- ✅ SyncStatus Widget mejorado

#### v0.1.0 (Fecha anterior)
- ✅ Fase 1 completada
- ✅ Configuración base
- ✅ Sistema de sincronización
- ✅ Interfaz básica

---

## 📚 Recursos Adicionales

### Documentación
- `Fases.md` - Plan de desarrollo completo
- `README.md` - Guía de inicio rápido
- `CONTEXTO.md` - Este documento

### Enlaces Útiles
- Electron Docs: https://www.electronjs.org/docs
- React Docs: https://react.dev/
- Vite Docs: https://vitejs.dev/
- FFmpeg Docs: https://ffmpeg.org/documentation.html

---

## 📞 Información de Contacto

Este es un proyecto personal en desarrollo activo.

---

**Última actualización:** 06 de Enero de 2025  
**Estado del Proyecto:** 2 de 7 fases completadas (~28%)  
**Próximo Milestone:** Fase 3 - Funcionalidades Avanzadas
