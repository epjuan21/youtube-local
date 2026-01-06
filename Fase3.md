# 📦 FASE 3: FUNCIONALIDADES AVANZADAS - Recapitulación Detallada

**Objetivo General:** Enriquecer la gestión de videos con características que permitan organización avanzada, personalización y control total sobre la biblioteca de videos.

---

## 🎯 RESUMEN EJECUTIVO

La Fase 3 se centra en implementar 6 sistemas principales que transformarán la aplicación de un simple gestor de videos a una plataforma completa de organización multimedia:

1. **Sistema de Categorías** - Organización jerárquica
2. **Sistema de Tags** - Etiquetado flexible
3. **Playlists** - Colecciones personalizadas
4. **Editor de Metadatos** - Personalización de información
5. **Extracción Automática de Metadatos** - Información técnica detallada
6. **Sistema de Favoritos** - Acceso rápido a contenido preferido

---

## 🔍 DESGLOSE DETALLADO POR SISTEMA

---

### 1️⃣ **SISTEMA DE CATEGORÍAS**

#### Objetivo:
Permitir al usuario organizar videos en categorías jerárquicas con colores personalizados.

#### Funcionalidades:

**📝 Crear/Editar/Eliminar Categorías**
- Modal para gestión de categorías
- Campos:
  - Nombre de categoría (obligatorio)
  - Color personalizado (picker de color)
  - Descripción (opcional)
  - Ícono (opcional)
- Validación de nombres duplicados
- Confirmación al eliminar categoría con videos asignados

**🏷️ Asignar Múltiples Categorías a Videos**
- Selector de categorías en VideoCard
- Modal de edición rápida
- Checkbox múltiple para seleccionar categorías
- Un video puede tener 0 a N categorías
- Vista de categorías en tarjeta de video (badges)

**🔍 Vista Filtrada por Categoría**
- Filtro en FilterBar para seleccionar categoría
- Vista dedicada por categoría (página /category/:id)
- Contador de videos por categoría
- Combinable con otros filtros (disponibilidad, ordenamiento)

**🎨 Colores Personalizados**
- Cada categoría tiene color único
- Badges de categoría con color asignado
- Filtro visual por color
- Presets de colores comunes

#### Cambios en Base de Datos:

```sql
-- Nueva tabla: categories
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nueva tabla: video_categories (relación N:M)
CREATE TABLE video_categories (
    video_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, category_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_video_categories_video ON video_categories(video_id);
CREATE INDEX idx_video_categories_category ON video_categories(category_id);
```

#### Componentes a Crear:
- `CategoryManager.jsx` - Panel de gestión de categorías
- `CategoryBadge.jsx` - Badge de categoría
- `CategorySelector.jsx` - Selector múltiple de categorías
- `CategoryFilter.jsx` - Filtro por categorías en FilterBar
- `CategoryPage.jsx` - Vista de videos por categoría

#### Ejemplos de Categorías:
- Tutoriales (🎓 Azul)
- Entretenimiento (🎬 Rojo)
- Documentales (📚 Verde)
- Música (🎵 Púrpura)
- Gaming (🎮 Naranja)

---

### 2️⃣ **SISTEMA DE TAGS/ETIQUETAS**

#### Objetivo:
Sistema flexible de etiquetado para clasificación granular de videos.

#### Funcionalidades:

**🏷️ Agregar Tags a Videos**
- Input de tags con autocompletado
- Tags separados por coma o Enter
- Límite sugerido: 10 tags por video
- Validación de caracteres especiales
- Tags case-insensitive

**💡 Autocompletado de Tags Existentes**
- Dropdown con sugerencias al escribir
- Mostrar tags más usados
- Filtrar por coincidencia
- Crear nuevo tag si no existe

**🔍 Búsqueda por Tags**
- Búsqueda específica por tag
- Filtro múltiple (AND/OR)
- Combinable con búsqueda por texto
- Vista de videos con tag específico

**☁️ Nube de Tags**
- Vista visual de tags más usados
- Tamaño proporcional a frecuencia
- Click en tag → ver videos
- Filtrable por categoría

#### Cambios en Base de Datos:

