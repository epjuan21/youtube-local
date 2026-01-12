# 📊 FASE 4: ESTADÍSTICAS Y ANALYTICS

**Estado General:** ⏳ PENDIENTE (0 de 2 completado - 0%)  
**Fecha de inicio:** Pendiente  
**Fecha estimada de completación:** ~2 semanas  
**Última actualización:** 11 de Enero de 2025  
**Revisión:** Documento inicial de requerimientos

---

## 🎯 OBJETIVO GENERAL

Proporcionar insights detallados sobre el uso y la biblioteca de videos mediante dashboards visuales y un sistema de historial de reproducción inteligente que permita "Continuar viendo" y análisis de patrones de uso.

---

## 📊 PROGRESO GENERAL

| Sistema | Estado | Backend | Frontend | Progreso | Estimación |
|---------|--------|---------|----------|----------|------------|
| **Dashboard Estadísticas** | ⏳ Pendiente | ⬜ 0% | ⬜ 0% | 0% | 5-7 días |
| **Historial Reproducción** | ⏳ Pendiente | ⬜ 0% | ⬜ 0% | 0% | 4-5 días |

**Total:** 0% completado (0/2 sistemas)

---

## ⏳ 1. DASHBOARD DE ESTADÍSTICAS - **PENDIENTE**

**Estado:** ⬜ 0%  
**Prioridad:** Alta  
**Estimación:** 5-7 días  
**Dependencias:** Sistema de historial de reproducción (parcial)

### 🎯 Objetivo:
Crear un dashboard visual con métricas clave de la biblioteca y el uso de la aplicación, proporcionando una vista general del contenido y patrones de consumo.

### 📋 Requerimientos Funcionales:

#### 1.1 Métricas Generales
- [ ] **Total de videos** en la biblioteca
- [ ] **Total de vistas** acumuladas
- [ ] **Tiempo total visto** (horas/minutos)
- [ ] **Espacio en disco** ocupado por la biblioteca
- [ ] **Videos por estado**: disponibles vs no disponibles (disco desconectado)
- [ ] **Promedio de duración** de videos

#### 1.2 Gráficas de Tendencias
- [ ] **Gráfica de líneas**: Videos agregados por mes (últimos 12 meses)
- [ ] **Gráfica de barras**: Reproducciones por día de la semana
- [ ] **Gráfica de área**: Tiempo de visualización por semana
- [ ] **Gráfica circular (pie)**: Distribución por categoría
- [ ] **Gráfica de barras horizontales**: Top 10 tags más usados

#### 1.3 Rankings y Tops
- [ ] **Top 10 videos más vistos** con thumbnail y contador
- [ ] **Top 10 videos mejor valorados** (por rating)
- [ ] **Top 5 categorías** con más videos
- [ ] **Top 5 tags** más populares
- [ ] **Playlists más reproducidas**

#### 1.4 Videos Recientes
- [ ] **Últimos 10 videos agregados** con fecha
- [ ] **Últimos 10 videos vistos** con timestamp
- [ ] **Videos agregados esta semana/mes**
- [ ] **Videos sin ver** (nunca reproducidos)

#### 1.5 Estadísticas por Categoría
- [ ] Número de videos por categoría
- [ ] Tiempo total por categoría
- [ ] Rating promedio por categoría
- [ ] Vistas totales por categoría

### 💾 Backend - Base de Datos:

No requiere nuevas tablas, utiliza datos existentes de:
- `videos` (view_count, duration, rating, created_at)
- `video_categories` (relación N:M)
- `video_tags` (relación N:M)
- `playlists` y `playlist_videos`

### 📌 APIs IPC Propuestas:

```javascript
// Métricas generales
⬜ stats:getOverview           // Resumen general (totales, promedios)
⬜ stats:getStorageInfo        // Espacio en disco usado

// Tendencias temporales
⬜ stats:getVideosByMonth      // Videos agregados por mes
⬜ stats:getViewsByDayOfWeek   // Vistas por día de la semana
⬜ stats:getWatchTimeByWeek    // Tiempo visto por semana

// Rankings
⬜ stats:getTopVideos          // Top videos por vistas
⬜ stats:getTopRated           // Top videos por rating
⬜ stats:getTopCategories      // Categorías con más videos
⬜ stats:getTopTags            // Tags más usados

// Recientes
⬜ stats:getRecentlyAdded      // Videos recientes
⬜ stats:getRecentlyWatched    // Últimos vistos (requiere historial)
⬜ stats:getUnwatchedVideos    // Videos nunca vistos

// Por categoría
⬜ stats:getCategoryStats      // Estadísticas por categoría
```

