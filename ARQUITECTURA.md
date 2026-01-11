# 🏗️ ARQUITECTURA DEL PROYECTO

**YouTube Local Manager - Documentación Técnica**  
**Última actualización:** 11 de Enero de 2025

---

## 📁 Estructura de Directorios

```
youtube-local/
├── src/
│   ├── main/                      # Proceso principal de Electron
│   │   ├── index.js              # Punto de entrada principal
│   │   ├── database.js           # Gestión de SQLite + migraciones
│   │   ├── scanner.js            # Escaneo de carpetas
│   │   ├── fileWatcher.js        # Monitoreo de archivos (Chokidar)
│   │   ├── thumbnailGenerator.js # Generación de thumbnails (FFmpeg)
│   │   ├── diskDetection.js      # Detección de discos (Multi-Disco)
│   │   ├── diskUtils.js          # Utilidades de disco
│   │   ├── videoHash.js          # Hash de videos
│   │   │
│   │   └── ipc/                  # Handlers IPC (8 archivos)
│   │       ├── videoHandlers.js
│   │       ├── folderHandlers.js
│   │       ├── syncHandlers.js
│   │       ├── thumbnailHandlers.js
│   │       ├── favoriteHandlers.js
│   │       ├── categoryHandlers.js
│   │       ├── tagHandlers.js
│   │       └── playlistHandlers.js
│   │
│   ├── preload/
│   │   └── index.js              # API expuesta al renderer (49 APIs)
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── App.jsx           # Componente raíz + rutas
│           ├── main.jsx          # Punto de entrada React
│           │
│           ├── components/        # 24 componentes
│           │   ├── Header.jsx
│           │   ├── Sidebar.jsx
│           │   ├── VideoCard.jsx
│           │   ├── VideoPlayer.jsx
│           │   ├── FilterBar.jsx
│           │   ├── FolderCard.jsx
│           │   ├── FolderSection.jsx
│           │   ├── SearchResults.jsx
│           │   ├── SyncStatus.jsx
│           │   ├── ThumbnailProgress.jsx
│           │   ├── ToastNotifications.jsx
│           │   ├── SkeletonLoaders.jsx
│           │   ├── PaginationComponents.jsx
│           │   ├── FavoriteButton.jsx
│           │   ├── CategoryBadge.jsx
│           │   ├── CategorySelector.jsx
│           │   ├── CategoryManager.jsx
│           │   ├── TagBadge.jsx
│           │   ├── TagInput.jsx
│           │   ├── TagSelector.jsx
│           │   ├── TagManager.jsx
│           │   ├── PlaylistCard.jsx
│           │   ├── PlaylistSelector.jsx
│           │   └── PlaylistManager.jsx
│           │
│           ├── pages/             # 10 páginas
│           │   ├── Home.jsx
│           │   ├── FolderView.jsx
│           │   ├── SearchPage.jsx
│           │   ├── Video.jsx
│           │   ├── Settings.jsx
│           │   ├── SyncManager.jsx
│           │   ├── FavoritesPage.jsx
│           │   ├── CategoryPage.jsx
│           │   ├── TagPage.jsx
│           │   └── PlaylistPage.jsx
│           │
│           ├── context/
│           │   └── SearchContext.jsx
│           │
│           ├── hooks/
│           │   └── usePagination.js
│           │
│           ├── utils/
│           │   ├── videoGrouping.js
│           │   └── videoSortFilter.js
│           │
│           └── styles/
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

### Resumen de Archivos

| Carpeta | Archivos | Descripción |
|---------|----------|-------------|
| `src/main/` | 8 | Backend Electron |
| `src/main/ipc/` | 8 | Handlers IPC |
| `src/preload/` | 1 | Preload script |
| `src/renderer/src/components/` | 24 | Componentes React |
| `src/renderer/src/pages/` | 10 | Páginas |
| `src/renderer/src/` (otros) | 5 | Context, hooks, utils, styles |
| **Total** | **56** | **archivos de código** |

---

## 💾 Base de Datos SQLite

### Diagrama de Relaciones

```
┌─────────────────┐       ┌─────────────────┐
│  watch_folders  │───1:N─│     videos      │
└─────────────────┘       └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                   N:M            N:M            N:M
                    │              │              │
            ┌───────┴───────┐ ┌────┴────┐ ┌──────┴──────┐
            │video_categories│ │video_tags│ │playlist_videos│
            └───────┬───────┘ └────┬────┘ └──────┬──────┘
                    │              │              │
                   N:1            N:1            N:1
                    │              │              │
            ┌───────┴───────┐ ┌────┴────┐ ┌──────┴──────┐
            │  categories   │ │  tags   │ │  playlists  │
            └───────────────┘ └─────────┘ └─────────────┘