```sql
-- Nueva tabla: tags
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nueva tabla: video_tags (relación N:M)
CREATE TABLE video_tags (
    video_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, tag_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_video_tags_video ON video_tags(video_id);
CREATE INDEX idx_video_tags_tag ON video_tags(tag_id);
CREATE INDEX idx_tags_name ON tags(name);
```

#### Componentes a Crear:
- `TagInput.jsx` - Input con autocompletado
- `TagCloud.jsx` - Nube de tags visual
- `TagBadge.jsx` - Badge individual de tag
- `TagFilter.jsx` - Filtro por tags
- `TagManager.jsx` - Gestión de tags

#### Ejemplos de Tags:
- #javascript, #tutorial, #beginner
- #react, #hooks, #2024
- #gaming, #walkthrough, #ps5

---

### 3️⃣ **PLAYLISTS**

#### Objetivo:
Crear colecciones personalizadas de videos con reproducción continua.

#### Funcionalidades:

**📋 Crear Playlists Personalizadas**
- Modal de creación de playlist
- Campos:
  - Nombre (obligatorio)
  - Descripción
  - Thumbnail (auto o manual)
  - Privacidad (futura)
- Vista de todas las playlists

**➕ Agregar/Remover Videos de Playlists**
- Botón "Agregar a playlist" en VideoCard
- Modal selector de playlists
- Checkbox para múltiples playlists
- Remover desde la playlist o desde el video
- Confirmación al remover

**🔀 Reordenar Videos en Playlist**
- Drag & drop para reordenar
- Botones arriba/abajo
- Vista previa de orden
- Guardar automáticamente

**▶️ Reproducción Continua de Playlist**
- Player especial para playlists
- Auto-play del siguiente video
- Mostrar lista lateral
- Progreso de playlist (video 3 de 10)
- Shuffle y repeat modes

**📤 Compartir/Exportar Playlists**
- Exportar a JSON
- Copiar lista de videos
- Futuro: Compartir con otros usuarios

#### Cambios en Base de Datos:

```sql
-- Nueva tabla: playlists
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nueva tabla: playlist_videos (relación N:M con orden)
CREATE TABLE playlist_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_playlist_videos_playlist ON playlist_videos(playlist_id);
CREATE INDEX idx_playlist_videos_position ON playlist_videos(playlist_id, position);
```

#### Componentes a Crear:
- `PlaylistManager.jsx` - Gestión de playlists
- `PlaylistCard.jsx` - Tarjeta de playlist
- `PlaylistView.jsx` - Vista de videos en playlist
- `PlaylistPlayer.jsx` - Reproductor con lista
- `PlaylistSelector.jsx` - Selector para agregar videos
- `PlaylistSidebar.jsx` - Lista lateral en reproductor

---

### 4️⃣ **EDITOR DE METADATOS**

#### Objetivo:
Permitir edición manual de información de videos.

#### Funcionalidades:

**✏️ Editar Título y Descripción**
- Modal de edición
- Campos:
  - Título
  - Descripción (textarea)
  - Duración (si difiere de la real)
  - Fecha personalizada
- Validación de campos
- Previsualización en tiempo real

**💾 Guardado Automático**
- Auto-save cada 5 segundos
- Indicador visual "Guardando..."
- Sin necesidad de botón guardar
- Prevenir pérdida de datos

**📜 Historial de Cambios**
- Registro de ediciones
- Quién y cuándo (futuro multi-usuario)
- Revertir a versión anterior
- Comparación de cambios

**⚡ Edición Rápida**
- Editar desde VideoCard (inline)
- Click para editar título
- ESC para cancelar, Enter para guardar
- Edición en lote (múltiples videos)

#### Cambios en Base de Datos:

```sql
-- Nueva tabla: video_metadata_history
CREATE TABLE video_metadata_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Índice
CREATE INDEX idx_metadata_history_video ON video_metadata_history(video_id);
```

#### Componentes a Crear:
- `MetadataEditor.jsx` - Modal de edición
- `QuickEdit.jsx` - Edición inline
- `MetadataHistory.jsx` - Visor de historial
- `BulkEdit.jsx` - Edición múltiple

---

### 5️⃣ **EXTRACCIÓN AUTOMÁTICA DE METADATOS**