### 🎨 Frontend - Componentes:

#### 📁 Archivos a crear:
```
src/renderer/src/
├── pages/
│   └── Dashboard.jsx              // Página principal del dashboard
├── components/
│   ├── dashboard/
│   │   ├── StatsOverview.jsx      // Tarjetas de métricas generales
│   │   ├── TrendCharts.jsx        // Gráficas de tendencias
│   │   ├── TopVideosPanel.jsx     // Panel de videos más vistos
│   │   ├── CategoryStats.jsx      // Estadísticas por categoría
│   │   ├── RecentActivity.jsx     // Actividad reciente
│   │   └── ChartCard.jsx          // Wrapper para gráficas
```

#### 🛠️ Librería de Gráficas:
**Recharts** (recomendado) - Ya mencionado en artifacts disponibles
```bash
npm install recharts
```

#### 📐 Layout del Dashboard:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Dashboard de Estadísticas                           │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │  Total  │ │  Total  │ │  Tiempo │ │ Espacio │        │
│ │ Videos  │ │  Vistas │ │  Visto  │ │  Disco  │        │
│ │  1,234  │ │  5,678  │ │ 234h    │ │  45 GB  │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌────────────────────────┐ │
│ │                          │ │      Distribución      │ │
│ │   Videos por Mes         │ │      por Categoría     │ │
│ │   (Gráfica de líneas)    │ │    (Gráfica circular)  │ │
│ │                          │ │                        │ │
│ └──────────────────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌────────────────────────┐ │
│ │    Top 10 Más Vistos     │ │   Actividad Reciente   │ │
│ │    - Video 1 (234 vistas)│ │   - Agregado: Video X  │ │
│ │    - Video 2 (198 vistas)│ │   - Visto: Video Y     │ │
│ │    - ...                 │ │   - ...                │ │
│ └──────────────────────────┘ └────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### ✅ Criterios de Aceptación:
- [ ] Dashboard carga en menos de 2 segundos
- [ ] Gráficas son interactivas (hover muestra detalles)
- [ ] Datos se actualizan al navegar a la página
- [ ] Responsive: se adapta a diferentes tamaños
- [ ] Skeleton loaders durante carga
- [ ] Colores consistentes con la paleta del proyecto

---

## ⏳ 2. HISTORIAL DE REPRODUCCIÓN - **PENDIENTE**

**Estado:** ⬜ 0%  
**Prioridad:** Alta  
**Estimación:** 4-5 días  
**Dependencias:** Ninguna (sistema nuevo)

### 🎯 Objetivo:
Registrar cada reproducción de video con timestamp y progreso, permitiendo "Continuar viendo" y análisis de patrones de uso.

### 📋 Requerimientos Funcionales:

#### 2.1 Registro de Reproducciones
- [ ] Guardar cada reproducción con timestamp
- [ ] Registrar **progreso** (segundos vistos / duración total)
- [ ] Registrar **porcentaje completado**
- [ ] Detectar si el video fue **completado** (>90%)
- [ ] Identificar sesión de visualización

#### 2.2 Continuar Viendo
- [ ] Sección "Continuar viendo" en Home
- [ ] Mostrar videos con progreso 10%-90%
- [ ] Guardar posición exacta de reproducción
- [ ] Reanudar desde donde se dejó
- [ ] Opción de "marcar como visto" manualmente

#### 2.3 Historial Navegable
- [ ] Página dedicada `/history`
- [ ] Lista cronológica de videos vistos
- [ ] Filtrar por fecha (hoy, esta semana, este mes)
- [ ] Buscar en historial
- [ ] Eliminar entradas individuales
- [ ] Limpiar historial completo

#### 2.4 Métricas de Sesión
- [ ] Tiempo de visualización por sesión
- [ ] Videos vistos por sesión
- [ ] Patrones de horario (mañana/tarde/noche)

### 💾 Backend - Base de Datos:

