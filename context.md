# 📚 CONTEXTO DEL PROYECTO - YouTube Local Manager

**Última actualización:** 11 de Enero de 2025  
**Versión:** 0.3.1  
**Estado:** Fase 3 en Progreso (71%)

---

## 📋 Resumen Ejecutivo

**YouTube Local Manager** es una aplicación de escritorio para gestionar, organizar y reproducir videos locales. Desarrollada con Electron + React + Vite, proporciona una experiencia similar a YouTube pero completamente local y privada.

### Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18, React Router DOM, Lucide React, Context API |
| **Backend** | Electron, better-sqlite3, Chokidar, fluent-ffmpeg |
| **Build** | Vite, Electron Builder |

---

## 🎯 Estado del Proyecto

### Progreso General

| Fase | Nombre | Progreso | Documento |
|------|--------|----------|-----------|
| 1 | Core (Base) | ✅ 100% | - |
| 2 | UI Avanzada | ✅ 100% | - |
| 3 | Funcionalidades Avanzadas | 🚧 71% | → `Fase3.md` |
| 4 | Estadísticas | ⏳ 0% | → `Fases.md` |
| 5 | Optimización | ⏳ 0% | → `Fases.md` |
| 6 | Premium | ⏳ 0% | → `Fases.md` |
| 7 | Distribución | ⏳ 0% | → `Fases.md` |

**Progreso Total:** ~40% (2.7 de 7 fases)

### Fase 3 - Resumen Rápido

| Sistema | Estado | Descripción |
|---------|--------|-------------|
| ✅ Favoritos | 100% | Marcado con estrella, página dedicada |
| ✅ Multi-Disco | 100% | UUID, rutas relativas, reconexión automática |
| ✅ Categorías | 100% | Organización N:M con colores |
| ✅ Tags | 100% | Etiquetado flexible con colores |
| ✅ Playlists | 100% | Listas con drag & drop, reproducción continua |
| ⏳ Editor Metadatos | 0% | Pendiente |
| ⏳ Extracción Metadatos | 0% | Pendiente |

**Detalle técnico completo:** Ver [`Fase3.md`](./Fase3.md)

---

## 🏗️ Estructura del Proyecto

```
youtube-local/src/
├── main/                    # Backend Electron (8 + 8 IPC handlers)
├── preload/                 # API expuesta (49 APIs)
└── renderer/src/            # Frontend React (24 componentes, 10 páginas)
```

**Detalle de arquitectura:** Ver [`ARQUITECTURA.md`](./ARQUITECTURA.md)

---

## 🎨 Sistema de Diseño

### Paleta de Colores por Sistema

| Sistema | Color | Hex |
|---------|-------|-----|
| Playlists | Verde | `#10b981` |
| Tags | Morado | `#8b5cf6` |
| Categorías | Azul | `#3b82f6` |
| Favoritos | Amarillo | `#ffc107` |

### Componentes Visuales Clave

**VideoCard** - 4 botones flotantes:
```
[🎵 Playlist] [# Tags] [🏷️ Categorías] [⭐ Favorito]
```

**Video.jsx** - Barra de acciones en página de reproducción:
```
[⭐ Favorito] [🏷️ Categorías 3] [# Tags 2] [🎵 Playlist 2] │ [👍] [👎]
```

**Sidebar** - 3 secciones dinámicas con contadores:
```
🎵 PLAYLISTS [+] → 🏷️ CATEGORÍAS [+] → # TAGS [+]
```

---

## ⚡ Métricas de Rendimiento

| Métrica | Valor |
|---------|-------|
| Carga inicial | ~500ms (24 videos) |
| Load More | ~50ms (+24 videos) |
| Búsqueda | ~100ms |
| Reproducción | Instantánea |

---

## 📱 Compatibilidad

- **SO:** Windows 10/11, macOS 10.14+, Linux (Ubuntu, Debian, Fedora)
- **Formatos:** MP4, MKV, AVI, MOV, WMV, FLV
- **Requisitos:** 4GB RAM mínimo, Node.js 16+

---

## 🤝 Desarrollo

```bash
npm install      # Instalar dependencias
npm run dev      # Modo desarrollo
npm run build    # Build producción
```

---

## 📚 Documentación del Proyecto

| Documento | Contenido |
|-----------|-----------|
| [`context.md`](./context.md) | **Este archivo** - Resumen ejecutivo |
| [`ARQUITECTURA.md`](./ARQUITECTURA.md) | Estructura, base de datos, APIs |
| [`Fase3.md`](./Fase3.md) | Detalle técnico de Fase 3 actual |
| [`Fases.md`](./Fases.md) | Plan de desarrollo (7 fases) |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de versiones |

---

## 📈 Roadmap Inmediato

| Tarea | Estimación | Estado |
|-------|------------|--------|
| Completar Fase 3 | 18-20 Enero 2025 | 🚧 71% |
| Editor de Metadatos | 4-5 días | ⏳ Pendiente |
| Extracción de Metadatos | 3-4 días | ⏳ Pendiente |
| Fase 4: Estadísticas | Febrero 2025 | ⏳ Planificado |

---

**Historial de cambios:** Ver [`CHANGELOG.md`](./CHANGELOG.md)