#### Objetivo:
Extraer información técnica detallada de los archivos de video.

#### Funcionalidades:

**📊 Leer Metadatos del Archivo**
- Duración exacta
- Resolución (1920x1080, 4K, etc.)
- Codec de video (H.264, H.265, VP9)
- Codec de audio (AAC, MP3, Opus)
- FPS (24, 30, 60)
- Aspect ratio (16:9, 4:3)

**🌍 Detectar Idioma del Audio**
- Pistas de audio disponibles
- Idiomas detectados
- Audio multicanal (stereo, 5.1, 7.1)

**📝 Información de Subtítulos Incrustados**
- Subtítulos embebidos
- Idiomas disponibles
- Formato (SRT, ASS, etc.)

**⚙️ Bitrate y Calidad**
- Bitrate de video
- Bitrate de audio
- Calidad estimada (SD, HD, Full HD, 4K)
- Tamaño por minuto

#### Implementación Técnica:
- Usar **fluent-ffmpeg** para extracción
- Ejecutar al agregar video nuevo
- Actualizar en segundo plano
- Cache de metadatos extraídos

#### Cambios en Base de Datos:

```sql
-- Agregar columnas a tabla videos
ALTER TABLE videos ADD COLUMN resolution TEXT;
ALTER TABLE videos ADD COLUMN codec_video TEXT;
ALTER TABLE videos ADD COLUMN codec_audio TEXT;
ALTER TABLE videos ADD COLUMN fps INTEGER;
ALTER TABLE videos ADD COLUMN bitrate_video INTEGER;
ALTER TABLE videos ADD COLUMN bitrate_audio INTEGER;
ALTER TABLE videos ADD COLUMN aspect_ratio TEXT;
ALTER TABLE videos ADD COLUMN audio_languages TEXT;
ALTER TABLE videos ADD COLUMN subtitle_languages TEXT;
```

#### Componentes a Crear:
- `VideoInfo.jsx` - Panel de información técnica
- `MetadataExtractor.js` - Utilidad de extracción (Main process)
- `TechnicalDetails.jsx` - Detalles expandibles en Video page

---

### 6️⃣ **SISTEMA DE FAVORITOS**

#### Objetivo:
Acceso rápido a videos preferidos.

#### Funcionalidades:

**⭐ Marcar Videos como Favoritos**
- Botón estrella en VideoCard
- Click para marcar/desmarcar
- Animación al marcar
- Contador de favoritos

**🌟 Vista Rápida de Favoritos**
- Página dedicada /favorites
- Filtrable y ordenable (igual que otras vistas)
- Acceso desde Sidebar
- Badge de "favorito" en todas las vistas

**✨ Ícono de Estrella en VideoCard**
- Estrella amarilla si es favorito
- Estrella outline si no lo es
- Hover effect
- Toggle con click

#### Cambios en Base de Datos:

```sql
-- Agregar columna a tabla videos
ALTER TABLE videos ADD COLUMN is_favorite INTEGER DEFAULT 0;

-- Índice para búsquedas rápidas
CREATE INDEX idx_videos_favorite ON videos(is_favorite);
```

#### Componentes a Crear:
- `FavoriteButton.jsx` - Botón de favorito
- `FavoritesPage.jsx` - Página de favoritos
- `FavoritesBadge.jsx` - Indicador visual

---

## 🗂️ ESTRUCTURA DE ARCHIVOS A CREAR/MODIFICAR