```sql
-- Nueva tabla: watch_history
CREATE TABLE watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    progress_seconds INTEGER DEFAULT 0,       -- Segundos vistos
    duration_seconds INTEGER DEFAULT 0,       -- Duración total del video
    percentage_watched REAL DEFAULT 0,        -- Porcentaje (0-100)
    completed INTEGER DEFAULT 0,              -- 1 si vio >90%
    session_id TEXT,                          -- Identificador de sesión
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Nueva tabla: watch_progress (para "continuar viendo")
CREATE TABLE watch_progress (
    video_id INTEGER PRIMARY KEY,
    last_position INTEGER DEFAULT 0,          -- Última posición en segundos
    last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_watch_time INTEGER DEFAULT 0,       -- Tiempo total visto
    watch_count INTEGER DEFAULT 0,            -- Veces iniciado
    completed_count INTEGER DEFAULT 0,        -- Veces completado
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_watch_history_video ON watch_history(video_id);
CREATE INDEX idx_watch_history_date ON watch_history(watched_at);
CREATE INDEX idx_watch_progress_last ON watch_progress(last_watched);
```

### 📌 APIs IPC Propuestas:

```javascript
// Registro de reproducción
⬜ history:recordWatch         // Registrar una reproducción
⬜ history:updateProgress      // Actualizar progreso durante reproducción

// Continuar viendo
⬜ history:getContinueWatching // Videos en progreso (10-90%)
⬜ history:getLastPosition     // Obtener última posición de un video
⬜ history:markAsWatched       // Marcar como completado manualmente
⬜ history:clearProgress       // Limpiar progreso de un video

// Historial
⬜ history:getAll              // Todo el historial (paginado)
⬜ history:getByDateRange      // Filtrar por rango de fechas
⬜ history:search              // Buscar en historial
⬜ history:deleteEntry         // Eliminar una entrada
⬜ history:clearAll            // Limpiar todo el historial

// Estadísticas
⬜ history:getWatchStats       // Estadísticas de visualización
⬜ history:getSessionStats     // Estadísticas por sesión
```

### 🎨 Frontend - Componentes:

#### 📁 Archivos a crear:
```
src/renderer/src/
├── pages/
│   └── HistoryPage.jsx            // Página de historial
├── components/
│   ├── history/
│   │   ├── ContinueWatching.jsx   // Sección "Continuar viendo"
│   │   ├── HistoryList.jsx        // Lista de historial
│   │   ├── HistoryItem.jsx        // Item individual con progreso
│   │   ├── HistoryFilters.jsx     // Filtros de fecha
│   │   └── ProgressBar.jsx        // Barra de progreso visual
```

#### 🔄 Integración con VideoPlayer:

```javascript
// En VideoPlayer.jsx - eventos a implementar
⬜ onTimeUpdate     // Actualizar progreso cada X segundos
⬜ onPlay           // Registrar inicio de reproducción
⬜ onPause          // Guardar posición actual
⬜ onEnded          // Marcar como completado
⬜ onSeeked         // Actualizar posición después de seek
```

#### 📐 Layout de Continuar Viendo (Home):

```
┌─────────────────────────────────────────────────────────┐
│  ▶️ Continuar Viendo                                    │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ ▓▓▓▓▓░░ │ │ ▓▓▓░░░░ │ │ ▓▓▓▓▓▓░ │ │ ▓▓░░░░░ │        │
│ │ 65%     │ │ 35%     │ │ 80%     │ │ 20%     │        │
│ │ Video 1 │ │ Video 2 │ │ Video 3 │ │ Video 4 │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
└─────────────────────────────────────────────────────────┘
```

#### 📐 Layout de Página de Historial:

```
┌─────────────────────────────────────────────────────────┐
│  📜 Historial de Reproducción                           │
├─────────────────────────────────────────────────────────┤
│  Filtros: [Hoy] [Esta semana] [Este mes] [Todo]        │
│  🔍 [Buscar en historial...                    ]       │
├─────────────────────────────────────────────────────────┤
│  📅 Hoy - 11 de Enero 2025                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎬 Video Tutorial React    │ 14:32 │ 85% │ [🗑️] │   │
│  │ 🎬 Conferencia Tech 2025   │ 12:15 │ 100%│ [🗑️] │   │
│  │ 🎬 Música Instrumental     │ 10:45 │ 45% │ [🗑️] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📅 Ayer - 10 de Enero 2025                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎬 Documental Naturaleza   │ 22:10 │ 100%│ [🗑️] │   │
│  │ 🎬 Curso Python Avanzado   │ 18:30 │ 60% │ [🗑️] │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  [Cargar más...]                    [Limpiar historial] │
└─────────────────────────────────────────────────────────┘
```

