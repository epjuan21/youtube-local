# 📝 CHANGELOG - YouTube Local Manager

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.1] - 2025-01-11

### ✨ Añadido
- **Video.jsx actualizado** con barra de acciones completa
  - Botón Favoritos con toggle instantáneo
  - Botón Categorías con modal selector
  - Botón Tags con modal selector
  - Botón Playlist con modal selector
  - Badges visuales de categorías y tags debajo del título
  - Indicador de playlists donde está el video
- **Soporte de reproducción desde playlist**
  - Detección de parámetro `?playlist=X` en URL
  - Props de playlist pasadas a VideoPlayer
  - Navegación Anterior/Siguiente
  - Auto-play del siguiente video con countdown de 5 segundos
- **Documentación modular**
  - `context.md` - Resumen ejecutivo compacto
  - `ARQUITECTURA.md` - Estructura técnica detallada
  - `CHANGELOG.md` - Este archivo

### 🔄 Modificado
- Reorganización de la documentación del proyecto
- Referencias cruzadas entre documentos

---

## [0.3.0] - 2025-01-10

### ✨ Añadido
- **Sistema de Tags completo**
  - 11 APIs backend (`tag:*`)
  - Tabla `tags` y `video_tags` (relación N:M)
  - `TagBadge.jsx` - Badge visual con colores
  - `TagSelector.jsx` - Modal para asignar tags
  - `TagManager.jsx` - CRUD completo
  - `TagPage.jsx` - Página `/tag/:tagId`
  - 16 colores preset para tags
  - Búsqueda en tiempo real
  - Integración en Sidebar y VideoCard

- **Sistema de Playlists completo**
  - 20 APIs backend (`playlist:*`)
  - Tabla `playlists` y `playlist_videos` (con posición)
  - `PlaylistCard.jsx` - Card visual de playlist
  - `PlaylistSelector.jsx` - Modal para agregar a playlist
  - `PlaylistManager.jsx` - CRUD completo
  - `PlaylistPage.jsx` - Página `/playlist/:playlistId`
  - `PlaylistsPage.jsx` - Página `/playlists`
  - Drag & drop para reordenar videos
  - Exportar/Importar JSON
  - Duplicar playlists
  - Navegación para reproducción continua
  - Integración en Sidebar y VideoCard

### 🔄 Modificado
- **Sidebar.jsx** (823 líneas)
  - Nueva sección de Playlists (verde)
  - Modal PlaylistManager integrado
- **VideoCard.jsx** (470 líneas)
  - 4 botones flotantes: Playlist, Tags, Categorías, Favoritos
  - Badges de tags visibles
  - Indicador de playlists en footer
- **App.jsx** - Nuevas rutas para tags y playlists

### 📊 Estadísticas
- 31 nuevas APIs implementadas
- 9 nuevos componentes
- ~4,500 líneas de código añadidas

---

## [0.2.1] - 2025-01-07

### ✨ Añadido
- **Sistema de Categorías completo**
  - 11 APIs backend (`category:*`)
  - Tabla `categories` y `video_categories` (relación N:M)
  - `CategoryBadge.jsx` - Badge visual con colores
  - `CategorySelector.jsx` - Modal para asignar categorías
  - `CategoryManager.jsx` - CRUD completo
  - `CategoryPage.jsx` - Página `/category/:categoryId`
  - Integración en Sidebar y VideoCard

- **Sistema Multi-Disco**
  - Detección de UUID multiplataforma (Linux/macOS/Windows)
  - Rutas relativas independientes del punto de montaje
  - Detección automática de reconexión cada 5 minutos
  - Restauración automática de videos
  - Migración de base de datos sin pérdida de datos
  - 3 APIs: `disk:detectReconnected`, `disk:getInfo`, `disk:updatePaths`

---

## [0.2.0] - 2025-01-06

### ✨ Añadido
- **Sistema de Favoritos**
  - 4 APIs: `toggleFavorite`, `getFavorites`, `getFavoritesCount`, `clearAllFavorites`
  - `FavoriteButton.jsx` - Botón estrella animado
  - `FavoritesPage.jsx` - Página dedicada `/favorites`
  - Badge con contador en Sidebar
  - Filtros y ordenamiento en página de favoritos

- **Sistema de Filtros y Ordenamiento**
  - 12 opciones de ordenamiento
  - Filtros por disponibilidad
  - `FilterBar.jsx` con controles visuales

- **Paginación "Load More"**
  - Carga inicial de 24 videos
  - Botón para cargar más
  - `PaginationComponents.jsx`
  - Hook `usePagination.js`

- **Skeleton Loaders**
  - `SkeletonLoaders.jsx` con múltiples variantes
  - Mejora de percepción de velocidad

- **Sistema de Notificaciones Toast**
  - `ToastNotifications.jsx`
  - 4 tipos: Success, Error, Warning, Info
  - Animaciones profesionales
  - Auto-dismiss configurable

- **SyncStatus Widget mejorado**
  - Historial de sincronizaciones
  - Barra de progreso en tiempo real
  - Estados visuales claros

### 🔄 Modificado
- Mejora general de la UI con estilos consistentes
- Optimización de rendimiento con paginación

---

## [0.1.0] - 2025-01 (Fecha exacta no registrada)

### ✨ Añadido
- **Core de la Aplicación**
  - Estructura base Electron + React + Vite
  - Configuración de electron-vite
  - Sistema de build

- **Base de Datos SQLite**
  - Tabla `watch_folders`
  - Tabla `videos`
  - Índices básicos

- **Sistema de Sincronización**
  - `scanner.js` - Escaneo de carpetas
  - `fileWatcher.js` - Monitoreo con Chokidar
  - APIs básicas de folders

- **Generación de Thumbnails**
  - `thumbnailGenerator.js` con FFmpeg
  - Generación en segundo plano
  - Widget de progreso

- **Reproductor de Video**
  - `VideoPlayer.jsx` con controles personalizados
  - Guardado de posición de reproducción
  - Velocidad variable
  - Atajos de teclado

- **Interfaz Básica**
  - `Header.jsx` con búsqueda
  - `Sidebar.jsx` con navegación
  - `VideoCard.jsx` con thumbnails
  - `Home.jsx` - Página principal
  - `FolderView.jsx` - Vista de carpeta
  - `SearchPage.jsx` - Resultados de búsqueda
  - `Settings.jsx` - Configuración básica
  - `SyncManager.jsx` - Gestión de carpetas

---

## Leyenda

| Emoji | Tipo de Cambio |
|-------|----------------|
| ✨ | Añadido - Nueva funcionalidad |
| 🔄 | Modificado - Cambios en funcionalidad existente |
| 🐛 | Corregido - Corrección de bugs |
| 🗑️ | Eliminado - Funcionalidad removida |
| 🔒 | Seguridad - Correcciones de seguridad |
| 📊 | Estadísticas - Métricas del cambio |

---

## Roadmap

### Próximas versiones

#### v0.4.0 (Estimado: Enero 2025)
- [ ] Editor de Metadatos
- [ ] Extracción de Metadatos con FFmpeg
- [ ] Completar Fase 3 al 100%

#### v0.5.0 (Estimado: Febrero 2025)
- [ ] Dashboard de estadísticas
- [ ] Historial de reproducción
- [ ] Sistema de recomendaciones

#### v1.0.0 (Estimado: Q2 2025)
- [ ] Todas las fases completadas
- [ ] Instaladores multiplataforma
- [ ] Documentación completa
- [ ] Testing completo

---

**Documento principal:** [`context.md`](./context.md)