```
youtube-local/
├── src/
│   ├── main/
│   │   ├── database.js                    ← Actualizar (nuevas tablas)
│   │   ├── metadataExtractor.js           ← NUEVO
│   │   └── ipc/
│   │       ├── categoryHandlers.js        ← NUEVO
│   │       ├── tagHandlers.js             ← NUEVO
│   │       ├── playlistHandlers.js        ← NUEVO
│   │       ├── metadataHandlers.js        ← NUEVO
│   │       └── favoriteHandlers.js        ← NUEVO
│   │
│   └── renderer/
│       └── src/
│           ├── components/
│           │   ├── CategoryManager.jsx    ← NUEVO
│           │   ├── CategoryBadge.jsx      ← NUEVO
│           │   ├── CategorySelector.jsx   ← NUEVO
│           │   ├── TagInput.jsx           ← NUEVO
│           │   ├── TagCloud.jsx           ← NUEVO
│           │   ├── TagBadge.jsx           ← NUEVO
│           │   ├── PlaylistManager.jsx    ← NUEVO
│           │   ├── PlaylistCard.jsx       ← NUEVO
│           │   ├── PlaylistPlayer.jsx     ← NUEVO
│           │   ├── MetadataEditor.jsx     ← NUEVO
│           │   ├── VideoInfo.jsx          ← NUEVO
│           │   ├── FavoriteButton.jsx     ← NUEVO
│           │   └── VideoCard.jsx          ← Actualizar
│           │
│           ├── pages/
│           │   ├── CategoryPage.jsx       ← NUEVO
│           │   ├── PlaylistView.jsx       ← NUEVO
│           │   ├── FavoritesPage.jsx      ← NUEVO
│           │   └── Video.jsx              ← Actualizar
│           │
│           └── utils/
│               └── metadataUtils.js       ← NUEVO
```

---

## 🎯 ORDEN DE IMPLEMENTACIÓN SUGERIDO

### Semana 1: Sistema de Favoritos + Categorías Base
1. Sistema de Favoritos (más simple, da valor inmediato)
2. Base de datos para categorías
3. CRUD básico de categorías
4. Asignación de categorías a videos

### Semana 2: Categorías Completas + Tags Base
5. Colores y personalización de categorías
6. Vista filtrada por categoría
7. Base de datos para tags
8. Tag input con autocompletado

### Semana 3: Tags Completos + Playlists Base
9. Búsqueda por tags
10. Nube de tags
11. Base de datos para playlists
12. CRUD de playlists

### Semana 4: Playlists Completas
13. Agregar/remover videos
14. Reordenar videos
15. Reproductor de playlists
16. Exportar playlists

### Semana 5: Editor de Metadatos
17. Modal de edición
18. Guardado automático
19. Edición rápida inline
20. Historial de cambios

### Semana 6: Extracción de Metadatos
21. Script de extracción con FFmpeg
22. Integración en sincronización
23. Panel de información técnica
24. Procesamiento en background

---

## 📊 MÉTRICAS DE ÉXITO

### Funcionalidad:
- ✅ 100% de funcionalidades implementadas
- ✅ Sin bugs críticos
- ✅ Todas las vistas navegables

### Rendimiento:
- ✅ Operaciones CRUD < 100ms
- ✅ Carga de playlists < 500ms
- ✅ Extracción de metadatos en background

### UX:
- ✅ Flujo intuitivo para categorías/tags
- ✅ Drag & drop funcional en playlists
- ✅ Feedback visual en todas las acciones

---

## 🎉 ENTREGABLES DE LA FASE 3

Al completar la Fase 3, tendrás:

1. ✅ **Sistema completo de categorías** con colores y filtros
2. ✅ **Sistema de tags** con autocompletado y nube visual
3. ✅ **Playlists funcionales** con reproducción continua
4. ✅ **Editor de metadatos** con historial de cambios
5. ✅ **Extracción automática** de información técnica
6. ✅ **Sistema de favoritos** integrado

**Resultado:** Aplicación de gestión multimedia profesional con organización avanzada y control total sobre la biblioteca de videos.

---

## 💡 NOTAS IMPORTANTES

### Priorización:
- **Alta:** Favoritos, Categorías, Tags (uso diario)
- **Media:** Playlists, Editor de Metadatos
- **Baja:** Extracción automática (nice-to-have)

### Complejidad:
- **Simple:** Favoritos (1-2 días)
- **Media:** Categorías, Tags (3-5 días cada uno)
- **Compleja:** Playlists (5-7 días), Editor (4-5 días)
- **Técnica:** Extracción metadatos (3-4 días)

### Dependencias:
- Categorías y Tags son independientes (pueden hacerse en paralelo)
- Playlists dependen de tener videos bien organizados
- Editor de metadatos es independiente
- Extracción puede hacerse al final

---

**¿Listo para comenzar? Sugerencia: Empezar por el Sistema de Favoritos (más simple y da valor inmediato) y luego continuar con Categorías.**