### ✅ Criterios de Aceptación:
- [ ] Progreso se guarda automáticamente cada 10 segundos
- [ ] "Continuar viendo" muestra máximo 10 videos
- [ ] Al reabrir video, pregunta si continuar o empezar de nuevo
- [ ] Barra de progreso visible en thumbnails
- [ ] Historial paginado (50 items por página)
- [ ] Performance: guardado no bloquea reproducción

---

## 📊 MÉTRICAS ESTIMADAS FASE 4

### Estimación de Código:

| Sistema | Líneas Estimadas |
|---------|------------------|
| Dashboard Estadísticas | ~2,000 |
| Historial Reproducción | ~1,800 |
| **Total Fase 4** | **~3,800 líneas** |

### APIs Estimadas:

| Sistema | Cantidad |
|---------|----------|
| Dashboard | 13 |
| Historial | 13 |
| **Total** | **26 APIs** |

### Componentes Estimados:

| Sistema | Componentes |
|---------|-------------|
| Dashboard | 6 |
| Historial | 5 |
| **Total** | **11 componentes** |

### Tablas de Base de Datos Nuevas:

| Tabla | Propósito |
|-------|-----------|
| `watch_history` | Historial de reproducciones |
| `watch_progress` | Progreso de videos (continuar viendo) |
| **Total** | **2 tablas nuevas** |

---

## 🔗 DEPENDENCIAS ENTRE SISTEMAS

```
┌─────────────────────┐
│     Historial       │
│   Reproducción      │
│   (Sistema base)    │
└──────────┬──────────┘
           │
           │ proporciona datos de
           │ visualización
           ▼
┌─────────────────────┐
│     Dashboard       │
│   Estadísticas      │
│ (usa datos historial│
│  para métricas)     │
└─────────────────────┘
```

### Orden Sugerido de Implementación:

1. **Historial de Reproducción** (base para Dashboard)
2. **Dashboard de Estadísticas** (usa datos del historial)

---

## 🛠️ LIBRERÍAS RECOMENDADAS

| Librería | Uso | Instalación |
|----------|-----|-------------|
| Recharts | Gráficas interactivas | `npm install recharts` |
| date-fns | Manejo de fechas | `npm install date-fns` |

---

## 💡 PALETA DE COLORES SUGERIDA

| Elemento | Color | Hex |
|----------|-------|-----|
| Vistas | Azul | `#3b82f6` |
| Tiempo | Verde | `#10b981` |
| Rating | Amarillo | `#ffc107` |
| Completado | Verde oscuro | `#059669` |
| En progreso | Naranja | `#f59e0b` |
| Sin ver | Gris | `#6b7280` |

---

## 📝 NOTAS ADICIONALES

### Consideraciones de Performance:
- Implementar paginación en historial y listas largas
- Usar lazy loading para gráficas
- Cache de estadísticas (invalidar al cambiar datos)
- Limitar historial a últimos 6-12 meses (configurable)
- Guardado de progreso asíncrono (no bloquear UI)

### Consideraciones de UX:
- Skeleton loaders en todas las secciones
- Estados vacíos informativos
- Tooltips explicativos en gráficas
- Confirmación antes de limpiar historial
- Feedback visual durante operaciones

### Integraciones con Fase 3:
- Usar sistema de categorías existente para estadísticas
- Usar sistema de tags existente para rankings
- Extender VideoCard con barra de progreso
- Integrar en Sidebar (acceso rápido a Dashboard/Historial)
- Actualizar Home.jsx para incluir "Continuar viendo"

---

**Última actualización:** 11 de Enero de 2025  
**Estado:** ⏳ FASE 4 PENDIENTE  
**Total de sistemas:** 0/2 implementados  
**Total de APIs estimadas:** 26  
**Total de componentes estimados:** 11  
**Total de líneas estimadas:** ~3,800