```

### Esquemas de Tablas

#### `watch_folders`
```sql
CREATE TABLE watch_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_path TEXT NOT NULL UNIQUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_scan DATETIME,
    is_active INTEGER DEFAULT 1,
    -- Multi-Disco
    disk_identifier TEXT,
    disk_mount_point TEXT,
    relative_path TEXT
);

CREATE INDEX idx_watch_folders_disk ON watch_folders(disk_identifier);
CREATE UNIQUE INDEX idx_watch_folders_unique ON watch_folders(disk_identifier, relative_path);
```

#### `videos`
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
    -- Favoritos
    is_favorite INTEGER DEFAULT 0,
    -- Multi-Disco
    disk_identifier TEXT,
    relative_filepath TEXT,
    -- Likes
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    FOREIGN KEY (watch_folder_id) REFERENCES watch_folders(id)
);

CREATE INDEX idx_videos_folder ON videos(watch_folder_id);
CREATE INDEX idx_videos_available ON videos(is_available);
CREATE INDEX idx_videos_filepath ON videos(filepath);
CREATE INDEX idx_videos_favorite ON videos(is_favorite);
CREATE INDEX idx_videos_disk ON videos(disk_identifier);
```

#### `categories`
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'folder',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `video_categories`
```sql
CREATE TABLE video_categories (
    video_id INTEGER,
    category_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, category_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_video_categories_video ON video_categories(video_id);
CREATE INDEX idx_video_categories_category ON video_categories(category_id);
```

#### `tags`
```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#8b5cf6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `video_tags`
```sql
CREATE TABLE video_tags (
    video_id INTEGER,
    tag_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, tag_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_video_tags_video ON video_tags(video_id);
CREATE INDEX idx_video_tags_tag ON video_tags(tag_id);
```

#### `playlists`
```sql
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#10b981',
    thumbnail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_playlists_updated ON playlists(updated_at DESC);
```

#### `playlist_videos`
```sql
CREATE TABLE playlist_videos (
    playlist_id INTEGER,
    video_id INTEGER,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, video_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_videos_playlist ON playlist_videos(playlist_id);
CREATE INDEX idx_playlist_videos_video ON playlist_videos(video_id);
CREATE INDEX idx_playlist_videos_position ON playlist_videos(playlist_id, position);
```

---

## 🔌 APIs IPC (49 Total)

### Videos (4 APIs)
| API | Descripción |
|-----|-------------|
| `videos:getAll` | Obtener todos los videos |
| `videos:getById` | Obtener video por ID |
| `videos:updateStats` | Actualizar estadísticas |
| `videos:search` | Buscar videos |

### Folders (4 APIs)
| API | Descripción |
|-----|-------------|
| `folders:add` | Agregar carpeta |
| `folders:remove` | Eliminar carpeta |
| `folders:getAll` | Obtener todas las carpetas |
| `folders:sync` | Sincronizar carpeta |

### Thumbnails (2 APIs)
| API | Descripción |
|-----|-------------|
| `thumbnails:generate` | Generar thumbnail |
| `thumbnails:getPath` | Obtener ruta de thumbnail |

### Favoritos (4 APIs)
| API | Descripción |
|-----|-------------|
| `favorites:toggle` | Marcar/desmarcar favorito |
| `favorites:getAll` | Obtener todos los favoritos |
| `favorites:getCount` | Contar favoritos |
| `favorites:clearAll` | Limpiar todos |

### Multi-Disco (3 APIs)
| API | Descripción |
|-----|-------------|
| `disk:detectReconnected` | Detectar discos reconectados |
| `disk:getInfo` | Obtener info del disco |
| `disk:updatePaths` | Actualizar rutas |

### Categorías (11 APIs)
| API | Descripción |
|-----|-------------|
| `category:getAll` | Obtener todas |
| `category:getById` | Obtener por ID |
| `category:create` | Crear categoría |
| `category:update` | Actualizar categoría |
| `category:delete` | Eliminar categoría |
| `category:assignToVideo` | Asignar a video |
| `category:removeFromVideo` | Quitar de video |
| `category:getVideoCategories` | Categorías de un video |
| `category:getVideos` | Videos de una categoría |
| `category:setVideoCategories` | Establecer categorías |
| `category:search` | Buscar categorías |

### Tags (11 APIs)
| API | Descripción |
|-----|-------------|
| `tag:getAll` | Obtener todos |
| `tag:getById` | Obtener por ID |
| `tag:create` | Crear tag |
| `tag:update` | Actualizar tag |
| `tag:delete` | Eliminar tag |
| `tag:assignToVideo` | Asignar a video |
| `tag:removeFromVideo` | Quitar de video |
| `tag:getVideoTags` | Tags de un video |
| `tag:getVideos` | Videos con un tag |
| `tag:setVideoTags` | Establecer tags |
| `tag:search` | Buscar tags |

### Playlists (20 APIs)
| API | Descripción |
|-----|-------------|
| `playlist:getAll` | Obtener todas |
| `playlist:getById` | Obtener por ID |
| `playlist:create` | Crear playlist |
| `playlist:update` | Actualizar playlist |
| `playlist:delete` | Eliminar playlist |
| `playlist:getVideos` | Videos de una playlist |
| `playlist:addVideo` | Agregar video |
| `playlist:addVideos` | Agregar múltiples videos |
| `playlist:removeVideo` | Quitar video |
| `playlist:reorderVideo` | Mover video a posición |
| `playlist:reorder` | Reordenar todos (bulk) |
| `playlist:getVideoPlaylists` | Playlists de un video |
| `playlist:duplicate` | Duplicar playlist |
| `playlist:clear` | Vaciar playlist |
| `playlist:getCount` | Contar playlists |
| `playlist:search` | Buscar playlists |
| `playlist:export` | Exportar a JSON |
| `playlist:import` | Importar desde JSON |
| `playlist:getNextVideo` | Siguiente video |
| `playlist:getPreviousVideo` | Video anterior |

---

## 🛣️ Rutas de la Aplicación

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `Home` | Página principal |
| `/search` | `SearchPage` | Resultados de búsqueda |
| `/folder/:id` | `FolderView` | Vista de carpeta |
| `/folder/:id/:subpath` | `FolderView` | Vista de subcarpeta |
| `/video/:id` | `Video` | Reproductor de video |
| `/favorites` | `FavoritesPage` | Página de favoritos |
| `/settings` | `Settings` | Configuración |
| `/sync` | `SyncManager` | Gestor de sincronización |
| `/category/:categoryId` | `CategoryPage` | Videos por categoría |
| `/tag/:tagId` | `TagPage` | Videos por tag |
| `/playlist/:playlistId` | `PlaylistPage` | Detalle de playlist |
| `/playlists` | `PlaylistPage` | Lista de playlists |

---

## 🔄 Flujo de Datos

### Comunicación IPC

```
┌─────────────┐     IPC      ┌─────────────┐     SQL      ┌──────────┐
│   React     │ ◄──────────► │   Electron  │ ◄──────────► │  SQLite  │
│  (Renderer) │   invoke/    │   (Main)    │   Query/     │   (DB)   │
│             │   handle     │             │   Result     │          │
└─────────────┘              └─────────────┘              └──────────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────┐              ┌─────────────┐
│   Preload   │              │   Chokidar  │
│   Bridge    │              │   Watcher   │
└─────────────┘              └─────────────┘
```

### Flujo de Sincronización

```
Usuario solicita sync
        │
        ▼
┌─────────────────┐
│  Scanner.js     │──► Lee archivos del disco
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database.js    │──► Compara con BD
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Nuevos    Eliminados
    │         │
    ▼         ▼
 INSERT    UPDATE
            is_available=0
```

---

## ⚡ Optimizaciones Implementadas

### Base de Datos
- 15+ índices optimizados
- Índices compuestos para consultas frecuentes
- Foreign keys con CASCADE para integridad

### Frontend
- Paginación: 24 videos por carga
- Skeleton loaders durante carga
- Context API para estado global
- Lazy loading de componentes

### Backend
- File watcher con debounce
- Generación de thumbnails en background
- Detección de discos cada 5 minutos
- Actualización de sidebar cada 10 segundos

---

## 📊 Métricas del Código

| Categoría | Cantidad |
|-----------|----------|
| Archivos de código | 56 |
| Líneas de código | ~17,600 |
| APIs IPC | 49 |
| Componentes React | 24 |
| Páginas | 10 |
| Tablas BD | 8 |
| Índices BD | 15+ |

---

**Documento relacionado:** [`context.md`](./context.md) - Resumen ejecutivo